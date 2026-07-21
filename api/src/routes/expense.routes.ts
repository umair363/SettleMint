import { FastifyInstance } from "fastify";
import * as expenseController from "../controllers/expense.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createExpenseSchema } from "@settlemint/shared";

export default async function expenseRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  server.get("/search", expenseController.searchMyExpenses);
  server.get("/me", expenseController.getMyExpenses);
  server.get("/group/:groupId", expenseController.getGroupExpenses);
  server.post("/", { preHandler: validateBody(createExpenseSchema) }, expenseController.createExpense);
}
