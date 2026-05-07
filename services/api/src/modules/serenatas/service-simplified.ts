// ============================================================================
// SERVICE SIMPLIFICADO - SOLO FUNCIONES ESENCIALES
// ============================================================================

import { eq, and, or, desc, asc, gte, lte, sql, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema.js';
import {
  PLATFORM_COMMISSION_RATE,
  PLATFORM_COMMISSION_VAT_RATE,
  isPlatformCommissionSource,
} from './constants.js';

// ============================================================================
// TIPOS SIMPLIFICADOS
// ============================================================================

export type CreateSerenataInput = {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // HH:MM
  duration?: number;
  address: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  recipientName?: string;
  recipientRelation?: string;
  message?: string;
  songRequests?: string[];
  price?: number;
  eventType?: 'serenata' | 'cumpleanos' | 'aniversario' | 'propuesta' | 'otro';
  coordinatorId?: string; // Si ya hay coordinador asignado
};

export type UpdateSerenataStatusInput = {
  status: 'pending' | 'quoted' | 'accepted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price?: number;
  coordinatorProfileId?: string;
};

export type CreateLineupInput = {
  serenataId: string;
  musicianId: string;
  instrument?: string;
  paymentAmount?: number;
};

// ============================================================================
// UTILIDADES
// ============================================================================

function computePlatformFees(amountClp: number, source: string) {
  if (!isPlatformCommissionSource(source)) {
    return { platformFee: 0, coordinatorEarnings: amountClp };
  }
  const net = Math.round(amountClp * PLATFORM_COMMISSION_RATE);
  const vat = Math.round(net * PLATFORM_COMMISSION_VAT_RATE);
  return {
    platformFee: net + vat,
    coordinatorEarnings: Math.max(0, amountClp - net - vat),
  };
}

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

export class SerenatasSimplifiedService {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  // ==========================================================================
  // SERENATAS - CRUD BÁSICO
  // ==========================================================================

  async createSerenata(userId: string, input: CreateSerenataInput) {
    const values: any = {
      clientId: userId,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      eventType: input.eventType || 'serenata',
      eventDate: input.eventDate,
      eventTime: input.eventTime,
      duration: input.duration || 30,
      address: input.address,
      city: input.city,
      region: input.region,
      latitude: input.latitude?.toString(),
      longitude: input.longitude?.toString(),
      recipientName: input.recipientName,
      recipientRelation: input.recipientRelation,
      message: input.message,
      songRequests: input.songRequests,
      price: input.price,
      status: input.coordinatorId ? 'confirmed' : 'pending',
      coordinatorProfileId: input.coordinatorId,
      source: input.coordinatorId ? 'own_lead' : 'platform_lead',
    };

    // Si hay coordinador, calcular comisión
    if (input.coordinatorId && input.price) {
      const fees = computePlatformFees(input.price, values.source);
      values.commission = fees.platformFee;
      values.coordinatorEarnings = fees.coordinatorEarnings;
    }

    // Si hay coordinador, marcar confirmedAt
    if (input.coordinatorId) {
      values.confirmedAt = new Date();
    }

    const [serenata] = await this.db.insert(schema.serenatas).values(values).returning();
    return serenata;
  }

  async getSerenataById(id: string) {
    const [serenata] = await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.id, id));
    return serenata;
  }

  async getSerenataWithDetails(id: string) {
    const [serenata] = await this.db.query.serenatas.findMany({
      where: eq(schema.serenatas.id, id),
      with: {
        client: true,
        coordinatorProfile: { with: { user: true } },
        lineup: { with: { musician: { with: { user: true } } } },
        group: { with: { members: { with: { musician: { with: { user: true } } } } } },
      },
      limit: 1,
    });
    return serenata;
  }

  async getSerenatasByClient(clientId: string, limit = 50) {
    return await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.clientId, clientId))
      .orderBy(desc(schema.serenatas.createdAt))
      .limit(limit);
  }

  async getSerenatasForCoordinator(coordinatorProfileId: string, status?: string) {
    let query = this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.coordinatorProfileId, coordinatorProfileId));
    
    if (status) {
      query = query.where(eq(schema.serenatas.status, status));
    }
    
    return await query.orderBy(desc(schema.serenatas.eventDate));
  }

  async getPendingSerenatasForMatching(city?: string, region?: string, limit = 20) {
    let query = this.db
      .select()
      .from(schema.serenatas)
      .where(and(
        eq(schema.serenatas.status, 'pending'),
        isNull(schema.serenatas.coordinatorProfileId)
      ));
    
    if (city) {
      query = query.where(eq(schema.serenatas.city, city));
    }
    
    return await query
      .orderBy(asc(schema.serenatas.eventDate))
      .limit(limit);
  }

  async updateSerenataStatus(id: string, input: UpdateSerenataStatusInput) {
    const updateData: any = { status: input.status, updatedAt: new Date() };

    // Precio y comisiones
    if (input.price) {
      updateData.price = input.price;
      const serenata = await this.getSerenataById(id);
      if (serenata) {
        const fees = computePlatformFees(input.price, serenata.source);
        updateData.commission = fees.platformFee;
        updateData.coordinatorEarnings = fees.coordinatorEarnings;
      }
    }

    // Asignar coordinador
    if (input.coordinatorProfileId) {
      updateData.coordinatorProfileId = input.coordinatorProfileId;
    }

    // Timestamps de estado
    if (input.status === 'quoted') updateData.quotedAt = new Date();
    if (input.status === 'accepted') updateData.acceptedAt = new Date();
    if (input.status === 'confirmed') updateData.confirmedAt = new Date();
    if (input.status === 'completed') updateData.completedAt = new Date();
    if (input.status === 'cancelled') updateData.cancelledAt = new Date();

    const [updated] = await this.db
      .update(schema.serenatas)
      .set(updateData)
      .where(eq(schema.serenatas.id, id))
      .returning();
    return updated;
  }

  async acceptSerenataAsCoordinator(serenataId: string, coordinatorProfileId: string) {
    return await this.updateSerenataStatus(serenataId, {
      status: 'accepted',
      coordinatorProfileId,
    });
  }

  // ==========================================================================
  // COORDINADOR PROFILES
  // ==========================================================================

  async getCoordinatorProfileByUserId(userId: string) {
    const [profile] = await this.db
      .select()
      .from(schema.serenataCoordinatorProfiles)
      .where(eq(schema.serenataCoordinatorProfiles.userId, userId));
    return profile;
  }

  async createCoordinatorProfile(userId: string, data: Partial<schema.NewSerenataCoordinatorProfile>) {
    const [profile] = await this.db
      .insert(schema.serenataCoordinatorProfiles)
      .values({
        userId,
        ...data,
        subscriptionStatus: 'paused',
      } as any)
      .returning();
    return profile;
  }

  async updateCoordinatorProfile(userId: string, data: Partial<schema.NewSerenataCoordinatorProfile>) {
    const profile = await this.getCoordinatorProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const [updated] = await this.db
      .update(schema.serenataCoordinatorProfiles)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(schema.serenataCoordinatorProfiles.id, profile.id))
      .returning();
    return updated;
  }

  // ==========================================================================
  // MATCHING - Coordinadores disponibles para una serenata
  // ==========================================================================

  async findMatchingCoordinators(filters: { city?: string; region?: string; date?: string; time?: string }) {
    const { city, region } = filters;
    
    let query = this.db
      .select({
        profile: schema.serenataCoordinatorProfiles,
        user: schema.users,
      })
      .from(schema.serenataCoordinatorProfiles)
      .innerJoin(schema.users, eq(schema.serenataCoordinatorProfiles.userId, schema.users.id))
      .where(eq(schema.serenataCoordinatorProfiles.subscriptionStatus, 'active'));
    
    if (city) {
      query = query.where(
        or(
          eq(schema.serenataCoordinatorProfiles.city, city),
          isNull(schema.serenataCoordinatorProfiles.city)
        )
      );
    }
    
    const coordinators = await query.limit(20);
    
    return coordinators.map(c => ({
      id: c.profile.id,
      name: c.user.name,
      phone: c.user.phone,
      city: c.profile.city,
      region: c.profile.region,
      serviceRadius: c.profile.serviceRadius,
    }));
  }

  // ==========================================================================
  // LINEUP - Asignación de músicos
  // ==========================================================================

  async addMusicianToLineup(input: CreateLineupInput) {
    const [lineup] = await this.db
      .insert(schema.serenataMusicianLineup)
      .values({
        serenataId: input.serenataId,
        musicianId: input.musicianId,
        instrument: input.instrument,
        paymentAmount: input.paymentAmount,
        status: 'pending',
      })
      .returning();
    return lineup;
  }

  async acceptLineupInvitation(lineupId: string) {
    const [updated] = await this.db
      .update(schema.serenataMusicianLineup)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(eq(schema.serenataMusicianLineup.id, lineupId))
      .returning();
    return updated;
  }

  async getLineupForSerenata(serenataId: string) {
    return await this.db.query.serenataMusicianLineup.findMany({
      where: eq(schema.serenataMusicianLineup.serenataId, serenataId),
      with: { musician: { with: { user: true } } },
    });
  }

  // ==========================================================================
  // CUADRILLA - Músicos del coordinador
  // ==========================================================================

  async getCrewMembers(coordinatorProfileId: string) {
    return await this.db.query.serenataMusicians.findMany({
      where: and(
        eq(schema.serenataMusicians.isCrewMember, true),
        eq(schema.serenataMusicians.coordinatorProfileId, coordinatorProfileId)
      ),
      with: { user: true },
    });
  }

  async addMusicianToCrew(musicianId: string, coordinatorProfileId: string) {
    const [updated] = await this.db
      .update(schema.serenataMusicians)
      .set({
        isCrewMember: true,
        coordinatorProfileId,
        crewSince: new Date(),
      })
      .where(eq(schema.serenataMusicians.id, musicianId))
      .returning();
    return updated;
  }

  // ==========================================================================
  // GRUPOS
  // ==========================================================================

  async createGroup(coordinatorProfileId: string, name: string, date: Date) {
    const [group] = await this.db
      .insert(schema.serenataGroups)
      .values({
        coordinatorProfileId,
        name,
        date,
        status: 'forming',
      })
      .returning();
    return group;
  }

  async addMemberToGroup(groupId: string, musicianId: string, instrument?: string) {
    const [member] = await this.db
      .insert(schema.serenataGroupMembers)
      .values({ groupId, musicianId, instrument })
      .returning();
    return member;
  }

  async assignSerenataToGroup(serenataId: string, groupId: string) {
    const [updated] = await this.db
      .update(schema.serenatas)
      .set({ groupId, updatedAt: new Date() })
      .where(eq(schema.serenatas.id, serenataId))
      .returning();
    return updated;
  }
}

// Factory function
export function createSerenatasSimplifiedService(db: PostgresJsDatabase<typeof schema>) {
  return new SerenatasSimplifiedService(db);
}
