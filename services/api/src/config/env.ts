import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  CORS_ORIGIN: z.string().optional(),
  LISTINGS_REPOSITORY: z.enum(["memory", "postgres"]).default("postgres"),
  DATABASE_URL: z.string().min(1).optional(),
  SSO_SHARED_SECRET: z.string().min(1).optional(),
  SSO_ISSUER: z.string().min(1).default("simple-api")
});

export type Env = z.infer<typeof EnvSchema>;

export function readEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid API env: ${parsed.error.message}`);
  }
  return parsed.data;
}
