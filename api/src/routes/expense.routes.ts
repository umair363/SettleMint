import { FastifyInstance } from "fastify";
import * as expenseController from "../controllers/expense.controller";
import { authenticate } from "../middleware/auth.middleware";

export default async function expenseRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  server.get("/me", expenseController.getMyExpenses);
  server.get("/group/:groupId", expenseController.getGroupExpenses);
  server.post("/", expenseController.createExpense);
}
