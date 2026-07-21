import * as Sentry from "@sentry/node";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import * as dotenv from "dotenv";

dotenv.config();

// ─── Sentry: must be initialized before any other imports ───────────────────
// SENTRY_DSN is optional — if not set, Sentry is a no-op (safe for local dev).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  // Capture 100% of transactions in production for a startup at low volume.
  // Reduce to 0.1 once traffic scales.
  tracesSampleRate: 1.0,
});

const server = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});

// Security Headers
server.register(helmet, {
  contentSecurityPolicy: process.env.NODE_ENV === "production",
});

// Rate Limiting
server.register(rateLimit, {
  max: 100, // default 100 reqs
  timeWindow: "1 minute",
});

// CORS Optimization
server.register(cors, {
  origin: process.env.FRONTEND_URL || true, // 'true' reflects the origin back, fixing the credentials error
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
});

import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import expenseRoutes from "./routes/expense.routes";
import settlementRoutes from "./routes/settlement.routes";
import userRoutes from "./routes/user.routes";
import friendshipRoutes from "./routes/friendship.routes";
import activityRoutes from "./routes/activity.routes";
import notificationRoutes from "./routes/notification.routes";
import inviteRoutes from "./routes/invite.routes";
import aiRoutes from "./routes/ai.routes";
import budgetRoutes from "./routes/budget.routes";

// ─── Global Error Handler ───────────────────────────────────────────────────
// Catches any unhandled error thrown in a route handler.
// Reports to Sentry with full context, then returns a clean 500 to the client.
server.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
  Sentry.withScope((scope) => {
    scope.setTag("route", request.routeOptions?.url || request.url);
    scope.setTag("method", request.method);
    // Attach userId if authenticated
    if ((request as any).user?.id) {
      scope.setUser({ id: (request as any).user.id, email: (request as any).user.email });
    }
    Sentry.captureException(error);
  });

  request.log.error({ err: error }, "Unhandled error");

  // Don't leak internal details to the client
  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    error: statusCode >= 500 ? "Internal Server Error" : error.message,
  });
});

// ─── Health check ───────────────────────────────────────────────────────────
// Health check route
server.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Register routes
server.register(authRoutes, { prefix: "/api/auth" });
server.register(groupRoutes, { prefix: "/api/groups" });
server.register(expenseRoutes, { prefix: "/api/expenses" });
server.register(settlementRoutes, { prefix: "/api/settlements" });
server.register(userRoutes, { prefix: "/api/users" });
server.register(friendshipRoutes, { prefix: "/api/friends" });
server.register(activityRoutes, { prefix: "/api/activity" });
server.register(notificationRoutes, { prefix: "/api/notifications" });
server.register(inviteRoutes, { prefix: "/api/invite" });
server.register(aiRoutes, { prefix: "/api/ai" });
server.register(budgetRoutes, { prefix: "/api/budget" });

import { initTypesense } from "./utils/typesense";

// Main async start function
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "8000", 10);
    await server.listen({ port, host: "0.0.0.0" });
    server.log.info(`Server listening on port ${port}`);
    
    // Initialize Typesense
    await initTypesense();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// ─── Process-level safety nets ───────────────────────────────────────────────
// Captures crashes that escape all try/catch blocks and reports to Sentry
// before the process exits, so nothing is silently lost.
process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason);
  server.log.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  Sentry.captureException(error);
  server.log.error({ err: error }, "Uncaught exception — shutting down");
  process.exit(1);
});

start();
