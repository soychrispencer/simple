export class InstagramFlowError extends Error {
  reason: string;

  constructor(reason: string, message: string) {
    super(message);
    this.name = "InstagramFlowError";
    this.reason = reason;
  }
}

export function getInstagramFlowReason(error: unknown, fallback = "unknown_error") {
  if (error instanceof InstagramFlowError) return error.reason;
  return fallback;
}

