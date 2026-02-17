import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import {
  buildMetaOAuthUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchFacebookMe,
  fetchFacebookPermissions,
  fetchPagesAccountsRaw,
  fetchInstagramMediaDetails,
  fetchPagesWithInstagram,
  publishImageToInstagram,
  refreshLongLivedToken,
} from "./meta";
import { InstagramFlowError, getInstagramFlowReason } from "./errors";
import {
  completeInstagramPublishJob,
  deleteInstagramIntegration,
  enqueueInstagramPublishJob,
  failInstagramPublishJob,
  fetchDueInstagramPublishJobs,
  fetchInstagramExpiringTokens,
  fetchInstagramIntegrationById,
  fetchInstagramIntegrationByUser,
  fetchInstagramPublishJobById,
  listInstagramPublishHistoryByUser,
  markInstagramPublishJobProcessing,
  scheduleInstagramPublishRetry,
  updateInstagramProviderToken,
  upsertInstagramIntegration,
  upsertInstagramProvider,
} from "./repository";

const DEFAULT_INSTAGRAM_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
] as const;

const BUSINESS_INSTAGRAM_OAUTH_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
] as const;

function parseInstagramScopes(raw: string | undefined | null) {
  if (!raw) return null;
  const scopes = raw
    .split(/[,\s]+/g)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes.length ? scopes : null;
}

function resolveInstagramOAuthScopes() {
  const override = parseInstagramScopes(process.env.INSTAGRAM_OAUTH_SCOPES);
  if (override) return override;

  const loginMode = String(process.env.INSTAGRAM_LOGIN_MODE || "legacy").toLowerCase();
  if (loginMode === "business") {
    return [...BUSINESS_INSTAGRAM_OAUTH_SCOPES];
  }

  return [...DEFAULT_INSTAGRAM_OAUTH_SCOPES];
}

export const INSTAGRAM_OAUTH_SCOPES = resolveInstagramOAuthScopes();

export type InstagramPublishQueueResult = {
  ok: boolean;
  jobId: string;
  status: "published" | "retrying" | "failed" | "queued";
  queued: boolean;
  mediaId?: string | null;
  creationId?: string | null;
  permalink?: string | null;
  publishedAt?: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: string | null;
  error?: string | null;
};

type OAuthCookieValues = {
  state: string | null;
  userId: string | null;
};

const TOKEN_REFRESH_WINDOW_MS = Number(process.env.INSTAGRAM_TOKEN_REFRESH_WINDOW_MS || 1000 * 60 * 60 * 24 * 7);
const DEFAULT_MAX_ATTEMPTS = Number(process.env.INSTAGRAM_PUBLISH_MAX_ATTEMPTS || 5);
const BASE_RETRY_MS = Number(process.env.INSTAGRAM_PUBLISH_RETRY_BASE_MS || 60_000);
const MAX_RETRY_MS = Number(process.env.INSTAGRAM_PUBLISH_RETRY_MAX_MS || 30 * 60_000);
const TOKEN_REFRESH_BATCH_LIMIT = Number(process.env.INSTAGRAM_TOKEN_REFRESH_BATCH_LIMIT || 25);

function getMetaAppId() {
  const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
  if (!appId) {
    throw new InstagramFlowError(
      "meta_not_configured",
      "META app id no configurado (usa FACEBOOK_APP_ID o META_APP_ID)"
    );
  }
  return appId;
}

function getMetaAppSecret() {
  const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;
  if (!appSecret) {
    throw new InstagramFlowError(
      "meta_not_configured",
      "META app secret no configurado (usa FACEBOOK_APP_SECRET o META_APP_SECRET)"
    );
  }
  return appSecret;
}

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ? String(match[1]) : null;
}

function getInstagramRedirectUri(origin: string) {
  return process.env.INSTAGRAM_OAUTH_REDIRECT_URI || `${origin}/api/instagram/oauth/callback`;
}

function shouldRefreshToken(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const expiration = Date.parse(expiresAt);
  if (!Number.isFinite(expiration)) return false;
  return expiration - Date.now() <= TOKEN_REFRESH_WINDOW_MS;
}

function computeRetryDelayMs(attemptCount: number) {
  const normalizedAttempt = Math.max(1, attemptCount);
  const delay = BASE_RETRY_MS * 2 ** (normalizedAttempt - 1);
  return Math.min(delay, MAX_RETRY_MS);
}

function inferErrorCode(message: string) {
  const codeMatch = message.match(/code=(\d+)/i);
  if (codeMatch?.[1]) return codeMatch[1];
  const httpMatch = message.match(/HTTP\s+(\d+)/i);
  if (httpMatch?.[1]) return `http_${httpMatch[1]}`;
  return null;
}

