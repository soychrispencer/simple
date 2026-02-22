import { Pool } from "pg";
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

type DbRow = Record<string, unknown>;

let poolCache: { url: string; pool: Pool } | null = null;

function getPool() {
  const url = String(process.env.DATABASE_URL || "").trim();
  if (!url) {
    throw new InstagramFlowError(
      "database_not_configured",
      "DATABASE_URL no configurada para integración de Instagram"
    );
  }
  if (poolCache?.url === url) return poolCache.pool;
  const pool = new Pool({ connectionString: url });
  poolCache = { url, pool };
  return pool;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function mapIntegrationRow(row: DbRow | undefined): InstagramIntegrationRecord | null {
  if (!row?.integration_id) return null;
  return {
    integrationId: String(row.integration_id),
    accessToken: row.access_token ? String(row.access_token) : null,
    igUserId: row.ig_user_id ? String(row.ig_user_id) : null,
    igUsername: row.ig_username ? String(row.ig_username) : null,
    pageName: row.page_name ? String(row.page_name) : null,
    expiresAt: toIso(row.expires_at),
  };
}

function mapPublishJobRow(row: DbRow | undefined): InstagramPublishJobRecord | null {
  if (!row?.id || !row?.integration_id || !row?.caption || !row?.image_url) return null;
  return {
    id: String(row.id),
    integrationId: String(row.integration_id),
    userId: String(row.user_id || ""),
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
    nextRetryAt: toIso(row.next_retry_at),
    lastAttemptAt: toIso(row.last_attempt_at),
    publishedAt: toIso(row.published_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
    accessToken: row.provider_access_token ? String(row.provider_access_token) : null,
    igUserId: row.provider_ig_user_id ? String(row.provider_ig_user_id) : null,
    tokenExpiresAt: toIso(row.provider_expires_at),
  };
}

export async function fetchInstagramIntegrationByUser(
  userId: string
): Promise<InstagramIntegrationRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT i.id AS integration_id,
            ig.access_token,
            ig.ig_user_id,
            ig.ig_username,
            ig.page_name,
            ig.expires_at
       FROM integrations i
       LEFT JOIN integration_instagram ig ON ig.integration_id = i.id
      WHERE i.user_id = $1
        AND i.provider = 'instagram'
      ORDER BY i.created_at DESC
      LIMIT 1`,
    [userId]
  );
  return mapIntegrationRow(rows[0] as DbRow | undefined);
}

export async function fetchInstagramIntegrationById(
  integrationId: string
): Promise<InstagramIntegrationRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT i.id AS integration_id,
            ig.access_token,
            ig.ig_user_id,
            ig.ig_username,
            ig.page_name,
            ig.expires_at
       FROM integrations i
       LEFT JOIN integration_instagram ig ON ig.integration_id = i.id
      WHERE i.id = $1
        AND i.provider = 'instagram'
      LIMIT 1`,
    [integrationId]
  );
  return mapIntegrationRow(rows[0] as DbRow | undefined);
}

export async function upsertInstagramIntegration(userId: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO integrations (user_id, provider, status, connected_at)
     VALUES ($1, 'instagram', 'connected', NOW())
     ON CONFLICT (user_id, provider)
     DO UPDATE SET status = 'connected', connected_at = EXCLUDED.connected_at, updated_at = NOW()
     RETURNING id`,
    [userId]
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new InstagramFlowError("integration_upsert_failed", "Failed to upsert integration");
  }
  return String(id);
}

export async function upsertInstagramProvider(input: InstagramProviderUpsertInput) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO integration_instagram
      (integration_id, access_token, token_type, expires_at, page_id, page_name, ig_user_id, ig_username)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (integration_id)
     DO UPDATE SET access_token = EXCLUDED.access_token,
                   token_type = EXCLUDED.token_type,
                   expires_at = EXCLUDED.expires_at,
                   page_id = EXCLUDED.page_id,
                   page_name = EXCLUDED.page_name,
                   ig_user_id = EXCLUDED.ig_user_id,
                   ig_username = EXCLUDED.ig_username,
                   updated_at = NOW()`,
    [
      input.integrationId,
      input.accessToken,
      input.tokenType,
      input.expiresAt,
      input.pageId,
      input.pageName,
      input.igUserId,
      input.igUsername,
    ]
  );
}

export async function updateInstagramProviderToken(input: {
  integrationId: string;
  accessToken: string;
  tokenType?: string | null;
  expiresAt?: string | null;
}) {
  const pool = getPool();
  await pool.query(
    `UPDATE integration_instagram
        SET access_token = $2,
            token_type = $3,
            expires_at = $4,
            updated_at = NOW()
      WHERE integration_id = $1`,
    [input.integrationId, input.accessToken, input.tokenType ?? null, input.expiresAt ?? null]
  );
}

