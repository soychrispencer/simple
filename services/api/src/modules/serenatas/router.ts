import { Hono, type Context } from 'hono';
import { eq, and, or, desc, asc, gte, lte, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { SerenatasService } from './service';

// Types for dependency injection
export type SerenatasRouterDeps = {
  db: any;
  authUser: (c: Context) => Promise<{ id: string; role?: string } | null>;
  requireAuth: (c: Context, next: () => Promise<void>) => Promise<void>;
  service: any;
  tables: {
    serenataCaptainProfiles: any;
    serenataMusicianProfiles: any;
    serenatas: any;
    serenataMusicians: any;
    serenataSubscriptions: any;
    serenataSubscriptionPayments: any;
    serenataPayments: any;
    serenataReviews: any;
    serenataAvailability: any;
    serenataMessages: any;
    serenataGroups: any;
    serenataGroupMembers: any;
    serenataRequests: any;
    serenataAssignments: any;
    serenataRoutes: any;
    serenataNotifications: any;
    users: any;
  };
};

// Validation schemas
const createCaptainProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  experience: z.number().min(0).max(50).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  serviceRadius: z.number().min(1).max(200).default(50),
  minPrice: z.number().min(0).default(100),
  maxPrice: z.number().min(0).default(500),
});

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
  source: z.enum(['self_captured', 'platform_lead', 'platform_assigned']).default('self_captured'),
});

