import { normalizeSubscriptionPlanId } from "@simple/config";
import type { SdkProfileSummary } from "./types";

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildProfileSummary(input: Record<string, unknown> | null | undefined): SdkProfileSummary {
  if (!input) return {};
  const id = safeString(input.id) || undefined;
  const email = safeString(input.email) || undefined;
  const firstName = safeString(input.first_name) ?? safeString(input.firstName) ?? undefined;
  const lastName = safeString(input.last_name) ?? safeString(input.lastName) ?? undefined;
  const publicName =
    safeString(input.public_name) ??
    safeString(input.publicName) ??
    safeString(input.username) ??
    safeString(input.display_name) ??
    undefined;
  return {
    id,
    email,
    firstName,
    lastName,
    publicName,
    planKey: normalizeSubscriptionPlanId(
      safeString(input.plan_key) ?? safeString(input.planKey) ?? "free"
    )
  };
}
