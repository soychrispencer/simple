export type VerticalKey = "autos" | "properties" | "stores" | "food";

export type UnifiedPlanKey = "free" | "pro" | "enterprise";
export type LegacyPlanKey = UnifiedPlanKey | "business" | "basic";
export type AnyPlanKey = LegacyPlanKey | (string & {});

export type DomainUserRole =
  | "user"
  | "buyer"
  | "seller"
  | "broker"
  | "dealer"
  | "agency"
  | "company_admin"
  | "company_member"
  | "admin"
  | "staff"
  | "superadmin";

export interface PlanCapabilities {
  maxActiveListings: number;
  maxImagesPerListing: number;
  canUsePublicPage: boolean;
  canUseAdvancedStats: boolean;
  canUseCrm: boolean;
  canUseTeam: boolean;
}

const PLAN_KEY_ALIASES: Record<string, UnifiedPlanKey> = {
  business: "enterprise",
  basic: "pro"
};

const PLAN_CAPABILITIES: Record<UnifiedPlanKey, PlanCapabilities> = {
  free: {
    maxActiveListings: 1,
    maxImagesPerListing: 10,
    canUsePublicPage: false,
    canUseAdvancedStats: false,
    canUseCrm: false,
    canUseTeam: false
  },
  pro: {
    maxActiveListings: 10,
    maxImagesPerListing: 20,
    canUsePublicPage: true,
    canUseAdvancedStats: true,
    canUseCrm: true,
    canUseTeam: false
  },
  enterprise: {
    maxActiveListings: -1,
    maxImagesPerListing: 20,
    canUsePublicPage: true,
    canUseAdvancedStats: true,
    canUseCrm: true,
    canUseTeam: true
  }
};

export function normalizePlanKey(input: AnyPlanKey | null | undefined): UnifiedPlanKey {
  const raw = String(input || "free").trim().toLowerCase();
  if (raw === "free" || raw === "pro" || raw === "enterprise") return raw;
  return PLAN_KEY_ALIASES[raw] || "free";
}

export function getPlanCapabilities(input: AnyPlanKey | null | undefined): PlanCapabilities {
  return PLAN_CAPABILITIES[normalizePlanKey(input)];
}

export function getPlanMaxActiveListings(input: AnyPlanKey | null | undefined): number {
  return getPlanCapabilities(input).maxActiveListings;
}

export function isPaidPlan(input: AnyPlanKey | null | undefined): boolean {
  return normalizePlanKey(input) !== "free";
}

export function canUsePublicPage(input: AnyPlanKey | null | undefined): boolean {
  return getPlanCapabilities(input).canUsePublicPage;
}

export function canUseAdvancedStats(input: AnyPlanKey | null | undefined): boolean {
  return getPlanCapabilities(input).canUseAdvancedStats;
}

export const DOMAIN_PLAN_CAPABILITIES = PLAN_CAPABILITIES;

