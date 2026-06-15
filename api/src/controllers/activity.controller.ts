import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { activityLogs } from "../db/schema";
import { eq, desc } from "drizzle-orm";

interface AuthenticatedRequest extends FastifyRequest {
  user?: any;
}

export const getMyActivity = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(50);

    return reply.send({ activity: logs });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
