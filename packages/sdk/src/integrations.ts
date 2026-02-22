export interface IntegrationStatus {
  provider: "instagram";
  connected: boolean;
  reason?: string | null;
}

export function normalizeInstagramIntegrationStatus(
  input: Record<string, unknown> | null | undefined
): IntegrationStatus {
  const connected = Boolean(input?.connected);
  const reason =
    typeof input?.reason === "string" && input.reason.trim().length > 0
      ? input.reason.trim()
      : null;
  return {
    provider: "instagram",
    connected,
    reason
  };
}