export async function fetchInstagramExpiringTokens(input?: { expiresBefore?: string; limit?: number }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT integration_id, access_token, expires_at
       FROM integration_instagram
      WHERE expires_at IS NOT NULL
        AND expires_at <= $1
      ORDER BY expires_at ASC
      LIMIT $2`,
    [input?.expiresBefore || new Date().toISOString(), input?.limit ?? 25]
  );
  return rows
    .map((row: DbRow) => {
      if (!row.integration_id || !row.access_token) return null;
      return {
        integrationId: String(row.integration_id),
        accessToken: String(row.access_token),
        expiresAt: toIso(row.expires_at),
      } satisfies InstagramExpiringTokenRecord;
    })
    .filter(Boolean) as InstagramExpiringTokenRecord[];
}

export async function deleteInstagramIntegration(userId: string) {
  const pool = getPool();
  await pool.query(
    `DELETE FROM integrations
      WHERE user_id = $1
        AND provider = 'instagram'`,
    [userId]
  );
}

export async function enqueueInstagramPublishJob(input: InstagramPublishJobInsert) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO integration_instagram_posts
      (integration_id, listing_id, vertical, caption, image_url, status, attempt_count, max_attempts, next_retry_at)
     VALUES ($1, $2, $3, $4, $5, 'queued', 0, $6, NOW())
     RETURNING id`,
    [
      input.integrationId,
      input.listingId ?? null,
      input.vertical ?? null,
      input.caption,
      input.imageUrl,
      input.maxAttempts ?? 5,
    ]
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new InstagramFlowError("queue_enqueue_failed", "Failed to enqueue Instagram publish job");
  }
  return String(id);
}

export async function fetchInstagramPublishJobById(
  jobId: string
): Promise<InstagramPublishJobRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.*,
            i.user_id,
            ig.access_token AS provider_access_token,
            ig.ig_user_id AS provider_ig_user_id,
            ig.expires_at AS provider_expires_at
       FROM integration_instagram_posts p
       JOIN integrations i ON i.id = p.integration_id
       LEFT JOIN integration_instagram ig ON ig.integration_id = i.id
      WHERE p.id = $1
      LIMIT 1`,
    [jobId]
  );
  return mapPublishJobRow(rows[0] as DbRow | undefined);
}

export async function fetchDueInstagramPublishJobs(input?: { limit?: number; userId?: string }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.*,
            i.user_id,
            ig.access_token AS provider_access_token,
            ig.ig_user_id AS provider_ig_user_id,
            ig.expires_at AS provider_expires_at
       FROM integration_instagram_posts p
       JOIN integrations i ON i.id = p.integration_id
       LEFT JOIN integration_instagram ig ON ig.integration_id = i.id
      WHERE p.status = ANY($1::text[])
        AND (p.next_retry_at IS NULL OR p.next_retry_at <= NOW())
        AND ($2::uuid IS NULL OR i.user_id = $2::uuid)
      ORDER BY p.created_at ASC
      LIMIT $3`,
    [["queued", "retrying"], input?.userId ?? null, input?.limit ?? 10]
  );
  return rows
    .map((row: DbRow) => mapPublishJobRow(row))
    .filter(Boolean) as InstagramPublishJobRecord[];
}

export async function markInstagramPublishJobProcessing(jobId: string, nextAttemptCount: number) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE integration_instagram_posts
        SET status = 'processing',
            attempt_count = $2,
            last_attempt_at = NOW(),
            error = NULL,
            error_code = NULL,
            next_retry_at = NULL,
            updated_at = NOW()
      WHERE id = $1
        AND status = ANY($3::text[])
    RETURNING id`,
    [jobId, nextAttemptCount, ["queued", "retrying"]]
  );
  return Boolean(rows[0]?.id);
}

export async function completeInstagramPublishJob(input: {
  jobId: string;
  mediaId: string;
  creationId: string;
  permalink?: string | null;
  publishedAt?: string | null;
}) {
  const pool = getPool();
  await pool.query(
    `UPDATE integration_instagram_posts
        SET status = 'published',
            media_id = $2,
            creation_id = $3,
            permalink = $4,
            error = NULL,
            error_code = NULL,
            next_retry_at = NULL,
            published_at = COALESCE($5::timestamptz, NOW()),
            updated_at = NOW()
      WHERE id = $1`,
    [input.jobId, input.mediaId, input.creationId, input.permalink ?? null, input.publishedAt ?? null]
  );
}

export async function scheduleInstagramPublishRetry(input: {
  jobId: string;
  nextRetryAt: string;
  error: string;
  errorCode?: string | null;
}) {
  const pool = getPool();
  await pool.query(
    `UPDATE integration_instagram_posts
        SET status = 'retrying',
            error = $2,
            error_code = $3,
            next_retry_at = $4::timestamptz,
            updated_at = NOW()
      WHERE id = $1`,
    [input.jobId, input.error, input.errorCode ?? null, input.nextRetryAt]
  );
}

export async function failInstagramPublishJob(input: {
  jobId: string;
  error: string;
  errorCode?: string | null;
}) {
  const pool = getPool();
  await pool.query(
    `UPDATE integration_instagram_posts
        SET status = 'failed',
            error = $2,
            error_code = $3,
            next_retry_at = NULL,
            updated_at = NOW()
      WHERE id = $1`,
    [input.jobId, input.error, input.errorCode ?? null]
  );
}

export async function listInstagramPublishHistoryByUser(input: {
  userId: string;
  vertical?: string;
  limit?: number;
}) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.id,
            p.listing_id,
            p.vertical,
            p.media_id,
            p.permalink,
            p.status,
            p.error,
            p.error_code,
            p.attempt_count,
            p.max_attempts,
            p.next_retry_at,
            p.last_attempt_at,
            p.published_at,
            p.created_at
       FROM integration_instagram_posts p
       JOIN integrations i ON i.id = p.integration_id
      WHERE i.user_id = $1
        AND ($2::text IS NULL OR p.vertical = $2::text)
      ORDER BY p.created_at DESC
      LIMIT $3`,
    [input.userId, input.vertical ?? null, input.limit ?? 20]
  );
  return rows.map((row: DbRow) => ({
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
    nextRetryAt: toIso(row.next_retry_at),
    lastAttemptAt: toIso(row.last_attempt_at),
    publishedAt: toIso(row.published_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
  })) as InstagramPublishHistoryItem[];
}
