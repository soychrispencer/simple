import { Pool } from "pg";

let cached: { url: string; pool: Pool } | null = null;

export function getDbPool(): Pool {
  const url = String(process.env.DATABASE_URL || "").trim();
  if (!url) {
    throw new Error("DATABASE_URL no configurada");
  }
  if (!cached || cached.url !== url) {
    cached = {
      url,
      pool: new Pool({ connectionString: url })
    };
  }
  return cached.pool;
}
