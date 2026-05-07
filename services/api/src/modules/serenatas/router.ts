import { Hono, type Context } from 'hono';
import { eq, and, or, desc, asc, gte, lte, sql, inArray, count } from 'drizzle-orm';
import { z } from 'zod';
import { SerenatasService } from './service';
import {
  computeSerenataPlatformFees,
  COORDINATOR_MONTHLY_PRICE_CLP,
  COORDINATOR_SUBSCRIPTION_PLAN,
  isCoordinatorSubscriptionActive,
} from './constants';
import { createCoordinatorProfileSchema as createCoordinatorProfileSchemaImported } from './types';
import {
  createCheckoutPreference,
  createPreapproval,
  getPaymentById,
  getPreapprovalById,
  isMercadoPagoConfigured,
  refundPayment,
  verifyMercadoPagoWebhookSignature,
} from '../mercadopago/service.js';
import { sendTransactionalEmail } from '../shared/mailer.js';
import { attachSerenatasNotificationRoutes } from './router-notifications.js';
import { geocodeChileAddress } from './geocode.js';
import type { SerenatasRouterDeps } from './serenatas-router-deps.js';

export type { SerenatasRouterDeps } from './serenatas-router-deps.js';

function serenatasDevErrorPayload(fallback: string, error: unknown): { error: string } {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && error instanceof Error && error.message) {
    return { error: `${fallback} (${error.message})` };
  }
  return { error: fallback };
}

/** Distancia en km entre dos puntos WGS84 (Haversine). */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Validation schemas (perfil coordinador — compartido con types.ts)
const createCoordinatorProfileSchema = createCoordinatorProfileSchemaImported;

/**
 * Inserta una notificación en `serenataNotifications`. Errores se loggean
 * pero no rompen el flujo principal (notificaciones nunca son críticas).
 */
async function notifySafe(
  db: any,
  tables: SerenatasRouterDeps['tables'],
  payload: {
    userId: string;
    type: 'serenata' | 'payment' | 'message' | 'system';
    title: string;
    message: string;
    /** Metadatos opcionales; no hay columna JSON — solo usamos ids reconocidos por el esquema. */
    data?: Record<string, unknown>;
    serenataId?: string;
    groupId?: string;
  }
) {
  try {
    const fromData = payload.data ?? {};
    const serenataId =
      payload.serenataId ??
      (typeof fromData.serenataId === 'string' ? fromData.serenataId : undefined);
    const groupId =
      payload.groupId ?? (typeof fromData.groupId === 'string' ? fromData.groupId : undefined);

    const withRefs: Record<string, unknown> = {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
    };
    if (groupId) withRefs.groupId = groupId;
    if (serenataId) withRefs.serenataId = serenataId;

    try {
      await db.insert(tables.serenataNotifications).values(withRefs);
    } catch {
      /** FK `serenata_id` → tabla legacy; ids de `serenatas` pueden fallar — guardar el aviso sin enlace. */
      await db.insert(tables.serenataNotifications).values({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        ...(groupId ? { groupId } : {}),
      });
    }
  } catch (err) {
    console.warn('[serenatas] notify failed:', err);
  }
}

/** Web push opcional (VAPID); mismo canal que SimpleAgenda (`push_subscriptions`). */
function fireSerenataPush(
  deps: SerenatasRouterDeps,
  userId: string,
  opts: { title: string; message: string; url?: string }
) {
  const send = deps.sendPushToUser;
  if (!send) return;
  void send(userId, { title: opts.title, body: opts.message, url: opts.url });
}

/** Envía email transaccional sin romper el flujo si SMTP no está configurado o falla. */
async function sendMailSafe(
  db: any,
  tables: SerenatasRouterDeps['tables'],
  userId: string | null | undefined,
  subject: string,
  text: string,
  html?: string
) {
  try {
    if (!userId) return;
    const [user] = await db
      .select({ email: tables.users.email, name: tables.users.name })
      .from(tables.users)
      .where(eq(tables.users.id, userId))
      .limit(1);
    if (!user?.email || typeof user.email !== 'string' || !user.email.includes('@')) return;
    await sendTransactionalEmail({
      to: user.email,
      subject,
      text,
      html,
      fromName: 'SimpleSerenatas',
    });
  } catch (err) {
    console.warn('[serenatas] mail failed:', err);
  }
}

const APP_URL_FOR_EMAIL = () =>
  process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS?.trim()?.replace(/\/$/, '') ||
  process.env.SERENATAS_APP_URL?.trim()?.replace(/\/$/, '') ||
  '';

const SERENATA_MP_REF_PREFIX = 'serenata:';
const SERENATA_SUB_MP_REF_PREFIX = 'serenata_sub:';
function getSerenatasPublicOrigin(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS?.trim()) ||
    process.env.MERCADO_PAGO_PUBLIC_ORIGIN?.trim() ||
    process.env.SERENATAS_APP_URL?.trim() ||
    '';
  return raw.replace(/\/$/, '');
}

