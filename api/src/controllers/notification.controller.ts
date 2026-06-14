import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, desc } from "drizzle-orm";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
  };
}

export const getMyNotifications = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return reply.send({ notifications: userNotifications });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const markAsRead = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));

    return reply.send({ message: "Marked as read" });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
