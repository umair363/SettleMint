import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { groups, groupMembers, users, expenses, expenseSplits, settlements } from "../db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { calculateBalances, calculateSuggestedSettlements } from "../utils/settlementEngine";

// Define a custom request type containing the auth user
interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// 1. GET /api/groups - Get all groups for the logged-in user
export const getAllGroups = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    // Join groups with groupMembers to only get groups the user belongs to
    const userGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        baseCurrency: groups.baseCurrency,
        mode: groups.mode,
        emoji: groups.emoji,
        color: groups.color,
        createdAt: groups.createdAt,
        role: groupMembers.role,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId));

    // To properly calculate "memberCount" and "balance", we typically need to do separate aggregations
    // For now, let's just return the base group data and we'll add aggregations next
    
    return reply.code(200).send({ groups: userGroups });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// 2. GET /api/groups/:id - Get a specific group with its members and expenses
export const getGroupById = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };

    // Verify user is in the group
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, userId)))
      .limit(1);

    if (membership.length === 0) {
      return reply.code(403).send({ error: "Forbidden: Not a member of this group" });
    }

    // Get basic group info
    const groupRecords = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    const group = groupRecords[0];

    if (!group) {
      return reply.code(404).send({ error: "Group not found" });
    }

    // Get members
    const members = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, id));

    // Get all expenses for the group
    const groupExpenses = await db.select().from(expenses).where(eq(expenses.groupId, id));
    
    // Get all splits for those expenses
    let groupSplits: any[] = [];
    if (groupExpenses.length > 0) {
      const expenseIds = groupExpenses.map(e => e.id);
      groupSplits = await db.select().from(expenseSplits).where(inArray(expenseSplits.expenseId, expenseIds));
    }

    // Get all settlements for the group
    const groupSettlements = await db.select().from(settlements).where(eq(settlements.groupId, id));

    // Calculate balances and debts
    const balances = calculateBalances(
      groupExpenses.map(e => ({ id: e.id, amount: Number(e.amount), paidBy: e.paidBy })),
      groupSplits.map(s => ({ expenseId: s.expenseId, userId: s.userId, amountOwed: Number(s.amountOwed), isSettled: s.isSettled })),
      groupSettlements.map(s => ({ paidBy: s.paidBy, paidTo: s.paidTo, amount: Number(s.amount) }))
    );

    const suggestedSettlementsRaw = calculateSuggestedSettlements(balances);

    // Map suggested settlements user IDs to full names for the frontend
    const userMap = new Map(members.map(m => [m.id, m.fullName]));
    const suggestedSettlements = suggestedSettlementsRaw.map(s => ({
      from: userMap.get(s.from) || "Unknown",
      fromId: s.from,
      to: userMap.get(s.to) || "Unknown",
      toId: s.to,
      amount: s.amount
    }));

    return reply.code(200).send({
      group: {
        ...group,
        members,
        balances,
        suggestedSettlements
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// 3. POST /api/groups - Create a new group
export const createGroup = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { name, mode, emoji, color, baseCurrency } = request.body as any;

    if (!name || !mode) {
      return reply.code(400).send({ error: "Name and mode are required" });
    }

    // Insert group
    const [newGroup] = await db.insert(groups).values({
      name,
      mode,
      emoji: emoji || "📝",
      color: color || "#3DD68C",
      baseCurrency: baseCurrency || "USD",
      createdBy: userId,
    }).returning();

    // Add creator as admin member
    await db.insert(groupMembers).values({
      groupId: newGroup.id,
      userId: userId,
      role: "admin",
    });

    return reply.code(201).send({ message: "Group created successfully", group: newGroup });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
