import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { InstagramFlowError } from "./errors";

export type InstagramIntegrationRecord = {
  integrationId: string;
  accessToken: string | null;
  igUserId: string | null;
  igUsername: string | null;
  pageName: string | null;
  expiresAt: string | null;
};

export type InstagramPublishHistoryItem = {
  id: string;
  listingId: string | null;
  vertical: string | null;
  mediaId: string | null;
  permalink: string | null;
  status: string;
  error: string | null;
  errorCode: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastAttemptAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type InstagramPublishJobRecord = {
  id: string;
  integrationId: string;
  userId: string;
  listingId: string | null;
  vertical: string | null;
  caption: string;
  imageUrl: string;
  status: string;
  mediaId: string | null;
  creationId: string | null;
  permalink: string | null;
  error: string | null;
  errorCode: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastAttemptAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  accessToken: string | null;
  igUserId: string | null;
  tokenExpiresAt: string | null;
};

export type InstagramExpiringTokenRecord = {
  integrationId: string;
  accessToken: string;
  expiresAt: string | null;
};

type InstagramProviderUpsertInput = {
  integrationId: string;
  accessToken: string;
  tokenType: string | null;
  expiresAt: string | null;
  pageId: string;
  pageName: string;
  igUserId: string;
  igUsername: string | null;
};

type InstagramPublishJobInsert = {
  integrationId: string;
  caption: string;
  imageUrl: string;
  listingId?: string;
  vertical?: string;
  maxAttempts?: number;
};

let adminClientCache: { cacheKey: string; client: SupabaseClient } | null = null;

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new InstagramFlowError(
      "supabase_admin_not_configured",
      "Supabase service credentials not configured"
    );
  }

  const cacheKey = `${url}::${key.slice(0, 12)}`;
  if (adminClientCache?.cacheKey === cacheKey) return adminClientCache.client;

  const client = createClient(url, key);
  adminClientCache = { cacheKey, client };
  return client;
}

function parseProviderRow(row: any): InstagramIntegrationRecord | null {
  if (!row?.id) return null;
  const provider = Array.isArray(row?.integration_instagram)
    ? row.integration_instagram[0]
    : row?.integration_instagram;

  if (!provider) return null;

  return {
    integrationId: String(row.id),
    accessToken: provider.access_token ? String(provider.access_token) : null,
    igUserId: provider.ig_user_id ? String(provider.ig_user_id) : null,
    igUsername: provider.ig_username ? String(provider.ig_username) : null,
    pageName: provider.page_name ? String(provider.page_name) : null,
    expiresAt: provider.expires_at ? String(provider.expires_at) : null,
  };
}

function parsePublishJobRow(row: any): InstagramPublishJobRecord | null {
  if (!row?.id || !row?.integration_id || !row?.image_url || !row?.caption) return null;

  const integration = Array.isArray(row?.integrations) ? row.integrations[0] : row?.integrations;
  const provider = Array.isArray(integration?.integration_instagram)
    ? integration.integration_instagram[0]
    : integration?.integration_instagram;

  return {
    id: String(row.id),
    integrationId: String(row.integration_id),
    userId: integration?.user_id ? String(integration.user_id) : "",
    listingId: row.listing_id ? String(row.listing_id) : null,
    vertical: row.vertical ? String(row.vertical) : null,
    caption: String(row.caption),
    imageUrl: String(row.image_url),
    status: String(row.status || "queued"),
    mediaId: row.media_id ? String(row.media_id) : null,
    creationId: row.creation_id ? String(row.creation_id) : null,
    permalink: row.permalink ? String(row.permalink) : null,
    error: row.error ? String(row.error) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
    attemptCount: Number(row.attempt_count || 0),
    maxAttempts: Number(row.max_attempts || 5),
    nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : null,
    lastAttemptAt: row.last_attempt_at ? String(row.last_attempt_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
    accessToken: provider?.access_token ? String(provider.access_token) : null,
    igUserId: provider?.ig_user_id ? String(provider.ig_user_id) : null,
    tokenExpiresAt: provider?.expires_at ? String(provider.expires_at) : null,
  };
}

export async function fetchInstagramIntegrationByUser(userId: string): Promise<InstagramIntegrationRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("integrations")
    .select("id, integration_instagram(access_token, ig_user_id, ig_username, page_name, expires_at)")
    .eq("user_id", userId)
    .eq("provider", "instagram")
    .maybeSingle();

  if (error) {
    throw new InstagramFlowError("integration_lookup_failed", error.message || "Failed to fetch integration");
  }

  return parseProviderRow(data);
}

