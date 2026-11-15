import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { MoneyError, type ApiErrorBody, type ApiErrorCode } from "@settlemint/shared";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Not found") => new AppError(404, "NOT_FOUND", what);
export const forbidden = (message = "You can't do that in this group") => new AppError(403, "FORBIDDEN", message);
export const versionConflict = (current: unknown) =>
  new AppError(409, "VERSION_CONFLICT", "Someone else changed this first. Review their version and try again.", {
    current,
  });

function body(code: ApiErrorCode, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send(body("NOT_FOUND", "Route not found"));
  });

  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.status).send(body(err.code, err.message, err.details));
    }
    if (err instanceof MoneyError) {
      return reply.status(422).send(body(err.code, err.message));
    }
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send(
        body(
          "VALIDATION_ERROR",
          "Some fields are invalid",
          err.validation.map((v) => ({ path: v.instancePath, message: v.message })),
        ),
      );
    }
    const status = (err as FastifyError).statusCode;
    if (status === 429) {
      return reply.status(429).send(body("RATE_LIMITED", "Too many requests, slow down a little"));
    }
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send(body("VALIDATION_ERROR", err.message));
    }
    req.log.error({ err }, "unhandled error");
    return reply.status(500).send(body("INTERNAL", "Something went wrong on our side"));
  });
}
