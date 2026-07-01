import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

// Fail fast at startup if the secret is not configured.
// A missing JWT_SECRET in production would silently allow forged tokens.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set. Server cannot start.");
}

export interface UserPayload {
  id: string;
  email: string;
  fullName: string;
}

// Augment the Fastify request to include the user payload
declare module "fastify" {
  interface FastifyRequest {
    user?: UserPayload;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized: Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    // Attach user to request
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ error: "Unauthorized: Invalid or expired token" });
  }
};
