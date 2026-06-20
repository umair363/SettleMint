import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { expenses, expenseSplits, groupMembers, users, activityLogs } from "../db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { sendExpenseAlertEmail } from "../utils/email";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// GET /api/expenses/me - Get all expenses for the user across all groups
export const getMyExpenses = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    // Join expenses with expenseSplits to find expenses involving the user
    // We can also just get expenses where the user is in the group.
    // For simplicity, let's get all expenses where the user is a part of the split OR paid for it.
    
    // We'll fetch expenses where the user is involved
    const userExpenses = await db
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
      .leftJoin(expenseSplits, eq(expenses.id, expenseSplits.expenseId))
      .where(or(eq(expenses.paidBy, userId), eq(expenseSplits.userId, userId)))
      .groupBy(expenses.id, users.fullName);

    const expenseIds = userExpenses.map(e => e.id);
    let splits: any[] = [];
    if (expenseIds.length > 0) {
      splits = await db.select().from(expenseSplits).where(inArray(expenseSplits.expenseId, expenseIds));
    }

    const expensesWithSplits = userExpenses.map(e => ({
      ...e,
      splits: splits.filter(s => s.expenseId === e.id)
    }));

    return reply.code(200).send({ expenses: expensesWithSplits });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

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

    const { groupId, description, amount, category, notes, splits, currency, paidBy: paidByOverride, date } = request.body as any;

    if (!description || !amount || !splits || !Array.isArray(splits)) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    // Allow caller to specify who paid (must be a group member or the requester)
    const actualPaidBy = paidByOverride || userId;

    if (groupId) {
      // Verify user is in the group
      const membership = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
        .limit(1);

      if (membership.length === 0) {
        return reply.code(403).send({ error: "Forbidden: Not a member of this group" });
      }
    }

    // Run within a transaction
    const newExpense = await db.transaction(async (tx) => {
      // 1. Insert Expense
      const [insertedExpense] = await tx.insert(expenses).values({
        groupId: groupId || null,
        description,
        amount: amount.toString(),
        paidBy: actualPaidBy,
        category: category || "other",
        notes: notes || null,
        currency: currency || "USD",
        date: date ? new Date(date) : new Date(),
      }).returning();

      // 2. Insert Splits
      const splitInserts = splits.map((split: any) => ({
        expenseId: insertedExpense.id,
        userId: split.userId,
        amountOwed: split.amountOwed.toString(),
        // Payer's own split is pre-settled — they don't owe themselves
        isSettled: split.userId === actualPaidBy,
      }));

      await tx.insert(expenseSplits).values(splitInserts);

      // 3. Insert Activity Log
      await tx.insert(activityLogs).values({
        groupId: groupId || null,
        userId: userId,
        action: "Expense Created",
        description: `Added "${description}" for ${currency || "USD"} ${amount.toString()}`,
      });

      return insertedExpense;
    });

    // Send expense notification emails asynchronously
    const userIds = splits.map((s: any) => s.userId).filter((uid: string) => uid !== userId);
    if (userIds.length > 0) {
      db.select({ email: users.email, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, userIds))
        .then((notifiedUsers) => {
          db.select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)
            .then(([payer]) => {
              const payerName = payer?.fullName || "Someone";
              notifiedUsers.forEach((u) => {
                sendExpenseAlertEmail(u.email, u.fullName, payerName, description, amount.toString(), currency || "USD")
                  .catch(err => request.log.error("Expense alert email failed: ", err));
              });
            })
            .catch(err => request.log.error("Payer query failed: ", err));
        })
        .catch(err => request.log.error("Notification recipients query failed: ", err));
    }

    return reply.code(201).send({ message: "Expense created successfully", expense: newExpense });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