function isRetryableInstagramError(message: string) {
  const httpMatch = message.match(/HTTP\s+(\d+)/i);
  if (!httpMatch?.[1]) return true;
  const status = Number(httpMatch[1]);
  if (status >= 500) return true;
  if (status === 429 || status === 408) return true;
  if (status === 401 || status === 403) return false;
  if (status >= 400 && status < 500) return false;
  return true;
}

async function tryResolveCookieUserId() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function tryResolveBearerUserId(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const bearerClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-simple-auth": "1" } },
    });
    const { data } = await bearerClient.auth.getUser(token);
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function refreshIntegrationTokenIfNeeded(input: {
  integrationId: string;
  accessToken: string;
  expiresAt: string | null;
}) {
  if (!shouldRefreshToken(input.expiresAt)) {
    return {
      accessToken: input.accessToken,
      expiresAt: input.expiresAt,
    };
  }

  const refreshed = await refreshLongLivedToken({
    appId: getMetaAppId(),
    appSecret: getMetaAppSecret(),
    accessToken: input.accessToken,
  });

  const nextToken = String(refreshed.access_token || input.accessToken);
  const nextExpiresAt =
    typeof refreshed.expires_in === "number"
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : input.expiresAt;

  await updateInstagramProviderToken({
    integrationId: input.integrationId,
    accessToken: nextToken,
    tokenType: refreshed.token_type || null,
    expiresAt: nextExpiresAt,
  });

  return {
    accessToken: nextToken,
    expiresAt: nextExpiresAt,
  };
}

async function processInstagramPublishJobInternal(jobId: string): Promise<InstagramPublishQueueResult> {
  const job = await fetchInstagramPublishJobById(jobId);
  if (!job) {
    throw new InstagramFlowError("queue_job_not_found", "Instagram publish job not found");
  }

  if (job.status === "published") {
    return {
      ok: true,
      jobId: job.id,
      status: "published",
      queued: false,
      mediaId: job.mediaId,
      creationId: job.creationId,
      permalink: job.permalink,
      publishedAt: job.publishedAt,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      nextRetryAt: null,
      error: null,
    };
  }

  if (job.attemptCount >= job.maxAttempts) {
    await failInstagramPublishJob({
      jobId: job.id,
      error: job.error || "Max retry attempts reached",
      errorCode: job.errorCode || "max_attempts",
    });
    return {
      ok: false,
      jobId: job.id,
      status: "failed",
      queued: false,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      nextRetryAt: null,
      error: job.error || "Max retry attempts reached",
    };
  }

  const nextAttempt = job.attemptCount + 1;
  const claimed = await markInstagramPublishJobProcessing(job.id, nextAttempt);
  if (!claimed) {
    const latest = await fetchInstagramPublishJobById(job.id);
    return {
      ok: true,
      jobId: job.id,
      status:
        latest?.status === "published"
          ? "published"
          : latest?.status === "failed"
            ? "failed"
            : "queued",
      queued: latest?.status !== "published",
      mediaId: latest?.mediaId ?? null,
      creationId: latest?.creationId ?? null,
      permalink: latest?.permalink ?? null,
      publishedAt: latest?.publishedAt ?? null,
      attemptCount: latest?.attemptCount ?? job.attemptCount,
      maxAttempts: latest?.maxAttempts ?? job.maxAttempts,
      nextRetryAt: latest?.nextRetryAt ?? null,
      error: latest?.error ?? null,
    };
  }

  let accessToken = job.accessToken;
  const igUserId = job.igUserId;
  if (!accessToken || !igUserId) {
    await failInstagramPublishJob({
      jobId: job.id,
      error: "Instagram no conectado",
      errorCode: "instagram_not_connected",
    });
    return {
      ok: false,
      jobId: job.id,
      status: "failed",
      queued: false,
      attemptCount: nextAttempt,
      maxAttempts: job.maxAttempts,
      nextRetryAt: null,
      error: "Instagram no conectado",
    };
  }

  try {
    const refreshed = await refreshIntegrationTokenIfNeeded({
      integrationId: job.integrationId,
      accessToken,
      expiresAt: job.tokenExpiresAt,
    });
    accessToken = refreshed.accessToken;
  } catch (error: any) {
    const errMessage = error?.message || "Token refresh failed";
    const retryable = nextAttempt < job.maxAttempts;
    if (retryable) {
      const nextRetryAt = new Date(Date.now() + computeRetryDelayMs(nextAttempt)).toISOString();
      await scheduleInstagramPublishRetry({
        jobId: job.id,
        nextRetryAt,
        error: errMessage,
        errorCode: "token_refresh_failed",
      });
      return {
        ok: true,
        jobId: job.id,
        status: "retrying",
        queued: true,
        attemptCount: nextAttempt,
        maxAttempts: job.maxAttempts,
        nextRetryAt,
        error: errMessage,
      };
    }

    await failInstagramPublishJob({
      jobId: job.id,
      error: errMessage,
      errorCode: "token_refresh_failed",
    });
    return {
      ok: false,
      jobId: job.id,
      status: "failed",
      queued: false,
      attemptCount: nextAttempt,
      maxAttempts: job.maxAttempts,
      nextRetryAt: null,
      error: errMessage,
    };
  }

  try {
    const result = await publishImageToInstagram({
      igUserId,
      accessToken,
      imageUrl: job.imageUrl,
      caption: job.caption,
    });

    let permalink: string | null = null;
    let publishedAt: string | null = null;
    try {
      const details = await fetchInstagramMediaDetails({
        mediaId: result.mediaId,
        accessToken,
      });
      permalink = details.permalink;
      publishedAt = details.timestamp;
    } catch {
      permalink = null;
      publishedAt = null;
    }

    await completeInstagramPublishJob({
      jobId: job.id,
      mediaId: result.mediaId,
      creationId: result.creationId,
      permalink,
      publishedAt,
    });

    return {
      ok: true,
      jobId: job.id,
      status: "published",
      queued: false,
      mediaId: result.mediaId,
      creationId: result.creationId,
      permalink,
      publishedAt,
      attemptCount: nextAttempt,
      maxAttempts: job.maxAttempts,
      nextRetryAt: null,
      error: null,
    };
  } catch (error: any) {
    const errMessage = error?.message || "Instagram publish failed";
    const retryable = isRetryableInstagramError(errMessage) && nextAttempt < job.maxAttempts;
    const errorCode = inferErrorCode(errMessage);

    if (retryable) {
      const nextRetryAt = new Date(Date.now() + computeRetryDelayMs(nextAttempt)).toISOString();
      await scheduleInstagramPublishRetry({
        jobId: job.id,
        nextRetryAt,
        error: errMessage,
        errorCode,
      });
      return {
        ok: true,
        jobId: job.id,
        status: "retrying",
        queued: true,
        attemptCount: nextAttempt,
        maxAttempts: job.maxAttempts,
        nextRetryAt,
        error: errMessage,
      };
    }

    await failInstagramPublishJob({
      jobId: job.id,
      error: errMessage,
      errorCode,
    });
    return {
      ok: false,
      jobId: job.id,
      status: "failed",
      queued: false,
      attemptCount: nextAttempt,
      maxAttempts: job.maxAttempts,
      nextRetryAt: null,
      error: errMessage,
    };
  }
}

