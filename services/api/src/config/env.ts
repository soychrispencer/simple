import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  LISTINGS_REPOSITORY: z.enum(["memory", "supabase"]).default("memory"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function readEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid API env: ${parsed.error.message}`);
  }
  return parsed.data;
}
