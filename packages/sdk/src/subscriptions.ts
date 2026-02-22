import {
  getMaxActiveListingsByPlan,
  getPlanCapabilitiesByPlan,
  normalizeSubscriptionPlanId
} from "@simple/config";

export function resolveSubscriptionPlan(input: unknown) {
  const plan = normalizeSubscriptionPlanId(String(input || "free"));
  return {
    plan,
    maxActiveListings: getMaxActiveListingsByPlan(plan),
    capabilities: getPlanCapabilitiesByPlan(plan)
  };
}