export async function resolveAuthUserId(req: NextRequest): Promise<string | null> {
  const cookieUserId = await tryResolveCookieUserId();
  if (cookieUserId) return cookieUserId;
  return tryResolveBearerUserId(req);
}

export function buildInstagramOAuthUrl(origin: string, state: string, scopes = INSTAGRAM_OAUTH_SCOPES) {
  const authType = String(process.env.INSTAGRAM_OAUTH_AUTH_TYPE || "").trim() || undefined;
  return buildMetaOAuthUrl({
    appId: getMetaAppId(),
    redirectUri: getInstagramRedirectUri(origin),
    state,
    scopes: [...scopes],
    authType,
  });
}

export function createInstagramOAuthState() {
  return crypto.randomUUID();
}

export async function setInstagramOAuthCookies(input: { state: string; userId: string; origin: string }) {
  const secure = input.origin.startsWith("https://");
  const cookieStore = await cookies();
  cookieStore.set("ig_oauth_state", input.state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 10,
  });
  cookieStore.set("ig_oauth_user", input.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function readInstagramOAuthCookies(): Promise<OAuthCookieValues> {
  const cookieStore = await cookies();
  return {
    state: cookieStore.get("ig_oauth_state")?.value ?? null,
    userId: cookieStore.get("ig_oauth_user")?.value ?? null,
  };
}

export async function clearInstagramOAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("ig_oauth_state");
  cookieStore.delete("ig_oauth_user");
}

export async function processDueInstagramPublishJobs(input?: { userId?: string; limit?: number }) {
  const jobs = await fetchDueInstagramPublishJobs({
    userId: input?.userId,
    limit: input?.limit ?? 10,
  });

  let published = 0;
  let queued = 0;
  let failed = 0;

  for (const job of jobs) {
    const result = await processInstagramPublishJobInternal(job.id);
    if (result.status === "published") published += 1;
    else if (result.status === "retrying" || result.status === "queued") queued += 1;
    else failed += 1;
  }

  return {
    processed: jobs.length,
    published,
    queued,
    failed,
  };
}

