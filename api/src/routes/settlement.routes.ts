import { FastifyInstance } from "fastify";
import * as settlementController from "../controllers/settlement.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function settlementRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.get("/", settlementController.getMySettlements);
  server.post("/", settlementController.createSettlement);
}
