import { FastifyInstance } from "fastify";
import * as inviteController from "../controllers/invite.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function inviteRoutes(server: FastifyInstance) {
  // Public: preview invite (no auth required)
  server.get("/:token", inviteController.previewInvite);

  // Protected: generate invite + join
  server.post("/:token/join", { preHandler: authenticate }, inviteController.joinViaInvite);
  server.post("/groups/:id/generate", { preHandler: authenticate }, inviteController.generateInviteLink);
}
