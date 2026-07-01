import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { settlements, users, activityLogs } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { Cache } from "../utils/cache";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// GET /api/settlements - Get settlements involving the user
export const getMySettlements = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const userSettlements = await db
      .select()
      .from(settlements)
      .where(or(eq(settlements.paidBy, userId), eq(settlements.paidTo, userId)));

    return reply.code(200).send({ settlements: userSettlements });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// POST /api/settlements - Record a new payment/settlement
export const createSettlement = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { groupId, paidTo, amount, method, notes } = request.body as any;

    if (!paidTo || !amount) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    const [newSettlement] = await db.insert(settlements).values({
      groupId: groupId || null,
      paidBy: userId,
      paidTo,
      amount: amount.toString(),
      method: method || "cash",
      notes: notes || null,
    }).returning();

    // Fetch receiver name for the activity log
    const [receiver] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, paidTo));
    
    await db.insert(activityLogs).values({
      groupId: groupId || null,
      userId: userId,
      action: "Payment Recorded",
      description: `Paid ${receiver?.fullName || "someone"} ${amount.toString()}`,
    });

    if (groupId) {
      await Cache.delete(`group_balances_${groupId}`);
    }

    return reply.code(201).send({ message: "Settlement recorded", settlement: newSettlement });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