export async function fetchInstagramIntegrationById(integrationId: string): Promise<InstagramIntegrationRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("integrations")
    .select("id, integration_instagram(access_token, ig_user_id, ig_username, page_name, expires_at)")
    .eq("id", integrationId)
    .eq("provider", "instagram")
    .maybeSingle();

  if (error) {
    throw new InstagramFlowError("integration_lookup_failed", error.message || "Failed to fetch integration");
  }

  return parseProviderRow(data);
}

export async function upsertInstagramIntegration(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("integrations")
    .upsert(
      {
        user_id: userId,
        provider: "instagram",
        status: "connected",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new InstagramFlowError(
      "integration_upsert_failed",
      error?.message || "Failed to upsert integration"
    );
  }

  return String(data.id);
}

export async function upsertInstagramProvider(input: InstagramProviderUpsertInput) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("integration_instagram").upsert(
    {
      integration_id: input.integrationId,
      access_token: input.accessToken,
      token_type: input.tokenType,
      expires_at: input.expiresAt,
      page_id: input.pageId,
      page_name: input.pageName,
      ig_user_id: input.igUserId,
      ig_username: input.igUsername,
    },
    { onConflict: "integration_id" }
  );

  if (error) {
    throw new InstagramFlowError("provider_upsert_failed", error.message || "Failed to upsert provider");
  }
}

