import { FastifyInstance } from "fastify";
import * as friendshipController from "../controllers/friendship.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function friendshipRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  server.get("/", friendshipController.getFriends);
  server.post("/", friendshipController.addFriend);
}
