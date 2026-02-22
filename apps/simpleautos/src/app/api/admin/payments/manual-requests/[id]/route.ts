import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/email';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

function isAdminRole(value: unknown) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'admin' || v === 'staff' || v === 'superadmin';
}

async function assertAdminUser(request: Request) {
  const auth = requireAuthUserId(request);
  if ('error' in auth) return { ok: false as const, status: 401 as const, error: 'No autenticado' };
  const db = getDbPool();
  const profile = await db.query(
    `SELECT user_role, is_admin
     FROM profiles
     WHERE id = $1
     LIMIT 1`,
    [auth.userId]
  );
  const row = profile.rows[0] as any;
  const isAdmin = Boolean(row?.is_admin) || isAdminRole(row?.user_role);
  if (!isAdmin) return { ok: false as const, status: 403 as const, error: 'Sin permisos' };
  return { ok: true as const, authUserId: auth.userId };
}

const PatchSchema = z.object({
  status: z.enum(['pending', 'proof_uploaded', 'approved', 'rejected', 'cancelled']).optional(),
  adminNote: z.string().trim().max(5000).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});

function addOneMonth(base: Date) {
  const date = new Date(base);
  date.setMonth(date.getMonth() + 1);
  return date;
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'proof_uploaded':
      return 'Comprobante cargado';
    case 'approved':
      return 'Aprobada';
    case 'rejected':
      return 'Rechazada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
}

function requestTypeLabel(type: string) {
  switch (type) {
    case 'subscription_upgrade':
      return 'upgrade de suscripción';
    case 'featured_listing':
      return 'destacado de publicación';
    case 'urgent_listing':
      return 'urgente';
    default:
      return 'solicitud manual';
  }
}

