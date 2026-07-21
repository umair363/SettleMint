import { FastifyInstance } from "fastify";
import * as aiController from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";

// Stricter than the global 100/min default (server.ts) — these routes call
// the Gemini API on every request, so they're the most expensive and most
// abusable endpoints in the app.
const AI_RATE_LIMIT = { max: 10, timeWindow: "1 minute" };

export default async function aiRoutes(server: FastifyInstance) {
  // Protect all AI routes so only authenticated users can trigger them
  server.addHook("preHandler", authenticate);

  server.post("/scan-receipt", { config: { rateLimit: AI_RATE_LIMIT } }, aiController.scanReceiptImage);
  server.post("/parse-nlp", { config: { rateLimit: AI_RATE_LIMIT } }, aiController.parseNaturalLanguage);
}
