import { FastifyInstance } from "fastify";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function authRoutes(server: FastifyInstance) {
  server.post("/register", authController.register);
  server.post("/login", authController.login);
  server.post("/verify-otp", authController.verifyOtp);
  server.post("/resend-otp", authController.resendOtp);

  // Protected route example
  server.get("/me", { preHandler: authenticate }, authController.me);
}
