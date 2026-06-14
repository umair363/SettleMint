import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { expenses, expenseSplits, groupMembers, users } from "../db/schema";
import { eq, and } from "drizzle-orm";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// GET /api/expenses/group/:groupId - Get expenses for a specific group
export const getGroupExpenses = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { groupId } = request.params as { groupId: string };

    // Verify user is in the group
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);

    if (membership.length === 0) {
      return reply.code(403).send({ error: "Forbidden: Not a member of this group" });
    }

    // Get all expenses for the group
    const groupExpenses = await db
      .select({
        id: expenses.id,
        description: expenses.description,
        amount: expenses.amount,
        currency: expenses.currency,
        date: expenses.date,
        category: expenses.category,
        paidBy: expenses.paidBy,
        payerName: users.fullName,
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.paidBy, users.id))
      .where(eq(expenses.groupId, groupId));

    return reply.code(200).send({ expenses: groupExpenses });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// POST /api/expenses - Create a new expense
export const createExpense = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { groupId, description, amount, category, notes, splits } = request.body as any;

    if (!groupId || !description || !amount || !splits || !Array.isArray(splits)) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    // Verify user is in the group
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);

    if (membership.length === 0) {
      return reply.code(403).send({ error: "Forbidden: Not a member of this group" });
    }

    // Run within a transaction
    const newExpense = await db.transaction(async (tx) => {
      // 1. Insert Expense
      const [insertedExpense] = await tx.insert(expenses).values({
        groupId,
        description,
        amount: amount.toString(),
        paidBy: userId,
        category: category || "General",
        notes: notes || null,
      }).returning();

      // 2. Insert Splits
      const splitInserts = splits.map((split: any) => ({
        expenseId: insertedExpense.id,
        userId: split.userId,
        amountOwed: split.amountOwed.toString(),
        isSettled: split.userId === userId ? true : false, // Payer doesn't owe themselves
      }));

      await tx.insert(expenseSplits).values(splitInserts);

      return insertedExpense;
    });

    return reply.code(201).send({ message: "Expense created successfully", expense: newExpense });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
