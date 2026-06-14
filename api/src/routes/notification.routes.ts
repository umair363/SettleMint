import { FastifyInstance } from "fastify";
import * as notificationController from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function notificationRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.get("/", notificationController.getMyNotifications);
  server.patch("/:id/read", notificationController.markAsRead);
}
