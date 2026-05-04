import { eq, and, desc, gte, lte, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';

type Database = PostgresJsDatabase<typeof schema>;
import { computeSerenataPlatformFees } from './constants';
import type { 
  CreateCoordinatorProfileInput, 
  CreateSerenataInput, 
  UpdateSerenataStatusInput,
  CreateReviewInput 
} from './types';

export class SerenatasService {
  constructor(private db: Database) {}

  // ==================== COORDINATOR PROFILES ====================

  async createCoordinatorProfile(userId: string, input: CreateCoordinatorProfileInput) {
    const { subscriptionPlan: planChoice, ...fields } = input as CreateCoordinatorProfileInput & {
      subscriptionPlan?: 'free' | 'pro' | 'premium';
    };
    const values: any = {
      userId,
      ...fields,
      subscriptionPlan: planChoice ?? 'free',
      subscriptionStatus: 'active',
    };
    // Convert decimal fields to strings if present
    if (input.latitude != null) values.latitude = String(input.latitude);
    if (input.longitude != null) values.longitude = String(input.longitude);
    
    const [profile] = await this.db
      .insert(schema.serenataCoordinatorProfiles)
      .values(values)
      .returning();
    return profile;
  }

  async getCoordinatorProfileByUserId(userId: string) {
    const [profile] = await this.db
      .select()
      .from(schema.serenataCoordinatorProfiles)
      .where(eq(schema.serenataCoordinatorProfiles.userId, userId));
    return profile;
  }

  async updateCoordinatorProfile(userId: string, input: Partial<CreateCoordinatorProfileInput>) {
    const profile = await this.getCoordinatorProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const values: any = { ...input, updatedAt: new Date() };
    // Convert decimal fields to strings if present
    if (input.latitude != null) values.latitude = String(input.latitude);
    if (input.longitude != null) values.longitude = String(input.longitude);
    
    const [updated] = await this.db
      .update(schema.serenataCoordinatorProfiles)
      .set(values)
      .where(eq(schema.serenataCoordinatorProfiles.id, profile.id))
      .returning();
    return updated;
  }

  // ==================== SERENATAS ====================

  async createSerenata(userId: string, input: CreateSerenataInput & { coordinatorId?: string }) {
    const { coordinatorId, ...rest } = input as CreateSerenataInput & { coordinatorId?: string };
    const values: any = {
      clientId: userId,
      ...rest,
    };
    if (coordinatorId) {
      values.coordinatorProfileId = coordinatorId;
    }
    // Convert decimal fields to strings if present
    if (input.latitude != null) values.latitude = String(input.latitude);
    if (input.longitude != null) values.longitude = String(input.longitude);
    
    const [serenata] = await this.db
      .insert(schema.serenatas)
      .values(values)
      .returning();
    return serenata;
  }

  async getSerenataById(id: string) {
    const [serenata] = await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.id, id));
    return serenata;
  }

  async getSerenatasByClient(clientId: string) {
    return await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.clientId, clientId))
      .orderBy(desc(schema.serenatas.createdAt));
  }

  async getSerenatasByCoordinator(coordinatorId: string) {
    return await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.coordinatorProfileId, coordinatorId))
      .orderBy(desc(schema.serenatas.createdAt));
  }

  async getAssignedSerenatasForCoordinator(userId: string) {
    // Perfil coordinador del usuario
    const profile = await this.getCoordinatorProfileByUserId(userId);
    if (!profile) return [];

    return await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.coordinatorProfileId, profile.id))
      .orderBy(desc(schema.serenatas.createdAt));
  }

  async updateSerenataStatus(id: string, input: UpdateSerenataStatusInput) {
    const updateData: any = { status: input.status };
    
    if (input.price) updateData.price = input.price;
    
    // Set timestamps based on status
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

  async assignSerenataToCoordinator(serenataId: string, coordinatorId: string) {
    const [updated] = await this.db
      .update(schema.serenatas)
      .set({ coordinatorProfileId: coordinatorId, status: 'accepted', acceptedAt: new Date() })
      .where(eq(schema.serenatas.id, serenataId))
      .returning();
    return updated;
  }

  /** Coordinadores con suscripción activa cerca de un punto (radio en km). */
  async findCoordinatorsNearLocation(latitude: number, longitude: number, radius: number = 50) {
    return await this.db
      .select()
      .from(schema.serenataCoordinatorProfiles)
      .where(
        and(
          eq(schema.serenataCoordinatorProfiles.subscriptionStatus, 'active'),
          sql`ST_DWithin(
            ST_MakePoint(${longitude}, ${latitude})::geography,
            ST_MakePoint(${schema.serenataCoordinatorProfiles.longitude}, ${schema.serenataCoordinatorProfiles.latitude})::geography,
            ${radius * 1000}
          )`
        )
      );
  }

  // ==================== PAYMENTS ====================

  async createSerenataPayment(serenataId: string, clientId: string, coordinatorProfileId: string, amount: number) {
    const [serenata] = await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.id, serenataId))
      .limit(1);

    const fees = computeSerenataPlatformFees(amount, serenata?.source);

    const [payment] = await this.db
      .insert(schema.serenataPayments)
      .values({
        serenataId,
        clientId,
        coordinatorProfileId,
        totalAmount: amount,
        platformCommission: fees.platformCommission,
        commissionVat: fees.commissionVat,
        coordinatorEarnings: fees.coordinatorEarnings,
        status: 'pending',
      })
      .returning();
    return payment;
  }

  // ==================== REVIEWS ====================

  async createReview(input: CreateReviewInput, reviewerId: string, reviewerType: 'client' | 'coordinator') {
    const serenata = await this.getSerenataById(input.serenataId);
    if (!serenata) throw new Error('Serenata not found');

    let revieweeUserId: string;
    const revieweeType = reviewerType === 'client' ? 'coordinator' : 'client';

    if (reviewerType === 'client') {
      if (!serenata.coordinatorProfileId) throw new Error('Serenata sin coordinador');
      const [coordProf] = await this.db
        .select({ userId: schema.serenataCoordinatorProfiles.userId })
        .from(schema.serenataCoordinatorProfiles)
        .where(eq(schema.serenataCoordinatorProfiles.id, serenata.coordinatorProfileId))
        .limit(1);
      if (!coordProf) throw new Error('Perfil coordinador no encontrado');
      revieweeUserId = coordProf.userId;
    } else {
      revieweeUserId = serenata.clientId;
    }

    const [review] = await this.db
      .insert(schema.serenataCoordinatorReviews)
      .values({
        serenataId: input.serenataId,
        reviewerId,
        reviewerType,
        revieweeId: revieweeUserId,
        revieweeType,
        rating: input.rating,
        punctualityRating: input.punctualityRating,
        performanceRating: input.performanceRating,
        communicationRating: input.communicationRating,
        comment: input.comment,
      })
      .returning();

    if (revieweeType === 'coordinator') {
      await this.updateCoordinatorRatingAggregate(serenata.coordinatorProfileId!);
    }

    return review;
  }

  private async updateCoordinatorRatingAggregate(coordinatorProfileId: string) {
    const [prof] = await this.db
      .select({ userId: schema.serenataCoordinatorProfiles.userId })
      .from(schema.serenataCoordinatorProfiles)
      .where(eq(schema.serenataCoordinatorProfiles.id, coordinatorProfileId))
      .limit(1);
    if (!prof) return;

    const reviews = await this.db
      .select({ rating: schema.serenataCoordinatorReviews.rating })
      .from(schema.serenataCoordinatorReviews)
      .where(
        and(
          eq(schema.serenataCoordinatorReviews.revieweeId, prof.userId),
          eq(schema.serenataCoordinatorReviews.revieweeType, 'coordinator'),
        ),
      );

    if (reviews.length === 0) return;

    const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

    await this.db
      .update(schema.serenataCoordinatorProfiles)
      .set({
        rating: avgRating.toFixed(1),
        reviewsCount: reviews.length,
      })
      .where(eq(schema.serenataCoordinatorProfiles.id, coordinatorProfileId));
  }

  // ==================== MATCHING & STATS ====================

  async findMatchingCoordinators(filters: { comuna: string; date: string; time: string; budget: number }) {
    const { comuna, date, time, budget } = filters;
    
    const coordinators = await this.db
      .select({
        id: schema.serenataCoordinatorProfiles.id,
        bio: schema.serenataCoordinatorProfiles.bio,
        city: schema.serenataCoordinatorProfiles.city,
        minPrice: schema.serenataCoordinatorProfiles.minPrice,
        maxPrice: schema.serenataCoordinatorProfiles.maxPrice,
        rating: schema.serenataCoordinatorProfiles.rating,
        reviewsCount: schema.serenataCoordinatorProfiles.reviewsCount,
        subscriptionPlan: schema.serenataCoordinatorProfiles.subscriptionPlan,
        userId: schema.serenataCoordinatorProfiles.userId,
      })
      .from(schema.serenataCoordinatorProfiles)
      .where(
        and(
          eq(schema.serenataCoordinatorProfiles.city, comuna),
          lte(schema.serenataCoordinatorProfiles.minPrice, budget),
          gte(schema.serenataCoordinatorProfiles.maxPrice, budget)
        )
      );

    const coordinatorsWithUsers = await Promise.all(
      coordinators.map(async (coord) => {
        const [user] = await this.db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            avatarUrl: schema.users.avatarUrl,
          })
          .from(schema.users)
          .where(eq(schema.users.id, coord.userId))
          .limit(1);
        
        return {
          ...coord,
          user: user || null,
        };
      })
    );

    return coordinatorsWithUsers;
  }

  async getCoordinatorStats(coordinatorId: string) {
    // Conteo de serenatas y montos por estado (precio como referencia)
    const serenatas = await this.db
      .select({
        id: schema.serenatas.id,
        price: schema.serenatas.price,
        status: schema.serenatas.status,
        createdAt: schema.serenatas.createdAt,
      })
      .from(schema.serenatas)
      .where(eq(schema.serenatas.coordinatorProfileId, coordinatorId));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthSerenatas = serenatas.filter(
      s => new Date(s.createdAt) >= startOfMonth
    );

    const stats = {
      total: serenatas.length,
      completed: serenatas.filter(s => s.status === 'completed').length,
      pending: serenatas.filter(s => s.status === 'pending').length,
      confirmed: serenatas.filter(s => s.status === 'confirmed').length,
      earnings: thisMonthSerenatas
        .filter(s => s.status === 'completed' || s.status === 'confirmed')
        .reduce((sum, s) => sum + (s.price || 0), 0),
      totalEarnings: serenatas
        .filter(s => s.status === 'completed' || s.status === 'confirmed')
        .reduce((sum, s) => sum + (s.price || 0), 0),
    };

    return stats;
  }

  // ==================== SUBSCRIPTIONS ====================

  async createSubscription(coordinatorProfileId: string, plan: 'free' | 'pro' | 'premium', priceMonthly: number) {
    const [subscription] = await this.db
      .insert(schema.serenataSubscriptions)
      .values({
        coordinatorProfileId,
        plan,
        priceMonthly,
        status: 'active',
      })
      .returning();
    return subscription;
  }

  async updateCoordinatorSubscription(userId: string, plan: 'free' | 'pro' | 'premium') {
    const profile = await this.getCoordinatorProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const priceMonthly = plan === 'free' ? 0 : plan === 'pro' ? 3900 : 7900; // CLP

    await this.db
      .update(schema.serenataCoordinatorProfiles)
      .set({ 
        subscriptionPlan: plan,
        subscriptionStartedAt: new Date(),
      })
      .where(eq(schema.serenataCoordinatorProfiles.id, profile.id));

    return await this.createSubscription(profile.id, plan, priceMonthly);
  }
}

export function createSerenatasService(db: Database) {
  return new SerenatasService(db);
}
