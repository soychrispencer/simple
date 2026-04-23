import { Hono, type Context } from 'hono';
import { eq, and, desc, asc, gte, lte, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Types for dependency injection
export type SerenatasRouterDeps = {
  db: any;
  authUser: (c: Context) => Promise<any | null>;
  tables: {
    serenataGroups: any;
    serenataGroupMembers: any;
    serenataMusicians: any;
    serenataRequests: any;
    serenataAssignments: any;
    serenataRoutes: any;
    serenataNotifications: any;
    users: any;
  };
};

// Validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  date: z.string().datetime(),
  serenataIds: z.array(z.string().uuid()).optional(),
});

const addMemberSchema = z.object({
  musicianId: z.string().uuid(),
  role: z.string().min(1).max(30),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  captainId: z.string().uuid().optional(),
  status: z.enum(['forming', 'confirmed', 'active', 'completed']).optional(),
});

const createMusicianSchema = z.object({
  instrument: z.enum(['trumpet', 'voice', 'guitar', 'vihuela', 'guitarron', 'violin', 'accordion', 'percussion', 'other']),
  experience: z.number().min(0).optional(),
  bio: z.string().max(500).optional(),
  comuna: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const updateMusicianProfileSchema = z.object({
  instrument: z.enum(['trumpet', 'voice', 'guitar', 'vihuela', 'guitarron', 'violin', 'accordion', 'percussion', 'other']).optional(),
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
  const { db, authUser, tables } = deps;

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
      const id = c.req.param('id');

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, id),
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
          assignments: {
            with: {
              serenata: true,
            },
          },
        },
      });

      if (!group) {
        return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      }

      return c.json({ ok: true, group });
    } catch (error) {
      console.error('[serenatas/groups] Error getting group:', error);
      return c.json({ ok: false, error: 'Error al obtener grupo' }, 500);
    }
  });

  // Create group
  app.post('/groups', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const body = await c.req.json().catch(() => null);
      const parsed = createGroupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      // Check if user is a musician
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Debes ser músico para crear un grupo' }, 403);
      }

      // Create group with captain
      const [group] = await db.insert(tables.serenataGroups).values({
        name: parsed.data.name,
        date: new Date(parsed.data.date),
        captainId: musician.id,
        status: 'forming',
      }).returning();

      // Add creator as first member
      await db.insert(tables.serenataGroupMembers).values({
        groupId: group.id,
        musicianId: musician.id,
        role: 'captain',
      });

      return c.json({ ok: true, group }, 201);
    } catch (error) {
      console.error('[serenatas/groups] Error creating group:', error);
      return c.json({ ok: false, error: 'Error al crear grupo' }, 500);
    }
  });

  // Update group
  app.patch('/groups/:id', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');
      const body = await c.req.json().catch(() => null);
      const parsed = updateGroupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      // Check if user is captain
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      const group = await db.query.serenataGroups.findFirst({
        where: eq(tables.serenataGroups.id, id),
      });

      if (!group) {
        return c.json({ ok: false, error: 'Grupo no encontrado' }, 404);
      }

      if (!musician || group.captainId !== musician.id) {
        return c.json({ ok: false, error: 'Solo el capitán puede editar el grupo' }, 403);
      }

      const [updated] = await db.update(tables.serenataGroups)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataGroups.id, id))
        .returning();

      return c.json({ ok: true, group: updated });
    } catch (error) {
      console.error('[serenatas/groups] Error updating group:', error);
      return c.json({ ok: false, error: 'Error al actualizar grupo' }, 500);
    }
  });

  // Add member to group
  app.post('/groups/:id/members', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const groupId = c.req.param('id');
      const body = await c.req.json().catch(() => null);
      const parsed = addMemberSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      // Check if user is captain
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
        return c.json({ ok: false, error: 'Solo el capitán puede agregar miembros' }, 403);
      }

      // Check if musician exists
      const memberMusician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.id, parsed.data.musicianId),
      });

      if (!memberMusician) {
        return c.json({ ok: false, error: 'Músico no encontrado' }, 404);
      }

      // Check if already member
      const existing = await db.query.serenataGroupMembers.findFirst({
        where: and(
          eq(tables.serenataGroupMembers.groupId, groupId),
          eq(tables.serenataGroupMembers.musicianId, parsed.data.musicianId)
        ),
      });

      if (existing) {
        return c.json({ ok: false, error: 'El músico ya es miembro del grupo' }, 409);
      }

      const [member] = await db.insert(tables.serenataGroupMembers).values({
        groupId,
        musicianId: parsed.data.musicianId,
        role: parsed.data.role,
      }).returning();

      return c.json({ ok: true, member }, 201);
    } catch (error) {
      console.error('[serenatas/groups] Error adding member:', error);
      return c.json({ ok: false, error: 'Error al agregar miembro' }, 500);
    }
  });

  // Remove member from group
  app.delete('/groups/:id/members/:musicianId', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const groupId = c.req.param('id');
      const musicianId = c.req.param('musicianId');

      // Check if user is captain
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
        return c.json({ ok: false, error: 'Solo el capitán puede remover miembros' }, 403);
      }

      // Cannot remove captain
      if (musicianId === group.captainId) {
        return c.json({ ok: false, error: 'No puedes remover al capitán' }, 400);
      }

      await db.delete(tables.serenataGroupMembers)
        .where(and(
          eq(tables.serenataGroupMembers.groupId, groupId),
          eq(tables.serenataGroupMembers.musicianId, musicianId)
        ));

      return c.json({ ok: true });
    } catch (error) {
      console.error('[serenatas/groups] Error removing member:', error);
      return c.json({ ok: false, error: 'Error al remover miembro' }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // MUSICIANS ROUTES
  // ═══════════════════════════════════════════════════════════════

  // List all musicians (public endpoint with filters)
  app.get('/musicians', async (c) => {
    try {
      const instrument = c.req.query('instrument');
      const available = c.req.query('available');
      const availableNow = c.req.query('availableNow');
      const comuna = c.req.query('comuna');
      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
      const offset = parseInt(c.req.query('offset') || '0');

      let conditions = [];

      if (instrument) {
        conditions.push(eq(tables.serenataMusicians.instrument, instrument));
      }

      if (available === 'true') {
        conditions.push(eq(tables.serenataMusicians.isAvailable, true));
      }

      if (availableNow === 'true') {
        conditions.push(eq(tables.serenataMusicians.availableNow, true));
      }

      if (comuna) {
        conditions.push(eq(tables.serenataMusicians.comuna, comuna));
      }

      const musicians = await db.query.serenataMusicians.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        with: {
          user: {
            columns: { id: true, name: true, avatarUrl: true, phone: true },
          },
        },
        orderBy: [desc(tables.serenataMusicians.rating)],
      });

      return c.json({ ok: true, musicians });
    } catch (error) {
      console.error('[serenatas/musicians] Error listing musicians:', error);
      return c.json({ ok: false, error: 'Error al listar músicos' }, 500);
    }
  });

  // Get musician by ID
  app.get('/musicians/:id', async (c) => {
    try {
      const id = c.req.param('id');

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.id, id),
        with: {
          user: {
            columns: { id: true, name: true, avatarUrl: true, phone: true },
          },
          memberships: {
            with: {
              group: true,
            },
          },
        },
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Músico no encontrado' }, 404);
      }

      return c.json({ ok: true, musician });
    } catch (error) {
      console.error('[serenatas/musicians] Error getting musician:', error);
      return c.json({ ok: false, error: 'Error al obtener músico' }, 500);
    }
  });

  // Get my musician profile
  app.get('/musicians/me/profile', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
        with: {
          user: {
            columns: { id: true, name: true, avatarUrl: true, phone: true },
          },
        },
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Perfil de músico no encontrado' }, 404);
      }

      return c.json({ ok: true, musician });
    } catch (error) {
      console.error('[serenatas/musicians] Error getting profile:', error);
      return c.json({ ok: false, error: 'Error al obtener perfil' }, 500);
    }
  });

  // Create musician profile
  app.post('/musicians', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      // Check if already has musician profile
      const existing = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.userId, user.id),
      });

      if (existing) {
        return c.json({ ok: false, error: 'Ya tienes un perfil de músico' }, 409);
      }

      const body = await c.req.json().catch(() => null);
      const parsed = createMusicianSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      const [musician] = await db.insert(tables.serenataMusicians).values({
        userId: user.id,
        ...parsed.data,
        isAvailable: true,
        availableNow: false,
      }).returning();

      return c.json({ ok: true, musician }, 201);
    } catch (error) {
      console.error('[serenatas/musicians] Error creating musician:', error);
      return c.json({ ok: false, error: 'Error al crear perfil de músico' }, 500);
    }
  });

  // Update musician profile
  app.patch('/musicians/:id', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');
      const body = await c.req.json().catch(() => null);
      const parsed = updateMusicianProfileSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      // Check ownership
      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.id, id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Músico no encontrado' }, 404);
      }

      if (musician.userId !== user.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const [updated] = await db.update(tables.serenataMusicians)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataMusicians.id, id))
        .returning();

      return c.json({ ok: true, musician: updated });
    } catch (error) {
      console.error('[serenatas/musicians] Error updating musician:', error);
      return c.json({ ok: false, error: 'Error al actualizar músico' }, 500);
    }
  });

  // Update availability
  app.patch('/musicians/:id/availability', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');
      const body = await c.req.json().catch(() => null);
      const parsed = updateMusicianAvailabilitySchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      const musician = await db.query.serenataMusicians.findFirst({
        where: eq(tables.serenataMusicians.id, id),
      });

      if (!musician) {
        return c.json({ ok: false, error: 'Músico no encontrado' }, 404);
      }

      if (musician.userId !== user.id) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
      }

      const [updated] = await db.update(tables.serenataMusicians)
        .set({
          isAvailable: parsed.data.isAvailable,
          availableNow: parsed.data.availableNow,
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataMusicians.id, id))
        .returning();

      return c.json({ ok: true, musician: updated });
    } catch (error) {
      console.error('[serenatas/musicians] Error updating availability:', error);
      return c.json({ ok: false, error: 'Error al actualizar disponibilidad' }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // REQUESTS ROUTES
  // ═══════════════════════════════════════════════════════════════

  // List serenata requests with filters
  app.get('/requests', async (c) => {
    try {
      const status = c.req.query('status');
      const urgency = c.req.query('urgency');
      const dateFrom = c.req.query('dateFrom');
      const dateTo = c.req.query('dateTo');
      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
      const offset = parseInt(c.req.query('offset') || '0');

      let conditions = [];

      if (status) {
        conditions.push(eq(tables.serenataRequests.status, status));
      }

      if (urgency) {
        conditions.push(eq(tables.serenataRequests.urgency, urgency));
      }

      if (dateFrom) {
        conditions.push(gte(tables.serenataRequests.dateTime, new Date(dateFrom)));
      }

      if (dateTo) {
        conditions.push(lte(tables.serenataRequests.dateTime, new Date(dateTo)));
      }

      const requests = await db.query.serenataRequests.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        orderBy: [asc(tables.serenataRequests.dateTime)],
      });

      return c.json({ ok: true, requests });
    } catch (error) {
      console.error('[serenatas/requests] Error listing requests:', error);
      return c.json({ ok: false, error: 'Error al listar solicitudes' }, 500);
    }
  });

  // Get request by ID
  app.get('/requests/:id', async (c) => {
    try {
      const id = c.req.param('id');

      const request = await db.query.serenataRequests.findFirst({
        where: eq(tables.serenataRequests.id, id),
        with: {
          assignments: {
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
          },
        },
      });

      if (!request) {
        return c.json({ ok: false, error: 'Solicitud no encontrada' }, 404);
      }

      return c.json({ ok: true, request });
    } catch (error) {
      console.error('[serenatas/requests] Error getting request:', error);
      return c.json({ ok: false, error: 'Error al obtener solicitud' }, 500);
    }
  });

  // Create serenata request (public endpoint)
  app.post('/requests', async (c) => {
    try {
      const body = await c.req.json().catch(() => null);
      const parsed = createRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      const [request] = await db.insert(tables.serenataRequests).values({
        ...parsed.data,
        status: 'pending',
        dateTime: new Date(parsed.data.dateTime),
      }).returning();

      return c.json({ ok: true, request }, 201);
    } catch (error) {
      console.error('[serenatas/requests] Error creating request:', error);
      return c.json({ ok: false, error: 'Error al crear solicitud' }, 500);
    }
  });

  // Update request
  app.patch('/requests/:id', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

      const id = c.req.param('id');
      const body = await c.req.json().catch(() => null);
      const parsed = updateRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
      }

      const [updated] = await db.update(tables.serenataRequests)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(tables.serenataRequests.id, id))
        .returning();

      return c.json({ ok: true, request: updated });
    } catch (error) {
      console.error('[serenatas/requests] Error updating request:', error);
      return c.json({ ok: false, error: 'Error al actualizar solicitud' }, 500);
    }
  });

  // Assign request to group
  app.post('/requests/:id/assign', async (c) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

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
  // ROUTES (TRAYECTOS) ROUTES
  // ═══════════════════════════════════════════════════════════════

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
