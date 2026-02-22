import { requestSimpleApiJson } from "@simple/config";
import type { SdkPublishQueueInput, SdkPublishQueueResponse } from "./types";

export async function queuePublish(input: SdkPublishQueueInput): Promise<SdkPublishQueueResponse> {
  return requestSimpleApiJson<SdkPublishQueueResponse>("/v1/publish/queue", {
    method: "POST",
    body: {
      listingId: input.listingId,
      vertical: input.vertical,
      reason: input.reason ?? "new_publish"
    },
    timeoutMs: 10_000,
    retries: 0
  });
}