async function createManualRequestEvent(payload: {
  requestId: string;
  eventType: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getDbPool();
  try {
    await db.query(
      `INSERT INTO manual_payment_request_events
       (request_id, event_type, actor_user_id, actor_role, from_status, to_status, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        payload.requestId,
        payload.eventType,
        payload.actorUserId ?? null,
        payload.actorRole ?? null,
        payload.fromStatus ?? null,
        payload.toStatus ?? null,
        payload.message ?? null,
        JSON.stringify(payload.metadata ?? {}),
      ]
    );
  } catch {
    // best effort
  }
}

async function activateSubscriptionFromManualRequest(requestRow: any, reviewedBy: string) {
  if (requestRow.request_type !== 'subscription_upgrade') return;
  if (!requestRow.plan_id || !requestRow.user_id || !requestRow.vertical_id) {
    throw new Error('Solicitud inválida para activar suscripción');
  }

  const db = getDbPool();
  const existingSub = await db.query(
    `SELECT id, current_period_end
     FROM subscriptions
     WHERE user_id = $1 AND vertical_id = $2 AND status = 'active'
     LIMIT 1`,
    [requestRow.user_id, requestRow.vertical_id]
  );

  const now = new Date();
  const currentEnd = existingSub.rows[0]?.current_period_end ? new Date(existingSub.rows[0].current_period_end as any) : null;
  const periodStart = currentEnd && currentEnd > now ? currentEnd : now;
  const periodEnd = addOneMonth(periodStart);

  await db.query(
    `INSERT INTO subscriptions
      (user_id, vertical_id, plan_id, target_type, status, current_period_start, current_period_end, cancel_at_period_end, metadata)
     VALUES ($1,$2,$3,'individual','active',$4,$5,false,$6::jsonb)
     ON CONFLICT (user_id, vertical_id)
     DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       status = EXCLUDED.status,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       metadata = EXCLUDED.metadata`,
    [
      requestRow.user_id,
      requestRow.vertical_id,
      requestRow.plan_id,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      JSON.stringify({
        source: 'manual_payment_request',
        request_id: requestRow.id,
        reviewed_by: reviewedBy,
      }),
    ]
  );

  const externalId = `manual_request_${requestRow.id}`;
  const existingPayment = await db.query(`SELECT id FROM payments WHERE external_id = $1 LIMIT 1`, [externalId]);
  if (!existingPayment.rows[0]?.id) {
    await db.query(
      `INSERT INTO payments
       (user_id, amount, currency, status, payment_method, external_id, description)
       VALUES ($1,$2,$3,'approved','manual_transfer',$4,$5)`,
      [
        requestRow.user_id,
        Number(requestRow.amount || 0),
        String(requestRow.currency || 'CLP'),
        externalId,
        `Solicitud manual aprobada (${requestRow.plan_key || 'plan'})`,
      ]
    );
  }
}

async function notifyStatusChange(
  requestRow: any,
  previousStatus: string,
  nextStatus: string,
  adminUserId: string,
  adminNote?: string
) {
  if (!requestRow.user_id || previousStatus === nextStatus) return;
  const db = getDbPool();

  const typeLabel = requestTypeLabel(String(requestRow.request_type || ''));
  const title = 'Actualización de solicitud manual';
  const content =
    `Tu solicitud de ${typeLabel} cambió de ${statusLabel(previousStatus)} a ${statusLabel(nextStatus)}.` +
    (adminNote ? ` Nota: ${adminNote}` : '');

  await db.query(
    `INSERT INTO notifications (user_id, type, title, content, is_read, data)
     VALUES ($1,$2,$3,$4,false,$5::jsonb)`,
    [
      requestRow.user_id,
      'manual_payment_request_status',
      title,
      content,
      JSON.stringify({
        request_id: requestRow.id,
        request_type: requestRow.request_type,
        previous_status: previousStatus,
        status: nextStatus,
        listing_id: requestRow.listing_id ?? null,
        reviewed_by: adminUserId,
      }),
    ]
  );

  const email = String(requestRow.requester_email || '').trim();
  if (!email) return;

  await sendMail({
    to: email,
    subject: `[Simple] Tu solicitud fue actualizada`,
    text:
      `Hola${requestRow.requester_name ? ` ${requestRow.requester_name}` : ''}, ` +
      `tu solicitud (${typeLabel}) cambió de ${statusLabel(previousStatus)} a ${statusLabel(nextStatus)}.` +
      (adminNote ? `\n\nNota del equipo: ${adminNote}` : ''),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 8px 0;">Actualización de solicitud</h2>
        <p style="margin:0 0 12px 0;">
          Tu solicitud de <strong>${typeLabel}</strong> cambió de
          <strong>${statusLabel(previousStatus)}</strong> a
          <strong>${statusLabel(nextStatus)}</strong>.
        </p>
        ${adminNote ? `<p style="margin:0;"><strong>Nota del equipo:</strong> ${adminNote}</p>` : ''}
      </div>
    `,
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const admin = await assertAdminUser(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const db = getDbPool();
    const requestRowRes = await db.query(
      `SELECT mpr.id, mpr.created_at, mpr.request_type, mpr.plan_key, mpr.plan_id, mpr.listing_id, mpr.amount, mpr.currency,
              mpr.status, mpr.requester_name, mpr.requester_email, mpr.proof_note, mpr.admin_note, mpr.reviewed_at, mpr.reviewed_by,
              v.key AS vertical_key, v.name AS vertical_name
       FROM manual_payment_requests mpr
       LEFT JOIN verticals v ON v.id = mpr.vertical_id
       WHERE mpr.id = $1
       LIMIT 1`,
      [id]
    );
    const requestRow = requestRowRes.rows[0] || null;
    if (!requestRow) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    const events = await db.query(
      `SELECT id, event_type, from_status, to_status, message, actor_user_id, actor_role, metadata, created_at
       FROM manual_payment_request_events
       WHERE request_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [id]
    );

    return NextResponse.json({ ok: true, data: { request: requestRow, events: events.rows || [] } }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const admin = await assertAdminUser(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    if (!parsed.data.status && parsed.data.adminNote === undefined) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    }

    const db = getDbPool();
    const requestRowRes = await db.query(
      `SELECT id, user_id, vertical_id, request_type, plan_id, plan_key, listing_id, amount, currency, status, requester_name, requester_email
       FROM manual_payment_requests
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    const requestRow = requestRowRes.rows[0] as any;
    if (!requestRow?.id) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    const previousStatus = String(requestRow.status || 'pending');
    const nextStatus = parsed.data.status ?? previousStatus;

    if (nextStatus === 'approved' && previousStatus !== 'approved') {
      await activateSubscriptionFromManualRequest(requestRow, admin.authUserId);
    }

    await db.query(
      `UPDATE manual_payment_requests
       SET status = $2,
           reviewed_by = $3,
           reviewed_at = now(),
           admin_note = COALESCE($4, admin_note)
       WHERE id = $1`,
      [id, nextStatus, admin.authUserId, parsed.data.adminNote ?? null]
    );

    if (nextStatus !== previousStatus) {
      await createManualRequestEvent({
        requestId: id,
        eventType: 'status_changed',
        actorUserId: admin.authUserId,
        actorRole: 'admin',
        fromStatus: previousStatus,
        toStatus: nextStatus,
        message: `Estado cambiado de ${statusLabel(previousStatus)} a ${statusLabel(nextStatus)}`,
        metadata: {
          request_type: requestRow.request_type,
          plan_key: requestRow.plan_key,
          listing_id: requestRow.listing_id ?? null,
        },
      });
    } else if (parsed.data.adminNote !== undefined) {
      await createManualRequestEvent({
        requestId: id,
        eventType: 'admin_note_updated',
        actorUserId: admin.authUserId,
        actorRole: 'admin',
        fromStatus: previousStatus,
        toStatus: nextStatus,
        message: 'Nota administrativa actualizada',
        metadata: {
          request_type: requestRow.request_type,
          note_length: String(parsed.data.adminNote || '').length,
        },
      });
    }

    if (nextStatus !== previousStatus) {
      try {
        await notifyStatusChange(requestRow, previousStatus, nextStatus, admin.authUserId, parsed.data.adminNote);
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
