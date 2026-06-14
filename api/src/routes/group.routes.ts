import { FastifyInstance } from "fastify";
import * as groupController from "../controllers/group.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function groupRoutes(server: FastifyInstance) {
  // All group routes require authentication
  server.addHook("preHandler", authenticate);

  server.get("/", groupController.getAllGroups);
  server.get("/:id", groupController.getGroupById);
  server.post("/", groupController.createGroup);
}