export async function updateInstagramProviderToken(input: {
  integrationId: string;
  accessToken: string;
  tokenType?: string | null;
  expiresAt?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("integration_instagram")
    .update({
      access_token: input.accessToken,
      token_type: input.tokenType ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .eq("integration_id", input.integrationId);

  if (error) {
    throw new InstagramFlowError("provider_upsert_failed", error.message || "Failed to update provider token");
  }
}

export async function fetchInstagramExpiringTokens(input?: { expiresBefore?: string; limit?: number }) {
  const admin = getSupabaseAdminClient();
  const expiresBefore = input?.expiresBefore || new Date().toISOString();
  const { data, error } = await admin
    .from("integration_instagram")
    .select("integration_id, access_token, expires_at")
    .not("expires_at", "is", null)
    .lte("expires_at", expiresBefore)
    .order("expires_at", { ascending: true })
    .limit(input?.limit ?? 25);

  if (error) {
    throw new InstagramFlowError(
      "integration_lookup_failed",
      error.message || "Failed to fetch expiring Instagram tokens"
    );
  }

  return (Array.isArray(data) ? data : [])
    .map((row: any) => {
      if (!row?.integration_id || !row?.access_token) return null;
      return {
        integrationId: String(row.integration_id),
        accessToken: String(row.access_token),
        expiresAt: row.expires_at ? String(row.expires_at) : null,
      } satisfies InstagramExpiringTokenRecord;
    })
    .filter(Boolean) as InstagramExpiringTokenRecord[];
}

export async function deleteInstagramIntegration(userId: string) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "instagram");

  if (error) {
    throw new InstagramFlowError("disconnect_failed", error.message || "Failed to disconnect");
  }
}

export async function enqueueInstagramPublishJob(input: InstagramPublishJobInsert) {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("integration_instagram_posts")
    .insert({
      integration_id: input.integrationId,
      listing_id: input.listingId ?? null,
      vertical: input.vertical ?? null,
      caption: input.caption,
      image_url: input.imageUrl,
      status: "queued",
      attempt_count: 0,
      max_attempts: input.maxAttempts ?? 5,
      next_retry_at: now,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new InstagramFlowError("queue_enqueue_failed", error?.message || "Failed to enqueue Instagram publish job");
  }

  return String(data.id);
}

export async function fetchInstagramPublishJobById(jobId: string): Promise<InstagramPublishJobRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("integration_instagram_posts")
    .select(
      "id, integration_id, listing_id, vertical, media_id, creation_id, permalink, caption, image_url, status, error, error_code, published_at, created_at, updated_at, attempt_count, max_attempts, next_retry_at, last_attempt_at, integrations!inner(user_id, integration_instagram(access_token, ig_user_id, expires_at))"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new InstagramFlowError("queue_fetch_failed", error.message || "Failed to fetch publish job");
  }

  return parsePublishJobRow(data);
}

export async function fetchDueInstagramPublishJobs(input?: { limit?: number; userId?: string }) {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

  let query = admin
    .from("integration_instagram_posts")
    .select(
      "id, integration_id, listing_id, vertical, media_id, creation_id, permalink, caption, image_url, status, error, error_code, published_at, created_at, updated_at, attempt_count, max_attempts, next_retry_at, last_attempt_at, integrations!inner(user_id, integration_instagram(access_token, ig_user_id, expires_at))"
    )
    .in("status", ["queued", "retrying"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(input?.limit ?? 10);

  if (input?.userId) {
    query = query.eq("integrations.user_id", input.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new InstagramFlowError("queue_fetch_failed", error.message || "Failed to fetch due publish jobs");
  }

  return (Array.isArray(data) ? data : []).map(parsePublishJobRow).filter(Boolean) as InstagramPublishJobRecord[];
}

export async function markInstagramPublishJobProcessing(jobId: string, nextAttemptCount: number) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("integration_instagram_posts")
    .update({
      status: "processing",
      attempt_count: nextAttemptCount,
      last_attempt_at: new Date().toISOString(),
      error: null,
      error_code: null,
      next_retry_at: null,
    })
    .eq("id", jobId)
    .in("status", ["queued", "retrying"])
    .select("id")
    .maybeSingle();

  if (error) {
    throw new InstagramFlowError("queue_update_failed", error.message || "Failed to mark job processing");
  }

  return !!data?.id;
}

export async function completeInstagramPublishJob(input: {
  jobId: string;
  mediaId: string;
  creationId: string;
  permalink?: string | null;
  publishedAt?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("integration_instagram_posts")
    .update({
      status: "published",
      media_id: input.mediaId,
      creation_id: input.creationId,
      permalink: input.permalink ?? null,
      error: null,
      error_code: null,
      next_retry_at: null,
      published_at: input.publishedAt ?? new Date().toISOString(),
    })
    .eq("id", input.jobId);

  if (error) {
    throw new InstagramFlowError("queue_update_failed", error.message || "Failed to complete publish job");
  }
}

export async function scheduleInstagramPublishRetry(input: {
  jobId: string;
  nextRetryAt: string;
  error: string;
  errorCode?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("integration_instagram_posts")
    .update({
      status: "retrying",
      error: input.error,
      error_code: input.errorCode ?? null,
      next_retry_at: input.nextRetryAt,
    })
    .eq("id", input.jobId);

  if (error) {
    throw new InstagramFlowError("queue_update_failed", error.message || "Failed to schedule retry");
  }
}

export async function failInstagramPublishJob(input: {
  jobId: string;
  error: string;
  errorCode?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("integration_instagram_posts")
    .update({
      status: "failed",
      error: input.error,
      error_code: input.errorCode ?? null,
      next_retry_at: null,
    })
    .eq("id", input.jobId);

  if (error) {
    throw new InstagramFlowError("queue_update_failed", error.message || "Failed to mark job failed");
  }
}

export async function listInstagramPublishHistoryByUser(input: {
  userId: string;
  vertical?: string;
  limit?: number;
}) {
  const admin = getSupabaseAdminClient();

  let query = admin
    .from("integration_instagram_posts")
    .select(
      "id, listing_id, vertical, media_id, permalink, status, error, error_code, attempt_count, max_attempts, next_retry_at, last_attempt_at, published_at, created_at, integrations!inner(user_id)"
    )
    .eq("integrations.user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 20);

  if (input.vertical) {
    query = query.eq("vertical", input.vertical);
  }

  const { data, error } = await query;
  if (error) {
    throw new InstagramFlowError("history_fetch_failed", error.message || "Failed to fetch Instagram history");
  }

  return (Array.isArray(data) ? data : []).map((row: any) => ({
    id: String(row.id),
    listingId: row.listing_id ? String(row.listing_id) : null,
    vertical: row.vertical ? String(row.vertical) : null,
    mediaId: row.media_id ? String(row.media_id) : null,
    permalink: row.permalink ? String(row.permalink) : null,
    status: String(row.status || "queued"),
    error: row.error ? String(row.error) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
    attemptCount: Number(row.attempt_count || 0),
    maxAttempts: Number(row.max_attempts || 5),
    nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : null,
    lastAttemptAt: row.last_attempt_at ? String(row.last_attempt_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
  })) as InstagramPublishHistoryItem[];
}
