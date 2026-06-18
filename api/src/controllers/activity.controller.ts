import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { activityLogs, groupMembers } from "../db/schema";
import { eq, desc, inArray, or } from "drizzle-orm";

interface AuthenticatedRequest extends FastifyRequest {
  user?: any;
}

export const getMyActivity = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    // Get groups user belongs to
    const userGroupMemberships = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
      
    const groupIds = userGroupMemberships.map(gm => gm.groupId);

    const condition = groupIds.length > 0 
      ? or(eq(activityLogs.userId, userId), inArray(activityLogs.groupId, groupIds))
      : eq(activityLogs.userId, userId);

    const logs = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        description: activityLogs.description,
        createdAt: activityLogs.createdAt,
        groupId: activityLogs.groupId,
        userId: activityLogs.userId,
      })
      .from(activityLogs)
      .where(condition)
      .orderBy(desc(activityLogs.createdAt))
      .limit(50);

    return reply.send({ activity: logs });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