export async function refreshExpiringInstagramTokens(input?: { limit?: number }) {
  const refreshThreshold = new Date(Date.now() + TOKEN_REFRESH_WINDOW_MS).toISOString();
  const candidates = await fetchInstagramExpiringTokens({
    expiresBefore: refreshThreshold,
    limit: input?.limit ?? TOKEN_REFRESH_BATCH_LIMIT,
  });

  let refreshed = 0;
  let failed = 0;
  for (const row of candidates) {
    try {
      await refreshIntegrationTokenIfNeeded({
        integrationId: row.integrationId,
        accessToken: row.accessToken,
        expiresAt: row.expiresAt,
      });
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    checked: candidates.length,
    refreshed,
    failed,
  };
}

export async function getInstagramConnection(userId: string) {
  const row = await fetchInstagramIntegrationByUser(userId);
  if (!row?.igUserId) {
    return {
      connected: false,
      ig_user_id: null,
      ig_username: null,
      page_name: null,
      expires_at: null,
    };
  }

  let accessToken = row.accessToken;
  let expiresAt = row.expiresAt;
  if (accessToken && shouldRefreshToken(expiresAt)) {
    try {
      const refreshed = await refreshIntegrationTokenIfNeeded({
        integrationId: row.integrationId,
        accessToken,
        expiresAt,
      });
      accessToken = refreshed.accessToken;
      expiresAt = refreshed.expiresAt;
    } catch {
      // No bloqueamos status por refresh fallido; publish job gestionará retry/fail.
    }
  }

  return {
    connected: true,
    ig_user_id: row.igUserId,
    ig_username: row.igUsername,
    page_name: row.pageName,
    expires_at: expiresAt,
  };
}

export async function disconnectInstagram(userId: string) {
  await deleteInstagramIntegration(userId);
}

export async function connectInstagramFromCode(input: {
  userId: string;
  code: string;
  origin: string;
}) {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  const redirectUri = getInstagramRedirectUri(input.origin);

  let shortLivedToken: string;
  let longLivedToken: string;
  let tokenType: string | null = null;
  let expiresAt: string | null = null;

  try {
    const short = await exchangeCodeForToken({
      appId,
      appSecret,
      redirectUri,
      code: input.code,
    });
    shortLivedToken = short.access_token;
  } catch (error: any) {
    throw new InstagramFlowError("token_exchange_failed", error?.message || "Token exchange failed");
  }

  try {
    const long = await exchangeForLongLivedToken({
      appId,
      appSecret,
      shortLivedToken,
    });
    longLivedToken = long.access_token;
    tokenType = long.token_type || null;
    expiresAt =
      typeof long.expires_in === "number" ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null;
  } catch (error: any) {
    throw new InstagramFlowError(
      "token_exchange_failed",
      error?.message || "Long-lived token exchange failed"
    );
  }

  let firstPage: { pageId: string; pageName: string; igUserId: string; igUsername?: string | null } | null = null;
  try {
    const rawPages = await fetchPagesAccountsRaw({ accessToken: longLivedToken });
    if (!rawPages.length) {
      const [me, permissions] = await Promise.all([
        fetchFacebookMe({ accessToken: longLivedToken }).catch(() => null),
        fetchFacebookPermissions({ accessToken: longLivedToken }).catch(() => []),
      ]);
      const granted = permissions
        .filter((p) => p.status === "granted")
        .map((p) => p.permission);
      const loginMode = String(process.env.INSTAGRAM_LOGIN_MODE || "legacy").toLowerCase();
      const required =
        loginMode === "business"
          ? [
              "pages_show_list",
              "pages_read_engagement",
              "instagram_business_basic",
              "instagram_business_content_publish",
              "business_management",
            ]
          : [
              "pages_show_list",
              "pages_read_engagement",
              "instagram_basic",
              "instagram_content_publish",
              "business_management",
            ];
      const missing = required.filter((perm) => !granted.includes(perm));
      const tokenUser = me?.name ? `${me.name} (${me.id})` : me?.id || "unknown";
      throw new InstagramFlowError(
        "no_pages_access",
        `No encontramos páginas administradas por este usuario en Facebook. token_user=${tokenUser}; granted=${granted.join(",") || "none"}; missing=${missing.join(",") || "none"}`
      );
    }

    const pages = await fetchPagesWithInstagram({ accessToken: longLivedToken });
    const preferredPageId = String(process.env.FACEBOOK_PAGE_ID || "").trim();
    if (preferredPageId) {
      firstPage = pages.find((page) => page.pageId === preferredPageId) || null;
      if (!firstPage && pages.length > 0) {
        throw new InstagramFlowError(
          "page_not_allowed",
          `La página configurada (${preferredPageId}) no está autorizada en este login.`
        );
      }
    } else {
      firstPage = pages[0] || null;
    }

    if (!firstPage?.igUserId) {
      const pageNames = rawPages
        .map((p) => p.pageName)
        .filter(Boolean)
        .slice(0, 5)
        .join(", ");
      throw new InstagramFlowError(
        "no_instagram_account_linked",
        pageNames
          ? `Páginas detectadas (${pageNames}), pero ninguna tiene Instagram profesional vinculado.`
          : "No Instagram account linked to a Facebook page"
      );
    }
  } catch (error: any) {
    if (error instanceof InstagramFlowError) {
      throw error;
    }
    throw new InstagramFlowError("pages_fetch_failed", error?.message || "Failed to fetch pages");
  }

  const integrationId = await upsertInstagramIntegration(input.userId);
  await upsertInstagramProvider({
    integrationId,
    accessToken: longLivedToken,
    tokenType,
    expiresAt,
    pageId: firstPage.pageId,
    pageName: firstPage.pageName,
    igUserId: firstPage.igUserId,
    igUsername: firstPage.igUsername || null,
  });
}

export async function publishInstagramForUser(input: {
  userId: string;
  imageUrl: string;
  caption: string;
  origin: string;
  listingId?: string;
  vertical?: string;
}): Promise<InstagramPublishQueueResult> {
  const record = await fetchInstagramIntegrationByUser(input.userId);
  if (!record?.accessToken || !record.igUserId) {
    throw new InstagramFlowError("instagram_not_connected", "Instagram no conectado");
  }

  const absoluteImageUrl = new URL(input.imageUrl, input.origin).toString();
  const jobId = await enqueueInstagramPublishJob({
    integrationId: record.integrationId,
    caption: input.caption,
    imageUrl: absoluteImageUrl,
    listingId: input.listingId,
    vertical: input.vertical,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
  });

  return processInstagramPublishJobInternal(jobId);
}

export async function processInstagramPublishQueueWorker(input?: { secret?: string | null; limit?: number }) {
  const workerSecret = process.env.INSTAGRAM_QUEUE_WORKER_SECRET || "";
  if (workerSecret) {
    if (!input?.secret || input.secret !== workerSecret) {
      throw new InstagramFlowError("worker_unauthorized", "Invalid worker secret");
    }
  }

  const tokenRefresh = await refreshExpiringInstagramTokens({ limit: TOKEN_REFRESH_BATCH_LIMIT });
  const queue = await processDueInstagramPublishJobs({ limit: input?.limit ?? 25 });
  return {
    ...queue,
    tokenRefresh,
  };
}

export async function getInstagramPublishHistoryForUser(input: {
  userId: string;
  vertical?: string;
  limit?: number;
  processQueue?: boolean;
}) {
  if (input.processQueue !== false) {
    await processDueInstagramPublishJobs({ userId: input.userId, limit: 5 });
  }
  return listInstagramPublishHistoryByUser({
    userId: input.userId,
    vertical: input.vertical,
    limit: input.limit ?? 20,
  });
}

export async function refreshInstagramConnectionIfNeededByUser(userId: string) {
  const record = await fetchInstagramIntegrationByUser(userId);
  if (!record?.accessToken) return null;
  if (!shouldRefreshToken(record.expiresAt)) {
    return {
      refreshed: false,
      expires_at: record.expiresAt,
    };
  }

  const refreshed = await refreshIntegrationTokenIfNeeded({
    integrationId: record.integrationId,
    accessToken: record.accessToken,
    expiresAt: record.expiresAt,
  });
  return {
    refreshed: true,
    expires_at: refreshed.expiresAt,
  };
}

export async function refreshInstagramIntegrationTokenByIntegrationId(integrationId: string) {
  const record = await fetchInstagramIntegrationById(integrationId);
  if (!record?.accessToken) {
    throw new InstagramFlowError("integration_lookup_failed", "Instagram integration token not found");
  }

  const refreshed = await refreshIntegrationTokenIfNeeded({
    integrationId: record.integrationId,
    accessToken: record.accessToken,
    expiresAt: record.expiresAt,
  });

  return {
    refreshed: refreshed.accessToken !== record.accessToken || refreshed.expiresAt !== record.expiresAt,
    expires_at: refreshed.expiresAt,
  };
}

export { getInstagramFlowReason };
