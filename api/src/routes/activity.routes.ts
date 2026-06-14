import { FastifyInstance } from "fastify";
import * as activityController from "../controllers/activity.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function activityRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.get("/", activityController.getMyActivity);
}
