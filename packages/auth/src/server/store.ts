import { createHash, randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";

type AuthRow = {
  profile_id: string;
  email: string;
  password_hash: string;
};

type PasswordResetRow = {
  profile_id: string;
  email: string | null;
};

let cachedPool: { url: string; pool: Pool } | null = null;
let schemaEnsuredForUrl: string | null = null;

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function getDatabaseUrl(): string {
  const url = String(process.env.DATABASE_URL || "").trim();
  if (!url) {
    throw new Error("DATABASE_URL no configurada");
  }
  return url;
}

function getPool(): Pool {
  const url = getDatabaseUrl();
  if (!cachedPool || cachedPool.url !== url) {
    cachedPool = {
      url,
      pool: new Pool({
        connectionString: url
      })
    };
    schemaEnsuredForUrl = null;
  }
  return cachedPool.pool;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, encodedHash: string): boolean {
  const [salt, hash] = String(encodedHash || "").split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  const expected = Buffer.from(hash, "hex");
  const received = Buffer.from(candidate, "hex");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

async function ensureLocalAuthSchema(): Promise<void> {
  const url = getDatabaseUrl();
  if (schemaEnsuredForUrl === url) return;

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_local_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid NOT NULL UNIQUE,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      email_verified boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_password_resets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  schemaEnsuredForUrl = url;
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(String(token || "").trim()).digest("hex");
}

async function insertProfileFallback(
  pool: Pool,
  profileId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<void> {
  const usernameBase = email.split("@")[0]?.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "user";
  const username = `${usernameBase}-${profileId.slice(0, 8)}`;

  try {
    await pool.query(
      `INSERT INTO profiles (id, email, first_name, last_name, username, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())`,
      [profileId, email, firstName || null, lastName || null, username]
    );
    return;
  } catch {
    // fall through
  }

  try {
    await pool.query(
      `INSERT INTO profiles (id, email, created_at, updated_at)
       VALUES ($1, $2, now(), now())`,
      [profileId, email]
    );
  } catch {
    // ignore: profile might already exist with strict constraints
  }
}

export async function registerLocalUser(params: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ id: string; email: string }> {
  await ensureLocalAuthSchema();
  const pool = getPool();
  const email = normalizeEmail(params.email);
  const password = String(params.password || "");
  if (!email || password.length < 8) {
    throw new Error("Datos de registro inválidos");
  }

  const existing = await pool.query<{ profile_id: string }>(
    `SELECT profile_id FROM auth_local_users WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (existing.rows[0]?.profile_id) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const profileId = randomUUID();
  const passwordHash = hashPassword(password);
  const firstName = String(params.firstName || "").trim();
  const lastName = String(params.lastName || "").trim();

  await insertProfileFallback(pool, profileId, email, firstName, lastName);

  await pool.query(
    `INSERT INTO auth_local_users (profile_id, email, password_hash, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, true, now(), now())`,
    [profileId, email, passwordHash]
  );

  return { id: profileId, email };
}

export async function verifyLocalCredentials(params: {
  email: string;
  password: string;
}): Promise<{ id: string; email: string } | null> {
  await ensureLocalAuthSchema();
  const pool = getPool();
  const email = normalizeEmail(params.email);
  const password = String(params.password || "");
  if (!email || !password) return null;

  const result = await pool.query<AuthRow>(
    `SELECT profile_id, email, password_hash
     FROM auth_local_users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  const row = result.rows[0];
  if (!row?.profile_id || !row.password_hash) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return { id: row.profile_id, email: row.email };
}

export async function loadProfileById(userId: string): Promise<Record<string, any> | null> {
  const id = String(userId || "").trim();
  if (!id) return null;
  const pool = getPool();
  try {
    const { rows } = await pool.query<Record<string, any>>(
      `SELECT *
       FROM profiles
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function createLocalPasswordResetToken(params: {
  email: string;
  expiresMinutes?: number;
}): Promise<{ token: string | null; profileId: string | null; email: string | null }> {
  await ensureLocalAuthSchema();
  const pool = getPool();
  const email = normalizeEmail(params.email);
  if (!email) return { token: null, profileId: null, email: null };

  const found = await pool.query<{ profile_id: string; email: string }>(
    `SELECT profile_id, email
     FROM auth_local_users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  const row = found.rows[0];
  if (!row?.profile_id) {
    return { token: null, profileId: null, email: null };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresMinutes = Math.min(Math.max(Number(params.expiresMinutes || 30), 5), 240);

  await pool.query(
    `UPDATE auth_password_resets
     SET used_at = now()
     WHERE profile_id = $1
       AND used_at IS NULL`,
    [row.profile_id]
  );

  await pool.query(
    `INSERT INTO auth_password_resets (profile_id, token_hash, expires_at, created_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval, now())`,
    [row.profile_id, tokenHash, String(expiresMinutes)]
  );

  return {
    token,
    profileId: row.profile_id,
    email: row.email || email,
  };
}

export async function consumeLocalPasswordResetToken(
  rawToken: string
): Promise<{ profileId: string; email: string | null } | null> {
  await ensureLocalAuthSchema();
  const pool = getPool();
  const token = String(rawToken || "").trim();
  if (!token) return null;

  const tokenHash = hashResetToken(token);
  const found = await pool.query<PasswordResetRow>(
    `SELECT r.profile_id, u.email
     FROM auth_password_resets r
     LEFT JOIN auth_local_users u ON u.profile_id = r.profile_id
     WHERE r.token_hash = $1
       AND r.used_at IS NULL
       AND r.expires_at > now()
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [tokenHash]
  );
  const row = found.rows[0];
  if (!row?.profile_id) return null;

  await pool.query(
    `UPDATE auth_password_resets
     SET used_at = now()
     WHERE token_hash = $1
       AND used_at IS NULL`,
    [tokenHash]
  );

  return {
    profileId: row.profile_id,
    email: row.email || null,
  };
}

export async function updateLocalUserPassword(params: {
  profileId: string;
  password: string;
}): Promise<void> {
  await ensureLocalAuthSchema();
  const pool = getPool();
  const profileId = String(params.profileId || "").trim();
  const password = String(params.password || "");
  if (!profileId || password.length < 8) {
    throw new Error("INVALID_PASSWORD_RESET_PAYLOAD");
  }

  const passwordHash = hashPassword(password);
  const result = await pool.query(
    `UPDATE auth_local_users
     SET password_hash = $1, updated_at = now()
     WHERE profile_id = $2`,
    [passwordHash, profileId]
  );
  if (!result.rowCount) {
    throw new Error("USER_NOT_FOUND");
  }

  await pool.query(
    `UPDATE auth_password_resets
     SET used_at = now()
     WHERE profile_id = $1
       AND used_at IS NULL`,
    [profileId]
  );
}
