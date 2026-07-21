import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { personalTransactions, budgets } from "../db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import type {
  createTransactionSchema,
  upsertBudgetSchema,
  budgetQuerySchema,
} from "@settlemint/shared";
import type { z } from "zod";
import { computeNextRunDate, materializeDueRecurringTransactions } from "../utils/recurrence";

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string; email: string; fullName: string };
}

type BudgetQuery = z.infer<typeof budgetQuerySchema>;
type CreateTransactionBody = z.infer<typeof createTransactionSchema>;
type UpsertBudgetBody = z.infer<typeof upsertBudgetSchema>;

// ─── Transactions ─────────────────────────────────────────────────────────────

// GET /api/budget/transactions
export const getTransactions = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  // Validated + coerced to numbers by budgetQuerySchema (validateQuery preHandler)
  const { month, year, category, type } = request.query as BudgetQuery;

  try {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    // Backfill any recurring transactions that came due since the user's
    // last visit before reading the period — see recurrence.ts for why this
    // is generate-on-read rather than a background scheduler.
    await materializeDueRecurringTransactions(userId, now);

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate   = new Date(targetYear, targetMonth, 1); // exclusive

    const rows = await db
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

  // Validated by createTransactionSchema (validateBody preHandler) — amount is
  // guaranteed positive & 2dp, category/wallet/type are guaranteed valid enums.
  const {
    amount, type, category, description, wallet,
    currency, date, notes, isRecurring, recurringFrequency,
  } = request.body as CreateTransactionBody;

  try {
    const txnDate = date ? new Date(date) : new Date();
    // The row being created here represents the first occurrence itself;
    // nextRunDate marks when the *next* one after it should be generated.
    const nextRunDate = isRecurring && recurringFrequency
      ? computeNextRunDate(txnDate, recurringFrequency)
      : null;

    const [txn] = await db.insert(personalTransactions).values({
      userId,
      amount: amount.toString(),
      type,
      category,
      description,
      wallet,
      currency: currency || "USD",
      date: txnDate,
      notes: notes || null,
      isRecurring: isRecurring ?? false,
      recurringFrequency: recurringFrequency || null,
      nextRunDate,
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

  const { month, year } = request.query as BudgetQuery;
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear  = year  ?? now.getFullYear();

  try {
    const rows = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, targetMonth),
          eq(budgets.year, targetYear),
        )
      );

    return reply.code(200).send({ budgets: rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// POST /api/budget/budgets  — upsert: if same category+month+year exists, update it
// Concurrency: relies on the unique index budgets_user_category_month_year_idx
// (see schema.ts) to make this race-safe — a concurrent duplicate insert is
// rejected by Postgres and turned into an update rather than creating a dupe row.
export const upsertBudget = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { category, limitAmount, currency, month, year } = request.body as UpsertBudgetBody;

  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear  = year  ?? now.getFullYear();

  try {
    const [budget] = await db
      .insert(budgets)
      .values({
        userId,
        category,
        limitAmount: limitAmount.toString(),
        currency: currency || "USD",
        month: targetMonth,
        year: targetYear,
      })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.category, budgets.month, budgets.year],
        set: {
          limitAmount: limitAmount.toString(),
          currency: currency || "USD",
        },
      })
      .returning();

    return reply.code(200).send({ budget });
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

  const { month, year } = request.query as BudgetQuery;
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear  = year  ?? now.getFullYear();

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate   = new Date(targetYear, targetMonth, 1);

  // Previous month range — powers the "vs last month" category trend deltas
  const prevMonthStart = new Date(targetYear, targetMonth - 2, 1);
  const prevMonthEnd   = startDate;

  // Last 6 months range for trend
  const trendStart = new Date(targetYear, targetMonth - 7, 1);

  try {
    await materializeDueRecurringTransactions(userId, now);

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

    // 1b. Spending by category for the previous month, for trend comparison
    const byCategoryPrevMonth = await db
      .select({
        category: personalTransactions.category,
        total: sql<string>`CAST(SUM(${personalTransactions.amount}) AS TEXT)`,
      })
      .from(personalTransactions)
      .where(
        and(
          eq(personalTransactions.userId, userId),
          eq(personalTransactions.type, "expense"),
          gte(personalTransactions.date, prevMonthStart),
          lte(personalTransactions.date, prevMonthEnd),
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
      byCategoryPrevMonth,
      monthlyTotals,
      summary: summary[0] ?? { totalExpense: "0", totalIncome: "0", txnCount: 0 },
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
