import { FastifyInstance } from "fastify";
import * as aiController from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function aiRoutes(server: FastifyInstance) {
  // Protect all AI routes so only authenticated users can trigger them
  server.addHook("preHandler", authenticate);

  server.post("/scan-receipt", aiController.scanReceiptImage);
  server.post("/parse-nlp", aiController.parseNaturalLanguage);
}
