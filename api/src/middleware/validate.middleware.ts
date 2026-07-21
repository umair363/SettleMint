import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError, ZodSchema } from "zod";

// Fastify preHandler factory: validates & coerces request.body against a Zod
// schema, replacing the body with the parsed (typed, defaulted, trimmed)
// result. Rejects with 400 + field-level errors on failure instead of
// letting bad data reach the controller (previously every controller cast
// `request.body as any` with no runtime checks).
export function validateBody(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: formatZodError(result.error),
      });
    }
    request.body = result.data;
  };
}

export function validateQuery(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: formatZodError(result.error),
      });
    }
    request.query = result.data as any;
  };
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
