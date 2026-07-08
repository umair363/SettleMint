import { FastifyInstance } from "fastify";
import * as budgetController from "../controllers/budget.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function budgetRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // Transactions
  server.get("/transactions",     budgetController.getTransactions);
  server.post("/transactions",    budgetController.createTransaction);
  server.delete("/transactions/:id", budgetController.deleteTransaction);

  // Budget Goals
  server.get("/budgets",          budgetController.getBudgets);
  server.post("/budgets",         budgetController.upsertBudget);
  server.delete("/budgets/:id",   budgetController.deleteBudget);

  // Analytics
  server.get("/analytics",        budgetController.getAnalytics);
}
