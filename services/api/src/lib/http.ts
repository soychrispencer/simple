import type { FastifyReply } from "fastify";
import type { z } from "zod";

export function badRequest(reply: FastifyReply, message: string, details?: unknown) {
  return reply.status(400).send({
    error: "bad_request",
    message,
    details
  });
}

export function parseOrReply<TSchema extends z.ZodTypeAny>(
  reply: FastifyReply,
  schema: TSchema,
  value: unknown,
  field: string
): z.infer<TSchema> | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    badRequest(reply, `Invalid ${field}`, parsed.error.flatten());
    return null;
  }
  return parsed.data;
}
