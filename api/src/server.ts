import Fastify from "fastify";
import cors from "@fastify/cors";
import * as dotenv from "dotenv";

dotenv.config();

const server = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});

server.register(cors, {
  origin: "*", // Adjust this in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
});

import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import expenseRoutes from "./routes/expense.routes";
import settlementRoutes from "./routes/settlement.routes";
import userRoutes from "./routes/user.routes";
import friendshipRoutes from "./routes/friendship.routes";
import activityRoutes from "./routes/activity.routes";
import notificationRoutes from "./routes/notification.routes";

// Health check route
server.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Register routes
server.register(authRoutes, { prefix: "/api/auth" });
server.register(groupRoutes, { prefix: "/api/groups" });
server.register(expenseRoutes, { prefix: "/api/expenses" });
server.register(settlementRoutes, { prefix: "/api/settlements" });
server.register(userRoutes, { prefix: "/api/users" });
server.register(friendshipRoutes, { prefix: "/api/friends" });
server.register(activityRoutes, { prefix: "/api/activity" });
server.register(notificationRoutes, { prefix: "/api/notifications" });

// Main async start function
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "8000", 10);
    await server.listen({ port, host: "0.0.0.0" });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
