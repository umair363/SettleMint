import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { fromNodeHeaders } from "better-auth/node";
import { createAuth, type Auth } from "./auth";
import { CLIENT_IP_HEADER } from "./client-ip";
import { liveRoutes, registerLiveUpdates } from "./live";
import type { AppConfig } from "./config";
import type { Db } from "./db/client";
import { AppError, registerErrorHandler } from "./errors";
import type { Mailer } from "./mailer";
import { activityRoutes } from "./routes/activity";
import { expenseRoutes } from "./routes/expenses";
import { groupRoutes } from "./routes/groups";
import { inviteRoutes } from "./routes/invites";
import { meRoutes } from "./routes/me";
import { memberRoutes } from "./routes/members";
import { aiRoutes } from "./routes/ai";
import { pushRoutes } from "./routes/push";
import { combinedSender, createNotifier, expoPushSender, webPushSender, type PushSender } from "./services/push";
import { importRoutes } from "./routes/import";
import { geminiReceiptReader, type ReceiptReader } from "./services/receipts";
import { recurringRoutes } from "./routes/recurring";
import { settlementRoutes } from "./routes/settlements";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isGuest: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthUser | null;
  }
  interface FastifyInstance {
    db: Db;
    auth: Auth;
    config: AppConfig;
  }
}

/** The signed-in user, or 401. */
export function requireUser(req: FastifyRequest): AuthUser {
  if (!req.authUser) throw new AppError(401, "UNAUTHORIZED", "Sign in to continue");
  return req.authUser;
}

function withClientIp(headers: Headers, ip: string) {
  headers.set(CLIENT_IP_HEADER, ip);
  return headers;
}

export interface BuildAppOptions {
  db: Db;
  config: AppConfig;
  mailer: Mailer;
  logger?: boolean;
  /** Override the receipt reader (tests); defaults to Gemini when a key is set. */
  receiptReader?: ReceiptReader | null;
  /** Override push delivery (tests); defaults to Web Push when VAPID keys are set. */
  pushSender?: PushSender | null;
}

export async function buildApp({ db, config, mailer, logger = true, receiptReader, pushSender }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger
      ? {
          level: config.env === "production" ? "info" : "debug",
          // Session cookies and tokens must never reach the logs.
          redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
        }
      : false,
    // Only the hosting provider's proxies are trusted for the client address
    // (X-Forwarded-For is otherwise client-controlled).
    trustProxy: config.trustProxyHops > 0 ? (_address: string, hop: number) => hop < config.trustProxyHops : false,
    // JSON only. Receipt photos will go straight to object storage via signed URLs.
    bodyLimit: 1024 * 1024,
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const auth = createAuth(db, config, mailer);
  app.decorate("db", db);
  app.decorate("auth", auth);
  app.decorate("config", config);
  app.decorate(
    "receiptReader",
    receiptReader !== undefined ? receiptReader : config.geminiApiKey ? geminiReceiptReader(config.geminiApiKey) : null,
  );
  app.decorateRequest("authUser", null);
  // Phones always get notifications (Expo's service needs no keys); browsers need Web Push keys.
  const sender =
    pushSender !== undefined
      ? pushSender
      : combinedSender(config.vapid ? webPushSender(config.vapid) : null, expoPushSender({ accessToken: config.expoAccessToken }));
  app.decorate("notifier", sender ? createNotifier(db, sender, config.webUrl) : null);
  app.addHook("onClose", async () => app.notifier?.idle());

  await app.register(helmet, { contentSecurityPolicy: false }); // JSON API: no HTML to protect
  await app.register(cors, {
    origin: config.webOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  if (config.env !== "test") {
    await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  }
  registerErrorHandler(app);

  // OpenAPI document generated from the same Zod schemas that validate requests.
  await app.register(swagger, {
    openapi: { info: { title: "SettleMint API", version: "1.0.0" } },
    transform: jsonSchemaTransform,
  });
  // @fastify/swagger's type augmentation doesn't load under nodenext CommonJS.
  app.get("/v1/openapi.json", async () => (app as unknown as { swagger(): unknown }).swagger());

  app.get("/health", async () => ({ ok: true }));

  registerLiveUpdates(app);

  // Better Auth handles everything under /v1/auth (sign-up, sign-in, OTP,
  // OAuth callbacks, guest sessions, sign-out).
  app.route({
    method: ["GET", "POST"],
    url: "/v1/auth/*",
    async handler(req, reply) {
      const url = new URL(req.url, config.apiUrl);
      const hasBody = req.method !== "GET" && req.body !== undefined && req.body !== null;
      const response = await auth.handler(
        new Request(url, {
          method: req.method,
          headers: withClientIp(fromNodeHeaders(req.headers), req.ip),
          body: hasBody ? JSON.stringify(req.body) : undefined,
        }),
      );
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie" && key !== "content-length") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });

  await app.register(
    async (v1) => {
      // Defence in depth against cross-site requests: SameSite cookies already
      // stop most, and this rejects any write that announces a foreign origin.
      v1.addHook("onRequest", async (req) => {
        if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
        const origin = req.headers.origin;
        if (origin && !config.webOrigins.includes(origin)) {
          throw new AppError(403, "FORBIDDEN", "Requests from this site aren't allowed");
        }
      });
      // Personal financial data: never stored by browsers, proxies or CDNs.
      v1.addHook("onSend", async (_req, reply, payload) => {
        reply.header("cache-control", "no-store");
        return payload;
      });
      v1.addHook("onRequest", async (req) => {
        const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
        if (result) {
          const u = result.user as typeof result.user & { isAnonymous?: boolean | null };
          req.authUser = {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.image ?? null,
            isGuest: Boolean(u.isAnonymous),
          };
        }
      });
      await v1.register(meRoutes);
      await v1.register(groupRoutes);
      await v1.register(memberRoutes);
      await v1.register(inviteRoutes);
      await v1.register(expenseRoutes);
      await v1.register(settlementRoutes);
      await v1.register(activityRoutes);
      await v1.register(liveRoutes);
      await v1.register(recurringRoutes);
      await v1.register(importRoutes);
      await v1.register(aiRoutes);
      await v1.register(pushRoutes);
    },
    { prefix: "/v1" },
  );

  return app;
}
