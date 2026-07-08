import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { personalTransactions, budgets } from "../db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string; email: string; fullName: string };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

// GET /api/budget/transactions
export const getTransactions = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { month, year, category, type } = request.query as {
    month?: string; year?: string; category?: string; type?: string;
  };

  try {
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear  = year  ? parseInt(year)  : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate   = new Date(targetYear, targetMonth, 1); // exclusive

    let query = db
      .select()
      .from(personalTransactions)
      .where(
        and(
          eq(personalTransactions.userId, userId),
          gte(personalTransactions.date, startDate),
          lte(personalTransactions.date, endDate),
          category ? eq(personalTransactions.category, category) : undefined,
          type     ? eq(personalTransactions.type, type)         : undefined,
        )
      )
      .orderBy(desc(personalTransactions.date));

    const rows = await query;
    return reply.code(200).send({ transactions: rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// POST /api/budget/transactions
export const createTransaction = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const {
    amount, type, category, description, wallet,
    currency, date, notes, isRecurring, recurringFrequency,
  } = request.body as any;

  if (!amount || !category || !description) {
    return reply.code(400).send({ error: "amount, category and description are required" });
  }

  try {
    const [txn] = await db.insert(personalTransactions).values({
      userId,
      amount: amount.toString(),
      type:   type || "expense",
      category,
      description,
      wallet:   wallet   || "card",
      currency: currency || "USD",
      date: date ? new Date(date) : new Date(),
      notes:              notes              || null,
      isRecurring:        isRecurring        ?? false,
      recurringFrequency: recurringFrequency || null,
    }).returning();

    return reply.code(201).send({ transaction: txn });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// DELETE /api/budget/transactions/:id
export const deleteTransaction = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };

  try {
    const deleted = await db
      .delete(personalTransactions)
      .where(and(eq(personalTransactions.id, id), eq(personalTransactions.userId, userId)))
      .returning();

    if (deleted.length === 0) return reply.code(404).send({ error: "Transaction not found" });
    return reply.code(200).send({ message: "Deleted" });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// ─── Budget Goals ─────────────────────────────────────────────────────────────

// GET /api/budget/budgets
export const getBudgets = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { month, year } = request.query as { month?: string; year?: string };
  const now = new Date();
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
  const targetYear  = year  ? parseInt(year)  : now.getFullYear();

  try {
    const rows = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, targetMonth.toString()),
          eq(budgets.year,  targetYear.toString()),
        )
      );

    return reply.code(200).send({ budgets: rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// POST /api/budget/budgets  — upsert: if same category+month+year exists, update it
export const upsertBudget = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { category, limitAmount, currency, month, year } = request.body as any;
  if (!category || !limitAmount) {
    return reply.code(400).send({ error: "category and limitAmount are required" });
  }

  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear  = year  ?? now.getFullYear();

  try {
    // Check if one already exists
    const existing = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.category, category),
          eq(budgets.month, targetMonth.toString()),
          eq(budgets.year,  targetYear.toString()),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(budgets)
        .set({ limitAmount: limitAmount.toString(), currency: currency || "USD" })
        .where(eq(budgets.id, existing[0].id))
        .returning();
      return reply.code(200).send({ budget: updated });
    }

    const [created] = await db.insert(budgets).values({
      userId,
      category,
      limitAmount: limitAmount.toString(),
      currency: currency || "USD",
      month: targetMonth.toString(),
      year:  targetYear.toString(),
    }).returning();

    return reply.code(201).send({ budget: created });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// DELETE /api/budget/budgets/:id
export const deleteBudget = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };

  try {
    const deleted = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();

    if (deleted.length === 0) return reply.code(404).send({ error: "Budget not found" });
    return reply.code(200).send({ message: "Deleted" });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────────

// GET /api/budget/analytics  — aggregated data for charts
export const getAnalytics = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { month, year } = request.query as { month?: string; year?: string };
  const now = new Date();
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
  const targetYear  = year  ? parseInt(year)  : now.getFullYear();

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate   = new Date(targetYear, targetMonth, 1);

  // Last 6 months range for trend
  const trendStart = new Date(targetYear, targetMonth - 7, 1);

  try {
    // 1. Spending by category (current month, expenses only)
    const byCategory = await db
      .select({
        category: personalTransactions.category,
        total: sql<string>`CAST(SUM(${personalTransactions.amount}) AS TEXT)`,
      })
      .from(personalTransactions)
      .where(
        and(
          eq(personalTransactions.userId, userId),
          eq(personalTransactions.type, "expense"),
          gte(personalTransactions.date, startDate),
          lte(personalTransactions.date, endDate),
        )
      )
      .groupBy(personalTransactions.category);

    // 2. Monthly totals (last 6 months)
    const monthlyTotals = await db
      .select({
        month: sql<string>`TO_CHAR(${personalTransactions.date}, 'YYYY-MM')`,
        expense: sql<string>`CAST(SUM(CASE WHEN ${personalTransactions.type} = 'expense' THEN ${personalTransactions.amount} ELSE 0 END) AS TEXT)`,
        income:  sql<string>`CAST(SUM(CASE WHEN ${personalTransactions.type} = 'income'  THEN ${personalTransactions.amount} ELSE 0 END) AS TEXT)`,
      })
      .from(personalTransactions)
      .where(
        and(
          eq(personalTransactions.userId, userId),
          gte(personalTransactions.date, trendStart),
        )
      )
      .groupBy(sql`TO_CHAR(${personalTransactions.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${personalTransactions.date}, 'YYYY-MM')`);

    // 3. Summary totals for current month
    const summary = await db
      .select({
        totalExpense: sql<string>`CAST(SUM(CASE WHEN ${personalTransactions.type} = 'expense' THEN ${personalTransactions.amount} ELSE 0 END) AS TEXT)`,
        totalIncome:  sql<string>`CAST(SUM(CASE WHEN ${personalTransactions.type} = 'income'  THEN ${personalTransactions.amount} ELSE 0 END) AS TEXT)`,
        txnCount:     sql<number>`COUNT(*)`,
      })
      .from(personalTransactions)
      .where(
        and(
          eq(personalTransactions.userId, userId),
          gte(personalTransactions.date, startDate),
          lte(personalTransactions.date, endDate),
        )
      );

    return reply.code(200).send({
      byCategory,
      monthlyTotals,
      summary: summary[0] ?? { totalExpense: "0", totalIncome: "0", txnCount: 0 },
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
