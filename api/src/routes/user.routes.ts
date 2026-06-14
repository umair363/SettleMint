import { FastifyInstance } from "fastify";
import * as userController from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function userRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);
  server.put("/me", userController.updateProfile);
}
