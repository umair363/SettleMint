import { FastifyInstance } from "fastify";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@settlemint/shared";

export default async function authRoutes(server: FastifyInstance) {
  server.post("/register", { preHandler: validateBody(registerSchema) }, authController.register);
  server.post("/login", { preHandler: validateBody(loginSchema) }, authController.login);
  server.post("/verify-otp", { preHandler: validateBody(verifyOtpSchema) }, authController.verifyOtp);
  server.post("/resend-otp", { preHandler: validateBody(resendOtpSchema) }, authController.resendOtp);
  server.post("/forgot-password", { preHandler: validateBody(forgotPasswordSchema) }, authController.forgotPassword);
  server.post("/reset-password", { preHandler: validateBody(resetPasswordSchema) }, authController.resetPassword);
  // Protected route example
  server.get("/me", { preHandler: authenticate }, authController.me);
}
