import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { createRecurringBody, type RecurringRuleDto } from "@settlemint/shared";
import { requireUser } from "../app";
import { recurringRules } from "../db/schema";
import { AppError, notFound } from "../errors";
import { requireMembership } from "../services/access";
import { recordActivity } from "../services/activity";
import { computeLines, type ExpenseInput } from "../services/expense-lines";
import { listRules, materializeRecurring, ruleToDto } from "../services/recurring";

const groupParams = z.object({ id: z.uuid() });
const idParams = z.object({ id: z.uuid() });

export const recurringRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/groups/:id/recurring", { schema: { params: groupParams } }, async (req): Promise<RecurringRuleDto[]> => {
    const user = requireUser(req);
    const { group } = await requireMembership(app.db, req.params.id, user.id);
    const rules = await listRules(app.db, [group.id]);
    return rules
      .map(ruleToDto)
      .sort((a, b) => Number(b.active) - Number(a.active) || a.nextDate.localeCompare(b.nextDate));
  });

  /** Start a repeating expense. If the start date is today or earlier, it's added right away. */
  app.post("/groups/:id/recurring", { schema: { params: groupParams, body: createRecurringBody } }, async (req, reply) => {
    const user = requireUser(req);
    const body = req.body;
    const id = body.id ?? uuidv7();
    await app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id);
      const [existing] = await tx.select().from(recurringRules).where(eq(recurringRules.id, id));
      if (existing) {
        if (existing.groupId !== group.id) throw new AppError(409, "CONFLICT", "That id is already in use");
        return;
      }
      // Validate the template exactly as a real expense (people, split, rate).
      await computeLines(tx, group, { ...body.template, date: body.startDate } as ExpenseInput);
      await tx.insert(recurringRules).values({
        id,
        groupId: group.id,
        template: body.template,
        frequency: body.frequency,
        interval: body.interval,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        timezone: body.timezone,
        nextDate: body.startDate,
        createdByUserId: user.id,
      });
      await recordActivity(tx, {
        groupId: group.id,
        type: "recurring.created",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: id,
        data: {
          description: body.template.description,
          amount: body.template.amount,
          currency: body.template.currency,
          frequency: body.frequency,
        },
      });
    });
    await materializeRecurring(app.db, { groupId: req.params.id });
    const [rule] = await app.db.select().from(recurringRules).where(eq(recurringRules.id, id));
    return reply.status(201).send(ruleToDto(rule));
  });

  /** Stop a repeating expense. Expenses already added stay. */
  app.delete("/recurring/:id", { schema: { params: idParams } }, async (req) => {
    const user = requireUser(req);
    return app.db.transaction(async (tx) => {
      const [rule] = await tx.select().from(recurringRules).where(eq(recurringRules.id, req.params.id));
      if (!rule) throw notFound("Recurring expense not found");
      const { me } = await requireMembership(tx, rule.groupId, user.id);
      const [updated] = await tx
        .update(recurringRules)
        .set({ active: false, pausedReason: null, updatedAt: new Date() })
        .where(eq(recurringRules.id, rule.id))
        .returning();
      await recordActivity(tx, {
        groupId: rule.groupId,
        type: "recurring.stopped",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: rule.id,
        data: { description: (rule.template as { description: string }).description },
      });
      return ruleToDto(updated);
    });
  });
};