function getSerenataMpNotificationUrl(): string | undefined {
  const base = process.env.API_BASE_URL?.trim()?.replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}/api/serenatas/webhooks/mercadopago`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseSerenataIdFromMpExternalRef(ref: unknown): string | null {
  const s = typeof ref === 'string' ? ref.trim() : '';
  if (!s.startsWith(SERENATA_MP_REF_PREFIX)) return null;
  const id = s.slice(SERENATA_MP_REF_PREFIX.length);
  if (!UUID_RE.test(id)) return null;
  return id;
}

function parseCoordinatorSubscriptionPaymentIdFromMpExternalRef(ref: unknown): string | null {
  const s = typeof ref === 'string' ? ref.trim() : '';
  if (!s.startsWith(SERENATA_SUB_MP_REF_PREFIX)) return null;
  const id = s.slice(SERENATA_SUB_MP_REF_PREFIX.length);
  if (!UUID_RE.test(id)) return null;
  return id;
}

const createSerenataSchema = z.object({
  clientName: z.string().min(1).max(255),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.string().email().max(255).optional(),
  eventType: z.enum(['serenata', 'cumpleanos', 'aniversario', 'propuesta', 'otro']).default('serenata'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().min(15).max(180).default(30),
  address: z.string().min(1),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  recipientName: z.string().max(255).optional(),
  recipientRelation: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  songRequests: z.array(z.string().max(255)).optional(),
  price: z.number().min(0).optional(),
  source: z.enum(['own_lead', 'self_captured', 'platform_lead', 'platform_assigned']).default('platform_lead'),
  coordinatorId: z.string().uuid().optional(),
  capturedByCoordinator: z.boolean().optional(),
});

const patchSerenataCoordinatorSchema = z.object({
  clientName: z.string().min(1).max(255).optional(),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.string().email().max(255).optional().nullable(),
  eventType: z.enum(['serenata', 'cumpleanos', 'aniversario', 'propuesta', 'otro']).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.number().min(15).max(180).optional(),
  address: z.string().min(1).optional(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  recipientName: z.string().max(255).optional().nullable(),
  recipientRelation: z.string().max(50).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  songRequests: z.array(z.string().max(255)).optional(),
  price: z.number().min(0).optional().nullable(),
});

const updateSerenataStatusSchema = z.object({
  status: z.enum(['pending', 'quoted', 'accepted', 'payment_pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected']),
  price: z.number().min(0).optional(),
});

const updateCoordinatorProfileSchema = z.object({
  experience: z.number().min(0).optional(),
  bio: z.string().max(500).optional(),
  comuna: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const updateMusicianAvailabilitySchema = z.object({
  isAvailable: z.boolean().optional(),
  availableNow: z.boolean().optional(),
});

const createRequestSchema = z.object({
  clientName: z.string().min(1).max(255),
  clientPhone: z.string().min(8).max(20),
  clientEmail: z.string().email().optional(),
  address: z.string().min(5).max(500),
  comuna: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  dateTime: z.string().datetime(),
  duration: z.number().min(15).max(120).default(30),
  occasion: z.enum(['birthday', 'anniversary', 'love', 'graduation', 'other']).optional(),
  message: z.string().max(500).optional(),
  specialRequests: z.string().max(500).optional(),
  requiredInstruments: z.array(z.string()).optional(),
  minMusicians: z.number().min(1).max(15).default(3),
  maxMusicians: z.number().min(1).max(20).optional(),
  price: z.number().min(1000),
  urgency: z.enum(['normal', 'urgent', 'express']).default('normal'),
});

const updateRequestSchema = z.object({
  clientName: z.string().min(1).max(255).optional(),
  clientPhone: z.string().min(8).max(20).optional(),
  address: z.string().min(5).max(500).optional(),
  dateTime: z.string().datetime().optional(),
  duration: z.number().min(15).max(120).optional(),
  status: z.enum(['pending', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
});

const createRouteSchema = z.object({
  groupId: z.string().uuid(),
  date: z.string().datetime(),
  waypoints: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    serenataId: z.string().uuid(),
    address: z.string(),
    estimatedTime: z.string(),
  })),
});

const optimizeRouteSchema = z.object({
  serenataIds: z.array(z.string().uuid()),
  algorithm: z.enum(['nearest_neighbor', 'manual']).default('nearest_neighbor'),
});

// Distance calculation helpers
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateRouteDistance(waypoints: Array<{ lat: number; lng: number }>): number {
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }
  return totalDistance;
}

/** Respuesta HTTP: grupo sin clave interna Drizzle del líder; expone `coordinator` + `coordinatorName`. */
function mapGroupForApi(group: Record<string, unknown>) {
  const leader = group.leadMusician as Record<string, unknown> | undefined | null;
  const { leadMusician: _drop, assignments, ...rest } = group;
  const user = leader?.user as { name?: string } | undefined;
  let sortedAssignments = assignments;
  if (Array.isArray(assignments) && assignments.length > 1) {
    sortedAssignments = [...assignments].sort(
      (a: { position?: unknown }, b: { position?: unknown }) =>
        Number(a.position ?? 0) - Number(b.position ?? 0)
    );
  }
  return {
    ...rest,
    assignments: sortedAssignments,
    coordinator: leader ?? null,
    coordinatorName: user?.name,
  };
}

function optimizeNearestNeighbor(
  startPoint: { lat: number; lng: number },
  points: Array<{ lat: number; lng: number; serenataId: string; address: string; estimatedTime: string }>
): Array<{ lat: number; lng: number; serenataId: string; address: string; estimatedTime: string }> {
  const unvisited = [...points];
  const route: Array<{ lat: number; lng: number; serenataId: string; address: string; estimatedTime: string }> = [];
  let current = startPoint;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
    }

    const next = unvisited.splice(nearestIndex, 1)[0];
    route.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  return route;
}

export function createSerenatasRouter(deps: SerenatasRouterDeps) {
  const app = new Hono();
  const { db, authUser, service, requireAuth, tables } = deps;

  /** Fila única `serenata_musicians` por usuario; crea mínimo si aún no existe. */
  async function getOrCreateSerenataMusicianForUser(userId: string) {
    let row = await db.query.serenataMusicians.findFirst({
      where: eq(tables.serenataMusicians.userId, userId),
    });
    if (!row) {
      const [inserted] = await db
        .insert(tables.serenataMusicians)
        .values({
          userId,
          instrument: 'Voz',
          isAvailable: true,
        })
        .returning();
      row = inserted;
    }
    return row!;
  }

  async function getAuthUser(c: Context) {
    return authUser(c);
  }

  function serenataDatePart(value: unknown): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value ?? '').slice(0, 10);
  }

  function serenataTimePart(value: unknown): string {
    return String(value ?? '00:00').slice(0, 5);
  }

  function parseIsoDateOnly(v?: string | null): Date | null {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function parseIsoWeekRange(week?: string | null): { start: Date; end: Date } | null {
    if (!week || !/^\d{4}-\d{2}$/.test(week)) return null;
    const [yStr, wStr] = week.split('-');
    const year = Number(yStr);
    const isoWeek = Number(wStr);
    if (!Number.isFinite(year) || !Number.isFinite(isoWeek) || isoWeek < 1 || isoWeek > 53) {
      return null;
    }
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7; // 1..7 (lunes..domingo)
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
    const start = new Date(week1Monday);
    start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start, end };
  }

  function mapSerenataForApi(row: any) {
    const eventDate = serenataDatePart(row.eventDate);
    const eventTime = serenataTimePart(row.eventTime);
    const dateTime = `${eventDate}T${eventTime}:00`;
    return {
      ...row,
      eventDate,
      eventTime,
      date: eventDate,
      time: eventTime,
      dateTime,
      location: row.address,
      comuna: row.city ?? '',
      lat: row.latitude != null ? Number(row.latitude) : undefined,
      lng: row.longitude != null ? Number(row.longitude) : undefined,
      coordinatorId: row.coordinatorProfileId ?? undefined,
      source: row.source ?? 'platform_lead',
      _origin: 'serenatas',
    };
  }

  async function getActorCoordinatorProfile(user: { id: string; role?: string }) {
    const [coord] = await db
      .select()
      .from(tables.serenataCoordinatorProfiles)
      .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
      .limit(1);
    return coord ?? null;
  }

  /** Registra en BD el pago aprobado por Mercado Pago (escrow + confirmación de serenata). Idempotente por `paymentId` MP. */
  async function finalizeSerenataMercadoPagoPayment(
    serenataId: string,
    mpPaymentId: string,
    mpPayment: Record<string, unknown>
  ) {
    const refParsed = parseSerenataIdFromMpExternalRef(mpPayment.external_reference);
    if (refParsed !== serenataId) {
      return { ok: false as const, error: 'Referencia externa inválida', httpStatus: 400 };
    }

    const [byMp] = await db
      .select()
      .from(tables.serenataPayments)
      .where(eq(tables.serenataPayments.externalPaymentId, String(mpPaymentId)))
      .limit(1);
    if (byMp) {
      if (byMp.serenataId !== serenataId) {
        return {
          ok: false as const,
          error: 'Ese pago ya está asociado a otra serenata',
          httpStatus: 409,
        };
      }
      const [serenataRow] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      const fees0 = computeSerenataPlatformFees(
        serenataRow?.price ?? (byMp as { totalAmount?: number }).totalAmount ?? 0,
        serenataRow?.source ?? 'own_lead'
      );
      return {
        ok: true as const,
        alreadyPaid: true,
        payment: byMp,
        breakdown: {
          totalAmount: serenataRow?.price ?? (byMp as { totalAmount: number }).totalAmount,
          platformCommission: fees0.platformCommission,
          commissionVat: fees0.commissionVat,
          coordinatorEarnings: fees0.coordinatorEarnings,
          source: serenataRow?.source ?? 'own_lead',
        },
      };
    }

    const [serenata] = await db
      .select()
      .from(tables.serenatas)
      .where(eq(tables.serenatas.id, serenataId))
      .limit(1);
    if (!serenata) {
      return { ok: false as const, error: 'Serenata no encontrada', httpStatus: 404 };
    }

    const coordinatorProfileId = serenata.coordinatorProfileId;
    if (!coordinatorProfileId) {
      return { ok: false as const, error: 'La serenata aún no tiene coordinador', httpStatus: 400 };
    }
    if (!serenata.price || serenata.price <= 0) {
      return { ok: false as const, error: 'La serenata no tiene precio acordado', httpStatus: 400 };
    }
    if (!['accepted', 'payment_pending', 'quoted', 'confirmed'].includes(serenata.status)) {
      return {
        ok: false as const,
        error: `No se puede registrar pago en estado ${serenata.status}`,
        httpStatus: 409,
      };
    }

    const txAmount = Number(mpPayment.transaction_amount);
    if (!Number.isFinite(txAmount) || Math.abs(Math.round(txAmount) - serenata.price) > 2) {
      return {
        ok: false as const,
        error: 'El monto del pago no coincide con el precio acordado',
        httpStatus: 400,
      };
    }

    const [existing] = await db
      .select()
      .from(tables.serenataPayments)
      .where(
        and(
          eq(tables.serenataPayments.serenataId, serenataId),
          inArray(tables.serenataPayments.status, ['pending', 'holding', 'released'])
        )
      )
      .limit(1);
    if (existing) {
      return {
        ok: false as const,
        error: 'La serenata ya tiene un pago registrado',
        httpStatus: 409,
      };
    }

    const totalAmount = serenata.price;
    const fees = computeSerenataPlatformFees(totalAmount, serenata.source);

    const [payment] = await db
      .insert(tables.serenataPayments)
      .values({
        serenataId,
        clientId: serenata.clientId,
        coordinatorProfileId,
        totalAmount,
        platformCommission: fees.platformCommission,
        commissionVat: fees.commissionVat,
        coordinatorEarnings: fees.coordinatorEarnings,
        currency: 'CLP',
        status: 'holding',
        clientPaidAt: new Date(),
        externalPaymentId: String(mpPaymentId),
        updatedAt: new Date(),
      })
      .returning();

    if (serenata.status !== 'confirmed') {
      await db
        .update(tables.serenatas)
        .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(tables.serenatas.id, serenataId));
    }

    const appUrl = APP_URL_FOR_EMAIL();
    const trackingUrl = appUrl ? `${appUrl}/tracking/${serenataId}` : '';

    try {
      const [coord] = await db
        .select({ userId: tables.serenataCoordinatorProfiles.userId })
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.id, coordinatorProfileId))
        .limit(1);
      if (coord?.userId) {
        await notifySafe(db, tables, {
          userId: coord.userId,
          type: 'payment',
          title: 'Pago confirmado',
          message: 'El cliente pagó la serenata. Ya puedes coordinar el evento.',
          data: { serenataId },
        });
        await sendMailSafe(
          db,
          tables,
          coord.userId,
          'Pago de serenata confirmado',
          `El cliente pagó la serenata #${serenataId.slice(0, 8)}. Ya puedes coordinar el evento.${trackingUrl ? `\n\nDetalles: ${trackingUrl}` : ''}`
        );
      }
    } catch (notifError) {
      console.warn('[serenatas/payments] Notification failed:', notifError);
    }

    await sendMailSafe(
      db,
      tables,
      serenata.clientId,
      'Pago recibido — tu serenata está confirmada',
      `Recibimos tu pago de $${totalAmount.toLocaleString('es-CL')} CLP por la serenata #${serenataId.slice(0, 8)}.\nTu pago queda en custodia hasta que la serenata se realice.${trackingUrl ? `\n\nSeguimiento: ${trackingUrl}` : ''}`
    );

    return {
      ok: true as const,
      payment,
      breakdown: {
        totalAmount,
        platformCommission: fees.platformCommission,
        commissionVat: fees.commissionVat,
        coordinatorEarnings: fees.coordinatorEarnings,
        source: serenata.source,
      },
    };
  }

  /** Tras un pago de suscripción aprobado: el usuario pasa a rol `coordinator`. */
  async function grantCoordinatorRoleForProfile(coordinatorProfileId: string) {
    const [row] = await db
      .select({ userId: tables.serenataCoordinatorProfiles.userId })
      .from(tables.serenataCoordinatorProfiles)
      .where(eq(tables.serenataCoordinatorProfiles.id, coordinatorProfileId))
      .limit(1);
    if (!row?.userId) return;
    await db
      .update(tables.users)
      .set({ role: 'coordinator' })
      .where(eq(tables.users.id, row.userId));
  }

  /**
   * Activa el pago de suscripción coordinador tras aprobación MP.
   * Idempotente por `subscriptionPaymentId` y por `mpPaymentId` (almacenado en `externalPaymentId`).
   */
  async function finalizeCoordinatorSubscriptionPayment(
    subscriptionPaymentId: string,
    mpPaymentId: string,
    mpPayment: Record<string, unknown>
  ) {
    const refParsed = parseCoordinatorSubscriptionPaymentIdFromMpExternalRef(
      mpPayment.external_reference
    );
    if (refParsed !== subscriptionPaymentId) {
      return { ok: false as const, error: 'Referencia externa inválida', httpStatus: 400 };
    }

    const [pendingPayment] = await db
      .select()
      .from(tables.serenataSubscriptionPayments)
      .where(eq(tables.serenataSubscriptionPayments.id, subscriptionPaymentId))
      .limit(1);
    if (!pendingPayment) {
      return { ok: false as const, error: 'Pago de suscripción no encontrado', httpStatus: 404 };
    }

    if (pendingPayment.status === 'succeeded') {
      return { ok: true as const, alreadyPaid: true, payment: pendingPayment };
    }

    const txAmount = Number(mpPayment.transaction_amount);
    if (!Number.isFinite(txAmount) || Math.abs(Math.round(txAmount) - pendingPayment.amount) > 2) {
      return {
        ok: false as const,
        error: 'El monto del pago no coincide con la suscripción',
        httpStatus: 400,
      };
    }

    const [updatedPayment] = await db
      .update(tables.serenataSubscriptionPayments)
      .set({
        status: 'succeeded',
        externalPaymentId: String(mpPaymentId),
        paidAt: new Date(),
      })
      .where(eq(tables.serenataSubscriptionPayments.id, subscriptionPaymentId))
      .returning();

    const [subscription] = await db
      .select()
      .from(tables.serenataSubscriptions)
      .where(eq(tables.serenataSubscriptions.id, pendingPayment.subscriptionId))
      .limit(1);

    if (subscription) {
      await db
        .update(tables.serenataSubscriptions)
        .set({
          status: 'active',
          startedAt: subscription.startedAt ?? new Date(),
          endsAt: pendingPayment.periodEnd,
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataSubscriptions.id, subscription.id));

      await db
        .update(tables.serenataCoordinatorProfiles)
        .set({
          subscriptionPlan: subscription.plan,
          subscriptionStatus: 'active',
          subscriptionStartedAt: subscription.startedAt ?? new Date(),
          subscriptionEndsAt: pendingPayment.periodEnd,
          updatedAt: new Date(),
        })
        .where(
          eq(tables.serenataCoordinatorProfiles.id, subscription.coordinatorProfileId)
        );

      await grantCoordinatorRoleForProfile(subscription.coordinatorProfileId);

      try {
        const [coord] = await db
          .select({ userId: tables.serenataCoordinatorProfiles.userId })
          .from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.id, subscription.coordinatorProfileId))
          .limit(1);
        if (coord?.userId) {
          const periodLabel = pendingPayment.periodEnd.toLocaleDateString('es-CL');
          await notifySafe(db, tables, {
            userId: coord.userId,
            type: 'payment',
            title: 'Suscripción activa',
            message: `Tu suscripción de coordinador está vigente hasta el ${periodLabel}.`,
            data: { plan: subscription.plan, subscriptionId: subscription.id },
          });
          await sendMailSafe(
            db,
            tables,
            coord.userId,
            'Suscripción coordinador activa',
            `Tu suscripción de coordinador en SimpleSerenatas está activa hasta el ${periodLabel}.\nMonto: $${pendingPayment.amount.toLocaleString('es-CL')} ${pendingPayment.currency}.`
          );
        }
      } catch (notifError) {
        console.warn('[serenatas/subscription] Notification failed:', notifError);
      }
    }

    return {
      ok: true as const,
      payment: updatedPayment ?? pendingPayment,
      subscription: subscription ?? null,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GROUPS ROUTES
  // ═══════════════════════════════════════════════════════════════

  // List groups with filters
  app.get('/groups', requireAuth, async (c) => {
    try {
      const status = c.req.query('status');
      const date = c.req.query('date');
      const coordinatorProfileIdFilter = c.req.query('coordinatorId');
      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
      const offset = parseInt(c.req.query('offset') || '0');

      let conditions = [];

      if (status) {
        conditions.push(eq(tables.serenataGroups.status, status));
      }

      if (date) {
        conditions.push(eq(tables.serenataGroups.date, new Date(date)));
      }

      if (coordinatorProfileIdFilter) {
        conditions.push(eq(tables.serenataGroups.groupLeadMusicianId, coordinatorProfileIdFilter));
      }

      const groups = await db.query.serenataGroups.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        with: {
          leadMusician: {
            with: {
              user: {
                columns: { id: true, name: true, avatarUrl: true },
              },
            },
          },
          members: {
            with: {
              musician: {
                with: {
                  user: {
                    columns: { id: true, name: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [desc(tables.serenataGroups.createdAt)],
      });

      return c.json({
        ok: true,
        groups: groups.map((g: Record<string, unknown>) => mapGroupForApi(g)),
      });
    } catch (error) {
      console.error('[serenatas/groups] Error listing groups:', error);
      return c.json({ ok: false, error: 'Error al listar grupos' }, 500);
    }
  });

  // GET /coordinators/me - Obtener perfil del coordinador autenticado
  app.get('/coordinators/me', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const profile = await service.getCoordinatorProfileByUserId(user.id);
      if (!profile) {
        return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);
      }

      return c.json({
        ok: true,
        profile,
        coordinatorAccess: isCoordinatorSubscriptionActive(profile),
      });
    } catch (error) {
      console.error('[serenatas/coordinators] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener perfil' }, 500);
    }
  });

  /**
   * Debe ir ANTES de `/groups/:id`; si no, `my` se captura como parámetro y rompe el UUID.
   * Alias para el frontend: grupos `serenata_groups` donde el usuario participa.
   */
  app.get('/groups/my', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const coordProfile = await service.getCoordinatorProfileByUserId(user.id);
      if (coordProfile) {
        const musicianRow = await db.query.serenataMusicians.findFirst({
          where: eq(tables.serenataMusicians.userId, user.id),
        });
        if (!musicianRow) return c.json({ ok: true, groups: [] });

        const groups = await db
          .select({
            id: tables.serenataGroups.id,
            name: tables.serenataGroups.name,
            date: tables.serenataGroups.date,
            status: tables.serenataGroups.status,
            totalEarnings: tables.serenataGroups.totalEarnings,
          })
          .from(tables.serenataGroups)
          .where(eq(tables.serenataGroups.createdBy, musicianRow.id))
          .orderBy(desc(tables.serenataGroups.date));

        const groupIds = groups.map((g: { id: string }) => g.id);
        const memberCountMap = new Map<string, number>();
        const assignmentCountMap = new Map<string, number>();

        if (groupIds.length > 0) {
          try {
            const memberRows = await db
              .select({
                groupId: tables.serenataGroupMembers.groupId,
                n: count(),
              })
              .from(tables.serenataGroupMembers)
              .where(inArray(tables.serenataGroupMembers.groupId, groupIds))
              .groupBy(tables.serenataGroupMembers.groupId);

            for (const row of memberRows) {
              memberCountMap.set(row.groupId, Number(row.n));
            }
          } catch (countErr) {
            console.error('[serenatas/groups/my] member counts skipped:', countErr);
          }

          try {
            const assignmentRows = await db
              .select({
                groupId: tables.serenataAssignments.groupId,
                n: count(),
              })
              .from(tables.serenataAssignments)
              .where(inArray(tables.serenataAssignments.groupId, groupIds))
              .groupBy(tables.serenataAssignments.groupId);

            for (const row of assignmentRows) {
              assignmentCountMap.set(row.groupId, Number(row.n));
            }
          } catch (countErr) {
            console.error('[serenatas/groups/my] assignment counts skipped:', countErr);
          }
        }

        return c.json({
          ok: true,
          groups: groups.map(
            (g: {
              id: string;
              name: string;
              date: Date;
              status: string;
              totalEarnings: unknown;
            }) => ({
              id: g.id,
              name: g.name,
              date: g.date,
              status: g.status,
              coordinatorName: null,
              totalEarnings: Number(g.totalEarnings ?? 0),
              members: memberCountMap.get(String(g.id)) ?? 0,
              serenatas: assignmentCountMap.get(String(g.id)) ?? 0,
            })
          ),
        });
      }

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!musician) return c.json({ ok: true, groups: [] });

      const memberships = await db
        .select({
          groupId: tables.serenataGroupMembers.groupId,
          status: tables.serenataGroupMembers.status,
          name: tables.serenataGroups.name,
          date: tables.serenataGroups.date,
          groupStatus: tables.serenataGroups.status,
          totalEarnings: tables.serenataGroups.totalEarnings,
        })
        .from(tables.serenataGroupMembers)
        .leftJoin(tables.serenataGroups, eq(tables.serenataGroupMembers.groupId, tables.serenataGroups.id))
        .where(eq(tables.serenataGroupMembers.musicianId, musician.id))
        .orderBy(desc(tables.serenataGroups.date));

      return c.json({
        ok: true,
        groups: memberships.map((m: any) => ({
          id: m.groupId,
          name: m.name,
          date: m.date,
          status: m.groupStatus,
          memberStatus: m.status,
          totalEarnings: Number(m.totalEarnings ?? 0),
          members: 0,
          serenatas: 0,
        })),
      });
    } catch (error) {
      console.error('[serenatas/groups] my groups error:', error);
      return c.json({ ok: false, error: 'Error al cargar grupos' }, 500);
    }
  });

  // Grupo por id
  app.get('/groups/:id', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const id = c.req.param('id');
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!musician) return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, id),
        with: {
          leadMusician: { with: { user: true } },
          members: { with: { musician: { with: { user: true } } } },
          assignments: { with: { serenata: true } },
        },
      });

      if (!group) return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      const isOwner = group.createdBy === musician.id;
      const isMember = (group.members ?? []).some((m: any) => m.musicianId === musician.id);
      if (!isOwner && !isMember) {
        return c.json({ ok: false, error: 'No tienes permiso para ver este grupo' }, 403);
      }
      return c.json({ ok: true, group: mapGroupForApi(group as Record<string, unknown>) });
    } catch (error) {
      console.error('[serenatas/groups] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener grupo' }, 500);
    }
  });

  // POST /groups - Crear grupo (coordinador)
  app.post('/groups', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const body = (await c.req.json().catch(() => ({}))) as { name?: string; date?: string };
      const name = (body.name ?? '').trim();
      const date = (body.date ?? '').trim();
      if (!name || !date) {
        return c.json({ ok: false, error: 'name y date son requeridos' }, 400);
      }

      const coord = await service.getCoordinatorProfileByUserId(user.id);
      if (!coord) {
        return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);
      }
      const musician = await getOrCreateSerenataMusicianForUser(user.id);
      const [group] = await db
        .insert(tables.serenataGroups)
        .values({
          name,
          date: new Date(`${date}T00:00:00`),
          createdBy: musician.id,
          groupLeadMusicianId: musician.id,
          status: 'forming',
        })
        .returning();

      await db.insert(tables.serenataGroupMembers).values({
        groupId: group.id,
        musicianId: musician.id,
        role: 'coordinator',
        status: 'confirmed',
      });

      return c.json(
        {
          ok: true,
          group: {
            id: group.id,
            name: group.name,
            date: group.date,
            status: group.status,
            coordinatorName: null,
            members: 1,
            serenatas: 0,
            totalEarnings: Number(group.totalEarnings ?? 0),
          },
        },
        201
      );
    } catch (error) {
      console.error('[serenatas/groups] create error:', error);
      return c.json({ ok: false, error: 'Error al crear grupo' }, 500);
    }
  });

  // POST /groups/:id/members - Agregar músico al grupo (desde cuadrilla activa)
  app.post('/groups/:id/members', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const groupId = c.req.param('id');
      const body = (await c.req.json().catch(() => ({}))) as { musicianId?: string; role?: string };
      if (!groupId || !body.musicianId) {
        return c.json({ ok: false, error: 'groupId y musicianId requeridos' }, 400);
      }

      const coord = await service.getCoordinatorProfileByUserId(user.id);
      if (!coord) return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);
      const ownerMusician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!ownerMusician) return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, groupId),
      });
      if (!group) return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      if (group.createdBy !== ownerMusician.id) {
        return c.json({ ok: false, error: 'No puedes editar un grupo de otro coordinador' }, 403);
      }
      if (group.status !== 'forming') {
        return c.json({ ok: false, error: 'Solo puedes agregar miembros a grupos en formación' }, 409);
      }

      const targetMusician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.id, body.musicianId),
      });
      if (!targetMusician) return c.json({ ok: false, error: 'Músico no encontrado' }, 404);

      const cm = tables.serenataCoordinatorCrewMemberships;
      const [crewLink] = await db
        .select({ id: cm.id })
        .from(cm)
        .where(
          and(
            eq(cm.coordinatorProfileId, coord.id),
            eq(cm.musicianId, targetMusician.id),
            eq(cm.membershipStatus, 'active')
          )
        )
        .limit(1);
      if (!crewLink) {
        return c.json({ ok: false, error: 'Solo puedes agregar músicos activos de tu cuadrilla' }, 409);
      }

      const gm = tables.serenataGroupMembers;
      const [existing] = await db
        .select({ id: gm.id })
        .from(gm)
        .where(and(eq(gm.groupId, groupId), eq(gm.musicianId, targetMusician.id)))
        .limit(1);
      if (existing) {
        return c.json({ ok: false, error: 'El músico ya está en el grupo' }, 409);
      }

      const [member] = await db
        .insert(gm)
        .values({
          groupId,
          musicianId: targetMusician.id,
          role: body.role || targetMusician.instrument || 'musico',
          status: 'invited',
        })
        .returning();

      return c.json({ ok: true, member });
    } catch (error) {
      console.error('[serenatas/groups] add member error:', error);
      return c.json({ ok: false, error: 'Error al agregar miembro' }, 500);
    }
  });

  // DELETE /groups/:id/members/:musicianId - Quitar músico
  app.delete('/groups/:id/members/:musicianId', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const groupId = c.req.param('id');
      const musicianId = c.req.param('musicianId');
      if (!groupId || !musicianId) {
        return c.json({ ok: false, error: 'groupId y musicianId requeridos' }, 400);
      }
      const coord = await service.getCoordinatorProfileByUserId(user.id);
      if (!coord) return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);
      const ownerMusician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!ownerMusician) return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, groupId),
      });
      if (!group) return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      if (group.createdBy !== ownerMusician.id) {
        return c.json({ ok: false, error: 'No puedes editar un grupo de otro coordinador' }, 403);
      }
      if (group.status !== 'forming') {
        return c.json({ ok: false, error: 'Solo puedes quitar miembros en grupos en formación' }, 409);
      }

      const gm = tables.serenataGroupMembers;
      await db
        .delete(gm)
        .where(and(eq(gm.groupId, groupId), eq(gm.musicianId, musicianId)));

      return c.json({ ok: true });
    } catch (error) {
      console.error('[serenatas/groups] remove member error:', error);
      return c.json({ ok: false, error: 'Error al quitar miembro' }, 500);
    }
  });

  // POST /groups/:id/confirm - Confirmar grupo
  app.post('/groups/:id/confirm', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const groupId = c.req.param('id');
      if (!groupId) return c.json({ ok: false, error: 'groupId requerido' }, 400);
      const coord = await service.getCoordinatorProfileByUserId(user.id);
      if (!coord) return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);
      const ownerMusician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!ownerMusician) return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, groupId),
      });
      if (!group) return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      if (group.createdBy !== ownerMusician.id) {
        return c.json({ ok: false, error: 'No puedes confirmar un grupo de otro coordinador' }, 403);
      }
      if (group.status !== 'forming') {
        return c.json({ ok: false, error: 'Este grupo ya no está en formación' }, 409);
      }

      const [updated] = await db
        .update(tables.serenataGroups)
        .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(tables.serenataGroups.id, groupId))
        .returning();
      if (!updated) return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      return c.json({ ok: true, group: updated });
    } catch (error) {
      console.error('[serenatas/groups] confirm error:', error);
      return c.json({ ok: false, error: 'Error al confirmar grupo' }, 500);
    }
  });

  // POST /coordinators - Crear perfil de coordinador
  app.post('/coordinators', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const parsed = createCoordinatorProfileSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          { ok: false, error: 'Datos inválidos', details: parsed.error.flatten() },
          400
        );
      }

      const existing = await service.getCoordinatorProfileByUserId(user.id);
      if (existing) {
        return c.json({ ok: false, error: 'Ya tienes perfil de coordinador' }, 400);
      }

      const profile = await service.createCoordinatorProfile(user.id, parsed.data);

      return c.json({ ok: true, profile }, 201);
    } catch (error) {
      console.error('[serenatas/coordinators] Error creating:', error);
      return c.json({ ok: false, error: 'Error al crear perfil' }, 500);
    }
  });

  // PATCH /coordinators/me - Actualizar perfil
  app.patch('/coordinators/me', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const profile = await service.updateCoordinatorProfile(user.id, body);
      return c.json({ ok: true, profile });
    } catch (error) {
      console.error('[serenatas/coordinators] Error updating:', error);
      return c.json({ ok: false, error: 'Error al actualizar perfil' }, 500);
    }
  });

  // GET /coordinators/me/stats - Estadísticas del coordinador
  app.get('/coordinators/me/stats', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Perfil coordinador del usuario autenticado
      const profile = await service.getCoordinatorProfileByUserId(user.id);
      if (!profile) {
        return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
      }

      // Agregados desde serenatas asignadas
      const stats = await service.getCoordinatorStats(profile.id);
      return c.json({ ok: true, stats });
    } catch (error) {
      console.error('[serenatas/coordinators/stats] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener estadísticas' }, 500);
    }
  });

  // GET /stats/coordinator - Alias para dashboard coordinador
  app.get('/stats/coordinator', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const profile = await service.getCoordinatorProfileByUserId(user.id);
      if (!profile) {
        return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
      }
      const stats = await service.getCoordinatorStats(profile.id);
      return c.json({ ok: true, stats });
    } catch (error) {
      console.error('[serenatas/stats/coordinator] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener estadísticas' }, 500);
    }
  });

  // POST /coordinators/match - Encontrar coordinadores disponibles
  app.post('/coordinators/match', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const { comuna, date, time, budget } = body;

      if (!comuna || !date || !time) {
        return c.json({ ok: false, error: 'Faltan datos requeridos' }, 400);
      }

      const coordinators = await service.findMatchingCoordinators({
        comuna,
        date,
        time,
        budget: budget || 150,
      });

      return c.json({ ok: true, coordinators });
    } catch (error) {
      console.error('[serenatas/coordinators/match] Error:', error);
      return c.json({ ok: false, error: 'Error al buscar coordinadores' }, 500);
    }
  });

  // GET /coordinators/available — mismo criterio que POST /coordinators/match (query: comuna, date, time, budget)
  app.get('/coordinators/available', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const comuna = c.req.query('comuna');
      const date = c.req.query('date');
      const time = c.req.query('time');
      const budgetRaw = c.req.query('budget');
      const budget = budgetRaw ? Number(budgetRaw) : 150;

      if (!comuna || !date || !time) {
        return c.json({ ok: false, error: 'Faltan datos requeridos (comuna, date, time)' }, 400);
      }

      const coordinators = await service.findMatchingCoordinators({
        comuna,
        date,
        time,
        budget: Number.isFinite(budget) && budget > 0 ? budget : 150,
      });

      return c.json({ ok: true, coordinators });
    } catch (error) {
      console.error('[serenatas/coordinators/available] Error:', error);
      return c.json({ ok: false, error: 'Error al buscar coordinadores' }, 500);
    }
  });

  // ========== SERENATAS ==========

  // GET /requests
  // - Sin query / `mine=true`: solicitudes del usuario como cliente (`clientId` = yo).
  // - `assignedToMe=true`: todas las serenatas asignadas al coordinador (cualquier estado; filtros en el cliente).
  app.get('/requests', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const assignedToMe = c.req.query('assignedToMe') === 'true';
      if (assignedToMe) {
        const profile = await service.getCoordinatorProfileByUserId(user.id);
        if (!profile) {
          return c.json({ ok: false, error: 'Perfil de coordinador no encontrado' }, 404);
        }
        const all = await service.getAssignedSerenatasForCoordinator(user.id);
        return c.json({ ok: true, serenatas: (all || []).map(mapSerenataForApi) });
      }

      const serenatas = (await service.getSerenatasByClient(user.id)).map(mapSerenataForApi);
      return c.json({ ok: true, serenatas });
    } catch (error) {
      console.error('[serenatas/requests] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener solicitudes' }, 500);
    }
  });

  // POST /requests - Crear solicitud (cliente). Persiste en tabla `serenatas`.
  app.post('/requests', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const parsed = createSerenataSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          {
            ok: false,
            error: 'Datos inválidos. Revisa fecha, hora, dirección y tipo de evento.',
            details: parsed.error.flatten(),
          },
          400
        );
      }

      const data = parsed.data;
      const capture = data.capturedByCoordinator === true;
      const coordForCapture = capture
        ? await service.getCoordinatorProfileByUserId(user.id)
        : null;
      if (capture && !coordForCapture) {
        return c.json(
          { ok: false, error: 'Solo un coordinador puede registrar una serenata captada directamente' },
          403
        );
      }
      if (
        capture &&
        data.coordinatorId &&
        data.coordinatorId !== coordForCapture!.id
      ) {
        return c.json(
          { ok: false, error: 'En captura directa el coordinador debe ser tu perfil' },
          400
        );
      }

      let latitude = data.latitude;
      let longitude = data.longitude;
      const needsGeo =
        (latitude == null || longitude == null) &&
        typeof data.address === 'string' &&
        data.address.trim().length > 0;

      if (needsGeo) {
        const g = await geocodeChileAddress({
          address: data.address,
          city: data.city,
          region: data.region,
        });
        if (g) {
          latitude = g.lat;
          longitude = g.lng;
        }
      }

      const serenata = await service.createSerenata(user.id, {
        ...data,
        source: capture ? 'own_lead' : 'platform_lead',
        latitude,
        longitude,
        coordinatorId: capture ? coordForCapture!.id : data.coordinatorId,
        capturedByCoordinator: capture,
      });

      if (serenata.coordinatorProfileId && !capture) {
        const [coord] = await db
          .select({ userId: tables.serenataCoordinatorProfiles.userId })
          .from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
          .limit(1);
        if (coord?.userId) {
          await notifySafe(db, tables, {
            userId: coord.userId,
            type: 'serenata',
            title: 'Nueva solicitud de serenata',
            message: 'Un cliente solicitó una serenata contigo. Revisa la solicitud.',
            data: { serenataId: serenata.id },
          });
          fireSerenataPush(deps, coord.userId, {
            title: 'Nueva solicitud de serenata',
            message: 'Un cliente solicitó una serenata contigo. Abre Solicitudes.',
            url: '/solicitudes',
          });
        }
      }

      return c.json({ ok: true, serenata: mapSerenataForApi(serenata) }, 201);
    } catch (error) {
      console.error('[serenatas/requests] Error creating:', error);
      return c.json({ ok: false, error: 'Error al crear solicitud' }, 500);
    }
  });

  // GET /requests/:id — alias de detalle (misma autorización que GET /:id)
  app.get('/requests/:id', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const rawId = c.req.param('id');
      if (!rawId || !UUID_RE.test(rawId)) {
        return c.json({ ok: false, error: 'ID inválido' }, 400);
      }
      const serenataId = rawId;

      const [row] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!row) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const isOwner = row.clientId === user.id;
      const isAdmin = user.role === 'admin';

      let coordProfile: any = null;
      if (row.coordinatorProfileId) {
        [coordProfile] = await db
          .select()
          .from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.id, row.coordinatorProfileId))
          .limit(1);
      }

      const isAssignedCoordinator = coordProfile?.userId === user.id;

      let isMusicianInLineup = false;
      if (!isOwner && !isAdmin && !isAssignedCoordinator && tables.serenataMusicianLineup) {
        const musicianRow = await db.query.serenataMusicians.findFirst({
          where: eq(tables.serenataMusicians.userId, user.id),
        });
        if (musicianRow) {
          const [lineupRow] = await db
            .select({ id: tables.serenataMusicianLineup.id })
            .from(tables.serenataMusicianLineup)
            .where(
              and(
                eq(tables.serenataMusicianLineup.serenataId, serenataId),
                eq(tables.serenataMusicianLineup.musicianId, musicianRow.id)
              )
            )
            .limit(1);
          isMusicianInLineup = !!lineupRow;
        }
      }

      if (!isOwner && !isAdmin && !isAssignedCoordinator && !isMusicianInLineup) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      let coordinatorName: string | undefined;
      let coordinatorPhone: string | undefined;
      if (coordProfile?.userId) {
        const [u] = await db
          .select({ name: tables.users.name, phone: tables.users.phone })
          .from(tables.users)
          .where(eq(tables.users.id, coordProfile.userId))
          .limit(1);
        coordinatorName = u?.name ?? undefined;
        coordinatorPhone = u?.phone ?? undefined;
      }

      const serenata = {
        ...mapSerenataForApi(row),
        coordinatorId: row.coordinatorProfileId,
        coordinatorLat: row.latitude,
        coordinatorLng: row.longitude,
        coordinatorLocationUpdatedAt: row.updatedAt,
        coordinatorName,
        coordinatorPhone,
      };

      delete (serenata as Record<string, unknown>).coordinatorProfileId;

      return c.json({ ok: true, serenata });
    } catch (error) {
      console.error('[serenatas/requests/:id] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener serenata' }, 500);
    }
  });

  // PATCH /requests/:id — edición por coordinador asignado (estados editables)
  app.patch('/requests/:id', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const rawPatchId = c.req.param('id');
      if (!rawPatchId || !UUID_RE.test(rawPatchId)) {
        return c.json({ ok: false, error: 'ID inválido' }, 400);
      }
      const serenataId = rawPatchId;

      const raw = await c.req.json().catch(() => null);
      const parsed = patchSerenataCoordinatorSchema.safeParse(raw ?? {});
      if (!parsed.success) {
        return c.json(
          { ok: false, error: 'Datos inválidos', details: parsed.error.flatten() },
          400
        );
      }

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const isAdmin = user.role === 'admin';
      const actorCoord = await getActorCoordinatorProfile(user);
      const isAssignedCoordinator =
        !!actorCoord &&
        !!serenata.coordinatorProfileId &&
        serenata.coordinatorProfileId === actorCoord.id;

      if (!isAdmin && !isAssignedCoordinator) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const editable = ['pending', 'quoted', 'accepted', 'payment_pending', 'confirmed'];
      if (!editable.includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede editar una serenata en estado ${serenata.status}` },
          409
        );
      }

      const p = parsed.data;

      let resolvedLatitude: string | null | undefined = undefined;
      let resolvedLongitude: string | null | undefined = undefined;

      const coordExplicit = p.latitude !== undefined || p.longitude !== undefined;
      const locationTouched =
        p.address !== undefined || p.city !== undefined || p.region !== undefined;

      if (!coordExplicit && locationTouched) {
        const addr = String(p.address ?? serenata.address ?? '').trim();
        if (addr) {
          const g = await geocodeChileAddress({
            address: addr,
            city: (p.city !== undefined ? p.city : serenata.city) ?? undefined,
            region: (p.region !== undefined ? p.region : serenata.region) ?? undefined,
          });
          if (g) {
            resolvedLatitude = String(g.lat);
            resolvedLongitude = String(g.lng);
          } else {
            resolvedLatitude = null;
            resolvedLongitude = null;
          }
        }
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (p.clientName !== undefined) updates.clientName = p.clientName;
      if (p.clientPhone !== undefined) updates.clientPhone = p.clientPhone;
      if (p.clientEmail !== undefined) updates.clientEmail = p.clientEmail;
      if (p.eventType !== undefined) updates.eventType = p.eventType;
      if (p.eventDate !== undefined) updates.eventDate = p.eventDate;
      if (p.eventTime !== undefined) updates.eventTime = p.eventTime;
      if (p.duration !== undefined) updates.duration = p.duration;
      if (p.address !== undefined) updates.address = p.address;
      if (p.city !== undefined) updates.city = p.city;
      if (p.region !== undefined) updates.region = p.region;
      if (p.latitude !== undefined) {
        updates.latitude =
          p.latitude === null ? null : String(p.latitude);
      } else if (resolvedLatitude !== undefined) {
        updates.latitude = resolvedLatitude;
      }
      if (p.longitude !== undefined) {
        updates.longitude =
          p.longitude === null ? null : String(p.longitude);
      } else if (resolvedLongitude !== undefined) {
        updates.longitude = resolvedLongitude;
      }
      if (p.recipientName !== undefined) updates.recipientName = p.recipientName;
      if (p.recipientRelation !== undefined) updates.recipientRelation = p.recipientRelation;
      if (p.message !== undefined) updates.message = p.message;
      if (p.songRequests !== undefined) updates.songRequests = p.songRequests;
      if (p.price !== undefined) updates.price = p.price;

      const [updated] = await db
        .update(tables.serenatas)
        .set(updates as any)
        .where(eq(tables.serenatas.id, serenataId))
        .returning();

      return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
    } catch (error) {
      console.error('[serenatas/requests PATCH] Error:', error);
      return c.json({ ok: false, error: 'Error al actualizar serenata' }, 500);
    }
  });

  // POST /requests/:id/complete — alias de check-out / marcar completada (coordinador)
  app.post('/requests/:id/complete', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const rawCompleteId = c.req.param('id');
      if (!rawCompleteId || !UUID_RE.test(rawCompleteId)) {
        return c.json({ ok: false, error: 'ID inválido' }, 400);
      }
      const serenataId = rawCompleteId;

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const [coordProfile] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      if (!coordProfile || serenata.coordinatorProfileId !== coordProfile.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      await db
        .update(tables.serenatas)
        .set({
          status: 'completed',
          completedAt: new Date(),
          coordinatorDepartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.serenatas.id, serenataId));

      let releasedPaymentId: string | null = null;
      try {
        const [holdingPayment] = await db
          .select({ id: tables.serenataPayments.id, status: tables.serenataPayments.status })
          .from(tables.serenataPayments)
          .where(
            and(
              eq(tables.serenataPayments.serenataId, serenataId),
              eq(tables.serenataPayments.status, 'holding')
            )
          )
          .limit(1);

        if (holdingPayment) {
          await db
            .update(tables.serenataPayments)
            .set({
              status: 'released',
              releasedToCoordinatorAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tables.serenataPayments.id, holdingPayment.id));
          releasedPaymentId = holdingPayment.id;
        }
      } catch (releaseError) {
        console.warn('[serenatas/requests/complete] release payment:', releaseError);
      }

      await notifySafe(db, tables, {
        userId: serenata.clientId,
        type: 'serenata',
        title: 'Serenata completada',
        message: 'El coordinador ha finalizado la serenata. ¡Deja tu review!',
        data: { serenataId },
      });

      const appUrl = APP_URL_FOR_EMAIL();
      const reviewUrl = appUrl ? `${appUrl}/review/${serenataId}` : '';
      await sendMailSafe(
        db,
        tables,
        serenata.clientId,
        '¡Tu serenata está completa!',
        `El coordinador finalizó la serenata #${serenataId.slice(0, 8)}.\nNos encantaría escuchar cómo estuvo. Deja tu review${reviewUrl ? ` aquí: ${reviewUrl}` : ' desde la app'}.`
      );

      const [after] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      return c.json({
        ok: true,
        message: 'Serenata marcada como completada',
        releasedPaymentId,
        serenata: after ? mapSerenataForApi(after) : undefined,
      });
    } catch (error) {
      console.error('[serenatas/requests/complete] Error:', error);
      return c.json({ ok: false, error: 'Error al completar serenata' }, 500);
    }
  });

  // POST /requests/:id/cancel — cliente, coordinador asignado o admin
  app.post('/requests/:id/cancel', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const rawCancelReqId = c.req.param('id');
      if (!rawCancelReqId || !UUID_RE.test(rawCancelReqId)) {
        return c.json({ ok: false, error: 'ID inválido' }, 400);
      }
      const serenataId = rawCancelReqId;

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      const [coordProfileReqCancel] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);
      const isAssignedCoordinator =
        !!coordProfileReqCancel &&
        !!serenata.coordinatorProfileId &&
        serenata.coordinatorProfileId === coordProfileReqCancel.id;

      if (!isAdmin && !isOwner && !isAssignedCoordinator) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      if (['completed', 'cancelled'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede cancelar en estado ${serenata.status}` },
          409
        );
      }

      const [updated] = await db
        .update(tables.serenatas)
        .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(tables.serenatas.id, serenataId))
        .returning();

      if (isOwner && serenata.coordinatorProfileId) {
        try {
          const [coord] = await db
            .select({ userId: tables.serenataCoordinatorProfiles.userId })
            .from(tables.serenataCoordinatorProfiles)
            .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
            .limit(1);
          if (coord?.userId) {
            await notifySafe(db, tables, {
              userId: coord.userId,
              type: 'serenata',
              title: 'Serenata cancelada',
              message: 'El cliente canceló la serenata.',
              data: { serenataId },
            });
          }
        } catch (notifyErr) {
          console.warn('[serenatas/requests/cancel] notify coord failed:', notifyErr);
        }
      } else if (isAssignedCoordinator || isAdmin) {
        await notifySafe(db, tables, {
          userId: serenata.clientId,
          type: 'serenata',
          title: 'Serenata cancelada',
          message: 'El coordinador canceló la serenata.',
          data: { serenataId },
        });
      }

      return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
    } catch (error) {
      console.error('[serenatas/requests/cancel] Error:', error);
      return c.json({ ok: false, error: 'Error al cancelar serenata' }, 500);
    }
  });

  // GET /requests/my/assigned
  // - Coordinador: serenatas (tabla nueva) asignadas a su perfil.
  // - Músico: serenatas (tabla nueva) en las que está en el lineup.
  // Devuelve solo las que están en estados activos (no completed/cancelled).
  // Query opcionales:
  // - ?date=YYYY-MM-DD
  // - ?week=YYYY-WW
  app.get('/requests/my/assigned', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const ACTIVE_SERENATA_STATUSES = [
        'pending',
        'quoted',
        'accepted',
        'payment_pending',
        'confirmed',
        'in_progress',
      ];
      const qDate = c.req.query('date');
      const qWeek = c.req.query('week');
      const dayFilter = parseIsoDateOnly(qDate);
      const weekRange = parseIsoWeekRange(qWeek);

      const coordProfile = await db.query.serenataCoordinatorProfiles.findFirst({
        where: eq(tables.serenataCoordinatorProfiles.userId, user.id),
      });

      const inRequestedRange = (serenataRow: any): boolean => {
        if (!dayFilter && !weekRange) return true;
        const d = parseIsoDateOnly(serenataDatePart(serenataRow.eventDate));
        if (!d) return false;
        if (dayFilter) return d.toISOString().slice(0, 10) === dayFilter.toISOString().slice(0, 10);
        if (weekRange) return d >= weekRange.start && d <= weekRange.end;
        return true;
      };

      if (coordProfile) {
        const all = await service.getAssignedSerenatasForCoordinator(user.id);
        const serenatas = (all || []).filter((s: any) =>
          ACTIVE_SERENATA_STATUSES.includes(s.status) && inRequestedRange(s)
        ).map(mapSerenataForApi);
        return c.json({ ok: true, serenatas });
      }

      const lineupResults: any[] = [];

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (musician && tables.serenataMusicianLineup) {
        try {
          const lineup = await db.query.serenataMusicianLineup.findMany({
            where: eq(tables.serenataMusicianLineup.musicianId, musician.id),
            with: { serenata: true },
          });
          lineupResults.push(
            ...lineup
              .filter(
                (row: any) =>
                  row.status === 'accepted' &&
                  row.serenata &&
                  ACTIVE_SERENATA_STATUSES.includes(row.serenata.status) &&
                  inRequestedRange(row.serenata)
              )
              .map((row: any) => ({
                ...mapSerenataForApi(row.serenata),
                lineupId: row.id,
                _origin: 'serenatas',
              }))
          );
        } catch (err) {
          console.warn('[serenatas/requests] lineup lookup failed', err);
        }
      }

      if (!musician) {
        return c.json({ ok: true, serenatas: [] });
      }

      return c.json({ ok: true, serenatas: lineupResults });
    } catch (error) {
      console.error('[serenatas/requests] Error getting assigned serenatas:', error);
      return c.json({ ok: false, error: 'Error al obtener serenatas asignadas' }, 500);
    }
  });

  // POST /requests/:requestId/assign-to-group — líder de cuadrilla asigna solicitud legacy a un grupo
  app.post('/requests/:requestId/assign-to-group', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const requestId = c.req.param('requestId');
      const body = await c.req.json().catch(() => null);
      const groupId = body?.groupId as string | undefined;

      if (!groupId) {
        return c.json({ ok: false, error: 'Se requiere groupId' }, 400);
      }

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, groupId),
      });

      if (!group) {
        return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      }

      if (!musician || group.groupLeadMusicianId !== musician.id) {
        return c.json({ ok: false, error: 'Solo el líder del grupo puede asignar solicitudes' }, 403);
      }

      const request = await db.query.serenatas.findFirst({
        where: eq(tables.serenatas.id, requestId),
      });

      if (!request) {
        return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      }

      if (request.status !== 'pending') {
        return c.json({ ok: false, error: 'La solicitud ya ha sido asignada' }, 409);
      }

      const [assignment] = await db.insert(tables.serenataAssignments).values({
        serenataId: requestId,
        groupId,
        status: 'confirmed',
      }).returning();

      await db.update(tables.serenatas)
        .set({ status: 'assigned', updatedAt: new Date() })
        .where(eq(tables.serenatas.id, requestId));

      return c.json({ ok: true, assignment }, 201);
    } catch (error) {
      console.error('[serenatas/requests] Error assigning request:', error);
      return c.json({ ok: false, error: 'Error al asignar solicitud' }, 500);
    }
  });

  /**
   * Serenatas pendientes sin coordinador asignado, listas para que un coordinador
   * las "tome". Devuelve datos normalizados al mismo shape que `Solicitud` del
   * frontend para que `/solicitudes` pueda fusionar resultados.
   * Solo usuarios con perfil de coordinador.
   */
  app.get('/available/for-pickup', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const isAdmin = user.role === 'admin';
      const coordProfile = await db.query.serenataCoordinatorProfiles.findFirst({
        where: eq(tables.serenataCoordinatorProfiles.userId, user.id),
      });
      if (!coordProfile && !isAdmin) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      const rows = await db.query.serenatas.findMany({
        where: and(
          eq(tables.serenatas.status, 'pending'),
          sql`${tables.serenatas.coordinatorProfileId} IS NULL`,
          gte(tables.serenatas.eventDate, today)
        ),
        limit,
        orderBy: [asc(tables.serenatas.eventDate), asc(tables.serenatas.eventTime)],
      });

      const requests = rows.map((r: any) => {
        const mapped = mapSerenataForApi(r);
        const dateTime = mapped.dateTime;
        const hoursUntil = (new Date(dateTime).getTime() - now.getTime()) / (1000 * 60 * 60);
        return {
          ...mapped,
          dateTime,
          urgency: hoursUntil <= 24 ? 'urgent' : 'normal',
          price: r.price ? String(r.price) : '0',
          requiredInstruments: [] as string[],
          message: r.message || '',
          distance: 0,
          source: 'serenatas' as const,
        };
      });

      return c.json({ ok: true, requests });
    } catch (error) {
      console.error('[serenatas/available/for-pickup] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener serenatas disponibles' }, 500);
    }
  });

  // Solicitudes urgentes
  app.get('/requests/urgent/list', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const requests = await db.query.serenatas.findMany({
        where: and(
          eq(tables.serenatas.status, 'confirmed'),
          gte(tables.serenatas.eventDate, today),
          lte(tables.serenatas.eventDate, tomorrow)
        ),
        limit,
        orderBy: [asc(tables.serenatas.eventDate), asc(tables.serenatas.eventTime)],
      });

      const requestsWithDistance = requests.map((r: any) => ({
        ...mapSerenataForApi(r),
        urgency: 'urgent',
        distance: 0,
        requiredInstruments: [],
      }));

      return c.json({ ok: true, requests: requestsWithDistance });
    } catch (error) {
      console.error('[serenatas/requests] Error getting urgent requests:', error);
      return c.json({ ok: false, error: 'Error al obtener solicitudes urgentes' }, 500);
    }
  });

  // Solicitudes disponibles para el músico
  app.get('/requests/available/for-musician', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Find musician profile
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      const lineupRows = await db.query.serenataMusicianLineup.findMany({
        where: and(
          eq(tables.serenataMusicianLineup.musicianId, musician.id),
          eq(tables.serenataMusicianLineup.status, 'invited')
        ),
        with: { serenata: true },
        limit: 20,
        orderBy: [desc(tables.serenataMusicianLineup.invitedAt)],
      });

      const requestsWithDetails = lineupRows
        .filter((row: any) => row.serenata && !['completed', 'cancelled', 'rejected'].includes(row.serenata.status))
        .map((row: any) => ({
          ...mapSerenataForApi(row.serenata),
          lineupId: row.id,
          urgency: 'normal',
          distance: 0,
          requiredInstruments: [],
        }));

      return c.json({ ok: true, requests: requestsWithDetails });
    } catch (error) {
      console.error('[serenatas/requests] Error getting available requests:', error);
      return c.json({ ok: false, error: 'Error al obtener solicitudes disponibles' }, 500);
    }
  });

  // Aceptar solicitud. Flujo activo: `serenatas`; fallback legacy: `serenata_requests`.
  app.post('/requests/:id/accept', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const requestId = c.req.param('id');
      const body = (await c.req.json().catch(() => ({}))) as {
        price?: number;
        requiresUpfrontPayment?: boolean;
      };

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, requestId))
        .limit(1);

      if (serenata) {
        const isAdmin = user.role === 'admin';
        const actorCoord = await getActorCoordinatorProfile(user);
        const isAssignedCoordinator =
          actorCoord && serenata.coordinatorProfileId === actorCoord.id;
        const canCoordinate = isAdmin || actorCoord;

        if (!canCoordinate) {
          return c.json({ ok: false, error: 'Solo un coordinador puede aceptar solicitudes de clientes' }, 403);
        }

        if (
          serenata.coordinatorProfileId &&
          actorCoord &&
          serenata.coordinatorProfileId !== actorCoord.id &&
          !isAdmin
        ) {
          return c.json({ ok: false, error: 'La serenata ya tiene otro coordinador asignado' }, 409);
        }

        if (!['pending', 'quoted', 'accepted', 'payment_pending'].includes(serenata.status)) {
          return c.json({ ok: false, error: `No se puede aceptar en estado ${serenata.status}` }, 409);
        }

        const acceptedPrice =
          typeof body.price === 'number' && body.price > 0 ? Math.round(body.price) : serenata.price;
        const requiresPayment = body.requiresUpfrontPayment === true;
        const nextStatus = requiresPayment && acceptedPrice ? 'payment_pending' : 'accepted';

        const [updated] = await db
          .update(tables.serenatas)
          .set({
            coordinatorProfileId: serenata.coordinatorProfileId ?? actorCoord?.id ?? null,
            price: acceptedPrice ?? null,
            status: nextStatus,
            acceptedAt: serenata.acceptedAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tables.serenatas.id, requestId))
          .returning();

        await notifySafe(db, tables, {
          userId: serenata.clientId,
          type: 'serenata',
          title: requiresPayment ? 'Serenata aceptada: pago pendiente' : 'Serenata aceptada',
          message: requiresPayment
            ? 'Tu solicitud fue aceptada. Realiza el pago para dejarla confirmada.'
            : 'Tu solicitud fue aceptada. El coordinador continuará con la organización.',
          data: { serenataId: requestId },
        });

        return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
      }

      // Find musician profile
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      const request = await db.query.serenatas.findFirst({
        where: eq(tables.serenatas.id, requestId),
      });

      if (!request) {
        return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      }

      if (request.status !== 'pending') {
        return c.json({ ok: false, error: 'La solicitud ya no está disponible' }, 409);
      }

      // Check if musician already has a group on the same calendar day (join → group.date)
      const eventDateTime = new Date(`${request.eventDate}T${request.eventTime}`);
      const existingRows = await db
        .select({ groupId: tables.serenataGroupMembers.groupId })
        .from(tables.serenataGroupMembers)
        .innerJoin(
          tables.serenataGroups,
          eq(tables.serenataGroupMembers.groupId, tables.serenataGroups.id)
        )
        .where(
          and(
            eq(tables.serenataGroupMembers.musicianId, musician.id),
            sql`${tables.serenataGroups.date}::date = ${eventDateTime}::timestamp::date`
          )
        )
        .limit(1);

      let groupId: string;

      if (existingRows.length > 0) {
        groupId = existingRows[0].groupId;
      } else {
        // Nuevo grupo con este músico como líder (groupLeadMusicianId)
        const [group] = await db.insert(tables.serenataGroups).values({
          name: `Grupo ${eventDateTime.toLocaleDateString('es-CL')}`,
          date: eventDateTime,
          createdBy: musician.id,
          groupLeadMusicianId: musician.id,
          status: 'forming',
        }).returning();
        groupId = group.id;

        // Add musician as member
        await db.insert(tables.serenataGroupMembers).values({
          groupId,
          musicianId: musician.id,
          role: 'coordinator',
        });
      }

      // Nueva asignación grupo ↔ solicitud
      await db.insert(tables.serenataAssignments).values({
        serenataId: requestId,
        groupId,
        status: 'confirmed',
      });

      // Update request status
      await db.update(tables.serenatas)
        .set({ status: 'assigned', updatedAt: new Date() })
        .where(eq(tables.serenatas.id, requestId));

      return c.json({ ok: true, message: 'Solicitud aceptada' });
    } catch (error) {
      console.error('[serenatas/requests] Error accepting request:', error);
      return c.json({ ok: false, error: 'Error al aceptar solicitud' }, 500);
    }
  });

  // Rechazar solicitud. Flujo activo: `serenatas`; fallback legacy: registrar descarte.
  app.post('/requests/:id/decline', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const requestId = c.req.param('id');
      const body = await c.req.json().catch(() => ({ reason: '' }));

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, requestId))
        .limit(1);

      if (serenata) {
        const isAdmin = user.role === 'admin';
        const actorCoord = await getActorCoordinatorProfile(user);
        const isAssignedCoordinator =
          actorCoord && serenata.coordinatorProfileId === actorCoord.id;
        const canReject = isAdmin || isAssignedCoordinator || (!serenata.coordinatorProfileId && actorCoord);

        if (!canReject) {
          return c.json({ ok: false, error: 'No autorizado para rechazar esta solicitud' }, 403);
        }

        if (!['pending', 'quoted', 'accepted', 'payment_pending'].includes(serenata.status)) {
          return c.json({ ok: false, error: `No se puede rechazar en estado ${serenata.status}` }, 409);
        }

        const [updated] = await db
          .update(tables.serenatas)
          .set({
            coordinatorProfileId: serenata.coordinatorProfileId ?? actorCoord?.id ?? null,
            status: 'rejected',
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tables.serenatas.id, requestId))
          .returning();

        await notifySafe(db, tables, {
          userId: serenata.clientId,
          type: 'serenata',
          title: 'Serenata rechazada',
          message: body?.reason
            ? `Tu solicitud fue rechazada. Motivo: ${body.reason}`
            : 'Tu solicitud fue rechazada por el coordinador.',
          data: { serenataId: requestId },
        });

        return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
      }

      // Log the decline (could be stored in a separate table for analytics)
      console.log(`[serenatas/requests] Musician ${user.id} declined request ${requestId}. Reason: ${body.reason || 'No reason provided'}`);

      // Optionally, track declines to avoid showing the same request repeatedly
      return c.json({ ok: true, message: 'Solicitud rechazada' });
    } catch (error) {
      console.error('[serenatas/requests] Error declining request:', error);
      return c.json({ ok: false, error: 'Error al rechazar solicitud' }, 500);
    }
  });

  // Músicos compatibles con una solicitud (para líderes de grupo)
  app.get('/requests/:id/matches', requireAuth, async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const requestId = c.req.param('id');

      const [newSerenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, requestId))
        .limit(1);

      if (newSerenata) {
        const musicians = await db.query.serenataMusicians.findMany({
          where: and(
            eq(tables.serenataMusicians.status, 'active'),
            eq(tables.serenataMusicians.isAvailable, true)
          ),
          with: {
            user: {
              columns: { id: true, name: true, avatarUrl: true, phone: true },
            },
          },
          limit: 20,
        });

        const matches = musicians
          .map((m: any) => ({
            ...m,
            distance:
              newSerenata.latitude && newSerenata.longitude && m.lat && m.lng
                ? calculateDistance(
                    parseFloat(newSerenata.latitude as string),
                    parseFloat(newSerenata.longitude as string),
                    parseFloat(m.lat as string),
                    parseFloat(m.lng as string)
                  )
                : 0,
            score: Number(m.rating ?? 5) * 20 + (m.completedSerenatas || 0),
          }))
          .sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));

        return c.json({ ok: true, matches, requiredInstruments: [] });
      }

      // Solicitud en tabla serenatas
      const request = await db.query.serenatas.findFirst({
        where: eq(tables.serenatas.id, requestId),
      });

      if (!request) {
        return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      }

      // Instrumentos requeridos vs perfil del músico
      const requiredInstruments = request.requiredInstruments || ['voz', 'guitarra'];

      // Find available musicians matching requirements
      const now = new Date();
      const musicians = await db.query.serenataMusicians.findMany({
        where: and(
          eq(tables.serenataMusicians.status, 'active'),
          eq(tables.serenataMusicians.isAvailable, true),
          inArray(tables.serenataMusicians.instrument, requiredInstruments as string[])
        ),
        with: {
          user: {
            columns: { id: true, name: true, avatarUrl: true, phone: true },
          },
        },
        limit: 20,
      });

      // Calculate distance and score for each musician
      const matches = musicians.map((m: any) => ({
        ...m,
        distance: request.latitude && request.longitude && m.lat && m.lng
          ? calculateDistance(
              parseFloat(request.latitude as string),
              parseFloat(request.longitude as string),
              parseFloat(m.lat as string),
              parseFloat(m.lng as string)
            )
          : Math.round(Math.random() * 15 + 1), // Mock distance
        score: m.rating * 20 + (m.completedSerenatas || 0), // Simple scoring
      })).sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));

      return c.json({ ok: true, matches, requiredInstruments });
    } catch (error) {
      console.error('[serenatas/requests] Error finding matches:', error);
      return c.json({ ok: false, error: 'Error al encontrar coincidencias' }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ========== PAYMENTS & FINANCIAL ==========
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /payments/subscription — activar suscripción coordinador (solo desarrollo sin MP).
   * Con Mercado Pago configurado, usar checkout + confirm.
   */
  app.post('/payments/subscription', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const amount = COORDINATOR_MONTHLY_PRICE_CLP;
      const targetPlan = COORDINATOR_SUBSCRIPTION_PLAN;
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const [existing] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      if (isMercadoPagoConfigured() && amount > 0) {
        return c.json(
          {
            ok: false,
            error:
              'El pago de la suscripción se realiza con Mercado Pago: usa POST /payments/subscription/checkout y POST /payments/subscription/mercadopago/confirm.',
            code: 'USE_MERCADOPAGO_CHECKOUT',
          },
          400
        );
      }

      const coordinatorPatch = {
        subscriptionPlan: targetPlan,
        subscriptionStatus: 'active' as const,
        subscriptionStartedAt: existing?.subscriptionStartedAt ?? new Date(),
        subscriptionEndsAt: periodEnd,
        updatedAt: new Date(),
      };

      let profileId: string | undefined = existing?.id;
      if (!existing) {
        const [created] = await db
          .insert(tables.serenataCoordinatorProfiles)
          .values({
            userId: user.id,
            ...coordinatorPatch,
          })
          .returning({ id: tables.serenataCoordinatorProfiles.id });
        profileId = created?.id;
      } else {
        await db
          .update(tables.serenataCoordinatorProfiles)
          .set(coordinatorPatch)
          .where(eq(tables.serenataCoordinatorProfiles.userId, user.id));
        profileId = existing.id;
      }

      if (profileId) {
        await grantCoordinatorRoleForProfile(profileId);
      }

      return c.json({
        ok: true,
        plan: targetPlan,
        amount,
        periodEndsAt: periodEnd.toISOString(),
        coordinatorActive: true,
        message: 'Suscripción coordinador registrada (simulada, sin Mercado Pago).',
      });
    } catch (error) {
      console.error('[serenatas/payments/subscription] Error:', error);
      return c.json({ ok: false, error: 'Error al procesar pago' }, 500);
    }
  });

  /**
   * Crea preferencia Checkout Pro para una suscripción mensual coordinador.
   * Pre-crea `serenataSubscriptions` (status pending) + `serenataSubscriptionPayments`
   * (status pending) y devuelve `redirectUrl`.
   */
  app.post('/payments/subscription/checkout', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      if (!isMercadoPagoConfigured()) {
        return c.json(
          {
            ok: false,
            error: 'Mercado Pago no está configurado en el servidor',
            code: 'MERCADOPAGO_NOT_CONFIGURED',
          },
          503
        );
      }

      const origin = getSerenatasPublicOrigin();
      if (!origin) {
        return c.json(
          {
            ok: false,
            error:
              'Falta MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS (o SERENATAS_APP_URL) para las URLs de retorno.',
            code: 'MISSING_SERENATAS_PUBLIC_ORIGIN',
          },
          503
        );
      }

      const plan = COORDINATOR_SUBSCRIPTION_PLAN;
      const amount = COORDINATOR_MONTHLY_PRICE_CLP;

      const [existingProfile] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      let coordinatorProfile = existingProfile;
      if (!coordinatorProfile) {
        const [created] = await db
          .insert(tables.serenataCoordinatorProfiles)
          .values({
            userId: user.id,
            subscriptionPlan: plan,
            subscriptionStatus: 'paused',
            subscriptionStartedAt: new Date(),
          })
          .returning();
        coordinatorProfile = created;
      }
      if (!coordinatorProfile) {
        return c.json({ ok: false, error: 'No se pudo crear el perfil coordinador' }, 500);
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [subscription] = await db
        .insert(tables.serenataSubscriptions)
        .values({
          coordinatorProfileId: coordinatorProfile.id,
          plan,
          priceMonthly: amount,
          currency: 'CLP',
          status: 'active',
          startedAt: now,
          endsAt: periodEnd,
        })
        .returning();
      if (!subscription) {
        return c.json({ ok: false, error: 'No se pudo crear la suscripción' }, 500);
      }

      const [pendingPayment] = await db
        .insert(tables.serenataSubscriptionPayments)
        .values({
          subscriptionId: subscription.id,
          coordinatorProfileId: coordinatorProfile.id,
          amount,
          currency: 'CLP',
          status: 'pending',
          periodStart: now,
          periodEnd,
        })
        .returning();
      if (!pendingPayment) {
        return c.json({ ok: false, error: 'No se pudo registrar el pago' }, 500);
      }

      const [payer] = await db
        .select({ email: tables.users.email, name: tables.users.name })
        .from(tables.users)
        .where(eq(tables.users.id, user.id))
        .limit(1);
      const payerEmail =
        typeof payer?.email === 'string' && payer.email.includes('@')
          ? payer.email
          : `coordinador+${user.id.slice(0, 8)}@simple.invalid`;

      const externalReference = `${SERENATA_SUB_MP_REF_PREFIX}${pendingPayment.id}`;
      const subscriptionBase = `${origin}/suscripcion`;
      const notificationUrl = getSerenataMpNotificationUrl();

      const pref = await createCheckoutPreference({
        externalReference,
        title: 'Suscripción coordinador SimpleSerenatas',
        description: 'Suscripción mensual — panel completo de coordinador',
        amount,
        currencyId: 'CLP',
        payerEmail,
        payerName: typeof payer?.name === 'string' ? payer.name : undefined,
        backUrls: {
          success: `${subscriptionBase}?mp_return=success`,
          failure: `${subscriptionBase}?mp_return=failure`,
          pending: `${subscriptionBase}?mp_return=pending`,
        },
        metadata: {
          plan,
          subscriptionId: subscription.id,
          subscriptionPaymentId: pendingPayment.id,
          vertical: 'serenatas',
          kind: 'coordinator_subscription',
        },
        ...(notificationUrl ? { notificationUrl } : {}),
      });

      const redirectUrl = pref.initPoint ?? pref.sandboxInitPoint;
      if (!redirectUrl) {
        return c.json({ ok: false, error: 'Mercado Pago no devolvió URL de pago' }, 502);
      }

      return c.json({
        ok: true,
        preferenceId: pref.id,
        redirectUrl,
        subscriptionId: subscription.id,
        subscriptionPaymentId: pendingPayment.id,
        plan,
        amount,
        sandboxInitPoint: pref.sandboxInitPoint,
        initPoint: pref.initPoint,
      });
    } catch (error) {
      console.error('[serenatas/payments/subscription/checkout] Error:', error);
      const message = error instanceof Error ? error.message : 'Error al crear checkout';
      return c.json({ ok: false, error: message }, 500);
    }
  });

  /** Tras volver de Checkout Pro: confirma el pago de la suscripción. */
  app.post('/payments/subscription/mercadopago/confirm', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      if (!isMercadoPagoConfigured()) {
        return c.json({ ok: false, error: 'Mercado Pago no está configurado' }, 503);
      }

      const body = (await c.req.json().catch(() => ({}))) as {
        paymentId?: string;
        subscriptionPaymentId?: string;
      };
      const paymentId = body.paymentId?.trim();
      const subscriptionPaymentId = body.subscriptionPaymentId?.trim();
      if (!paymentId || !subscriptionPaymentId) {
        return c.json(
          { ok: false, error: 'Faltan paymentId / subscriptionPaymentId' },
          400
        );
      }

      const [pendingPayment] = await db
        .select()
        .from(tables.serenataSubscriptionPayments)
        .where(eq(tables.serenataSubscriptionPayments.id, subscriptionPaymentId))
        .limit(1);
      if (!pendingPayment) {
        return c.json({ ok: false, error: 'Pago de suscripción no encontrado' }, 404);
      }

      const [coordinator] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(
          eq(tables.serenataCoordinatorProfiles.id, pendingPayment.coordinatorProfileId)
        )
        .limit(1);
      const isAdmin = user.role === 'admin';
      if (!isAdmin && coordinator?.userId !== user.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      let mpPayment: Record<string, unknown>;
      try {
        mpPayment = await getPaymentById(paymentId);
      } catch (e) {
        console.error('[serenatas/subscription mp confirm] getPayment:', e);
        return c.json({ ok: false, error: 'No se pudo verificar el pago en Mercado Pago' }, 502);
      }

      const status = String(mpPayment.status ?? '');
      if (status === 'pending' || status === 'in_process' || status === 'in_mediation') {
        return c.json({ ok: true, pending: true, message: 'Pago en proceso' });
      }
      if (status !== 'approved') {
        return c.json(
          { ok: false, error: `Pago no aprobado (${status})`, mercadoPagoStatus: status },
          400
        );
      }

      const fin = await finalizeCoordinatorSubscriptionPayment(
        subscriptionPaymentId,
        paymentId,
        mpPayment
      );
      if (!fin.ok) {
        return c.json({ ok: false, error: fin.error }, fin.httpStatus as 400 | 404 | 409);
      }

      return c.json({
        ok: true,
        alreadyPaid: fin.alreadyPaid === true,
        payment: fin.payment,
        subscription: fin.subscription,
      });
    } catch (error) {
      console.error('[serenatas/payments/subscription/mercadopago/confirm] Error:', error);
      return c.json({ ok: false, error: 'Error al confirmar pago' }, 500);
    }
  });

  /**
   * Crea un `preapproval` (suscripción recurrente Mercado Pago) para el plan
   * coordinador y devuelve `init_point` para autorización del usuario.
   *
   * Una vez autorizada, MP cobrará automáticamente cada mes y notificará
   * los cobros vía webhook (`topic=subscription_authorized_payment`).
   */
  app.post('/payments/subscription/preapproval', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      if (!isMercadoPagoConfigured()) {
        return c.json(
          { ok: false, error: 'Mercado Pago no está configurado', code: 'MERCADOPAGO_NOT_CONFIGURED' },
          503
        );
      }

      const origin = getSerenatasPublicOrigin();
      if (!origin) {
        return c.json(
          {
            ok: false,
            error: 'Falta MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS para back_url',
            code: 'MISSING_SERENATAS_PUBLIC_ORIGIN',
          },
          503
        );
      }

      const plan = COORDINATOR_SUBSCRIPTION_PLAN;
      const amount = COORDINATOR_MONTHLY_PRICE_CLP;

      const [existingProfile] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      let coordinatorProfile = existingProfile;
      if (!coordinatorProfile) {
        const [created] = await db
          .insert(tables.serenataCoordinatorProfiles)
          .values({
            userId: user.id,
            subscriptionPlan: plan,
            subscriptionStatus: 'paused',
            subscriptionStartedAt: new Date(),
          })
          .returning();
        coordinatorProfile = created;
      }
      if (!coordinatorProfile) {
        return c.json({ ok: false, error: 'No se pudo crear el perfil coordinador' }, 500);
      }

      const [payer] = await db
        .select({ email: tables.users.email })
        .from(tables.users)
        .where(eq(tables.users.id, user.id))
        .limit(1);
      if (!payer?.email || !payer.email.includes('@')) {
        return c.json(
          { ok: false, error: 'Necesitas un email válido para suscribirte' },
          400
        );
      }

      const externalReference = `serenata_preapproval:${coordinatorProfile.id}:${plan}`;

      const pre = await createPreapproval({
        externalReference,
        reason: 'SimpleSerenatas — suscripción coordinador',
        amount,
        currencyId: 'CLP',
        payerEmail: payer.email,
        backUrl: `${origin}/suscripcion?mp_preapproval=return`,
      });

      const [preRow] = await db
        .insert(tables.serenataCoordinatorPreapprovals)
        .values({
          coordinatorProfileId: coordinatorProfile.id,
          externalId: pre.id,
          plan,
          amount,
          currency: 'CLP',
          status: pre.status === 'authorized' ? 'authorized' : 'pending',
          payerEmail: payer.email,
        })
        .returning();

      return c.json({
        ok: true,
        preapprovalId: pre.id,
        redirectUrl: pre.initPoint,
        plan,
        amount,
        record: preRow ?? null,
      });
    } catch (error) {
      console.error('[serenatas/payments/subscription/preapproval] Error:', error);
      const message = error instanceof Error ? error.message : 'Error al crear preapproval';
      return c.json({ ok: false, error: message }, 500);
    }
  });

  /**
   * Sincroniza el estado de un preapproval contra Mercado Pago.
   * Llamado por el frontend al volver de `back_url` y opcionalmente desde el webhook.
   */
  app.post('/payments/subscription/preapproval/sync', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      if (!isMercadoPagoConfigured()) {
        return c.json({ ok: false, error: 'Mercado Pago no está configurado' }, 503);
      }

      const body = (await c.req.json().catch(() => ({}))) as { preapprovalId?: string };
      const preapprovalId = body.preapprovalId?.trim();
      if (!preapprovalId) {
        return c.json({ ok: false, error: 'Falta preapprovalId' }, 400);
      }

      const [row] = await db
        .select()
        .from(tables.serenataCoordinatorPreapprovals)
        .where(eq(tables.serenataCoordinatorPreapprovals.externalId, preapprovalId))
        .limit(1);
      if (!row) {
        return c.json({ ok: false, error: 'Preapproval no encontrado' }, 404);
      }

      const [coord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.id, row.coordinatorProfileId))
        .limit(1);
      const isAdmin = user.role === 'admin';
      if (!isAdmin && coord?.userId !== user.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      let mpPre: Record<string, unknown>;
      try {
        mpPre = await getPreapprovalById(preapprovalId);
      } catch (e) {
        console.error('[serenatas/preapproval/sync] getPreapproval:', e);
        return c.json({ ok: false, error: 'No se pudo verificar en Mercado Pago' }, 502);
      }

      const mpStatus = String(mpPre.status ?? '');
      const newStatus =
        mpStatus === 'authorized'
          ? 'authorized'
          : mpStatus === 'paused'
            ? 'paused'
            : mpStatus === 'cancelled'
              ? 'cancelled'
              : 'pending';

      const updates: Record<string, unknown> = {
        status: newStatus,
        updatedAt: new Date(),
      };
      if (newStatus === 'authorized' && !row.startedAt) updates.startedAt = new Date();
      if (newStatus === 'cancelled' && !row.cancelledAt) updates.cancelledAt = new Date();

      await db
        .update(tables.serenataCoordinatorPreapprovals)
        .set(updates)
        .where(eq(tables.serenataCoordinatorPreapprovals.id, row.id));

      if (newStatus === 'authorized' && coord) {
        await db
          .update(tables.serenataCoordinatorProfiles)
          .set({
            subscriptionPlan: COORDINATOR_SUBSCRIPTION_PLAN,
            subscriptionStatus: 'active',
            subscriptionStartedAt: coord.subscriptionStartedAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tables.serenataCoordinatorProfiles.id, coord.id));
        await grantCoordinatorRoleForProfile(coord.id);
      } else if (newStatus === 'cancelled' && coord) {
        await db
          .update(tables.serenataCoordinatorProfiles)
          .set({
            subscriptionStatus: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(tables.serenataCoordinatorProfiles.id, coord.id));
      }

      return c.json({
        ok: true,
        status: newStatus,
        mercadoPagoStatus: mpStatus,
      });
    } catch (error) {
      console.error('[serenatas/payments/subscription/preapproval/sync] Error:', error);
      return c.json({ ok: false, error: 'Error al sincronizar preapproval' }, 500);
    }
  });

  /**
   * IPN Mercado Pago: confirma pago cuando el estado pasa a `approved`.
   *
   * Pasos:
   *   1. Persistir el evento crudo en `serenata_mp_webhook_events`.
   *   2. Validar la firma `x-signature` si `MERCADO_PAGO_WEBHOOK_SECRET` está configurado.
   *   3. Obtener el recurso real con `getPaymentById(resourceId)`.
   *   4. Despachar según prefijo de `external_reference`.
   *
   * Devuelve siempre `200` para que MP no reintente indefinidamente; los errores
   * quedan registrados en la tabla de auditoría con su `note`.
   */
  app.post('/webhooks/mercadopago', async (c) => {
    const xSignature = c.req.header('x-signature') ?? c.req.header('X-Signature') ?? null;
    const xRequestId = c.req.header('x-request-id') ?? c.req.header('X-Request-Id') ?? null;

    let body: Record<string, unknown> = {};
    try {
      body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const bodyData = (body.data ?? {}) as Record<string, unknown>;
    const topic =
      c.req.query('topic') ?? c.req.query('type') ?? String(body.type ?? body.topic ?? '');
    const resourceId =
      c.req.query('id') ?? c.req.query('data.id') ?? String(bodyData.id ?? body.id ?? '');

    let auditId: string | null = null;
    try {
      const [audit] = await db
        .insert(tables.serenataMpWebhookEvents)
        .values({
          topic: topic || null,
          resourceId: resourceId || null,
          status: 'received',
          headers: { 'x-signature': xSignature, 'x-request-id': xRequestId },
          payload: body,
        })
        .returning({ id: tables.serenataMpWebhookEvents.id });
      auditId = audit?.id ?? null;
    } catch (auditError) {
      console.warn('[serenatas/mp webhook] No se pudo registrar evento:', auditError);
    }

    const markAudit = async (
      status: 'processed' | 'ignored' | 'invalid_signature' | 'error',
      note?: string,
      externalReference?: string
    ) => {
      if (!auditId) return;
      try {
        await db
          .update(tables.serenataMpWebhookEvents)
          .set({
            status,
            note: note ?? null,
            externalReference: externalReference ?? null,
            processedAt: new Date(),
          })
          .where(eq(tables.serenataMpWebhookEvents.id, auditId));
      } catch (e) {
        console.warn('[serenatas/mp webhook] update audit failed:', e);
      }
    };

    try {
      if (!isMercadoPagoConfigured()) {
        await markAudit('ignored', 'mercadopago_not_configured');
        return c.json({ ok: true });
      }

      const sigCheck = verifyMercadoPagoWebhookSignature({
        xSignature,
        xRequestId,
        dataId: resourceId,
      });
      if (sigCheck === false) {
        await markAudit('invalid_signature', 'x-signature mismatch');
        return c.json({ ok: false, error: 'Invalid signature' }, 401);
      }

      if (!resourceId) {
        await markAudit('ignored', 'no_resource_id');
        return c.json({ ok: true });
      }

      // Topic `preapproval`: actualiza el estado de la suscripción recurrente.
      if (topic === 'preapproval') {
        try {
          const mpPre = await getPreapprovalById(String(resourceId));
          const mpStatus = String(mpPre.status ?? '');
          const newStatus =
            mpStatus === 'authorized'
              ? 'authorized'
              : mpStatus === 'paused'
                ? 'paused'
                : mpStatus === 'cancelled'
                  ? 'cancelled'
                  : 'pending';
          const [row] = await db
            .select()
            .from(tables.serenataCoordinatorPreapprovals)
            .where(eq(tables.serenataCoordinatorPreapprovals.externalId, String(resourceId)))
            .limit(1);
          if (row) {
            const updates: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
            if (newStatus === 'authorized' && !row.startedAt) updates.startedAt = new Date();
            if (newStatus === 'cancelled' && !row.cancelledAt) updates.cancelledAt = new Date();
            await db
              .update(tables.serenataCoordinatorPreapprovals)
              .set(updates)
              .where(eq(tables.serenataCoordinatorPreapprovals.id, row.id));
            const [coord] = await db
              .select()
              .from(tables.serenataCoordinatorProfiles)
              .where(eq(tables.serenataCoordinatorProfiles.id, row.coordinatorProfileId))
              .limit(1);
            if (coord) {
              await db
                .update(tables.serenataCoordinatorProfiles)
                .set({
                  ...(newStatus === 'authorized'
                    ? {
                        subscriptionStatus: 'active',
                        subscriptionPlan: COORDINATOR_SUBSCRIPTION_PLAN,
                      }
                    : newStatus === 'cancelled'
                      ? { subscriptionStatus: 'cancelled' }
                      : newStatus === 'paused'
                        ? { subscriptionStatus: 'paused' }
                        : {}),
                  updatedAt: new Date(),
                })
                .where(eq(tables.serenataCoordinatorProfiles.id, coord.id));
              if (newStatus === 'authorized') {
                await grantCoordinatorRoleForProfile(coord.id);
              }
            }
            await markAudit('processed', `preapproval_status=${mpStatus}`);
          } else {
            await markAudit('ignored', 'preapproval_not_found_local');
          }
        } catch (e) {
          await markAudit(
            'error',
            `preapproval_lookup_failed: ${e instanceof Error ? e.message : String(e)}`
          );
        }
        return c.json({ ok: true });
      }

      // Topic `subscription_authorized_payment`: cobro recurrente. MP envía un id de
      // authorized_payment; lo registramos en `serenata_subscription_payments` para
      // historial y extendemos `subscription.endsAt` un mes.
      if (topic === 'subscription_authorized_payment' || topic === 'authorized_payment') {
        try {
          const externalRefRaw = String(body.external_reference ?? bodyData.external_reference ?? '');
          // Buscamos preapproval por external_reference primero, luego por id.
          const [preRow] = externalRefRaw
            ? await db
                .select()
                .from(tables.serenataCoordinatorPreapprovals)
                .where(
                  eq(
                    tables.serenataCoordinatorPreapprovals.externalId,
                    String(bodyData.preapproval_id ?? body.preapproval_id ?? '')
                  )
                )
                .limit(1)
            : [];
          if (!preRow) {
            await markAudit('ignored', 'recurring_payment_no_preapproval');
            return c.json({ ok: true });
          }
          const [activeSub] = await db
            .select()
            .from(tables.serenataSubscriptions)
            .where(
              and(
                eq(tables.serenataSubscriptions.coordinatorProfileId, preRow.coordinatorProfileId),
                eq(tables.serenataSubscriptions.status, 'active')
              )
            )
            .orderBy(desc(tables.serenataSubscriptions.startedAt))
            .limit(1);
          let subscriptionId = activeSub?.id;
          if (!subscriptionId) {
            const [created] = await db
              .insert(tables.serenataSubscriptions)
              .values({
                coordinatorProfileId: preRow.coordinatorProfileId,
                plan: COORDINATOR_SUBSCRIPTION_PLAN,
                priceMonthly: preRow.amount,
                currency: preRow.currency,
                status: 'active',
                startedAt: new Date(),
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                externalSubscriptionId: preRow.externalId,
              })
              .returning({ id: tables.serenataSubscriptions.id });
            subscriptionId = created?.id;
          } else {
            await db
              .update(tables.serenataSubscriptions)
              .set({
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
              })
              .where(eq(tables.serenataSubscriptions.id, subscriptionId));
          }
          if (subscriptionId) {
            const now = new Date();
            await db.insert(tables.serenataSubscriptionPayments).values({
              subscriptionId,
              coordinatorProfileId: preRow.coordinatorProfileId,
              amount: preRow.amount,
              currency: preRow.currency,
              status: 'succeeded',
              periodStart: now,
              periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              externalPaymentId: String(resourceId),
              paidAt: now,
            });
            await db
              .update(tables.serenataCoordinatorProfiles)
              .set({
                subscriptionStatus: 'active',
                subscriptionPlan: COORDINATOR_SUBSCRIPTION_PLAN,
                subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
              })
              .where(
                eq(tables.serenataCoordinatorProfiles.id, preRow.coordinatorProfileId)
              );
            await grantCoordinatorRoleForProfile(preRow.coordinatorProfileId);
            await markAudit('processed', 'recurring_payment_recorded', preRow.externalId);
          } else {
            await markAudit('error', 'subscription_create_failed');
          }
        } catch (e) {
          await markAudit(
            'error',
            `recurring_payment_failed: ${e instanceof Error ? e.message : String(e)}`
          );
        }
        return c.json({ ok: true });
      }

      if (topic !== 'payment') {
        await markAudit('ignored', `topic=${topic || 'none'}`);
        return c.json({ ok: true });
      }

      let mpPayment: Record<string, unknown>;
      try {
        mpPayment = await getPaymentById(String(resourceId));
      } catch (e) {
        await markAudit(
          'error',
          `getPayment failed: ${e instanceof Error ? e.message : String(e)}`
        );
        return c.json({ ok: true });
      }

      const status = String(mpPayment.status ?? '');
      if (status !== 'approved') {
        await markAudit('ignored', `payment_status=${status || 'unknown'}`);
        return c.json({ ok: true });
      }

      const externalRef = mpPayment.external_reference;
      const externalRefStr = typeof externalRef === 'string' ? externalRef : undefined;

      const serenataId = parseSerenataIdFromMpExternalRef(externalRef);
      if (serenataId) {
        const fin = await finalizeSerenataMercadoPagoPayment(
          serenataId,
          String(resourceId),
          mpPayment
        );
        if (!fin.ok) {
          await markAudit('error', `finalize_serenata: ${fin.error}`, externalRefStr);
        } else {
          await markAudit(
            'processed',
            fin.alreadyPaid ? 'serenata_already_paid' : 'serenata_paid',
            externalRefStr
          );
        }
        return c.json({ ok: true });
      }

      const subscriptionPaymentId =
        parseCoordinatorSubscriptionPaymentIdFromMpExternalRef(externalRef);
      if (subscriptionPaymentId) {
        const fin = await finalizeCoordinatorSubscriptionPayment(
          subscriptionPaymentId,
          String(resourceId),
          mpPayment
        );
        if (!fin.ok) {
          await markAudit('error', `finalize_subscription: ${fin.error}`, externalRefStr);
        } else {
          await markAudit(
            'processed',
            fin.alreadyPaid ? 'subscription_already_paid' : 'subscription_paid',
            externalRefStr
          );
        }
        return c.json({ ok: true });
      }

      await markAudit(
        'ignored',
        `unknown_external_reference=${externalRefStr ?? 'none'}`,
        externalRefStr
      );
      return c.json({ ok: true });
    } catch (e) {
      console.error('[serenatas/mp webhook] Error:', e);
      await markAudit('error', e instanceof Error ? e.message : String(e));
      return c.json({ ok: true });
    }
  });

  /**
   * Crea preferencia Checkout Pro y devuelve URL de redirección (`init_point`).
   * Requiere `MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS` (o `SERENATAS_APP_URL`) para `back_urls`.
   */
  app.post('/payments/serenata/:id/checkout', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      if (!isMercadoPagoConfigured()) {
        return c.json(
          {
            ok: false,
            error: 'Mercado Pago no está configurado en el servidor',
            code: 'MERCADOPAGO_NOT_CONFIGURED',
          },
          503
        );
      }

      const serenataId = c.req.param('id');
      const body = (await c.req.json().catch(() => ({}))) as {
        price?: number;
        requiresUpfrontPayment?: boolean;
      };
      if (!serenataId) return c.json({ ok: false, error: 'Falta id de serenata' }, 400);

      const origin = getSerenatasPublicOrigin();
      if (!origin) {
        return c.json(
          {
            ok: false,
            error:
              'Falta MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS (o SERENATAS_APP_URL) en la API para las URLs de retorno.',
            code: 'MISSING_SERENATAS_PUBLIC_ORIGIN',
          },
          503
        );
      }

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      if (!isAdmin && !isOwner) return c.json({ ok: false, error: 'No autorizado' }, 403);

      if (!serenata.coordinatorProfileId) {
        return c.json({ ok: false, error: 'La serenata aún no tiene coordinador' }, 400);
      }
      if (!serenata.price || serenata.price <= 0) {
        return c.json({ ok: false, error: 'La serenata no tiene precio acordado' }, 400);
      }
      if (!['accepted', 'payment_pending', 'quoted', 'confirmed'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede pagar en estado ${serenata.status}` },
          409
        );
      }

      const [existing] = await db
        .select()
        .from(tables.serenataPayments)
        .where(
          and(
            eq(tables.serenataPayments.serenataId, serenataId),
            inArray(tables.serenataPayments.status, ['pending', 'holding', 'released'])
          )
        )
        .limit(1);
      if (existing) {
        return c.json({
          ok: true,
          alreadyPaid: true,
          payment: existing,
        });
      }

      const [payer] = await db
        .select({ email: tables.users.email, name: tables.users.name })
        .from(tables.users)
        .where(eq(tables.users.id, serenata.clientId))
        .limit(1);
      const payerEmail =
        typeof payer?.email === 'string' && payer.email.includes('@')
          ? payer.email
          : `cliente+${serenata.clientId.slice(0, 8)}@simple.invalid`;

      const externalReference = `${SERENATA_MP_REF_PREFIX}${serenataId}`;
      const trackingBase = `${origin}/tracking/${serenataId}`;
      const notificationUrl = getSerenataMpNotificationUrl();

      const pref = await createCheckoutPreference({
        externalReference,
        title: `Serenata ${serenataId.slice(0, 8)}`,
        description: 'Pago serenata Simple',
        amount: serenata.price,
        currencyId: 'CLP',
        payerEmail,
        payerName: typeof payer?.name === 'string' ? payer.name : undefined,
        backUrls: {
          success: `${trackingBase}?mp_return=success`,
          failure: `${trackingBase}?mp_return=failure`,
          pending: `${trackingBase}?mp_return=pending`,
        },
        metadata: { serenataId, vertical: 'serenatas' },
        ...(notificationUrl ? { notificationUrl } : {}),
      });

      const redirectUrl = pref.initPoint ?? pref.sandboxInitPoint;
      if (!redirectUrl) {
        return c.json({ ok: false, error: 'Mercado Pago no devolvió URL de pago' }, 502);
      }

      return c.json({
        ok: true,
        preferenceId: pref.id,
        redirectUrl,
        sandboxInitPoint: pref.sandboxInitPoint,
        initPoint: pref.initPoint,
      });
    } catch (error) {
      console.error('[serenatas/payments/checkout] Error:', error);
      const message = error instanceof Error ? error.message : 'Error al crear checkout';
      return c.json({ ok: false, error: message }, 500);
    }
  });

  /** Tras volver de Checkout Pro: valida el pago en la API de Mercado Pago y registra escrow. */
  app.post('/payments/serenata/:id/mercadopago/confirm', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      if (!isMercadoPagoConfigured()) {
        return c.json({ ok: false, error: 'Mercado Pago no está configurado' }, 503);
      }

      const serenataId = c.req.param('id');
      if (!serenataId) return c.json({ ok: false, error: 'Falta id de serenata' }, 400);

      const body = (await c.req.json().catch(() => ({}))) as { paymentId?: string };
      const paymentId = body.paymentId?.trim();
      if (!paymentId) {
        return c.json({ ok: false, error: 'Falta paymentId' }, 400);
      }

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      if (!isAdmin && !isOwner) return c.json({ ok: false, error: 'No autorizado' }, 403);

      let mpPayment: Record<string, unknown>;
      try {
        mpPayment = await getPaymentById(paymentId);
      } catch (e) {
        console.error('[serenatas/mp confirm] getPayment:', e);
        return c.json({ ok: false, error: 'No se pudo verificar el pago en Mercado Pago' }, 502);
      }

      const status = String(mpPayment.status ?? '');
      if (status === 'pending' || status === 'in_process' || status === 'in_mediation') {
        return c.json({ ok: true, pending: true, message: 'Pago en proceso' });
      }
      if (status !== 'approved') {
        return c.json(
          { ok: false, error: `Pago no aprobado (${status})`, mercadoPagoStatus: status },
          400
        );
      }

      const fin = await finalizeSerenataMercadoPagoPayment(serenataId, paymentId, mpPayment);
      if (!fin.ok) {
        return c.json({ ok: false, error: fin.error }, fin.httpStatus as 400 | 404 | 409);
      }

      return c.json({
        ok: true,
        alreadyPaid: fin.alreadyPaid === true,
        payment: fin.payment,
        breakdown: fin.breakdown,
      });
    } catch (error) {
      console.error('[serenatas/payments/mercadopago/confirm] Error:', error);
      return c.json({ ok: false, error: 'Error al confirmar pago' }, 500);
    }
  });

  /**
   * Cliente paga la serenata. Crea un `serenata_payments` en estado `holding`
   * (escrow) y mueve la serenata a `confirmed`. La comisión se calcula
   * automáticamente según `source` (8 % + IVA para `platform_*`).
   *
   * Idempotente: si ya hay un pago no rechazado/devuelto para la serenata,
   * devuelve ese pago sin crear otro.
   *
   * Si Mercado Pago está configurado (`MERCADO_PAGO_ACCESS_TOKEN`), este
   * endpoint queda deshabilitado: usa `POST .../checkout` y `.../mercadopago/confirm`.
   */
  app.post('/payments/serenata/:id', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      if (isMercadoPagoConfigured()) {
        return c.json(
          {
            ok: false,
            error:
              'El pago se realiza con Mercado Pago: crea una preferencia con POST .../payments/serenata/:id/checkout y confirma con POST .../payments/serenata/:id/mercadopago/confirm.',
            code: 'USE_MERCADOPAGO_CHECKOUT',
          },
          400
        );
      }

      const serenataId = c.req.param('id');
      const body = (await c.req.json().catch(() => ({}))) as {
        paymentMethod?: string;
        externalPaymentId?: string;
      };

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      if (!isAdmin && !isOwner) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const coordinatorProfileId = serenata.coordinatorProfileId;
      if (!coordinatorProfileId) {
        return c.json({ ok: false, error: 'La serenata aún no tiene coordinador' }, 400);
      }

      if (!serenata.price || serenata.price <= 0) {
        return c.json({ ok: false, error: 'La serenata no tiene precio acordado' }, 400);
      }

      if (!['accepted', 'payment_pending', 'quoted', 'confirmed'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede pagar en estado ${serenata.status}` },
          409
        );
      }

      // Idempotencia: existe pago vivo (no refunded) → devolver ese.
      const [existing] = await db
        .select()
        .from(tables.serenataPayments)
        .where(
          and(
            eq(tables.serenataPayments.serenataId, serenataId),
            inArray(tables.serenataPayments.status, ['pending', 'holding', 'released'])
          )
        )
        .limit(1);

      if (existing) {
        return c.json({
          ok: true,
          alreadyPaid: true,
          payment: existing,
        });
      }

      const totalAmount = serenata.price;
      const fees = computeSerenataPlatformFees(totalAmount, serenata.source);

      const [payment] = await db
        .insert(tables.serenataPayments)
        .values({
          serenataId,
          clientId: serenata.clientId,
          coordinatorProfileId,
          totalAmount,
          platformCommission: fees.platformCommission,
          commissionVat: fees.commissionVat,
          coordinatorEarnings: fees.coordinatorEarnings,
          currency: 'CLP',
          status: 'holding',
          clientPaidAt: new Date(),
          externalPaymentId: body?.externalPaymentId,
          updatedAt: new Date(),
        })
        .returning();

      // Pasar serenata a confirmed si todavía no lo está.
      if (serenata.status !== 'confirmed') {
        await db
          .update(tables.serenatas)
          .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
          .where(eq(tables.serenatas.id, serenataId));
      }

      // Notificar al coordinador
      try {
        const [coord] = await db
          .select({ userId: tables.serenataCoordinatorProfiles.userId })
          .from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.id, coordinatorProfileId))
          .limit(1);
        if (coord?.userId) {
          await notifySafe(db, tables, {
            userId: coord.userId,
            type: 'payment',
            title: 'Pago confirmado',
            message: 'El cliente pagó la serenata. Ya puedes coordinar el evento.',
            data: { serenataId },
          });
        }
      } catch (notifError) {
        console.warn('[serenatas/payments] Notification failed:', notifError);
      }

      return c.json({
        ok: true,
        payment,
        breakdown: {
          totalAmount,
          platformCommission: fees.platformCommission,
          commissionVat: fees.commissionVat,
          coordinatorEarnings: fees.coordinatorEarnings,
          source: serenata.source,
        },
      });
    } catch (error) {
      console.error('[serenatas/payments/serenata] Error:', error);
      return c.json({ ok: false, error: 'Error al procesar pago' }, 500);
    }
  });

  /**
   * Libera el pago en escrow al coordinador. Sólo después de `completed`.
   * - Coordinador asignado, admin, o auto-llamado al hacer checkout.
   * - Idempotente: si ya está `released`, devuelve ese estado.
   */
  app.post('/payments/serenata/:id/release', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      const body = (await c.req.json().catch(() => ({}))) as {
        price?: number;
        requiresUpfrontPayment?: boolean;
      };

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const [actorCoord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      const isAssignedCoord =
        actorCoord && serenata.coordinatorProfileId === actorCoord.id;

      if (!isAdmin && !isAssignedCoord) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      if (serenata.status !== 'completed') {
        return c.json(
          { ok: false, error: 'La serenata debe estar completada antes de liberar el pago' },
          409
        );
      }

      const [payment] = await db
        .select()
        .from(tables.serenataPayments)
        .where(eq(tables.serenataPayments.serenataId, serenataId))
        .orderBy(desc(tables.serenataPayments.createdAt))
        .limit(1);

      if (!payment) {
        return c.json({ ok: false, error: 'No hay pago registrado para la serenata' }, 404);
      }

      if (payment.status === 'released') {
        return c.json({ ok: true, payment, alreadyReleased: true });
      }

      if (payment.status !== 'holding') {
        return c.json(
          { ok: false, error: `El pago está en estado ${payment.status}; no se puede liberar` },
          409
        );
      }

      const [updated] = await db
        .update(tables.serenataPayments)
        .set({
          status: 'released',
          releasedToCoordinatorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataPayments.id, payment.id))
        .returning();

      return c.json({ ok: true, payment: updated });
    } catch (error) {
      console.error('[serenatas/payments/release] Error:', error);
      return c.json({ ok: false, error: 'Error al liberar pago' }, 500);
    }
  });

  /**
   * Reembolsa el pago. Solo admin (o el cliente si la serenata fue cancelada antes del check-in).
   * Cambia status a `refunded` y deja la serenata en `cancelled` si seguía activa.
   */
  app.post('/payments/serenata/:id/refund', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      const body = (await c.req.json().catch(() => ({}))) as {
        price?: number;
        requiresUpfrontPayment?: boolean;
      };

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      if (!isAdmin && !(isOwner && serenata.status === 'cancelled')) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const [payment] = await db
        .select()
        .from(tables.serenataPayments)
        .where(eq(tables.serenataPayments.serenataId, serenataId))
        .orderBy(desc(tables.serenataPayments.createdAt))
        .limit(1);
      if (!payment) {
        return c.json({ ok: false, error: 'No hay pago registrado' }, 404);
      }

      if (payment.status === 'refunded') {
        return c.json({ ok: true, payment, alreadyRefunded: true });
      }

      if (payment.status === 'released') {
        return c.json(
          { ok: false, error: 'El pago ya fue liberado al coordinador' },
          409
        );
      }

      let mpRefundId: string | null = null;
      let mpRefundError: string | null = null;
      const externalPaymentId =
        typeof payment.externalPaymentId === 'string' && payment.externalPaymentId.trim().length > 0
          ? payment.externalPaymentId
          : null;

      if (externalPaymentId && isMercadoPagoConfigured()) {
        try {
          const refund = await refundPayment({
            paymentId: externalPaymentId,
            idempotencyKey: `serenata-refund:${payment.id}`,
          });
          mpRefundId =
            typeof refund?.id === 'string' || typeof refund?.id === 'number'
              ? String(refund.id)
              : null;
        } catch (refundError) {
          mpRefundError =
            refundError instanceof Error ? refundError.message : String(refundError);
          console.error('[serenatas/payments/refund] MP refund failed:', refundError);
          return c.json(
            {
              ok: false,
              error: `No se pudo reembolsar en Mercado Pago: ${mpRefundError}`,
              code: 'MP_REFUND_FAILED',
            },
            502
          );
        }
      }

      const [updated] = await db
        .update(tables.serenataPayments)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
          updatedAt: new Date(),
          ...(mpRefundId ? { externalTransferId: mpRefundId } : {}),
        })
        .where(eq(tables.serenataPayments.id, payment.id))
        .returning();

      try {
        const refundMessage = externalPaymentId
          ? 'Tu reembolso fue procesado en Mercado Pago. Puede tardar 24–48 horas en reflejarse.'
          : 'Tu pago fue marcado como reembolsado.';
        await notifySafe(db, tables, {
          userId: payment.clientId,
          type: 'payment',
          title: 'Reembolso procesado',
          message: refundMessage,
          data: { serenataId, paymentId: payment.id, mpRefundId },
        });
        await sendMailSafe(
          db,
          tables,
          payment.clientId,
          'Reembolso de serenata',
          `${refundMessage}\nMonto: $${payment.totalAmount.toLocaleString('es-CL')} ${payment.currency}.\nReferencia: ${payment.id}`
        );
      } catch (notifError) {
        console.warn('[serenatas/refund] notify failed:', notifError);
      }

      return c.json({
        ok: true,
        payment: updated,
        mercadoPago: externalPaymentId
          ? { refundId: mpRefundId, originalPaymentId: externalPaymentId }
          : null,
      });
    } catch (error) {
      console.error('[serenatas/payments/refund] Error:', error);
      return c.json({ ok: false, error: 'Error al reembolsar pago' }, 500);
    }
  });

  /**
   * Resumen del pago de una serenata (cliente, coordinador o admin).
   * Devuelve `null` si no hay pago todavía y el `breakdown` proyectado
   * según el precio acordado.
   */
  app.get('/payments/serenata/:id', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      const [actorCoord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);
      const isAssignedCoord =
        actorCoord && serenata.coordinatorProfileId === actorCoord.id;

      if (!isAdmin && !isOwner && !isAssignedCoord) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const [payment] = await db
        .select()
        .from(tables.serenataPayments)
        .where(eq(tables.serenataPayments.serenataId, serenataId))
        .orderBy(desc(tables.serenataPayments.createdAt))
        .limit(1);

      const projected = computeSerenataPlatformFees(
        serenata.price ?? 0,
        serenata.source
      );

      return c.json({
        ok: true,
        mercadoPagoConfigured: isMercadoPagoConfigured(),
        payment: payment ?? null,
        projected: {
          totalAmount: serenata.price ?? 0,
          ...projected,
          source: serenata.source,
        },
      });
    } catch (error) {
      console.error('[serenatas/payments/summary] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener resumen de pago' }, 500);
    }
  });

  // GET /coordinators/me/finances - Dashboard financiero
  app.get('/coordinators/me/finances', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Perfil coordinador del usuario autenticado
      const [coordProfile] = await db.select().from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      if (!coordProfile) {
        return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
      }

      // Pagos del coordinador (todos los activos: holding + released)
      const payments = await db
        .select()
        .from(tables.serenataPayments)
        .where(
          and(
            eq(tables.serenataPayments.coordinatorProfileId, coordProfile.id),
            inArray(tables.serenataPayments.status, ['holding', 'released'])
          )
        );

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const releasedPayments = payments.filter(
        (p: { status: string }) => p.status === 'released'
      );
      const holdingPayments = payments.filter(
        (p: { status: string }) => p.status === 'holding'
      );
      const thisMonthReleased = releasedPayments.filter(
        (p: { updatedAt: Date }) => new Date(p.updatedAt) >= startOfMonth
      );

      const sumEarnings = (rows: Array<{ coordinatorEarnings: number | null }>) =>
        rows.reduce((sum, p) => sum + (p.coordinatorEarnings || 0), 0);

      const finances = {
        /** Liberados al coordinador (cobrables / cobrados). */
        totalEarnings: sumEarnings(releasedPayments),
        thisMonthEarnings: sumEarnings(thisMonthReleased),
        totalPlatformFees: payments.reduce(
          (sum: number, p: { platformCommission: number | null; commissionVat: number | null }) =>
            sum + (p.platformCommission || 0) + (p.commissionVat || 0),
          0
        ),
        /** En custodia (cliente pagó pero serenata aún no se liberó). */
        pendingEarnings: sumEarnings(holdingPayments),
        completedSerenatas: releasedPayments.length,
        averagePerSerenata:
          releasedPayments.length > 0
            ? sumEarnings(releasedPayments) / releasedPayments.length
            : 0,
        subscription: {
          plan: coordProfile.subscriptionPlan,
          active: isCoordinatorSubscriptionActive(coordProfile),
          /** Comisión sobre leads de plataforma: 8% + IVA (no aplica a serenatas own_lead). */
          platformLeadCommission: '8% + IVA',
          expiresAt: coordProfile.subscriptionEndsAt,
        },
      };

      return c.json({ ok: true, finances });
    } catch (error) {
      console.error('[serenatas/coordinators/finances] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener finanzas' }, 500);
    }
  });

  // GET /coordinators/me/transactions - Historial de transacciones
  app.get('/coordinators/me/transactions', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const [coordProfile] = await db.select().from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      if (!coordProfile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

      const transactions = await db.select({
        id: tables.serenataPayments.id,
        totalAmount: tables.serenataPayments.totalAmount,
        coordinatorEarnings: tables.serenataPayments.coordinatorEarnings,
        platformCommission: tables.serenataPayments.platformCommission,
        commissionVat: tables.serenataPayments.commissionVat,
        status: tables.serenataPayments.status,
        createdAt: tables.serenataPayments.createdAt,
        serenataId: tables.serenataPayments.serenataId,
      })
      .from(tables.serenataPayments)
      .where(or(
        eq(tables.serenataPayments.coordinatorProfileId, coordProfile.id),
        eq(tables.serenataPayments.clientId, user.id),
      ))
      .orderBy(desc(tables.serenataPayments.createdAt))
      .limit(50);

      return c.json({ ok: true, transactions });
    } catch (error) {
      console.error('[serenatas/coordinators/transactions] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener transacciones' }, 500);
    }
  });

  // Ruta por id
  app.get('/routes/:id', requireAuth, async (c) => {
    try {
      const id = c.req.param('id');

      const route = await db.query.serenataRoutes.findFirst({
        where: eq(tables.serenataRoutes.id, id),
        with: {
          group: {
            with: {
              leadMusician: {
                with: {
                  user: {
                    columns: { id: true, name: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!route) {
        return c.json({ ok: false, error: 'Ruta no encontrada' }, 404);
      }

      return c.json({ ok: true, route });
    } catch (error) {
      console.error('[serenatas/routes] Error getting route:', error);
      return c.json({ ok: false, error: 'Error al obtener ruta' }, 500);
    }
  });

  // Ruta por grupo (dueño o miembro del grupo)
  app.get('/routes/group/:groupId', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const groupId = c.req.param('groupId');

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, groupId),
        with: { members: true },
      });

      if (!group) {
        return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      }

      const isOwner = group.createdBy === musician.id;
      const isMember = (group.members ?? []).some((m: { musicianId: string }) => m.musicianId === musician.id);
      if (!isOwner && !isMember) {
        return c.json({ ok: false, error: 'No tienes permiso para ver esta ruta' }, 403);
      }

      const route = await db.query.serenataRoutes.findFirst({
        where: eq(tables.serenataRoutes.groupId, groupId),
      });

      if (!route) {
        return c.json({ ok: false, error: 'Ruta no encontrada para este grupo' }, 404);
      }

      return c.json({ ok: true, route });
    } catch (error) {
      console.error('[serenatas/routes] Error getting group route:', error);
      return c.json({ ok: false, error: 'Error al obtener ruta del grupo' }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ========== SERENATA BY ID — detalle + autorización por rol
  // ═══════════════════════════════════════════════════════════════

  /**
   * Lectura del detalle de una serenata. Sólo pueden verla:
   * - el cliente dueño,
   * - el coordinador asignado,
   * - cualquier músico que ya esté en el lineup de la serenata,
   * - administradores.
   * Devuelve el modelo crudo + enriquecido con datos del coordinador.
   */
  app.get('/:id', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');

      const [row] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!row) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const isOwner = row.clientId === user.id;
      const isAdmin = user.role === 'admin';

      let coordProfile: any = null;
      if (row.coordinatorProfileId) {
        [coordProfile] = await db
          .select()
          .from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.id, row.coordinatorProfileId))
          .limit(1);
      }

      const isAssignedCoordinator = coordProfile?.userId === user.id;

      let isMusicianInLineup = false;
      if (!isOwner && !isAdmin && !isAssignedCoordinator && tables.serenataMusicianLineup) {
        const musicianRow = await db.query.serenataMusicians.findFirst({
          where: eq(tables.serenataMusicians.userId, user.id),
        });
        if (musicianRow) {
          const [lineupRow] = await db
            .select({ id: tables.serenataMusicianLineup.id })
            .from(tables.serenataMusicianLineup)
            .where(
              and(
                eq(tables.serenataMusicianLineup.serenataId, serenataId),
                eq(tables.serenataMusicianLineup.musicianId, musicianRow.id)
              )
            )
            .limit(1);
          isMusicianInLineup = !!lineupRow;
        }
      }

      if (!isOwner && !isAdmin && !isAssignedCoordinator && !isMusicianInLineup) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      let coordinatorName: string | undefined;
      let coordinatorPhone: string | undefined;
      if (coordProfile?.userId) {
        const [u] = await db
          .select({ name: tables.users.name, phone: tables.users.phone })
          .from(tables.users)
          .where(eq(tables.users.id, coordProfile.userId))
          .limit(1);
        coordinatorName = u?.name ?? undefined;
        coordinatorPhone = u?.phone ?? undefined;
      }

      const serenata = {
        ...mapSerenataForApi(row),
        coordinatorId: row.coordinatorProfileId,
        coordinatorLat: row.latitude,
        coordinatorLng: row.longitude,
        coordinatorLocationUpdatedAt: row.updatedAt,
        coordinatorName,
        coordinatorPhone,
      };

      delete (serenata as Record<string, unknown>).coordinatorProfileId;

      return c.json({ ok: true, serenata });
    } catch (error) {
      console.error('[serenatas/detail] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener serenata' }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ========== SERENATAS — flujo de asignación / aceptación
  // ═══════════════════════════════════════════════════════════════

  /**
   * Asigna un coordinador a una serenata.
   * - Admin: puede asignar a cualquier coordinador (`body.coordinatorId`).
   * - Coordinador: se auto-asigna (toma la serenata para sí). No puede pisar otra asignación.
   * Estados: `pending → accepted` o `payment_pending` si se exige pago anticipado.
   */
  app.post('/:id/assign', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      const body = (await c.req.json().catch(() => null)) as
        | { coordinatorId?: string; price?: number; requiresUpfrontPayment?: boolean }
        | null;

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const isAdmin = user.role === 'admin';
      const [actorCoord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      let targetCoordinatorId: string | undefined;
      if (isAdmin) {
        targetCoordinatorId = body?.coordinatorId || actorCoord?.id;
        if (!targetCoordinatorId) {
          return c.json({ ok: false, error: 'Falta coordinatorId' }, 400);
        }
      } else if (actorCoord) {
        targetCoordinatorId = actorCoord.id;
      } else {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      if (
        serenata.coordinatorProfileId &&
        serenata.coordinatorProfileId !== targetCoordinatorId &&
        !isAdmin
      ) {
        return c.json({ ok: false, error: 'La serenata ya tiene coordinador asignado' }, 409);
      }

      if (!['pending', 'quoted', 'accepted'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede reasignar una serenata en estado ${serenata.status}` },
          409
        );
      }

      const updates: any = {
        coordinatorProfileId: targetCoordinatorId,
        status: body?.requiresUpfrontPayment === true && body?.price ? 'payment_pending' : 'accepted',
        acceptedAt: serenata.acceptedAt ?? new Date(),
        updatedAt: new Date(),
      };
      if (typeof body?.price === 'number' && body.price > 0) {
        updates.price = body.price;
        updates.quotedAt = new Date();
      }

      const [updated] = await db
        .update(tables.serenatas)
        .set(updates)
        .where(eq(tables.serenatas.id, serenataId))
        .returning();

      await notifySafe(db, tables, {
        userId: serenata.clientId,
        type: 'serenata',
        title: updates.status === 'payment_pending' ? 'Serenata aceptada: pago pendiente' : 'Serenata aceptada',
        message:
          updates.status === 'payment_pending'
            ? 'Un coordinador aceptó tu solicitud. Realiza el pago para dejarla confirmada.'
            : 'Un coordinador aceptó tu solicitud y continuará con la organización.',
        data: { serenataId },
      });

      return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
    } catch (error) {
      console.error('[serenatas/assign] Error:', error);
      return c.json({ ok: false, error: 'Error al asignar serenata' }, 500);
    }
  });

  /**
   * Aceptación de la serenata.
   * - Coordinador asignado: marca `status=accepted` (desde pending|quoted).
   * - Músico: se inscribe en `serenata_musician_lineup` (debe haber coordinador asignado).
   * - Admin: equivalente al coordinador.
   */
  app.post('/:id/accept', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      const body = (await c.req.json().catch(() => ({}))) as {
        price?: number;
        requiresUpfrontPayment?: boolean;
      };

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';

      // Coordinador asignado o admin → aceptación a nivel serenata
      const [coordProfile] = serenata.coordinatorProfileId
        ? await db
            .select()
            .from(tables.serenataCoordinatorProfiles)
            .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
            .limit(1)
        : [null];

      const isAssignedCoordinator = coordProfile?.userId === user.id;

      if (isAssignedCoordinator || isAdmin) {
        if (!['pending', 'quoted'].includes(serenata.status)) {
          return c.json(
            { ok: false, error: `No se puede aceptar en estado ${serenata.status}` },
            409
          );
        }
        const acceptedPrice =
          typeof body.price === 'number' && body.price > 0 ? Math.round(body.price) : serenata.price;
        const nextStatus = body.requiresUpfrontPayment === true && acceptedPrice ? 'payment_pending' : 'accepted';

        const [updated] = await db
          .update(tables.serenatas)
          .set({
            status: nextStatus,
            price: acceptedPrice ?? null,
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tables.serenatas.id, serenataId))
          .returning();

        await notifySafe(db, tables, {
          userId: serenata.clientId,
          type: 'serenata',
          title: nextStatus === 'payment_pending' ? 'Serenata aceptada: pago pendiente' : 'Coordinador aceptó tu serenata',
          message:
            nextStatus === 'payment_pending'
              ? 'Tu solicitud fue aceptada. Ya puedes pagar para confirmar el evento.'
              : 'Tu solicitud fue aceptada. El coordinador continuará con la organización.',
          data: { serenataId },
        });

        return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
      }

      // Caso músico → se suma al lineup (fila canónica serenata_musicians)
      const musicianRow = await getOrCreateSerenataMusicianForUser(user.id);

      if (!serenata.coordinatorProfileId) {
        return c.json(
          { ok: false, error: 'La serenata aún no tiene coordinador asignado' },
          409
        );
      }

      if (!['pending', 'quoted', 'accepted', 'payment_pending', 'confirmed'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede sumar al lineup en estado ${serenata.status}` },
          409
        );
      }

      // Idempotente: si ya está, devolvemos OK.
      const [existing] = await db
        .select({ id: tables.serenataMusicianLineup.id })
        .from(tables.serenataMusicianLineup)
        .where(
          and(
            eq(tables.serenataMusicianLineup.serenataId, serenataId),
            eq(tables.serenataMusicianLineup.musicianId, musicianRow.id)
          )
        )
        .limit(1);

      if (existing) {
        return c.json({ ok: true, lineupId: existing.id, alreadyJoined: true });
      }

      const nowAccept = new Date();
      const [lineup] = await db
        .insert(tables.serenataMusicianLineup)
        .values({
          serenataId,
          musicianId: musicianRow.id,
          status: 'accepted',
          initiator: 'musician',
          invitedAt: nowAccept,
          confirmedAt: nowAccept,
          updatedAt: nowAccept,
        })
        .returning();

      // Notifica al coordinador que un músico se sumó.
      if (coordProfile?.userId) {
        await notifySafe(db, tables, {
          userId: coordProfile.userId,
          type: 'serenata',
          title: 'Nuevo músico en el lineup',
          message: 'Un músico se sumó al lineup de tu serenata.',
          data: { serenataId, musicianId: musicianRow.id },
        });
      }

      return c.json({ ok: true, lineupId: lineup.id });
    } catch (error) {
      console.error('[serenatas/accept] Error:', error);
      return c.json({ ok: false, error: 'Error al aceptar serenata' }, 500);
    }
  });

  /**
   * Confirma la serenata. Solo coordinador asignado o admin.
   * Estados válidos de origen: `accepted` o `quoted` con coordinador.
   */
  app.post('/:id/confirm', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const [coordProfile] = serenata.coordinatorProfileId
        ? await db
            .select()
            .from(tables.serenataCoordinatorProfiles)
            .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
            .limit(1)
        : [null];

      if (!isAdmin && coordProfile?.userId !== user.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      if (!['accepted', 'quoted'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede confirmar en estado ${serenata.status}` },
          409
        );
      }

      const [updated] = await db
        .update(tables.serenatas)
        .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(tables.serenatas.id, serenataId))
        .returning();

      await notifySafe(db, tables, {
        userId: serenata.clientId,
        type: 'serenata',
        title: 'Serenata confirmada',
        message: 'Fecha y precio acordados. ¡Solo queda esperar el día del evento!',
        data: { serenataId },
      });

      return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
    } catch (error) {
      console.error('[serenatas/confirm] Error:', error);
      return c.json({ ok: false, error: 'Error al confirmar serenata' }, 500);
    }
  });

  /**
   * Cancela la serenata. Cliente dueño, coordinador asignado o admin.
   * Mantiene historial; no borra la fila.
   */
  app.post('/:id/cancel', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      const [coordProfileCancel] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);
      const isAssignedCoordinator =
        !!coordProfileCancel &&
        !!serenata.coordinatorProfileId &&
        serenata.coordinatorProfileId === coordProfileCancel.id;

      if (!isAdmin && !isOwner && !isAssignedCoordinator) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      if (['completed', 'cancelled'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede cancelar en estado ${serenata.status}` },
          409
        );
      }

      const [updated] = await db
        .update(tables.serenatas)
        .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(tables.serenatas.id, serenataId))
        .returning();

      // Notificar al otro lado: si lo cancela el cliente, avisamos al coordinador y viceversa.
      const cancelledBy =
        serenata.clientId === user.id ? 'client' : isAssignedCoordinator ? 'coordinator' : 'admin';
      if (cancelledBy === 'client' && serenata.coordinatorProfileId) {
        try {
          const [coord] = await db
            .select({ userId: tables.serenataCoordinatorProfiles.userId })
            .from(tables.serenataCoordinatorProfiles)
            .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
            .limit(1);
          if (coord?.userId) {
            await notifySafe(db, tables, {
              userId: coord.userId,
              type: 'serenata',
              title: 'Serenata cancelada',
              message: 'El cliente canceló la serenata.',
              data: { serenataId },
            });
          }
        } catch (notifyErr) {
          console.warn('[serenatas/cancel] notify coord failed:', notifyErr);
        }
      } else if (cancelledBy === 'coordinator') {
        await notifySafe(db, tables, {
          userId: serenata.clientId,
          type: 'serenata',
          title: 'Serenata cancelada',
          message: 'El coordinador canceló la serenata.',
          data: { serenataId },
        });
      } else {
        await notifySafe(db, tables, {
          userId: serenata.clientId,
          type: 'serenata',
          title: 'Serenata cancelada',
          message: 'Tu serenata fue cancelada por el equipo.',
          data: { serenataId },
        });
      }

      return c.json({ ok: true, serenata: mapSerenataForApi(updated) });
    } catch (error) {
      console.error('[serenatas/cancel] Error:', error);
      return c.json({ ok: false, error: 'Error al cancelar serenata' }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ========== GPS TRACKING ==========
  // ═══════════════════════════════════════════════════════════════

  // POST /serenatas/:id/location - Coordinador actualiza ubicacion
  app.post('/:id/location', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      const body = await c.req.json();
      const { lat, lng, accuracy } = body;

      if (!lat || !lng) {
        return c.json({ ok: false, error: 'Ubicacion requerida' }, 400);
      }

      // Solo el coordinador asignado puede actualizar ubicación
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const [coordProfile] = await db.select().from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      if (!coordProfile || serenata.coordinatorProfileId !== coordProfile.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      await db.update(tables.serenatas)
        .set({
          latitude: String(lat),
          longitude: String(lng),
          updatedAt: new Date(),
        })
        .where(eq(tables.serenatas.id, serenataId));

      return c.json({ ok: true, location: { lat, lng, accuracy } });
    } catch (error) {
      console.error('[serenatas/location] Error:', error);
      return c.json({ ok: false, error: 'Error al actualizar ubicacion' }, 500);
    }
  });

  // GET /serenatas/:id/location - Cliente ve ubicacion del coordinador
  app.get('/:id/location', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');

      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const [coordProf] = await db
        .select({ id: tables.serenataCoordinatorProfiles.id })
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      const isClient = serenata.clientId === user.id;
      const isCoordinator =
        coordProf != null && serenata.coordinatorProfileId === coordProf.id;

      if (!isClient && !isCoordinator) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      return c.json({
        ok: true,
        location: {
          lat: serenata.latitude,
          lng: serenata.longitude,
          updatedAt: serenata.updatedAt,
        },
      });
    } catch (error) {
      console.error('[serenatas/location] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener ubicacion' }, 500);
    }
  });

  // POST /serenatas/:id/checkin - Coordinador confirma llegada
  app.post('/:id/checkin', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');

      // Serenata
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      // Solo el coordinador asignado
      const [coordProfile] = await db.select().from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      if (!coordProfile || serenata.coordinatorProfileId !== coordProfile.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      await db.update(tables.serenatas)
        .set({
          status: 'in_progress',
          coordinatorArrivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.serenatas.id, serenataId));

      await db.insert(tables.serenataNotifications).values({
        userId: serenata.clientId,
        type: 'serenata',
        title: 'Serenata iniciada',
        message: 'El coordinador ha llegado y comenzado la serenata',
      });

      return c.json({ ok: true, message: 'Check-in exitoso' });
    } catch (error) {
      console.error('[serenatas/checkin] Error:', error);
      return c.json({ ok: false, error: 'Error en check-in' }, 500);
    }
  });

  // POST /serenatas/:id/checkout - Coordinador confirma finalizacion
  app.post('/:id/checkout', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      if (!serenataId) return c.json({ ok: false, error: 'Falta id de serenata' }, 400);

      // Serenata
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      // Solo el coordinador asignado
      const [coordProfile] = await db.select().from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);

      if (!coordProfile || serenata.coordinatorProfileId !== coordProfile.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      await db.update(tables.serenatas)
        .set({
          status: 'completed',
          completedAt: new Date(),
          coordinatorDepartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.serenatas.id, serenataId));

      // Liberar automáticamente el pago en escrow al coordinador.
      let releasedPaymentId: string | null = null;
      try {
        const [holdingPayment] = await db
          .select({ id: tables.serenataPayments.id, status: tables.serenataPayments.status })
          .from(tables.serenataPayments)
          .where(
            and(
              eq(tables.serenataPayments.serenataId, serenataId),
              eq(tables.serenataPayments.status, 'holding')
            )
          )
          .limit(1);

        if (holdingPayment) {
          await db
            .update(tables.serenataPayments)
            .set({
              status: 'released',
              releasedToCoordinatorAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tables.serenataPayments.id, holdingPayment.id));
          releasedPaymentId = holdingPayment.id;
        }
      } catch (releaseError) {
        console.warn('[serenatas/checkout] No se pudo liberar pago automáticamente:', releaseError);
      }

      await notifySafe(db, tables, {
        userId: serenata.clientId,
        type: 'serenata',
        title: 'Serenata completada',
        message: 'El coordinador ha finalizado la serenata. ¡Deja tu review!',
        data: { serenataId },
      });

      const appUrl = APP_URL_FOR_EMAIL();
      const reviewUrl = appUrl ? `${appUrl}/review/${serenataId}` : '';
      await sendMailSafe(
        db,
        tables,
        serenata.clientId,
        '¡Tu serenata está completa!',
        `El coordinador finalizó la serenata #${serenataId.slice(0, 8)}.\nNos encantaría escuchar cómo estuvo. Deja tu review${reviewUrl ? ` aquí: ${reviewUrl}` : ' desde la app'}.`
      );

      return c.json({ ok: true, message: 'Check-out exitoso', releasedPaymentId });
    } catch (error) {
      console.error('[serenatas/checkout] Error:', error);
      return c.json({ ok: false, error: 'Error en check-out' }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ========== REVIEWS ==========
  // ═══════════════════════════════════════════════════════════════

  // POST /serenatas/:id/reviews - Crear review
  app.post('/:id/reviews', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      const body = await c.req.json();
      const { rating, comment, role } = body;

      if (!rating || rating < 1 || rating > 5) {
        return c.json({ ok: false, error: 'Rating debe ser entre 1 y 5' }, 400);
      }

      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      let reviewerType: 'client' | 'coordinator';
      if (role === 'client' && serenata.clientId === user.id) {
        reviewerType = 'client';
      } else if (role === 'coordinator') {
        const [coordProfile] = await db.select().from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
          .limit(1);
        if (!coordProfile || serenata.coordinatorProfileId !== coordProfile.id) {
          return c.json({ ok: false, error: 'No autorizado' }, 403);
        }
        reviewerType = 'coordinator';
      } else {
        return c.json({ ok: false, error: 'Rol invalido' }, 400);
      }

      const [existingReview] = await db.select().from(tables.serenataCoordinatorReviews)
        .where(and(
          eq(tables.serenataCoordinatorReviews.serenataId, serenataId),
          eq(tables.serenataCoordinatorReviews.reviewerId, user.id),
        ))
        .limit(1);

      if (existingReview) {
        return c.json({ ok: false, error: 'Ya dejaste un review para esta serenata' }, 400);
      }

      const review = await service.createReview(
        { serenataId, rating, comment },
        user.id,
        reviewerType,
      );

      await db.insert(tables.serenataNotifications).values({
        userId: review.revieweeId,
        type: 'review',
        title: 'Nuevo review recibido',
        message: `${reviewerType === 'client' ? 'Un cliente' : 'Un coordinador'} te ha calificado con ${rating} estrellas`,
      });

      return c.json({ ok: true, review });
    } catch (error) {
      console.error('[serenatas/reviews] Error:', error);
      return c.json({ ok: false, error: 'Error al crear review' }, 500);
    }
  });

  // GET /serenatas/:id/reviews - Obtener reviews de una serenata
  app.get('/:id/reviews', requireAuth, async (c) => {
    try {
      const serenataId = c.req.param('id');

      const reviews = await db.select({
        id: tables.serenataCoordinatorReviews.id,
        rating: tables.serenataCoordinatorReviews.rating,
        comment: tables.serenataCoordinatorReviews.comment,
        reviewerRole: tables.serenataCoordinatorReviews.reviewerType,
        createdAt: tables.serenataCoordinatorReviews.createdAt,
        reviewer: {
          id: tables.users.id,
          name: tables.users.name,
          avatarUrl: tables.users.avatarUrl,
        },
      })
      .from(tables.serenataCoordinatorReviews)
      .leftJoin(tables.users, eq(tables.serenataCoordinatorReviews.reviewerId, tables.users.id))
      .where(eq(tables.serenataCoordinatorReviews.serenataId, serenataId))
      .orderBy(desc(tables.serenataCoordinatorReviews.createdAt));

      return c.json({ ok: true, reviews });
    } catch (error) {
      console.error('[serenatas/reviews] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener reviews' }, 500);
    }
  });

  async function coordinatorReviewsPayload(coordinatorProfileId: string) {
    const [prof] = await db
      .select({ userId: tables.serenataCoordinatorProfiles.userId })
      .from(tables.serenataCoordinatorProfiles)
      .where(eq(tables.serenataCoordinatorProfiles.id, coordinatorProfileId))
      .limit(1);

    if (!prof) return null;

    const reviews = await db.select({
      id: tables.serenataCoordinatorReviews.id,
      rating: tables.serenataCoordinatorReviews.rating,
      comment: tables.serenataCoordinatorReviews.comment,
      createdAt: tables.serenataCoordinatorReviews.createdAt,
      reviewer: {
        id: tables.users.id,
        name: tables.users.name,
        avatarUrl: tables.users.avatarUrl,
      },
      serenata: {
        id: tables.serenatas.id,
        recipientName: tables.serenatas.recipientName,
        eventDate: tables.serenatas.eventDate,
      },
    })
      .from(tables.serenataCoordinatorReviews)
      .leftJoin(tables.users, eq(tables.serenataCoordinatorReviews.reviewerId, tables.users.id))
      .leftJoin(tables.serenatas, eq(tables.serenataCoordinatorReviews.serenataId, tables.serenatas.id))
      .where(and(
        eq(tables.serenataCoordinatorReviews.revieweeId, prof.userId),
        eq(tables.serenataCoordinatorReviews.revieweeType, 'coordinator'),
      ))
      .orderBy(desc(tables.serenataCoordinatorReviews.createdAt));

    const stats = {
      average: reviews.length > 0
        ? (reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      total: reviews.length,
      distribution: {
        5: reviews.filter((r: { rating: number }) => r.rating === 5).length,
        4: reviews.filter((r: { rating: number }) => r.rating === 4).length,
        3: reviews.filter((r: { rating: number }) => r.rating === 3).length,
        2: reviews.filter((r: { rating: number }) => r.rating === 2).length,
        1: reviews.filter((r: { rating: number }) => r.rating === 1).length,
      },
    };

    return { reviews, stats };
  }

  // GET /coordinators/:id/reviews - Obtener reviews de un coordinador (`id` = perfil coordinador)
  app.get('/coordinators/:id/reviews', async (c) => {
    try {
      const coordinatorProfileId = c.req.param('id');

      const payload = await coordinatorReviewsPayload(coordinatorProfileId);
      if (!payload) {
        return c.json({ ok: false, error: 'Coordinador no encontrado' }, 404);
      }

      return c.json({ ok: true, reviews: payload.reviews, stats: payload.stats });
    } catch (error) {
      console.error('[serenatas/coordinators/reviews] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener reviews' }, 500);
    }
  });

  // Crear o actualizar ruta de grupo
  app.post('/routes', requireAuth, async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json().catch(() => null);
      const parsed = createRouteSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      // Grupo existe y el usuario es el líder de la cuadrilla
      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, parsed.data.groupId),
      });

      if (!group) {
        return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      }

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }
      if (group.createdBy !== musician.id) {
        return c.json({ ok: false, error: 'Solo el dueño del grupo puede guardar la ruta' }, 403);
      }

      const totalDistance = calculateRouteDistance(parsed.data.waypoints);
      const totalDuration = Math.ceil(totalDistance / 30 * 60);

      // Check if route already exists for this group
      const existing = await db.query.serenataRoutes.findFirst({
        where: eq(tables.serenataRoutes.groupId, parsed.data.groupId),
      });

      let route;
      if (existing) {
        [route] = await db.update(tables.serenataRoutes)
          .set({
            waypoints: parsed.data.waypoints,
            totalDistance: totalDistance.toFixed(2),
            totalDuration,
            updatedAt: new Date(),
          })
          .where(eq(tables.serenataRoutes.id, existing.id))
          .returning();
      } else {
        [route] = await db.insert(tables.serenataRoutes).values({
          groupId: parsed.data.groupId,
          date: new Date(parsed.data.date),
          waypoints: parsed.data.waypoints,
          totalDistance: totalDistance.toFixed(2),
          totalDuration,
        }).returning();
      }

      const orderedSerenataIds = parsed.data.waypoints.map((w) => w.serenataId);
      await db
        .update(tables.serenataGroups)
        .set({
          optimizedOrder: orderedSerenataIds,
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataGroups.id, parsed.data.groupId));

      const now = new Date();
      for (let i = 0; i < parsed.data.waypoints.length; i++) {
        await db
          .update(tables.serenataAssignments)
          .set({ position: i, updatedAt: now })
          .where(
            and(
              eq(tables.serenataAssignments.groupId, parsed.data.groupId),
              eq(tables.serenataAssignments.serenataId, parsed.data.waypoints[i].serenataId)
            )
          );
      }

      return c.json({ ok: true, route }, existing ? 200 : 201);
    } catch (error) {
      console.error('[serenatas/routes] Error creating route:', error);
      return c.json({ ok: false, error: 'Error al crear ruta' }, 500);
    }
  });

  // Optimizar orden de visitas
  app.post('/routes/optimize', requireAuth, async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json().catch(() => null);
      const parsed = optimizeRouteSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      const serenatas = await db.query.serenatas.findMany({
        where: and(
          inArray(tables.serenatas.id, parsed.data.serenataIds),
          inArray(tables.serenatas.status, ['accepted', 'payment_pending', 'confirmed', 'in_progress'])
        ),
      });

      if (serenatas.length === 0) {
        return c.json({ ok: false, error: 'No se encontraron serenatas válidas' }, 400);
      }

      // Waypoints desde coordenadas de cada solicitud
      const waypoints = serenatas
        .filter((s: any) => s.latitude && s.longitude)
        .map((s: any) => ({
          lat: parseFloat(s.latitude!.toString()),
          lng: parseFloat(s.longitude!.toString()),
          serenataId: s.id,
          address: s.address,
          estimatedTime: mapSerenataForApi(s).dateTime,
        }));

      if (waypoints.length === 0) {
        return c.json({ ok: false, error: 'Las serenatas no tienen coordenadas válidas' }, 400);
      }

      // For now, use a default starting point
      const startPoint = { lat: -33.4489, lng: -70.6693 }; // Santiago center

      let optimized;
      if (parsed.data.algorithm === 'nearest_neighbor') {
        optimized = optimizeNearestNeighbor(startPoint, waypoints);
      } else {
        optimized = waypoints;
      }

      const totalDistance = calculateRouteDistance([startPoint, ...optimized]);
      const totalDuration = Math.ceil(totalDistance / 30 * 60);

      return c.json({
        ok: true,
        optimized,
        totalDistance: totalDistance.toFixed(2),
        totalDuration,
        algorithm: parsed.data.algorithm,
      });
    } catch (error) {
      console.error('[serenatas/routes] Error optimizing route:', error);
      return c.json({ ok: false, error: 'Error al optimizar ruta' }, 500);
    }
  });

  // Iniciar ruta
  app.post('/routes/:id/start', requireAuth, async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');

      const route = await db.query.serenataRoutes.findFirst({
        where: eq(tables.serenataRoutes.id, id),
        with: { group: true },
      });

      if (!route) {
        return c.json({ ok: false, error: 'Ruta no encontrada' }, 404);
      }

      if (route.status !== 'planned') {
        return c.json(
          {
            ok: false,
            error:
              route.status === 'completed'
                ? 'Esta ruta ya fue completada'
                : 'La ruta ya está en curso',
          },
          409
        );
      }

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      const group = route.group as { createdBy?: string } | null | undefined;
      if (!musician || group?.createdBy !== musician.id) {
        return c.json({ ok: false, error: 'Solo el dueño del grupo puede iniciar la ruta' }, 403);
      }

      const [updated] = await db.update(tables.serenataRoutes)
        .set({
          status: 'active',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataRoutes.id, id))
        .returning();

      return c.json({ ok: true, route: updated });
    } catch (error) {
      console.error('[serenatas/routes] Error starting route:', error);
      return c.json({ ok: false, error: 'Error al iniciar ruta' }, 500);
    }
  });

  // Completar ruta
  app.post('/routes/:id/complete', requireAuth, async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');

      const route = await db.query.serenataRoutes.findFirst({
        where: eq(tables.serenataRoutes.id, id),
        with: { group: true },
      });

      if (!route) {
        return c.json({ ok: false, error: 'Ruta no encontrada' }, 404);
      }

      if (route.status !== 'active') {
        return c.json(
          {
            ok: false,
            error:
              route.status === 'completed'
                ? 'Esta ruta ya fue completada'
                : 'Debes iniciar la ruta antes de marcarla como completada',
          },
          409
        );
      }

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      const group = route.group as { createdBy?: string } | null | undefined;
      if (!musician || group?.createdBy !== musician.id) {
        return c.json({ ok: false, error: 'Solo el dueño del grupo puede completar la ruta' }, 403);
      }

      const [updated] = await db.update(tables.serenataRoutes)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataRoutes.id, id))
        .returning();

      return c.json({ ok: true, route: updated });
    } catch (error) {
      console.error('[serenatas/routes] Error completing route:', error);
      return c.json({ ok: false, error: 'Error al completar ruta' }, 500);
    }
  });

  // Estadísticas de una ruta
  app.get('/routes/:id/stats', requireAuth, async (c) => {
    try {
      const id = c.req.param('id');

      const route = await db.query.serenataRoutes.findFirst({
        where: eq(tables.serenataRoutes.id, id),
      });

      if (!route) {
        return c.json({ ok: false, error: 'Ruta no encontrada' }, 404);
      }

      const assignments = await db.query.serenataAssignments.findMany({
        where: eq(tables.serenataAssignments.groupId, route.groupId as any),
      });

      const waypoints = route.waypoints as any[] || [];
      const stats = {
        totalWaypoints: waypoints.length,
        totalDistance: route.totalDistance,
        estimatedDuration: route.totalDuration,
        completedAssignments: assignments.filter((a: any) => a.status === 'completed').length,
        pendingAssignments: assignments.filter((a: any) => a.status === 'pending').length,
        totalAssignments: assignments.length,
      };

      return c.json({ ok: true, stats });
    } catch (error) {
      console.error('[serenatas/routes] Error getting stats:', error);
      return c.json({ ok: false, error: 'Error al obtener estadísticas' }, 500);
    }
  });

  attachSerenatasNotificationRoutes(app, deps);

  /** Payload músico para panel (AuthContext, editar perfil). */
  async function buildMusicianMeProfile(userId: string): Promise<Record<string, unknown> | null> {
    try {
      const m = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, userId),
      });
      if (!m) return null;
      const [u] = await db
        .select({ name: tables.users.name })
        .from(tables.users)
        .where(eq(tables.users.id, userId))
        .limit(1);
      const rating = m.rating != null ? Number(m.rating) : 5;
      const exp = m.experience ?? undefined;
      const comuna = typeof m.comuna === 'string' ? m.comuna : '';
      return {
        id: m.id,
        userId: m.userId,
        instrument: m.instrument,
        bio: m.bio ?? '',
        phone: m.phone ?? undefined,
        comuna,
        region: typeof m.region === 'string' ? m.region : '',
        location: comuna,
        isAvailable: Boolean(m.isAvailable ?? true),
        availableNow: Boolean(m.availableNow ?? false),
        experience: exp ?? null,
        experienceYears: exp ?? undefined,
        rating,
        avatarUrl: m.avatarUrl ?? undefined,
        name: typeof u?.name === 'string' ? u.name : '',
      };
    } catch (error) {
      // Si hay error de base de datos (tabla no existe, etc.), retornar null
      console.error('[buildMusicianMeProfile] Database error:', error);
      return null;
    }
  }

  const serveAuthenticatedMusicianProfile = async (c: Context) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const musician = await buildMusicianMeProfile(user.id);
      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }
      return c.json({ ok: true, musician });
    } catch (error) {
      console.error('[serenatas/musicians] GET me/profile error:', error);
      return c.json({ ok: false, ...serenatasDevErrorPayload('Error al cargar perfil', error) }, 500);
    }
  };

  app.get('/musicians/me/profile', requireAuth, serveAuthenticatedMusicianProfile);
  /** @deprecated Usar `/musicians/me/profile`; se mantiene para clientes antiguos. */
  app.get('/musicians/my', requireAuth, serveAuthenticatedMusicianProfile);

  app.post('/musicians/me/profile', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const existing = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (existing) {
        return c.json({ ok: false, error: 'Ya tienes un perfil de músico' }, 409);
      }

      const body = (await c.req.json().catch(() => ({}))) as {
        name?: string;
        instrument?: string;
        experience?: number;
        bio?: string | null;
        comuna?: string | null;
        region?: string | null;
        location?: string | null;
        lat?: number | string;
        lng?: number | string;
        phone?: string | null;
        isAvailable?: boolean;
        availableNow?: boolean;
      };

      const instrument =
        typeof body.instrument === 'string' && body.instrument.trim()
          ? body.instrument.trim().slice(0, 30)
          : 'Voz';

      if (typeof body.name === 'string' && body.name.trim()) {
        await db
          .update(tables.users)
          .set({ name: body.name.trim().slice(0, 255), updatedAt: new Date() })
          .where(eq(tables.users.id, user.id));
      }

      const lat =
        body.lat !== undefined && body.lat !== '' ? String(body.lat) : undefined;
      const lng =
        body.lng !== undefined && body.lng !== '' ? String(body.lng) : undefined;

      await db.insert(tables.serenataMusicians).values({
        userId: user.id,
        instrument,
        experience: typeof body.experience === 'number' ? body.experience : undefined,
        bio: body.bio != null ? String(body.bio).slice(0, 4000) : undefined,
        phone:
          typeof body.phone === 'string' ? body.phone.trim().slice(0, 50) || undefined : undefined,
        comuna:
          (body.comuna ?? body.location) != null
            ? String(body.comuna ?? body.location).trim().slice(0, 100) || undefined
            : undefined,
        region: typeof body.region === 'string' ? body.region.trim().slice(0, 100) || undefined : undefined,
        lat,
        lng,
        isAvailable: body.isAvailable ?? true,
        availableNow: body.availableNow ?? false,
      });

      const musician = await buildMusicianMeProfile(user.id);
      return c.json({ ok: true, musician }, 201);
    } catch (error) {
      console.error('[serenatas/musicians] POST me/profile error:', error);
      return c.json({ ok: false, error: 'Error al crear perfil' }, 500);
    }
  });

  app.patch('/musicians/me/profile', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const row = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!row) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      const body = (await c.req.json().catch(() => ({}))) as {
        name?: string;
        instrument?: string;
        experience?: number | null;
        bio?: string | null;
        comuna?: string | null;
        region?: string | null;
        location?: string | null;
        lat?: number | string | null;
        lng?: number | string | null;
        phone?: string | null;
        isAvailable?: boolean;
        availableNow?: boolean;
      };

      if (typeof body.name === 'string' && body.name.trim()) {
        await db
          .update(tables.users)
          .set({ name: body.name.trim().slice(0, 255), updatedAt: new Date() })
          .where(eq(tables.users.id, user.id));
      }

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof body.instrument === 'string' && body.instrument.trim()) {
        patch.instrument = body.instrument.trim().slice(0, 30);
      }
      if (body.experience !== undefined) {
        patch.experience = body.experience === null ? null : Number(body.experience);
      }
      if (body.bio !== undefined) {
        patch.bio = body.bio === null ? null : String(body.bio).slice(0, 4000);
      }
      if (body.phone !== undefined) {
        patch.phone =
          body.phone === null || body.phone === ''
            ? null
            : String(body.phone).trim().slice(0, 50);
      }
      const loc = body.comuna ?? body.location;
      if (loc !== undefined) {
        patch.comuna = loc === null || loc === '' ? null : String(loc).trim().slice(0, 100);
      }
      if (body.region !== undefined) {
        patch.region =
          body.region === null || body.region === ''
            ? null
            : String(body.region).trim().slice(0, 100);
      }
      if (body.lat !== undefined) {
        patch.lat = body.lat === null || body.lat === '' ? null : String(body.lat);
      }
      if (body.lng !== undefined) {
        patch.lng = body.lng === null || body.lng === '' ? null : String(body.lng);
      }
      if (typeof body.isAvailable === 'boolean') patch.isAvailable = body.isAvailable;
      if (typeof body.availableNow === 'boolean') patch.availableNow = body.availableNow;

      await db
        .update(tables.serenataMusicians)
        .set(patch)
        .where(eq(tables.serenataMusicians.id, row.id));

      const musician = await buildMusicianMeProfile(user.id);
      return c.json({ ok: true, musician });
    } catch (error) {
      console.error('[serenatas/musicians] PATCH me/profile error:', error);
      return c.json({ ok: false, error: 'Error al actualizar perfil' }, 500);
    }
  });

  app.patch('/musicians/me/availability', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = (await c.req.json().catch(() => ({}))) as {
        isAvailable?: boolean;
        availableNow?: boolean;
      };
      const hasAvail = typeof body.isAvailable === 'boolean';
      const hasNow = typeof body.availableNow === 'boolean';
      if (!hasAvail && !hasNow) {
        return c.json({ ok: false, error: 'isAvailable o availableNow requerido' }, 400);
      }

      const row = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      if (!row) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (hasAvail) patch.isAvailable = body.isAvailable;
      if (hasNow) patch.availableNow = body.availableNow;

      await db
        .update(tables.serenataMusicians)
        .set(patch)
        .where(eq(tables.serenataMusicians.id, row.id));

      return c.json({ ok: true });
    } catch (error) {
      console.error('[serenatas/musicians] PATCH availability error:', error);
      return c.json({ ok: false, error: 'Error al actualizar disponibilidad' }, 500);
    }
  });

  /**
   * Músicos disponibles cerca del usuario (coordinador/músico) para armar grupos.
   * Origen: query `lat`/`lng`, o perfil de coordinador, o perfil de músico.
   * Sin coordenadas: lista ordenada por rating / disponibles ahora (distancia 0).
   */
  app.get('/musicians/available', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const role = user.role ?? '';
      const canUse =
        role === 'admin' ||
        role === 'superadmin' ||
        role === 'coordinator' ||
        role === 'musician';
      if (!canUse) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const radiusKm = Math.min(Math.max(Number(c.req.query('radius') ?? 10) || 10, 1), 200);
      const limit = Math.min(Number(c.req.query('limit') ?? 40) || 40, 80);

      let originLat: number | null = null;
      let originLng: number | null = null;

      const qLat = c.req.query('lat');
      const qLng = c.req.query('lng');
      if (qLat != null && qLng != null && qLat !== '' && qLng !== '') {
        const lat = Number(qLat);
        const lng = Number(qLng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          originLat = lat;
          originLng = lng;
        }
      }

      if (originLat == null) {
        const coordProfile = await db.query.serenataCoordinatorProfiles.findFirst({
          where: eq(tables.serenataCoordinatorProfiles.userId, user.id),
        });
        if (coordProfile?.latitude != null && coordProfile?.longitude != null) {
          const lat = Number(coordProfile.latitude);
          const lng = Number(coordProfile.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            originLat = lat;
            originLng = lng;
          }
        }
      }

      if (originLat == null) {
        const musicianMe = await db.query.serenataMusicians.findFirst({
          where: eq(tables.serenataMusicians.userId, user.id),
        });
        if (musicianMe?.lat != null && musicianMe?.lng != null) {
          const lat = Number(musicianMe.lat);
          const lng = Number(musicianMe.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            originLat = lat;
            originLng = lng;
          }
        }
      }

      const selfRow = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      const selfMusicianId = selfRow?.id;

      type AvailableMusicianRow = {
        id: string;
        instrument: string;
        lat: unknown;
        lng: unknown;
        rating: unknown;
        availableNow: boolean;
        userId: string;
        name: unknown;
      };

      const rows = (await db
        .select({
          id: tables.serenataMusicians.id,
          instrument: tables.serenataMusicians.instrument,
          lat: tables.serenataMusicians.lat,
          lng: tables.serenataMusicians.lng,
          rating: tables.serenataMusicians.rating,
          availableNow: tables.serenataMusicians.availableNow,
          userId: tables.serenataMusicians.userId,
          name: tables.users.name,
        })
        .from(tables.serenataMusicians)
        .innerJoin(tables.users, eq(tables.serenataMusicians.userId, tables.users.id))
        .where(
          and(eq(tables.serenataMusicians.status, 'active'), eq(tables.serenataMusicians.isAvailable, true))
        )
        .limit(400)) as AvailableMusicianRow[];

      const hasOrigin = originLat != null && originLng != null;

      type Draft = {
        id: string;
        name: string;
        instrument: string;
        distance: number;
        availableNow: boolean;
        rating: number;
      };

      const drafted: Draft[] = rows
        .filter((r) => r.id !== selfMusicianId)
        .map((r) => {
          const mLat = r.lat != null ? Number(r.lat) : NaN;
          const mLng = r.lng != null ? Number(r.lng) : NaN;
          let distance = 0;
          if (hasOrigin && Number.isFinite(mLat) && Number.isFinite(mLng) && originLat != null && originLng != null) {
            distance = Math.round(haversineKm(originLat, originLng, mLat, mLng) * 10) / 10;
          } else if (hasOrigin) {
            distance = 9999;
          }
          const ratingN = r.rating != null ? Number(r.rating) : 5;
          return {
            id: r.id,
            name: typeof r.name === 'string' && r.name ? r.name : 'Músico',
            instrument: r.instrument,
            distance,
            availableNow: Boolean(r.availableNow),
            rating: Number.isFinite(ratingN) ? ratingN : 5,
          };
        })
        .filter((m) => {
          if (!hasOrigin) return true;
          return m.distance <= radiusKm;
        })
        .sort((a, b) => {
          if (hasOrigin) return a.distance - b.distance;
          if (a.availableNow !== b.availableNow) return a.availableNow ? -1 : 1;
          return b.rating - a.rating;
        })
        .slice(0, limit);

      const musicians = drafted.map((m) => ({
        id: m.id,
        name: m.name,
        instrument: m.instrument,
        distance: hasOrigin ? m.distance : null,
      }));

      return c.json({
        ok: true,
        musicians,
        meta: {
          hasOrigin,
          radiusKm,
        },
      });
    } catch (error) {
      console.error('[serenatas/musicians/available] Error:', error);
      return c.json({ ok: false, error: 'Error al listar músicos' }, 500);
    }
  });

  /** Perfil público de músico por id canónico. */
  app.get('/musicians/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id || id === 'me') {
        return c.json({ ok: false, error: 'id inválido' }, 400);
      }

      const m = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.id, id),
      });
      if (!m) {
        return c.json({ ok: false, error: 'Músico no encontrado' }, 404);
      }

      const [u] = await db
        .select({ name: tables.users.name })
        .from(tables.users)
        .where(eq(tables.users.id, m.userId))
        .limit(1);

      const createdAt = m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt ?? '');

      return c.json({
        ok: true,
        musician: {
          id: m.id,
          name: typeof u?.name === 'string' && u.name ? u.name : 'Músico',
          instrument: m.instrument,
          bio: m.bio ?? undefined,
          location: (typeof m.comuna === 'string' && m.comuna) || (typeof m.region === 'string' && m.region) || '',
          rating: m.rating != null ? Number(m.rating) : 5,
          completedSerenatas: m.completedSerenatas ?? 0,
          joinedAt: createdAt,
          isAvailable: Boolean(m.isAvailable ?? true),
          avatar: m.avatarUrl ?? undefined,
        },
      });
    } catch (error) {
      console.error('[serenatas/musicians] GET :id error:', error);
      return c.json({ ok: false, error: 'Error al cargar músico' }, 500);
    }
  });

  // Estadísticas del músico autenticado
  app.get('/musicians/me/stats', requireAuth, async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      // Completadas vía asignaciones en grupos del músico
      const memberships = await db.query.serenataGroupMembers.findMany({
        where: eq(tables.serenataGroupMembers.musicianId, musician.id),
        with: {
          group: {
            with: {
              assignments: {
                with: {
                  serenata: true,
                },
              },
            },
          },
        },
      });

      const allSerenatas = memberships.flatMap((m: any) => 
        m.group.assignments.map((a: any) => a.serenata)
      );

      const completed = allSerenatas.filter((s: any) => s.status === 'completed').length;
      const confirmed = allSerenatas.filter((s: any) => s.status === 'confirmed').length;
      const totalEarnings = allSerenatas
        .filter((s: any) => s.status === 'completed')
        .reduce((sum: number, s: any) => sum + parseFloat(s.price || 0), 0);

      // Calculate weekly stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisWeek = allSerenatas.filter((s: any) => 
        new Date(s.dateTime) >= weekAgo && s.status === 'completed'
      ).length;

      const stats = {
        totalSerenatas: allSerenatas.length,
        completedSerenatas: completed,
        confirmedSerenatas: confirmed,
        thisWeekSerenatas: thisWeek,
        totalEarnings: Math.round(totalEarnings),
        rating: musician.rating || 5,
        responseRate: 95, // Mock - would calculate from actual response data
      };

      return c.json({ ok: true, stats });
    } catch (error) {
      console.error('[serenatas/musicians] Error getting stats:', error);
      return c.json({ ok: false, error: 'Error al obtener estadísticas' }, 500);
    }
  });

  // ============================================================
  // LINEUP DE SERENATA — invitaciones, solicitudes y aceptación
  // ============================================================
  // Modelo: `serenataMusicianLineup` con `status` ∈ {invited, requested, accepted, declined, removed}.
  // Coordinador asignado puede invitar y aprobar/rechazar; músico puede solicitar y aceptar/rechazar.

  /**
   * Listar lineup de una serenata, con perfiles de los músicos.
   * Visible para: cliente dueño, coordinador asignado, admin, o cualquier músico del lineup.
   */
  app.get('/:id/lineup', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const serenataId = c.req.param('id');
      if (!serenataId) return c.json({ ok: false, error: 'serenataId requerido' }, 400);

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const isAdmin = user.role === 'admin';
      const isOwner = serenata.clientId === user.id;
      let isAssignedCoordinator = false;
      if (serenata.coordinatorProfileId) {
        const [coord] = await db
          .select({ userId: tables.serenataCoordinatorProfiles.userId })
          .from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
          .limit(1);
        isAssignedCoordinator = coord?.userId === user.id;
      }

      // ¿el usuario está en el lineup?
      const myMusician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });
      let isInLineup = false;
      if (myMusician) {
        const [row] = await db
          .select({ id: tables.serenataMusicianLineup.id })
          .from(tables.serenataMusicianLineup)
          .where(
            and(
              eq(tables.serenataMusicianLineup.serenataId, serenataId),
              eq(tables.serenataMusicianLineup.musicianId, myMusician.id)
            )
          )
          .limit(1);
        isInLineup = !!row;
      }

      if (!isAdmin && !isOwner && !isAssignedCoordinator && !isInLineup) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const lineup = await db
        .select({
          id: tables.serenataMusicianLineup.id,
          /** ID canónico del músico (`serenata_musicians.id`); alias legacy para el cliente. */
          musicianProfileId: tables.serenataMusicianLineup.musicianId,
          status: tables.serenataMusicianLineup.status,
          initiator: tables.serenataMusicianLineup.initiator,
          invitedAt: tables.serenataMusicianLineup.invitedAt,
          respondedAt: tables.serenataMusicianLineup.respondedAt,
          confirmedAt: tables.serenataMusicianLineup.confirmedAt,
          declineReason: tables.serenataMusicianLineup.declineReason,
          attended: tables.serenataMusicianLineup.attended,
          userId: tables.serenataMusicians.userId,
          instrument: tables.serenataMusicians.instrument,
          name: tables.users.name,
          email: tables.users.email,
        })
        .from(tables.serenataMusicianLineup)
        .leftJoin(
          tables.serenataMusicians,
          eq(tables.serenataMusicianLineup.musicianId, tables.serenataMusicians.id)
        )
        .leftJoin(tables.users, eq(tables.serenataMusicians.userId, tables.users.id))
        .where(eq(tables.serenataMusicianLineup.serenataId, serenataId))
        .orderBy(asc(tables.serenataMusicianLineup.invitedAt));

      return c.json({ ok: true, lineup });
    } catch (error) {
      console.error('[serenatas/lineup] list error:', error);
      return c.json({ ok: false, error: 'Error al cargar lineup' }, 500);
    }
  });

  /**
   * Coordinador asignado invita uno o varios músicos.
   * Body: `{ musicianIds?: string[] }` y/o `{ musicianProfileIds?: string[] }` (alias legacy — mismos UUIDs que `musicianIds`).
   * Crea filas con status='invited', initiator='coordinator'. Idempotente: si ya existe
   * con status='declined' o 'removed', re-invita; si está 'accepted' o 'invited' → no-op.
   */
  app.post('/:id/lineup/invite', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const serenataId = c.req.param('id');
      if (!serenataId) return c.json({ ok: false, error: 'serenataId requerido' }, 400);

      const body = (await c.req.json().catch(() => ({}))) as {
        musicianProfileIds?: string[];
        musicianIds?: string[];
      };
      const rawIds = [...(body.musicianIds ?? []), ...(body.musicianProfileIds ?? [])].filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      );
      const musicianIdsUnique = [...new Set(rawIds)];
      if (musicianIdsUnique.length === 0) {
        return c.json({ ok: false, error: 'musicianIds o musicianProfileIds requerido' }, 400);
      }

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const [coordProfile] = serenata.coordinatorProfileId
        ? await db
            .select()
            .from(tables.serenataCoordinatorProfiles)
            .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
            .limit(1)
        : [null];

      const isAdmin = user.role === 'admin';
      const isAssignedCoordinator = coordProfile?.userId === user.id;
      if (!isAdmin && !isAssignedCoordinator) {
        return c.json({ ok: false, error: 'Solo el coordinador asignado puede invitar' }, 403);
      }
      if (!coordProfile) {
        return c.json({ ok: false, error: 'La serenata aún no tiene coordinador asignado' }, 409);
      }

      // Validar que los músicos existen y obtener userIds para notificar
      const musicians = await db
        .select({
          id: tables.serenataMusicians.id,
          userId: tables.serenataMusicians.userId,
        })
        .from(tables.serenataMusicians)
        .where(inArray(tables.serenataMusicians.id, musicianIdsUnique));

      const validIds = new Set(musicians.map((m: any) => m.id));
      const userIdByMusicianId = new Map<string, string>(
        musicians.map((m: any) => [m.id, m.userId])
      );

      const created: any[] = [];
      const skipped: string[] = [];
      const now = new Date();
      for (const musicianId of musicianIdsUnique) {
        if (!validIds.has(musicianId)) {
          skipped.push(musicianId);
          continue;
        }
        const [existing] = await db
          .select()
          .from(tables.serenataMusicianLineup)
          .where(
            and(
              eq(tables.serenataMusicianLineup.serenataId, serenataId),
              eq(tables.serenataMusicianLineup.musicianId, musicianId)
            )
          )
          .limit(1);

        if (existing) {
          if (['accepted', 'invited'].includes(existing.status)) {
            skipped.push(musicianId);
            continue;
          }
          // Re-invitar: declined / removed / requested → invited
          const [updated] = await db
            .update(tables.serenataMusicianLineup)
            .set({
              status: 'invited',
              initiator: 'coordinator',
              invitedBy: coordProfile.id,
              invitedAt: now,
              respondedAt: null,
              declineReason: null,
              updatedAt: now,
            })
            .where(eq(tables.serenataMusicianLineup.id, existing.id))
            .returning();
          created.push(updated);
        } else {
          const [row] = await db
            .insert(tables.serenataMusicianLineup)
            .values({
              serenataId,
              musicianId,
              status: 'invited',
              initiator: 'coordinator',
              invitedBy: coordProfile.id,
              invitedAt: now,
              updatedAt: now,
            })
            .returning();
          created.push(row);
        }

        const targetUserId = userIdByMusicianId.get(musicianId);
        if (targetUserId) {
          await notifySafe(db, tables, {
            userId: targetUserId,
            type: 'serenata',
            title: 'Te invitaron a una serenata',
            message: 'Un coordinador te invitó al lineup de una serenata. Revisa tus invitaciones.',
            data: { serenataId, lineupAction: 'invited' },
          });
          fireSerenataPush(deps, targetUserId, {
            title: 'Te invitaron a una serenata',
            message: 'Un coordinador te invitó al lineup. Revisa Invitaciones.',
            url: '/invitaciones',
          });
          await sendMailSafe(
            db,
            tables,
            targetUserId,
            'Te invitaron a una serenata',
            `Un coordinador te invitó al lineup de una serenata.\n\nIngresa a tu panel: ${APP_URL_FOR_EMAIL()}/invitaciones`
          );
        }
      }

      return c.json({ ok: true, invited: created.length, skipped, lineup: created });
    } catch (error) {
      console.error('[serenatas/lineup] invite error:', error);
      return c.json({ ok: false, error: 'Error al invitar músicos' }, 500);
    }
  });

  /**
   * Músico solicita unirse al lineup.
   * Crea fila con status='requested', initiator='musician'. El coord debe aprobarla.
   */
  app.post('/:id/lineup/request', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const serenataId = c.req.param('id');
      if (!serenataId) return c.json({ ok: false, error: 'serenataId requerido' }, 400);

      const musician = await getOrCreateSerenataMusicianForUser(user.id);

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      if (!serenata.coordinatorProfileId) {
        return c.json({ ok: false, error: 'La serenata aún no tiene coordinador asignado' }, 409);
      }
      if (!['pending', 'quoted', 'accepted', 'confirmed'].includes(serenata.status)) {
        return c.json(
          { ok: false, error: `No se puede solicitar unirse en estado ${serenata.status}` },
          409
        );
      }

      const [existing] = await db
        .select()
        .from(tables.serenataMusicianLineup)
        .where(
          and(
            eq(tables.serenataMusicianLineup.serenataId, serenataId),
            eq(tables.serenataMusicianLineup.musicianId, musician.id)
          )
        )
        .limit(1);

      const now = new Date();
      let lineupRow: any;
      if (existing) {
        if (['accepted', 'requested', 'invited'].includes(existing.status)) {
          return c.json({ ok: true, lineupId: existing.id, alreadyExists: true, status: existing.status });
        }
        const [updated] = await db
          .update(tables.serenataMusicianLineup)
          .set({
            status: 'requested',
            initiator: 'musician',
            invitedBy: serenata.coordinatorProfileId,
            invitedAt: now,
            respondedAt: null,
            declineReason: null,
            updatedAt: now,
          })
          .where(eq(tables.serenataMusicianLineup.id, existing.id))
          .returning();
        lineupRow = updated;
      } else {
        const [row] = await db
          .insert(tables.serenataMusicianLineup)
          .values({
            serenataId,
            musicianId: musician.id,
            status: 'requested',
            initiator: 'musician',
            invitedBy: serenata.coordinatorProfileId,
            invitedAt: now,
            updatedAt: now,
          })
          .returning();
        lineupRow = row;
      }

      // Notificar al coordinador asignado
      const [coord] = await db
        .select({ userId: tables.serenataCoordinatorProfiles.userId })
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
        .limit(1);
      if (coord?.userId) {
        await notifySafe(db, tables, {
          userId: coord.userId,
          type: 'serenata',
          title: 'Un músico solicita unirse al lineup',
          message: 'Un músico solicitó unirse al lineup de tu serenata. Revisa solicitudes pendientes.',
          data: { serenataId, lineupAction: 'requested', lineupId: lineupRow.id },
        });
        await sendMailSafe(
          db,
          tables,
          coord.userId,
          'Solicitud para unirse a tu serenata',
          `Un músico solicitó unirse al lineup. Revisa: ${APP_URL_FOR_EMAIL()}/coordinator/tracking/${serenataId}`
        );
      }

      return c.json({ ok: true, lineupId: lineupRow.id, status: lineupRow.status });
    } catch (error) {
      console.error('[serenatas/lineup] request error:', error);
      return c.json({ ok: false, error: 'Error al solicitar unirse' }, 500);
    }
  });

  /**
   * Músico responde a su invitación (status='invited' → 'accepted' | 'declined').
   * Body: `{ accept: boolean, reason?: string }`.
   */
  app.post('/:id/lineup/respond', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const serenataId = c.req.param('id');
      if (!serenataId) return c.json({ ok: false, error: 'serenataId requerido' }, 400);

      const body = (await c.req.json().catch(() => ({}))) as {
        accept?: boolean;
        reason?: string;
      };
      if (typeof body.accept !== 'boolean') {
        return c.json({ ok: false, error: 'accept (boolean) requerido' }, 400);
      }

      const musician = await getOrCreateSerenataMusicianForUser(user.id);

      const [row] = await db
        .select()
        .from(tables.serenataMusicianLineup)
        .where(
          and(
            eq(tables.serenataMusicianLineup.serenataId, serenataId),
            eq(tables.serenataMusicianLineup.musicianId, musician.id)
          )
        )
        .limit(1);
      if (!row) return c.json({ ok: false, error: 'Invitación no encontrada' }, 404);
      if (row.status !== 'invited') {
        return c.json(
          { ok: false, error: `No se puede responder en estado ${row.status}` },
          409
        );
      }

      const now = new Date();
      const [updated] = await db
        .update(tables.serenataMusicianLineup)
        .set({
          status: body.accept ? 'accepted' : 'declined',
          respondedAt: now,
          confirmedAt: body.accept ? now : null,
          declineReason: body.accept ? null : (body.reason ?? null),
          updatedAt: now,
        })
        .where(eq(tables.serenataMusicianLineup.id, row.id))
        .returning();

      // Notificar al coordinador
      const [serenata] = await db
        .select({ coordinatorProfileId: tables.serenatas.coordinatorProfileId })
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (serenata?.coordinatorProfileId) {
        const [coord] = await db
          .select({ userId: tables.serenataCoordinatorProfiles.userId })
          .from(tables.serenataCoordinatorProfiles)
          .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
          .limit(1);
        if (coord?.userId) {
          await notifySafe(db, tables, {
            userId: coord.userId,
            type: 'serenata',
            title: body.accept ? 'Músico aceptó tu invitación' : 'Músico rechazó tu invitación',
            message: body.accept
              ? 'Un músico aceptó la invitación al lineup de tu serenata.'
              : `Un músico rechazó la invitación.${body.reason ? ' Motivo: ' + body.reason : ''}`,
            data: { serenataId, lineupAction: body.accept ? 'accepted' : 'declined' },
          });
          fireSerenataPush(deps, coord.userId, {
            title: body.accept ? 'Músico aceptó tu invitación' : 'Músico rechazó tu invitación',
            message: body.accept
              ? 'Un músico aceptó el lineup de tu serenata.'
              : `Un músico rechazó la invitación.${body.reason ? ' Motivo: ' + body.reason : ''}`,
            url: '/solicitudes',
          });
        }
      }

      return c.json({ ok: true, lineup: updated });
    } catch (error) {
      console.error('[serenatas/lineup] respond error:', error);
      return c.json({ ok: false, error: 'Error al responder invitación' }, 500);
    }
  });

  /**
   * Coordinador aprueba (`approve`) o rechaza (`reject`) una solicitud de un músico
   * (status='requested' → 'accepted' | 'declined').
   */
  app.post('/:id/lineup/:lineupId/decision', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const serenataId = c.req.param('id');
      const lineupId = c.req.param('lineupId');
      if (!serenataId || !lineupId) return c.json({ ok: false, error: 'parámetros requeridos' }, 400);

      const body = (await c.req.json().catch(() => ({}))) as {
        approve?: boolean;
        reason?: string;
      };
      if (typeof body.approve !== 'boolean') {
        return c.json({ ok: false, error: 'approve (boolean) requerido' }, 400);
      }

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const [coordProfile] = serenata.coordinatorProfileId
        ? await db
            .select()
            .from(tables.serenataCoordinatorProfiles)
            .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
            .limit(1)
        : [null];
      const isAdmin = user.role === 'admin';
      const isAssignedCoordinator = coordProfile?.userId === user.id;
      if (!isAdmin && !isAssignedCoordinator) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const [row] = await db
        .select()
        .from(tables.serenataMusicianLineup)
        .where(
          and(
            eq(tables.serenataMusicianLineup.id, lineupId),
            eq(tables.serenataMusicianLineup.serenataId, serenataId)
          )
        )
        .limit(1);
      if (!row) return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      if (row.status !== 'requested') {
        return c.json(
          { ok: false, error: `Solo se puede aprobar/rechazar solicitudes pendientes (estado: ${row.status})` },
          409
        );
      }

      const now = new Date();
      const [updated] = await db
        .update(tables.serenataMusicianLineup)
        .set({
          status: body.approve ? 'accepted' : 'declined',
          respondedAt: now,
          confirmedAt: body.approve ? now : null,
          declineReason: body.approve ? null : (body.reason ?? null),
          updatedAt: now,
        })
        .where(eq(tables.serenataMusicianLineup.id, lineupId))
        .returning();

      // Notificar al músico
      const [musician] = await db
        .select({ userId: tables.serenataMusicians.userId })
        .from(tables.serenataMusicians)
        .where(eq(tables.serenataMusicians.id, row.musicianId))
        .limit(1);
      if (musician?.userId) {
        await notifySafe(db, tables, {
          userId: musician.userId,
          type: 'serenata',
          title: body.approve ? 'Aceptaron tu solicitud' : 'Rechazaron tu solicitud',
          message: body.approve
            ? 'El coordinador aprobó tu solicitud al lineup.'
            : `El coordinador rechazó tu solicitud.${body.reason ? ' Motivo: ' + body.reason : ''}`,
          data: { serenataId, lineupAction: body.approve ? 'approved' : 'rejected' },
        });
      }

      return c.json({ ok: true, lineup: updated });
    } catch (error) {
      console.error('[serenatas/lineup] decision error:', error);
      return c.json({ ok: false, error: 'Error al procesar decisión' }, 500);
    }
  });

  /**
   * Remover músico del lineup (status='removed'). Solo coord asignado o admin.
   */
  app.delete('/:id/lineup/:lineupId', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const serenataId = c.req.param('id');
      const lineupId = c.req.param('lineupId');
      if (!serenataId || !lineupId) return c.json({ ok: false, error: 'parámetros requeridos' }, 400);

      const [serenata] = await db
        .select()
        .from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);
      if (!serenata) return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);

      const [coordProfile] = serenata.coordinatorProfileId
        ? await db
            .select()
            .from(tables.serenataCoordinatorProfiles)
            .where(eq(tables.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
            .limit(1)
        : [null];
      const isAdmin = user.role === 'admin';
      const isAssignedCoordinator = coordProfile?.userId === user.id;
      if (!isAdmin && !isAssignedCoordinator) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const [row] = await db
        .select()
        .from(tables.serenataMusicianLineup)
        .where(
          and(
            eq(tables.serenataMusicianLineup.id, lineupId),
            eq(tables.serenataMusicianLineup.serenataId, serenataId)
          )
        )
        .limit(1);
      if (!row) return c.json({ ok: false, error: 'Lineup no encontrado' }, 404);

      const now = new Date();
      await db
        .update(tables.serenataMusicianLineup)
        .set({
          status: 'removed',
          respondedAt: now,
          updatedAt: now,
        })
        .where(eq(tables.serenataMusicianLineup.id, lineupId));

      const [musician] = await db
        .select({ userId: tables.serenataMusicians.userId })
        .from(tables.serenataMusicians)
        .where(eq(tables.serenataMusicians.id, row.musicianId))
        .limit(1);
      if (musician?.userId) {
        await notifySafe(db, tables, {
          userId: musician.userId,
          type: 'serenata',
          title: 'Te removieron del lineup',
          message: 'El coordinador te removió del lineup de la serenata.',
          data: { serenataId, lineupAction: 'removed' },
        });
      }

      return c.json({ ok: true });
    } catch (error) {
      console.error('[serenatas/lineup] remove error:', error);
      return c.json({ ok: false, error: 'Error al remover del lineup' }, 500);
    }
  });

  // ============================================================
  // CUADRILLA (CREW) — `serenata_coordinator_crew_memberships` + `serenata_musicians`
  // ============================================================
  // membershipStatus ∈ {active, invited, requested, declined, removed}.

  /** Actualiza datos de perfil en la fila canónica del músico (opcional). */
  async function patchSerenataMusicianProfileFields(
    musicianId: string,
    body: { instrument?: string; bio?: string | null; phone?: string | null }
  ) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.instrument) {
      patch.instrument = body.instrument;
    }
    if (body.bio !== undefined) patch.bio = body.bio;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (Object.keys(patch).length > 1) {
      await db
        .update(tables.serenataMusicians)
        .set(patch)
        .where(eq(tables.serenataMusicians.id, musicianId));
    }
  }

  /**
   * Listar miembros de la cuadrilla del coordinador autenticado.
   * Filtros opcionales: `?status=active|invited|requested|declined|removed`.
   * `id` = ID de membresía en cuadrilla; `musicianId` = `serenata_musicians.id`.
   */
  app.get('/coordinators/me/crew', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const statusFilter = c.req.query('status');

      const [coord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);
      if (!coord) return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);

      const cm = tables.serenataCoordinatorCrewMemberships;
      const where = statusFilter
        ? and(eq(cm.coordinatorProfileId, coord.id), eq(cm.membershipStatus, statusFilter))
        : eq(cm.coordinatorProfileId, coord.id);

      const members = await db
        .select({
          id: cm.id,
          crewMembershipId: cm.id,
          musicianId: tables.serenataMusicians.id,
          userId: tables.serenataMusicians.userId,
          bio: tables.serenataMusicians.bio,
          phone: tables.serenataMusicians.phone,
          instruments: tables.serenataMusicians.instruments,
          isActive: tables.serenataMusicians.isAvailable,
          availableNow: tables.serenataMusicians.availableNow,
          membershipStatus: cm.membershipStatus,
          membershipInitiator: cm.membershipInitiator,
          membershipInvitedAt: cm.membershipInvitedAt,
          membershipRespondedAt: cm.membershipRespondedAt,
          membershipMessage: cm.membershipMessage,
          createdAt: cm.createdAt,
          name: tables.users.name,
          email: tables.users.email,
        })
        .from(cm)
        .innerJoin(tables.serenataMusicians, eq(cm.musicianId, tables.serenataMusicians.id))
        .leftJoin(tables.users, eq(tables.serenataMusicians.userId, tables.users.id))
        .where(where)
        .orderBy(desc(cm.createdAt));

      return c.json({ ok: true, members });
    } catch (error) {
      console.error('[serenatas/crew] list error:', error);
      return c.json({ ok: false, error: 'Error al listar cuadrilla' }, 500);
    }
  });

  /**
   * Coordinador invita a un músico a su cuadrilla.
   * Body: `{ email?: string, userId?: string, instruments?, bio?, phone?, message? }`.
   * Crea/use `serenata_musicians` y una fila en crew con estado `invited`.
   */
  app.post('/coordinators/me/crew/invite', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = (await c.req.json().catch(() => ({}))) as {
        email?: string;
        userId?: string;
        instruments?: string[];
        bio?: string;
        phone?: string;
        message?: string;
      };
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const userIdInput = typeof body.userId === 'string' ? body.userId : '';
      if (!email && !userIdInput) {
        return c.json({ ok: false, error: 'email o userId requerido' }, 400);
      }

      const [coord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);
      if (!coord) return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);

      const [targetUser] = await db
        .select({ id: tables.users.id, email: tables.users.email, name: tables.users.name })
        .from(tables.users)
        .where(userIdInput ? eq(tables.users.id, userIdInput) : eq(tables.users.email, email))
        .limit(1);
      if (!targetUser) {
        return c.json(
          { ok: false, error: 'Usuario no encontrado. Pídele que se registre primero.' },
          404
        );
      }
      if (targetUser.id === user.id) {
        return c.json({ ok: false, error: 'No puedes invitarte a ti mismo' }, 400);
      }

      const musician = await getOrCreateSerenataMusicianForUser(targetUser.id);
      await patchSerenataMusicianProfileFields(musician.id, {
        bio: body.bio ?? undefined,
        phone: body.phone ?? undefined,
      });

      const cm = tables.serenataCoordinatorCrewMemberships;
      const [existing] = await db
        .select()
        .from(cm)
        .where(and(eq(cm.musicianId, musician.id), eq(cm.coordinatorProfileId, coord.id)))
        .limit(1);

      const now = new Date();
      let membership: any;
      if (existing) {
        if (['active', 'invited'].includes(existing.membershipStatus)) {
          return c.json(
            { ok: false, error: `Ya tiene estado: ${existing.membershipStatus}` },
            409
          );
        }
        const [updated] = await db
          .update(cm)
          .set({
            membershipStatus: 'invited',
            membershipInitiator: 'coordinator',
            membershipInvitedAt: now,
            membershipRespondedAt: null,
            membershipMessage: body.message ?? null,
            updatedAt: now,
          })
          .where(eq(cm.id, existing.id))
          .returning();
        membership = updated;
      } else {
        const [row] = await db
          .insert(cm)
          .values({
            musicianId: musician.id,
            coordinatorProfileId: coord.id,
            membershipStatus: 'invited',
            membershipInitiator: 'coordinator',
            membershipInvitedAt: now,
            membershipMessage: body.message ?? null,
          })
          .returning();
        membership = row;
      }

      await notifySafe(db, tables, {
        userId: targetUser.id,
        type: 'system',
        title: 'Te invitaron a una cuadrilla',
        message: 'Un coordinador te invitó a unirte a su cuadrilla. Revisa tus invitaciones.',
        data: { coordinatorProfileId: coord.id, crewAction: 'invited', crewMembershipId: membership.id },
      });
      await sendMailSafe(
        db,
        tables,
        targetUser.id,
        'Te invitaron a una cuadrilla',
        `Un coordinador te invitó a su cuadrilla en SimpleSerenatas.\n\nIngresa: ${APP_URL_FOR_EMAIL()}/invitaciones`
      );

      const profile = { ...membership, musicianId: musician.id, userId: targetUser.id };
      return c.json({ ok: true, profile });
    } catch (error) {
      console.error('[serenatas/crew] invite error:', error);
      return c.json({ ok: false, error: 'Error al invitar a la cuadrilla' }, 500);
    }
  });

  /**
   * Músico solicita unirse a la cuadrilla de un coordinador.
   * Body opcional: `{ instruments?, bio?, phone?, message? }`.
   */
  app.post('/coordinators/:coordinatorId/crew/request', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const coordinatorId = c.req.param('coordinatorId');
      if (!coordinatorId) return c.json({ ok: false, error: 'coordinatorId requerido' }, 400);

      const [coord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.id, coordinatorId))
        .limit(1);
      if (!coord) return c.json({ ok: false, error: 'Coordinador no encontrado' }, 404);
      if (coord.userId === user.id) {
        return c.json({ ok: false, error: 'No puedes solicitar unirte a tu propia cuadrilla' }, 400);
      }

      const body = (await c.req.json().catch(() => ({}))) as {
        bio?: string;
        phone?: string;
        message?: string;
      };

      const musician = await getOrCreateSerenataMusicianForUser(user.id);
      await patchSerenataMusicianProfileFields(musician.id, {
        bio: body.bio ?? undefined,
        phone: body.phone ?? undefined,
      });

      const cm = tables.serenataCoordinatorCrewMemberships;
      const [existing] = await db
        .select()
        .from(cm)
        .where(and(eq(cm.musicianId, musician.id), eq(cm.coordinatorProfileId, coordinatorId)))
        .limit(1);

      const now = new Date();
      let membership: any;
      if (existing) {
        if (['active', 'invited', 'requested'].includes(existing.membershipStatus)) {
          return c.json(
            { ok: false, error: `Ya tienes estado: ${existing.membershipStatus}` },
            409
          );
        }
        const [updated] = await db
          .update(cm)
          .set({
            membershipStatus: 'requested',
            membershipInitiator: 'musician',
            membershipInvitedAt: now,
            membershipRespondedAt: null,
            membershipMessage: body.message ?? null,
            updatedAt: now,
          })
          .where(eq(cm.id, existing.id))
          .returning();
        membership = updated;
      } else {
        const [row] = await db
          .insert(cm)
          .values({
            musicianId: musician.id,
            coordinatorProfileId: coordinatorId,
            membershipStatus: 'requested',
            membershipInitiator: 'musician',
            membershipInvitedAt: now,
            membershipMessage: body.message ?? null,
          })
          .returning();
        membership = row;
      }

      await notifySafe(db, tables, {
        userId: coord.userId,
        type: 'system',
        title: 'Solicitud para unirse a tu cuadrilla',
        message: 'Un músico solicitó unirse a tu cuadrilla.',
        data: {
          musicianProfileId: membership.id,
          crewMembershipId: membership.id,
          crewAction: 'requested',
        },
      });
      await sendMailSafe(
        db,
        tables,
        coord.userId,
        'Solicitud para unirse a tu cuadrilla',
        `Un músico solicitó unirse a tu cuadrilla.\n\nRevisa: ${APP_URL_FOR_EMAIL()}/cuadrilla`
      );

      const profile = { ...membership, musicianId: musician.id, userId: user.id };
      return c.json({ ok: true, profile });
    } catch (error) {
      console.error('[serenatas/crew] request error:', error);
      return c.json({ ok: false, error: 'Error al solicitar unirse' }, 500);
    }
  });

  /**
   * Músico responde a invitación a la cuadrilla.
   * `:profileId` = id de fila en `serenata_coordinator_crew_memberships`.
   */
  app.post('/musicians/me/memberships/:profileId/respond', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const profileId = c.req.param('profileId');
      if (!profileId) return c.json({ ok: false, error: 'profileId requerido' }, 400);

      const body = (await c.req.json().catch(() => ({}))) as { accept?: boolean };
      if (typeof body.accept !== 'boolean') {
        return c.json({ ok: false, error: 'accept (boolean) requerido' }, 400);
      }

      const cm = tables.serenataCoordinatorCrewMemberships;
      const [row] = await db
        .select({
          membership: cm,
          musicianUserId: tables.serenataMusicians.userId,
        })
        .from(cm)
        .innerJoin(tables.serenataMusicians, eq(cm.musicianId, tables.serenataMusicians.id))
        .where(eq(cm.id, profileId))
        .limit(1);

      if (!row) return c.json({ ok: false, error: 'Membresía no encontrada' }, 404);
      if (row.musicianUserId !== user.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }
      if (row.membership.membershipStatus !== 'invited') {
        return c.json(
          { ok: false, error: `No se puede responder en estado ${row.membership.membershipStatus}` },
          409
        );
      }

      const now = new Date();
      const [updated] = await db
        .update(cm)
        .set({
          membershipStatus: body.accept ? 'active' : 'declined',
          membershipRespondedAt: now,
          updatedAt: now,
        })
        .where(eq(cm.id, profileId))
        .returning();

      const [coord] = await db
        .select({ userId: tables.serenataCoordinatorProfiles.userId })
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.id, row.membership.coordinatorProfileId))
        .limit(1);
      if (coord?.userId) {
        await notifySafe(db, tables, {
          userId: coord.userId,
          type: 'system',
          title: body.accept ? 'Músico aceptó tu invitación' : 'Músico rechazó tu invitación',
          message: body.accept
            ? 'Un músico aceptó la invitación a tu cuadrilla.'
            : 'Un músico rechazó la invitación a tu cuadrilla.',
          data: { musicianProfileId: profileId, crewAction: body.accept ? 'accepted' : 'declined' },
        });
      }

      return c.json({ ok: true, profile: updated });
    } catch (error) {
      console.error('[serenatas/crew] respond error:', error);
      return c.json({ ok: false, error: 'Error al responder invitación' }, 500);
    }
  });

  /**
   * Coordinador aprueba (`approve=true`) o rechaza (`approve=false`) una solicitud de un músico.
   * `:profileId` = id de membresía en cuadrilla.
   */
  app.post('/coordinators/me/crew/:profileId/decision', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const profileId = c.req.param('profileId');
      if (!profileId) return c.json({ ok: false, error: 'profileId requerido' }, 400);

      const body = (await c.req.json().catch(() => ({}))) as { approve?: boolean };
      if (typeof body.approve !== 'boolean') {
        return c.json({ ok: false, error: 'approve (boolean) requerido' }, 400);
      }

      const [coord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);
      if (!coord) return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);

      const cm = tables.serenataCoordinatorCrewMemberships;
      const [row] = await db
        .select({
          membership: cm,
          musicianUserId: tables.serenataMusicians.userId,
        })
        .from(cm)
        .innerJoin(tables.serenataMusicians, eq(cm.musicianId, tables.serenataMusicians.id))
        .where(and(eq(cm.id, profileId), eq(cm.coordinatorProfileId, coord.id)))
        .limit(1);

      if (!row) return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      if (row.membership.membershipStatus !== 'requested') {
        return c.json(
          {
            ok: false,
            error: `Solo se puede decidir solicitudes pendientes (estado: ${row.membership.membershipStatus})`,
          },
          409
        );
      }

      const now = new Date();
      const [updated] = await db
        .update(cm)
        .set({
          membershipStatus: body.approve ? 'active' : 'declined',
          membershipRespondedAt: now,
          updatedAt: now,
        })
        .where(eq(cm.id, profileId))
        .returning();

      await notifySafe(db, tables, {
        userId: row.musicianUserId,
        type: 'system',
        title: body.approve ? 'Aceptaron tu solicitud' : 'Rechazaron tu solicitud',
        message: body.approve
          ? 'El coordinador aceptó tu solicitud para unirte a su cuadrilla.'
          : 'El coordinador rechazó tu solicitud.',
        data: { coordinatorProfileId: coord.id, crewAction: body.approve ? 'approved' : 'rejected' },
      });

      return c.json({ ok: true, profile: updated });
    } catch (error) {
      console.error('[serenatas/crew] decision error:', error);
      return c.json({ ok: false, error: 'Error al procesar decisión' }, 500);
    }
  });

  /**
   * Remover músico de la cuadrilla (membershipStatus='removed').
   * `:profileId` = id de membresía. Coordinador o el propio músico (auto-baja).
   */
  app.delete('/coordinators/me/crew/:profileId', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
      const profileId = c.req.param('profileId');
      if (!profileId) return c.json({ ok: false, error: 'profileId requerido' }, 400);

      const cm = tables.serenataCoordinatorCrewMemberships;
      const [row] = await db
        .select({
          membership: cm,
          musicianUserId: tables.serenataMusicians.userId,
        })
        .from(cm)
        .innerJoin(tables.serenataMusicians, eq(cm.musicianId, tables.serenataMusicians.id))
        .where(eq(cm.id, profileId))
        .limit(1);
      if (!row) return c.json({ ok: false, error: 'Membresía no encontrada' }, 404);

      const [coord] = await db
        .select({
          userId: tables.serenataCoordinatorProfiles.userId,
          id: tables.serenataCoordinatorProfiles.id,
        })
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.id, row.membership.coordinatorProfileId))
        .limit(1);
      const isAdmin = user.role === 'admin';
      const isCoordOwner = coord?.userId === user.id;
      const isSelf = row.musicianUserId === user.id;
      if (!isAdmin && !isCoordOwner && !isSelf) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const now = new Date();
      await db
        .update(cm)
        .set({
          membershipStatus: 'removed',
          membershipRespondedAt: now,
          updatedAt: now,
        })
        .where(eq(cm.id, profileId));

      const otherUserId = isCoordOwner || isAdmin ? row.musicianUserId : coord?.userId;
      if (otherUserId) {
        await notifySafe(db, tables, {
          userId: otherUserId,
          type: 'system',
          title: isSelf && !isCoordOwner ? 'Un músico salió de la cuadrilla' : 'Te removieron de la cuadrilla',
          message:
            isSelf && !isCoordOwner
              ? 'Un músico decidió dejar tu cuadrilla.'
              : 'El coordinador te removió de su cuadrilla.',
          data: { musicianProfileId: profileId, crewAction: 'removed' },
        });
      }

      return c.json({ ok: true });
    } catch (error) {
      console.error('[serenatas/crew] remove error:', error);
      return c.json({ ok: false, error: 'Error al remover de la cuadrilla' }, 500);
    }
  });

  /**
   * Búsqueda pública de coordinadores activos por nombre / email / ciudad.
   * Útil para que un músico encuentre una cuadrilla a la cual solicitar unirse.
   * Query: `?q=<texto>&limit=<n>`.
   */
  app.get('/coordinators/search', async (c) => {
    try {
      const q = (c.req.query('q') ?? '').trim();
      const limit = Math.min(Number(c.req.query('limit') ?? 10) || 10, 30);
      if (q.length < 2) {
        return c.json({ ok: true, coordinators: [] });
      }

      const pattern = `%${q.toLowerCase()}%`;
      const rows = await db
        .select({
          id: tables.serenataCoordinatorProfiles.id,
          userId: tables.serenataCoordinatorProfiles.userId,
          city: tables.serenataCoordinatorProfiles.city,
          region: tables.serenataCoordinatorProfiles.region,
          rating: tables.serenataCoordinatorProfiles.rating,
          totalSerenatas: tables.serenataCoordinatorProfiles.totalSerenatas,
          isVerified: tables.serenataCoordinatorProfiles.isVerified,
          name: tables.users.name,
          email: tables.users.email,
        })
        .from(tables.serenataCoordinatorProfiles)
        .leftJoin(tables.users, eq(tables.serenataCoordinatorProfiles.userId, tables.users.id))
        .where(
          or(
            sql`LOWER(${tables.users.name}) LIKE ${pattern}`,
            sql`LOWER(${tables.users.email}) LIKE ${pattern}`,
            sql`LOWER(${tables.serenataCoordinatorProfiles.city}) LIKE ${pattern}`
          )
        )
        .limit(limit);

      return c.json({ ok: true, coordinators: rows });
    } catch (error) {
      console.error('[serenatas/coordinators] search error:', error);
      return c.json({ ok: false, error: 'Error en la búsqueda' }, 500);
    }
  });

  /**
   * Lista coordinadores asociados al músico autenticado, con su estado de membresía.
   */
  app.get('/musicians/me/coordinators', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const cm = tables.serenataCoordinatorCrewMemberships;
      const memberships = await db
        .select({
          profileId: cm.id,
          crewMembershipId: cm.id,
          membershipStatus: cm.membershipStatus,
          membershipInitiator: cm.membershipInitiator,
          membershipInvitedAt: cm.membershipInvitedAt,
          membershipRespondedAt: cm.membershipRespondedAt,
          membershipMessage: cm.membershipMessage,
          musicianId: cm.musicianId,
          coordinatorProfileId: tables.serenataCoordinatorProfiles.id,
          coordinatorUserId: tables.serenataCoordinatorProfiles.userId,
          city: tables.serenataCoordinatorProfiles.city,
          rating: tables.serenataCoordinatorProfiles.rating,
          coordinatorName: tables.users.name,
          coordinatorEmail: tables.users.email,
        })
        .from(cm)
        .innerJoin(tables.serenataMusicians, eq(cm.musicianId, tables.serenataMusicians.id))
        .leftJoin(
          tables.serenataCoordinatorProfiles,
          eq(cm.coordinatorProfileId, tables.serenataCoordinatorProfiles.id)
        )
        .leftJoin(tables.users, eq(tables.serenataCoordinatorProfiles.userId, tables.users.id))
        .where(eq(tables.serenataMusicians.userId, user.id))
        .orderBy(desc(cm.createdAt));

      return c.json({ ok: true, memberships });
    } catch (error) {
      console.error('[serenatas/crew] my coordinators error:', error);
      return c.json({ ok: false, error: 'Error al cargar coordinadores' }, 500);
    }
  });

  // ============================================================
  // BANDEJA UNIFICADA — invitaciones / pendientes
  // ============================================================

  /**
   * Inbox del músico autenticado: invitaciones a serenatas (lineup) y a cuadrillas (crew),
   * más solicitudes propias pendientes (con estado).
   */
  app.get('/musicians/me/invitations', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Intentar obtener el perfil del músico
      let musicianRow: any = null;
      try {
        musicianRow = await db.query.serenataMusicians.findFirst({
          where: eq(tables.serenataMusicians.userId, user.id),
        });
      } catch (dbError) {
        // Si hay error de base de datos (tabla no existe, etc.), continuar sin perfil
        console.error('[serenatas/invitations] Database error finding musician:', dbError);
      }

      // Si no hay perfil de músico, retornar respuesta vacía
      if (!musicianRow) {
        return c.json({
          ok: true,
          lineup: [],
          crew: [],
          counts: { lineupInvited: 0, lineupRequested: 0, crewInvited: 0, crewRequested: 0 },
          totalPending: 0,
        });
      }

      // Lineup: invited (recibidas) + requested (enviadas pendientes) + accepted (informativo)
      let lineup: any[] = [];
      try {
        lineup = await db
          .select({
            id: tables.serenataMusicianLineup.id,
            serenataId: tables.serenataMusicianLineup.serenataId,
            status: tables.serenataMusicianLineup.status,
            initiator: tables.serenataMusicianLineup.initiator,
            invitedAt: tables.serenataMusicianLineup.invitedAt,
            respondedAt: tables.serenataMusicianLineup.respondedAt,
            recipientName: tables.serenatas.recipientName,
            address: tables.serenatas.address,
            city: tables.serenatas.city,
            eventDate: tables.serenatas.eventDate,
            eventTime: tables.serenatas.eventTime,
            duration: tables.serenatas.duration,
            price: tables.serenatas.price,
            message: tables.serenatas.message,
            serenataStatus: tables.serenatas.status,
            coordinatorProfileId: tables.serenatas.coordinatorProfileId,
          })
          .from(tables.serenataMusicianLineup)
          .leftJoin(
            tables.serenatas,
            eq(tables.serenataMusicianLineup.serenataId, tables.serenatas.id)
          )
          .where(
            and(
              eq(tables.serenataMusicianLineup.musicianId, musicianRow.id),
              inArray(tables.serenataMusicianLineup.status, ['invited', 'requested', 'accepted'])
            )
          )
          .orderBy(desc(tables.serenataMusicianLineup.invitedAt));
      } catch (dbError) {
        console.error('[serenatas/invitations] Database error fetching lineup:', dbError);
        lineup = [];
      }

      // Crew (membresías): invited (recibidas) y requested (enviadas)
      let crew: any[] = [];
      try {
        const cm = tables.serenataCoordinatorCrewMemberships;
        crew = await db
          .select({
            profileId: cm.id,
            crewMembershipId: cm.id,
            membershipStatus: cm.membershipStatus,
            membershipInitiator: cm.membershipInitiator,
            membershipInvitedAt: cm.membershipInvitedAt,
            membershipMessage: cm.membershipMessage,
            coordinatorProfileId: tables.serenataCoordinatorProfiles.id,
            city: tables.serenataCoordinatorProfiles.city,
            rating: tables.serenataCoordinatorProfiles.rating,
            coordinatorName: tables.users.name,
          })
          .from(cm)
          .leftJoin(
            tables.serenataCoordinatorProfiles,
            eq(cm.coordinatorProfileId, tables.serenataCoordinatorProfiles.id)
          )
          .leftJoin(tables.users, eq(tables.serenataCoordinatorProfiles.userId, tables.users.id))
          .where(
            and(
              eq(cm.musicianId, musicianRow.id),
              inArray(cm.membershipStatus, ['invited', 'requested'])
            )
          )
          .orderBy(desc(cm.membershipInvitedAt));
      } catch (dbError) {
        console.error('[serenatas/invitations] Database error fetching crew:', dbError);
        crew = [];
      }

      const counts = {
        lineupInvited: lineup.filter((l: any) => l.status === 'invited').length,
        lineupRequested: lineup.filter((l: any) => l.status === 'requested').length,
        crewInvited: crew.filter((m: any) => m.membershipStatus === 'invited').length,
        crewRequested: crew.filter((m: any) => m.membershipStatus === 'requested').length,
      };
      const totalPending = counts.lineupInvited + counts.crewInvited;

      return c.json({ ok: true, lineup, crew, counts, totalPending });
    } catch (error) {
      console.error('[serenatas/inbox] musician inbox error:', error);
      return c.json(
        { ok: false, ...serenatasDevErrorPayload('Error al cargar invitaciones', error) },
        500
      );
    }
  });

  /**
   * Inbox del coordinador autenticado: solicitudes pendientes (lineup `requested` y crew `requested`).
   */
  app.get('/coordinators/me/pending', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const [coord] = await db
        .select()
        .from(tables.serenataCoordinatorProfiles)
        .where(eq(tables.serenataCoordinatorProfiles.userId, user.id))
        .limit(1);
      if (!coord) return c.json({ ok: false, error: 'No tienes perfil de coordinador' }, 404);

      // Serenatas asignadas al coord
      const mySerenatas = await db
        .select({ id: tables.serenatas.id })
        .from(tables.serenatas)
        .where(eq(tables.serenatas.coordinatorProfileId, coord.id));
      const serenataIds = mySerenatas.map((s: any) => s.id);

      let lineupRequests: any[] = [];
      if (serenataIds.length > 0) {
        lineupRequests = await db
          .select({
            id: tables.serenataMusicianLineup.id,
            serenataId: tables.serenataMusicianLineup.serenataId,
            status: tables.serenataMusicianLineup.status,
            invitedAt: tables.serenataMusicianLineup.invitedAt,
            musicianProfileId: tables.serenataMusicianLineup.musicianId,
            instrument: tables.serenataMusicians.instrument,
            musicianName: tables.users.name,
            musicianEmail: tables.users.email,
            recipientName: tables.serenatas.recipientName,
            eventDate: tables.serenatas.eventDate,
            eventTime: tables.serenatas.eventTime,
          })
          .from(tables.serenataMusicianLineup)
          .leftJoin(
            tables.serenataMusicians,
            eq(tables.serenataMusicianLineup.musicianId, tables.serenataMusicians.id)
          )
          .leftJoin(tables.users, eq(tables.serenataMusicians.userId, tables.users.id))
          .leftJoin(tables.serenatas, eq(tables.serenataMusicianLineup.serenataId, tables.serenatas.id))
          .where(
            and(
              inArray(tables.serenataMusicianLineup.serenataId, serenataIds),
              eq(tables.serenataMusicianLineup.status, 'requested')
            )
          )
          .orderBy(desc(tables.serenataMusicianLineup.invitedAt));
      }

      const cmPending = tables.serenataCoordinatorCrewMemberships;
      const crewRequests = await db
        .select({
          profileId: cmPending.id,
          crewMembershipId: cmPending.id,
          membershipStatus: cmPending.membershipStatus,
          membershipInvitedAt: cmPending.membershipInvitedAt,
          membershipMessage: cmPending.membershipMessage,
          instrument: tables.serenataMusicians.instrument,
          musicianUserId: tables.serenataMusicians.userId,
          musicianName: tables.users.name,
          musicianEmail: tables.users.email,
        })
        .from(cmPending)
        .innerJoin(tables.serenataMusicians, eq(cmPending.musicianId, tables.serenataMusicians.id))
        .leftJoin(tables.users, eq(tables.serenataMusicians.userId, tables.users.id))
        .where(
          and(eq(cmPending.coordinatorProfileId, coord.id), eq(cmPending.membershipStatus, 'requested'))
        )
        .orderBy(desc(cmPending.membershipInvitedAt));

      return c.json({
        ok: true,
        lineupRequests,
        crewRequests,
        totalPending: lineupRequests.length + crewRequests.length,
      });
    } catch (error) {
      console.error('[serenatas/inbox] coord pending error:', error);
      return c.json({ ok: false, error: 'Error al cargar pendientes' }, 500);
    }
  });

  return app;
}
