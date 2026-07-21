import { FastifyInstance } from "fastify";
import * as budgetController from "../controllers/budget.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { createTransactionSchema, upsertBudgetSchema, budgetQuerySchema } from "@settlemint/shared";

export default async function budgetRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // Transactions
  server.get("/transactions", { preHandler: validateQuery(budgetQuerySchema) }, budgetController.getTransactions);
  server.post("/transactions", { preHandler: validateBody(createTransactionSchema) }, budgetController.createTransaction);
  server.delete("/transactions/:id", budgetController.deleteTransaction);

  // Budget Goals
  server.get("/budgets", { preHandler: validateQuery(budgetQuerySchema) }, budgetController.getBudgets);
  server.post("/budgets", { preHandler: validateBody(upsertBudgetSchema) }, budgetController.upsertBudget);
  server.delete("/budgets/:id", budgetController.deleteBudget);

  // Analytics
  server.get("/analytics", { preHandler: validateQuery(budgetQuerySchema) }, budgetController.getAnalytics);
}