const updateSerenataStatusSchema = z.object({
  status: z.enum(['pending', 'quoted', 'accepted', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  price: z.number().min(0).optional(),
});

const updateCaptainProfileSchema = z.object({
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

  async function getAuthUser(c: Context) {
    return authUser(c);
  }

  // ═══════════════════════════════════════════════════════════════
  // GROUPS ROUTES
  // ═══════════════════════════════════════════════════════════════

  // List groups with filters
  app.get('/groups', async (c) => {
    try {
      const status = c.req.query('status');
      const date = c.req.query('date');
      const captainId = c.req.query('captainId');
      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
      const offset = parseInt(c.req.query('offset') || '0');

      let conditions = [];

      if (status) {
        conditions.push(eq(tables.serenataGroups.status, status));
      }

      if (date) {
        conditions.push(eq(tables.serenataGroups.date, new Date(date)));
      }

      if (captainId) {
        conditions.push(eq(tables.serenataGroups.captainId, captainId));
      }

      const groups = await db.query.serenataGroups.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        with: {
          captain: {
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

      return c.json({ ok: true, groups });
    } catch (error) {
      console.error('[serenatas/groups] Error listing groups:', error);
      return c.json({ ok: false, error: 'Error al listar grupos' }, 500);
    }
  });

  // Get group by ID
  app.get('/groups/:id', async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const profile = await service.getCaptainProfileByUserId(user.id);
      if (!profile) {
        return c.json({ ok: false, error: 'No tienes perfil de capitán' }, 404);
      }

      return c.json({ ok: true, profile });
    } catch (error) {
      console.error('[serenatas/captains] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener perfil' }, 500);
    }
  });

  // POST /captains - Crear perfil de capitán
  app.post('/captains', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const data = createCaptainProfileSchema.parse(body);

      const existing = await service.getCaptainProfileByUserId(user.id);
      if (existing) {
        return c.json({ ok: false, error: 'Ya tienes perfil de capitán' }, 400);
      }

      const profile = await service.createCaptainProfile(user.id, data);
      return c.json({ ok: true, profile }, 201);
    } catch (error) {
      console.error('[serenatas/captains] Error creating:', error);
      return c.json({ ok: false, error: 'Error al crear perfil' }, 500);
    }
  });

  // PATCH /captains/me - Actualizar perfil
  app.patch('/captains/me', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const profile = await service.updateCaptainProfile(user.id, body);
      return c.json({ ok: true, profile });
    } catch (error) {
      console.error('[serenatas/captains] Error updating:', error);
      return c.json({ ok: false, error: 'Error al actualizar perfil' }, 500);
    }
  });

  // GET /captains/me/stats - Estadísticas del capitán
  app.get('/captains/me/stats', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Get captain profile
      const profile = await service.getCaptainProfileByUserId(user.id);
      if (!profile) {
        return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
      }

      // Get stats from serenatas
      const stats = await service.getCaptainStats(profile.id);
      return c.json({ ok: true, stats });
    } catch (error) {
      console.error('[serenatas/captains/stats] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener estadísticas' }, 500);
    }
  });

  // POST /captains/match - Encontrar capitanes disponibles
  app.post('/captains/match', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const { comuna, date, time, budget } = body;

      if (!comuna || !date || !time) {
        return c.json({ ok: false, error: 'Faltan datos requeridos' }, 400);
      }

      const captains = await service.findMatchingCaptains({
        comuna,
        date,
        time,
        budget: budget || 150,
      });

      return c.json({ ok: true, captains });
    } catch (error) {
      console.error('[serenatas/captains/match] Error:', error);
      return c.json({ ok: false, error: 'Error al buscar capitanes' }, 500);
    }
  });

  // ========== SERENATAS ==========

  // GET /requests - Mis solicitudes como cliente
  app.get('/requests', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenatas = await service.getSerenatasByClient(user.id);
      return c.json({ ok: true, serenatas });
    } catch (error) {
      console.error('[serenatas/requests] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener solicitudes' }, 500);
    }
  });

  // POST /requests - Crear solicitud
  app.post('/requests', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const data = createSerenataSchema.parse(body);

      const serenata = await service.createSerenata(user.id, data);
      return c.json({ ok: true, serenata }, 201);
    } catch (error) {
      console.error('[serenatas/requests] Error creating:', error);
      return c.json({ ok: false, error: 'Error al crear solicitud' }, 500);
    }
  });

  // GET /requests/my/assigned - Mis serenatas asignadas como capitán
  app.get('/requests/my/assigned', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenatas = await service.getAssignedSerenatasForCaptain(user.id);
      const requestId = c.req.param('id');
      const body = await c.req.json().catch(() => null);
      const groupId = body?.groupId;

      if (!groupId) {
        return c.json({ ok: false, error: 'Se requiere groupId' }, 400);
      }

      // Check if user is captain of the group
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, groupId),
      });

      if (!group) {
        return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      }

      if (!musician || group.captainId !== musician.id) {
        return c.json({ ok: false, error: 'Solo el capitán puede asignar serenatas' }, 403);
      }

      const request = await db.query.serenataRequests.findFirst({
        where: eq(tables.serenataRequests.id, requestId),
      });

      if (!request) {
        return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      }

      if (request.status !== 'pending') {
        return c.json({ ok: false, error: 'La solicitud ya ha sido asignada' }, 409);
      }

      // Create assignment
      const [assignment] = await db.insert(tables.serenataAssignments).values({
        requestId,
        groupId,
        status: 'confirmed',
      }).returning();

      // Update request status
      await db.update(tables.serenataRequests)
        .set({ status: 'assigned', updatedAt: new Date() })
        .where(eq(tables.serenataRequests.id, requestId));

      return c.json({ ok: true, assignment }, 201);
    } catch (error) {
      console.error('[serenatas/requests] Error assigning request:', error);
      return c.json({ ok: false, error: 'Error al asignar solicitud' }, 500);
    }
  });

  // Get my assigned serenatas (for musicians)
  app.get('/requests/my/assigned', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Find musician profile
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      // Find groups where musician is a member
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

      // Extract all serenatas from assigned groups
      const serenatas = memberships.flatMap((m: any) => 
        m.group.assignments.map((a: any) => ({
          ...a.serenata,
          assignmentId: a.id,
          groupId: m.group.id,
          groupName: m.group.name,
        }))
      ).filter((s: any) => ['assigned', 'confirmed', 'in_progress'].includes(s.status));

      return c.json({ ok: true, serenatas });
    } catch (error) {
      console.error('[serenatas/requests] Error getting assigned serenatas:', error);
      return c.json({ ok: false, error: 'Error al obtener serenatas asignadas' }, 500);
    }
  });

  // Get urgent requests list
  app.get('/requests/urgent/list', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);
      const now = new Date();
      const urgentWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      const requests = await db.query.serenataRequests.findMany({
        where: and(
          eq(tables.serenataRequests.status, 'pending'),
          eq(tables.serenataRequests.urgency, 'urgent'),
          gte(tables.serenataRequests.dateTime, now),
          lte(tables.serenataRequests.dateTime, urgentWindow)
        ),
        limit,
        orderBy: [asc(tables.serenataRequests.dateTime)],
      });

      // Add distance calculation (mock for now, would use actual coords)
      const requestsWithDistance = requests.map((r: any) => ({
        ...r,
        distance: Math.round(Math.random() * 15 + 1), // Mock distance 1-16km
        requiredInstruments: r.requiredInstruments || ['voz', 'guitarra'],
      }));

      return c.json({ ok: true, requests: requestsWithDistance });
    } catch (error) {
      console.error('[serenatas/requests] Error getting urgent requests:', error);
      return c.json({ ok: false, error: 'Error al obtener solicitudes urgentes' }, 500);
    }
  });

  // Get available requests for musician
  app.get('/requests/available/for-musician', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Find musician profile
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Get pending requests matching musician's availability
      let conditions = [
        eq(tables.serenataRequests.status, 'pending'),
        gte(tables.serenataRequests.dateTime, now),
        lte(tables.serenataRequests.dateTime, threeDaysFromNow),
      ];

      // Filter by instrument if specified
      if (musician.instrument) {
        conditions.push(
          sql`${tables.serenataRequests.requiredInstruments} IS NULL OR 
              ${tables.serenataRequests.requiredInstruments} @> ${JSON.stringify([musician.instrument])}`
        );
      }

      const requests = await db.query.serenataRequests.findMany({
        where: and(...conditions),
        limit: 20,
        orderBy: [asc(tables.serenataRequests.dateTime)],
      });

      // Add distance and instruments
      const requestsWithDetails = requests.map((r: any) => ({
        ...r,
        distance: Math.round(Math.random() * 20 + 1),
        requiredInstruments: r.requiredInstruments || ['voz', 'guitarra'],
      }));

      return c.json({ ok: true, requests: requestsWithDetails });
    } catch (error) {
      console.error('[serenatas/requests] Error getting available requests:', error);
      return c.json({ ok: false, error: 'Error al obtener solicitudes disponibles' }, 500);
    }
  });

  // Accept request
  app.post('/requests/:id/accept', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const requestId = c.req.param('id');

      // Find musician profile
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      const request = await db.query.serenataRequests.findFirst({
        where: eq(tables.serenataRequests.id, requestId),
      });

      if (!request) {
        return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      }

      if (request.status !== 'pending') {
        return c.json({ ok: false, error: 'La solicitud ya no está disponible' }, 409);
      }

      // Check if musician already has a group for this date
      const existingMembership = await db.query.serenataGroupMembers.findFirst({
        where: and(
          eq(tables.serenataGroupMembers.musicianId, musician.id),
          sql`${tables.serenataGroupMembers.joinedAt}::date = ${request.dateTime.toDateString()}`
        ),
        with: {
          group: true,
        },
      });

      let groupId: string;

      if (existingMembership) {
        // Use existing group
        groupId = existingMembership.groupId;
      } else {
        // Create new group with this musician as captain
        const [group] = await db.insert(tables.serenataGroups).values({
          name: `Grupo ${new Date(request.dateTime).toLocaleDateString('es-CL')}`,
          date: new Date(request.dateTime),
          captainId: musician.id,
          status: 'forming',
        }).returning();
        groupId = group.id;

        // Add musician as member
        await db.insert(tables.serenataGroupMembers).values({
          groupId,
          musicianId: musician.id,
          role: 'captain',
        });
      }

      // Create assignment
      await db.insert(tables.serenataAssignments).values({
        requestId,
        groupId,
        status: 'confirmed',
      });

      // Update request status
      await db.update(tables.serenataRequests)
        .set({ status: 'assigned', updatedAt: new Date() })
        .where(eq(tables.serenataRequests.id, requestId));

      return c.json({ ok: true, message: 'Solicitud aceptada' });
    } catch (error) {
      console.error('[serenatas/requests] Error accepting request:', error);
      return c.json({ ok: false, error: 'Error al aceptar solicitud' }, 500);
    }
  });

  // Decline request
  app.post('/requests/:id/decline', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const requestId = c.req.param('id');
      const body = await c.req.json().catch(() => ({ reason: '' }));

      // Log the decline (could be stored in a separate table for analytics)
      console.log(`[serenatas/requests] Musician ${user.id} declined request ${requestId}. Reason: ${body.reason || 'No reason provided'}`);

      // Optionally, track declines to avoid showing the same request repeatedly
      return c.json({ ok: true, message: 'Solicitud rechazada' });
    } catch (error) {
      console.error('[serenatas/requests] Error declining request:', error);
      return c.json({ ok: false, error: 'Error al rechazar solicitud' }, 500);
    }
  });

  // Get matching musicians for a request (for group captains)
  app.get('/requests/:id/matches', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const requestId = c.req.param('id');

      // Get the request
      const request = await db.query.serenataRequests.findFirst({
        where: eq(tables.serenataRequests.id, requestId),
      });

      if (!request) {
        return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      }

      // Get required instruments
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
        distance: request.lat && request.lng && m.lat && m.lng
          ? calculateDistance(
              parseFloat(request.lat as string),
              parseFloat(request.lng as string),
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

  // POST /payments/subscription - Crear pago de suscripción
  app.post('/payments/subscription', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json();
      const { plan, paymentMethod } = body;

      // Calculate price based on plan
      const prices = { free: 0, pro: 3900, premium: 7900 };
      const amount = prices[plan as keyof typeof prices] || 0;

      if (amount === 0) {
        // Free plan - just update
        await db.update(tables.serenataCaptainProfiles)
          .set({ subscriptionPlan: plan, subscriptionStatus: 'active' })
          .where(eq(tables.serenataCaptainProfiles.userId, user.id));
        return c.json({ ok: true, plan, amount: 0 });
      }

      // Create payment record
      const [payment] = await db.insert(tables.serenataPayments)
        .values({
          payerId: user.id,
          amount,
          currency: 'CLP',
          status: 'pending',
          type: 'subscription',
          metadata: { plan, paymentMethod },
        })
        .returning();

      // TODO: Integrate with MercadoPago/Stripe
      // For now, simulate successful payment
      await db.update(tables.serenataPayments)
        .set({ status: 'completed', processedAt: new Date() })
        .where(eq(tables.serenataPayments.id, payment.id));

      // Update captain profile
      await db.update(tables.serenataCaptainProfiles)
        .set({ 
          subscriptionPlan: plan, 
          subscriptionStatus: 'active',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })
        .where(eq(tables.serenataCaptainProfiles.userId, user.id));

      return c.json({ ok: true, paymentId: payment.id, plan, amount });
    } catch (error) {
      console.error('[serenatas/payments/subscription] Error:', error);
      return c.json({ ok: false, error: 'Error al procesar pago' }, 500);
    }
  });

  // POST /payments/serenata/:id - Pagar una serenata
  app.post('/payments/serenata/:id', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      
      // Get serenata details
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      // Get captain commission rate based on plan
      const captain = await db.select().from(tables.serenataCaptainProfiles)
        .where(eq(tables.serenataCaptainProfiles.id, serenata.assignedCaptainId!))
        .limit(1);

      const commissionRates = { free: 0.20, pro: 0.10, premium: 0 };
      const captainPlan = captain[0]?.subscriptionPlan || 'free';
      const commissionRate = commissionRates[captainPlan as keyof typeof commissionRates];

      const totalAmount = serenata.price || 150;
      const platformFee = Math.round(totalAmount * commissionRate);
      const captainEarnings = totalAmount - platformFee;

      // Create payment record
      const [payment] = await db.insert(tables.serenataPayments)
        .values({
          payerId: user.id,
          payeeId: serenata.assignedCaptainId,
          serenataId,
          amount: totalAmount,
          platformFee,
          captainEarnings,
          currency: 'CLP',
          status: 'pending',
          type: 'serenata',
        })
        .returning();

      // TODO: Integrate with MercadoPago/Stripe
      // Simulate payment completion
      await db.update(tables.serenataPayments)
        .set({ status: 'completed', processedAt: new Date() })
        .where(eq(tables.serenataPayments.id, payment.id));

      // Update serenata status
      await db.update(tables.serenatas)
        .set({ paymentStatus: 'paid', status: 'confirmed' })
        .where(eq(tables.serenatas.id, serenataId));

      return c.json({ 
        ok: true, 
        paymentId: payment.id, 
        totalAmount, 
        platformFee, 
        captainEarnings,
        commissionRate: `${commissionRate * 100}%`,
      });
    } catch (error) {
      console.error('[serenatas/payments/serenata] Error:', error);
      return c.json({ ok: false, error: 'Error al procesar pago' }, 500);
    }
  });

  // GET /captains/me/finances - Dashboard financiero
  app.get('/captains/me/finances', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Get captain profile
      const [captain] = await db.select().from(tables.serenataCaptainProfiles)
        .where(eq(tables.serenataCaptainProfiles.userId, user.id))
        .limit(1);

      if (!captain) {
        return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
      }

      // Get payment stats
      const payments = await db.select().from(tables.serenataPayments)
        .where(and(
          eq(tables.serenataPayments.payeeId, captain.id),
          eq(tables.serenataPayments.status, 'completed')
        ));

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthPayments = payments.filter((p: { processedAt: string | null }) => new Date(p.processedAt!) >= startOfMonth);

      const finances = {
        totalEarnings: payments.reduce((sum: number, p: { captainEarnings: number | null }) => sum + (p.captainEarnings || 0), 0),
        thisMonthEarnings: thisMonthPayments.reduce((sum: number, p: { captainEarnings: number | null }) => sum + (p.captainEarnings || 0), 0),
        totalPlatformFees: payments.reduce((sum: number, p: { platformFee: number | null }) => sum + (p.platformFee || 0), 0),
        pendingEarnings: payments
          .filter((p: { status: string }) => p.status === 'pending')
          .reduce((sum: number, p: { captainEarnings: number | null }) => sum + (p.captainEarnings || 0), 0),
        completedSerenatas: payments.filter((p: { status: string }) => p.status === 'completed').length,
        averagePerSerenata: payments.length > 0 
          ? payments.reduce((sum: number, p: { captainEarnings: number | null }) => sum + (p.captainEarnings || 0), 0) / payments.length 
          : 0,
        subscription: {
          plan: captain.subscriptionPlan,
          commissionRate: captain.subscriptionPlan === 'premium' ? '0%' : 
                         captain.subscriptionPlan === 'pro' ? '10%' : '20%',
          expiresAt: captain.subscriptionExpiresAt,
        }
      };

      return c.json({ ok: true, finances });
    } catch (error) {
      console.error('[serenatas/captains/finances] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener finanzas' }, 500);
    }
  });

  // GET /captains/me/transactions - Historial de transacciones
  app.get('/captains/me/transactions', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const [captain] = await db.select().from(tables.serenataCaptainProfiles)
        .where(eq(tables.serenataCaptainProfiles.userId, user.id))
        .limit(1);

      if (!captain) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

      const transactions = await db.select({
        id: tables.serenataPayments.id,
        amount: tables.serenataPayments.amount,
        captainEarnings: tables.serenataPayments.captainEarnings,
        platformFee: tables.serenataPayments.platformFee,
        status: tables.serenataPayments.status,
        type: tables.serenataPayments.type,
        createdAt: tables.serenataPayments.createdAt,
        serenataId: tables.serenataPayments.serenataId,
      })
      .from(tables.serenataPayments)
      .where(or(
        eq(tables.serenataPayments.payeeId, captain.id),
        eq(tables.serenataPayments.payerId, user.id)
      ))
      .orderBy(desc(tables.serenataPayments.createdAt))
      .limit(50);

      return c.json({ ok: true, transactions });
    } catch (error) {
      console.error('[serenatas/captains/transactions] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener transacciones' }, 500);
    }
  });

  // Get route by ID
  app.get('/routes/:id', async (c) => {
    try {
      const id = c.req.param('id');

      const route = await db.query.serenataRoutes.findFirst({
        where: eq(tables.serenataRoutes.id, id),
        with: {
          group: {
            with: {
              captain: {
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

  // Get route for group
  app.get('/routes/group/:groupId', async (c) => {
    try {
      const groupId = c.req.param('groupId');

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
  // ========== GPS TRACKING ==========
  // ═══════════════════════════════════════════════════════════════

  // POST /serenatas/:id/location - Capitan actualiza ubicacion
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

      // Verify captain is assigned to this serenata
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      const [captain] = await db.select().from(tables.serenataCaptainProfiles)
        .where(eq(tables.serenataCaptainProfiles.userId, user.id))
        .limit(1);

      if (!captain || serenata.captainId !== captain.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      // Update location in serenata
      await db.update(tables.serenatas)
        .set({
          captainLat: lat,
          captainLng: lng,
          captainLocationUpdatedAt: new Date(),
        })
        .where(eq(tables.serenatas.id, serenataId));

      return c.json({ ok: true, location: { lat, lng, accuracy } });
    } catch (error) {
      console.error('[serenatas/location] Error:', error);
      return c.json({ ok: false, error: 'Error al actualizar ubicacion' }, 500);
    }
  });

  // GET /serenatas/:id/location - Cliente ve ubicacion del capitán
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

      // Only client or captain can see location
      if (serenata.clientId !== user.id && serenata.captainId !== user.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      return c.json({
        ok: true,
        location: {
          lat: serenata.captainLat,
          lng: serenata.captainLng,
          updatedAt: serenata.captainLocationUpdatedAt,
        },
      });
    } catch (error) {
      console.error('[serenatas/location] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener ubicacion' }, 500);
    }
  });

  // POST /serenatas/:id/checkin - Capitan confirma llegada
  app.post('/:id/checkin', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');
      const body = await c.req.json();
      const { code } = body;

      // Get serenata
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      // Verify captain
      const [captain] = await db.select().from(tables.serenataCaptainProfiles)
        .where(eq(tables.serenataCaptainProfiles.userId, user.id))
        .limit(1);

      if (!captain || serenata.captainId !== captain.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      // Verify check-in code (simple 4-digit code)
      const expectedCode = serenata.checkInCode;
      if (code && code !== expectedCode) {
        return c.json({ ok: false, error: 'Codigo incorrecto' }, 400);
      }

      // Update status
      await db.update(tables.serenatas)
        .set({
          status: 'in_progress',
          actualStartTime: new Date(),
        })
        .where(eq(tables.serenatas.id, serenataId));

      // Notify client
      await db.insert(tables.serenataNotifications).values({
        userId: serenata.clientId,
        type: 'serenata',
        title: 'Serenata iniciada',
        body: 'El capitán ha llegado y comenzado la serenata',
        metadata: { serenataId, action: 'checkin' },
      });

      return c.json({ ok: true, message: 'Check-in exitoso' });
    } catch (error) {
      console.error('[serenatas/checkin] Error:', error);
      return c.json({ ok: false, error: 'Error en check-in' }, 500);
    }
  });

  // POST /serenatas/:id/checkout - Capitan confirma finalizacion
  app.post('/:id/checkout', requireAuth, async (c) => {
    try {
      const user = await authUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const serenataId = c.req.param('id');

      // Get serenata
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      // Verify captain
      const [captain] = await db.select().from(tables.serenataCaptainProfiles)
        .where(eq(tables.serenataCaptainProfiles.userId, user.id))
        .limit(1);

      if (!captain || serenata.captainId !== captain.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      // Update status
      await db.update(tables.serenatas)
        .set({
          status: 'completed',
          actualEndTime: new Date(),
        })
        .where(eq(tables.serenatas.id, serenataId));

      // Notify client
      await db.insert(tables.serenataNotifications).values({
        userId: serenata.clientId,
        type: 'serenata',
        title: 'Serenata completada',
        body: 'El capitán ha finalizado la serenata. Deja tu review!',
        metadata: { serenataId, action: 'checkout' },
      });

      return c.json({ ok: true, message: 'Check-out exitoso' });
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

      // Get serenata
      const [serenata] = await db.select().from(tables.serenatas)
        .where(eq(tables.serenatas.id, serenataId))
        .limit(1);

      if (!serenata) {
        return c.json({ ok: false, error: 'Serenata no encontrada' }, 404);
      }

      // Determine who is reviewing who
      let reviewedId: string;
      let reviewerRole: 'client' | 'captain';

      if (role === 'client' && serenata.clientId === user.id) {
        // Client reviewing captain
        reviewedId = serenata.captainId!;
        reviewerRole = 'client';
      } else if (role === 'captain') {
        // Captain reviewing client
        const [captain] = await db.select().from(tables.serenataCaptainProfiles)
          .where(eq(tables.serenataCaptainProfiles.userId, user.id))
          .limit(1);
        if (!captain || serenata.captainId !== captain.id) {
          return c.json({ ok: false, error: 'No autorizado' }, 403);
        }
        reviewedId = serenata.clientId;
        reviewerRole = 'captain';
      } else {
        return c.json({ ok: false, error: 'Rol invalido' }, 400);
      }

      // Check if review already exists
      const [existingReview] = await db.select().from(tables.serenataReviews)
        .where(and(
          eq(tables.serenataReviews.serenataId, serenataId),
          eq(tables.serenataReviews.reviewerId, user.id)
        ))
        .limit(1);

      if (existingReview) {
        return c.json({ ok: false, error: 'Ya dejaste un review para esta serenata' }, 400);
      }

      // Create review
      const [review] = await db.insert(tables.serenataReviews)
        .values({
          serenataId,
          groupId: serenata.captainId, // Using captainId as groupId for simplicity
          reviewerId: reviewedId, // The person being reviewed
          reviewerType: reviewerRole === 'client' ? 'client' : 'captain',
          overallRating: rating,
          comment: comment || null,
        })
        .returning();

      // Update average rating for the reviewed user/captain
      await service.updateAverageRating(reviewedId, reviewerRole === 'client' ? 'captain' : 'client');

      // Notify the reviewed user
      await db.insert(tables.serenataNotifications).values({
        userId: reviewedId,
        type: 'review',
        title: 'Nuevo review recibido',
        body: `${reviewerRole === 'client' ? 'Un cliente' : 'Un capitán'} te ha calificado con ${rating} estrellas`,
        metadata: { reviewId: review.id, serenataId },
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
        id: tables.serenataReviews.id,
        rating: tables.serenataReviews.overallRating,
        comment: tables.serenataReviews.comment,
        reviewerRole: tables.serenataReviews.reviewerType,
        createdAt: tables.serenataReviews.createdAt,
        reviewer: {
          id: tables.users.id,
          name: tables.users.name,
          avatarUrl: tables.users.avatarUrl,
        },
      })
      .from(tables.serenataReviews)
      .leftJoin(tables.users, eq(tables.serenataReviews.reviewerId, tables.users.id))
      .where(eq(tables.serenataReviews.serenataId, serenataId))
      .orderBy(desc(tables.serenataReviews.createdAt));

      return c.json({ ok: true, reviews });
    } catch (error) {
      console.error('[serenatas/reviews] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener reviews' }, 500);
    }
  });

  // GET /captains/:id/reviews - Obtener reviews de un capitán
  app.get('/captains/:id/reviews', async (c) => {
    try {
      const captainId = c.req.param('id');

      const reviews = await db.select({
        id: tables.serenataReviews.id,
        rating: tables.serenataReviews.overallRating,
        comment: tables.serenataReviews.comment,
        createdAt: tables.serenataReviews.createdAt,
        reviewer: {
          id: tables.users.id,
          name: tables.users.name,
          avatarUrl: tables.users.avatarUrl,
        },
        serenata: {
          id: tables.serenatas.id,
          recipientName: tables.serenatas.recipientName,
          date: tables.serenatas.date,
        },
      })
      .from(tables.serenataReviews)
      .leftJoin(tables.users, eq(tables.serenataReviews.reviewerId, tables.users.id))
      .leftJoin(tables.serenatas, eq(tables.serenataReviews.serenataId, tables.serenatas.id))
      .where(and(
        eq(tables.serenataReviews.reviewerId, captainId),
        eq(tables.serenataReviews.reviewerType, 'client')
      ))
      .orderBy(desc(tables.serenataReviews.createdAt));

      // Calculate stats
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

      return c.json({ ok: true, reviews, stats });
    } catch (error) {
      console.error('[serenatas/captains/reviews] Error:', error);
      return c.json({ ok: false, error: 'Error al obtener reviews' }, 500);
    }
  });

  // Create or update route for group
  app.post('/routes', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json().catch(() => null);
      const parsed = createRouteSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      // Check if group exists and user is captain
      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, parsed.data.groupId),
      });

      if (!group) {
        return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
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

      return c.json({ ok: true, route }, existing ? 200 : 201);
    } catch (error) {
      console.error('[serenatas/routes] Error creating route:', error);
      return c.json({ ok: false, error: 'Error al crear ruta' }, 500);
    }
  });

  // Optimize route for a group
  app.post('/routes/optimize', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json().catch(() => null);
      const parsed = optimizeRouteSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      // Get serenata details
      const serenatas = await db.query.serenataRequests.findMany({
        where: and(
          inArray(tables.serenataRequests.id, parsed.data.serenataIds),
          eq(tables.serenataRequests.status, 'assigned')
        ),
      });

      if (serenatas.length === 0) {
        return c.json({ ok: false, error: 'No se encontraron serenatas válidas' }, 400);
      }

      // Create waypoints from serenatas
      const waypoints = serenatas
        .filter((s: any) => s.lat && s.lng)
        .map((s: any) => ({
          lat: parseFloat(s.lat!.toString()),
          lng: parseFloat(s.lng!.toString()),
          serenataId: s.id,
          address: s.address,
          estimatedTime: s.dateTime.toISOString(),
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

  // Start route
  app.post('/routes/:id/start', async (c) => {
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

      // Check if user is captain
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      const group = route.group as any;
      if (!musician || group?.captainId !== musician.id) {
        return c.json({ ok: false, error: 'Solo el capitán puede iniciar la ruta' }, 403);
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

  // Complete route
  app.post('/routes/:id/complete', async (c) => {
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

  // Get route statistics
  app.get('/routes/:id/stats', async (c) => {
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

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS ROUTES
  // ═══════════════════════════════════════════════════════════════

  // Get my notifications
  app.get('/notifications', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
      const unreadOnly = c.req.query('unread') === 'true';

      let conditions = [eq(tables.serenataNotifications.userId, user.id)];
      if (unreadOnly) {
        conditions.push(eq(tables.serenataNotifications.isRead, false));
      }

      const notifications = await db.query.serenataNotifications.findMany({
        where: and(...conditions),
        limit,
        orderBy: [desc(tables.serenataNotifications.createdAt)],
      });

      const unreadCount = await db.query.serenataNotifications.findMany({
        where: and(
          eq(tables.serenataNotifications.userId, user.id),
          eq(tables.serenataNotifications.isRead, false)
        ),
      }).then((n: any[]) => n.length);

      return c.json({ ok: true, notifications, unreadCount });
    } catch (error) {
      console.error('[serenatas/notifications] Error getting notifications:', error);
      return c.json({ ok: false, error: 'Error al obtener notificaciones' }, 500);
    }
  });

  // Mark notification as read
  app.patch('/notifications/:id/read', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');

      const [updated] = await db.update(tables.serenataNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(tables.serenataNotifications.id, id),
          eq(tables.serenataNotifications.userId, user.id)
        ))
        .returning();

      if (!updated) {
        return c.json({ ok: false, error: 'Notificación no encontrada' }, 404);
      }

      return c.json({ ok: true });
    } catch (error) {
      console.error('[serenatas/notifications] Error marking as read:', error);
      return c.json({ ok: false, error: 'Error al marcar notificación' }, 500);
    }
  });

  // Mark all notifications as read
  app.post('/notifications/read-all', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      await db.update(tables.serenataNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(tables.serenataNotifications.userId, user.id),
          eq(tables.serenataNotifications.isRead, false)
        ));

      return c.json({ ok: true, message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
      console.error('[serenatas/notifications] Error marking all as read:', error);
      return c.json({ ok: false, error: 'Error al marcar notificaciones' }, 500);
    }
  });

  // Delete notification
  app.delete('/notifications/:id', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');

      await db.delete(tables.serenataNotifications)
        .where(and(
          eq(tables.serenataNotifications.id, id),
          eq(tables.serenataNotifications.userId, user.id)
        ));

      return c.json({ ok: true });
    } catch (error) {
      console.error('[serenatas/notifications] Error deleting notification:', error);
      return c.json({ ok: false, error: 'Error al eliminar notificación' }, 500);
    }
  });

  // Get unread count (for badge)
  app.get('/notifications/unread-count', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const count = await db.query.serenataNotifications.findMany({
        where: and(
          eq(tables.serenataNotifications.userId, user.id),
          eq(tables.serenataNotifications.isRead, false)
        ),
      }).then((n: any[]) => n.length);

      return c.json({ ok: true, count });
    } catch (error) {
      console.error('[serenatas/notifications] Error getting unread count:', error);
      return c.json({ ok: false, error: 'Error al obtener conteo' }, 500);
    }
  });

  // Get musician stats
  app.get('/musicians/me/stats', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      // Get completed serenatas count
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

  return app;
}
