import { requestSimpleApiJson } from "@simple/config";

export interface SimpleApiHealthResponse {
  ok: boolean;
  service?: string;
  at?: string;
  uptimeSec?: number;
}

export async function getSimpleApiHealth(): Promise<SimpleApiHealthResponse> {
  return requestSimpleApiJson<SimpleApiHealthResponse>("/api/health", {
    timeoutMs: 5_000,
    retries: 0
  });
}

