import { eq, and, desc, gte, lte, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';

type Database = PostgresJsDatabase<typeof schema>;
import type { 
  CreateCaptainProfileInput, 
  CreateSerenataInput, 
  UpdateSerenataStatusInput,
  CreateReviewInput 
} from './types';

export class SerenatasService {
  constructor(private db: Database) {}

  // ==================== CAPTAIN PROFILES ====================

  async createCaptainProfile(userId: string, input: CreateCaptainProfileInput) {
    const values: any = {
      userId,
      ...input,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
    };
    // Convert decimal fields to strings if present
    if (input.latitude != null) values.latitude = String(input.latitude);
    if (input.longitude != null) values.longitude = String(input.longitude);
    
    const [profile] = await this.db
      .insert(schema.serenataCaptainProfiles)
      .values(values)
      .returning();
    return profile;
  }

  async getCaptainProfileByUserId(userId: string) {
    const [profile] = await this.db
      .select()
      .from(schema.serenataCaptainProfiles)
      .where(eq(schema.serenataCaptainProfiles.userId, userId));
    return profile;
  }

  async updateCaptainProfile(userId: string, input: Partial<CreateCaptainProfileInput>) {
    const profile = await this.getCaptainProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const values: any = { ...input, updatedAt: new Date() };
    // Convert decimal fields to strings if present
    if (input.latitude != null) values.latitude = String(input.latitude);
    if (input.longitude != null) values.longitude = String(input.longitude);
    
    const [updated] = await this.db
      .update(schema.serenataCaptainProfiles)
      .set(values)
      .where(eq(schema.serenataCaptainProfiles.id, profile.id))
      .returning();
    return updated;
  }

  // ==================== SERENATAS ====================

  async createSerenata(userId: string, input: CreateSerenataInput) {
    const values: any = {
      clientId: userId,
      ...input,
    };
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

  async getSerenatasByCaptain(captainId: string) {
    return await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.captainId, captainId))
      .orderBy(desc(schema.serenatas.createdAt));
  }

  async getAssignedSerenatasForCaptain(userId: string) {
    // First get the captain profile
    const profile = await this.getCaptainProfileByUserId(userId);
    if (!profile) return [];

    return await this.db
      .select()
      .from(schema.serenatas)
      .where(eq(schema.serenatas.captainId, profile.id))
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

  async assignSerenataToCaptain(serenataId: string, captainId: string) {
    const [updated] = await this.db
      .update(schema.serenatas)
      .set({ captainId, status: 'accepted', acceptedAt: new Date() })
      .where(eq(schema.serenatas.id, serenataId))
      .returning();
    return updated;
  }

  // Find available captains near a location
  async findCaptainsNearLocation(latitude: number, longitude: number, radius: number = 50) {
    return await this.db
      .select()
      .from(schema.serenataCaptainProfiles)
      .where(
        and(
          eq(schema.serenataCaptainProfiles.subscriptionStatus, 'active'),
          sql`ST_DWithin(
            ST_MakePoint(${longitude}, ${latitude})::geography,
            ST_MakePoint(${schema.serenataCaptainProfiles.longitude}, ${schema.serenataCaptainProfiles.latitude})::geography,
            ${radius * 1000}
          )`
        )
      );
  }

  // ==================== PAYMENTS ====================

  async createSerenataPayment(serenataId: string, clientId: string, captainId: string, amount: number) {
    // Get captain's subscription to determine commission
    const captain = await this.db
      .select()
      .from(schema.serenataCaptainProfiles)
      .where(eq(schema.serenataCaptainProfiles.id, captainId))
      .then(rows => rows[0]);

    let commission = 0;
    if (captain?.subscriptionPlan === 'free') commission = Math.round(amount * 0.20); // 20%
    else if (captain?.subscriptionPlan === 'pro') commission = Math.round(amount * 0.10); // 10%
    // premium = 0% commission

    const captainEarnings = amount - commission;

    const [payment] = await this.db
      .insert(schema.serenataPayments)
      .values({
        serenataId,
        clientId,
        captainId,
        totalAmount: amount,
        platformCommission: commission,
        captainEarnings,
        status: 'pending',
      })
      .returning();
    return payment;
  }

  // ==================== REVIEWS ====================

  async createReview(input: CreateReviewInput, reviewerId: string, reviewerType: 'client' | 'captain') {
    // Get serenata to determine reviewee
    const serenata = await this.getSerenataById(input.serenataId);
    if (!serenata) throw new Error('Serenata not found');

    const revieweeId = reviewerType === 'client' ? serenata.captainId : serenata.clientId;
    const revieweeType = reviewerType === 'client' ? 'captain' : 'client';

    const [review] = await this.db
      .insert(schema.serenataCapitanReviews)
      .values({
        serenataId: input.serenataId,
        reviewerId,
        reviewerType,
        revieweeId: revieweeId!,
        revieweeType,
        rating: input.rating,
        punctualityRating: input.punctualityRating,
        performanceRating: input.performanceRating,
        communicationRating: input.communicationRating,
        comment: input.comment,
      })
      .returning();

    // Update captain rating
    if (revieweeType === 'captain') {
      await this.updateCaptainRating(revieweeId!);
    }

    return review;
  }

  private async updateCaptainRating(captainId: string) {
    const reviews = await this.db
      .select({ rating: schema.serenataCapitanReviews.rating })
      .from(schema.serenataCapitanReviews)
      .where(eq(schema.serenataCapitanReviews.revieweeId, captainId));

    if (reviews.length > 0) {
      const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
      
      await this.db
        .update(schema.serenataCaptainProfiles)
        .set({ 
          rating: avgRating.toFixed(1), 
          reviewsCount: reviews.length 
        })
        .where(eq(schema.serenataCaptainProfiles.id, captainId));
    }
  }

  // ==================== MATCHING & STATS ====================

  async findMatchingCaptains(filters: { comuna: string; date: string; time: string; budget: number }) {
    const { comuna, date, time, budget } = filters;
    
    // Find captains in the same city/comuna with availability
    const captains = await this.db
      .select({
        id: schema.serenataCaptainProfiles.id,
        bio: schema.serenataCaptainProfiles.bio,
        city: schema.serenataCaptainProfiles.city,
        minPrice: schema.serenataCaptainProfiles.minPrice,
        maxPrice: schema.serenataCaptainProfiles.maxPrice,
        rating: schema.serenataCaptainProfiles.rating,
        reviewsCount: schema.serenataCaptainProfiles.reviewsCount,
        subscriptionPlan: schema.serenataCaptainProfiles.subscriptionPlan,
        userId: schema.serenataCaptainProfiles.userId,
      })
      .from(schema.serenataCaptainProfiles)
      .where(
        and(
          eq(schema.serenataCaptainProfiles.city, comuna),
          lte(schema.serenataCaptainProfiles.minPrice, budget),
          gte(schema.serenataCaptainProfiles.maxPrice, budget)
        )
      );

    // Get user info for each captain
    const captainsWithUsers = await Promise.all(
      captains.map(async (captain) => {
        const [user] = await this.db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            avatarUrl: schema.users.avatarUrl,
          })
          .from(schema.users)
          .where(eq(schema.users.id, captain.userId))
          .limit(1);
        
        return {
          ...captain,
          user: user || null,
        };
      })
    );

    return captainsWithUsers;
  }

  async updateAverageRating(reviewedId: string, type: 'captain' | 'client') {
    // Get all reviews for this user/captain
    // Note: reviewerId in serenataReviews stores the reviewed person's ID for simplicity
    const reviews = await this.db
      .select({ overallRating: schema.serenataReviews.overallRating })
      .from(schema.serenataReviews)
      .where(and(
        eq(schema.serenataReviews.reviewerId, reviewedId),
        eq(schema.serenataReviews.reviewerType, type === 'captain' ? 'client' : 'captain')
      ));

    if (reviews.length === 0) return;

    const average = reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length;

    if (type === 'captain') {
      await this.db
        .update(schema.serenataCaptainProfiles)
        .set({
          rating: String(average),
          reviewsCount: reviews.length,
        })
        .where(eq(schema.serenataCaptainProfiles.id, reviewedId));
    }
    // For clients, we could store in users table if needed
  }

  async getCaptainStats(captainId: string) {
    // Get serenatas count and earnings
    const serenatas = await this.db
      .select({
        id: schema.serenatas.id,
        price: schema.serenatas.price,
        status: schema.serenatas.status,
        createdAt: schema.serenatas.createdAt,
      })
      .from(schema.serenatas)
      .where(eq(schema.serenatas.captainId, captainId));

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

  async createSubscription(captainId: string, plan: 'free' | 'pro' | 'premium', priceMonthly: number) {
    const [subscription] = await this.db
      .insert(schema.serenataSubscriptions)
      .values({
        captainId,
        plan,
        priceMonthly,
        status: 'active',
      })
      .returning();
    return subscription;
  }

  async updateCaptainSubscription(userId: string, plan: 'free' | 'pro' | 'premium') {
    const profile = await this.getCaptainProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const priceMonthly = plan === 'free' ? 0 : plan === 'pro' ? 3900 : 7900; // CLP

    await this.db
      .update(schema.serenataCaptainProfiles)
      .set({ 
        subscriptionPlan: plan,
        subscriptionStartedAt: new Date(),
      })
      .where(eq(schema.serenataCaptainProfiles.id, profile.id));

    return await this.createSubscription(profile.id, plan, priceMonthly);
  }
}

export function createSerenatasService(db: Database) {
  return new SerenatasService(db);
}
