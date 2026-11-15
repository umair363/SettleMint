import { createHash } from "node:crypto";
import { and, eq, inArray, lte } from "drizzle-orm";
import {
  dueOccurrences,
  MoneyError,
  todayIn,
  occurrenceDate,
  type RecurringRuleDto,
  type SplitSpec,
} from "@settlemint/shared";
import type { Db } from "../db/client";
import { expenseLines, expenses, groups, recurringRules } from "../db/schema";
import { AppError } from "../errors";
import { recordActivity } from "./activity";
import { computeLines, expenseSummary, type ExpenseInput } from "./expense-lines";

export type RuleRow = typeof recurringRules.$inferSelect;
type Template = Omit<ExpenseInput, "date">;

/**
 * Stable expense id for (rule, date), so generating the same occurrence twice,
 * even from two servers at once, hits the primary key instead of duplicating.
 */
export function occurrenceExpenseId(ruleId: string, date: string): string {
  const h = createHash("sha256").update(`${ruleId}:${date}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50; // version nibble
  h[8] = (h[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = h.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function ruleToDto(r: RuleRow): RecurringRuleDto {
  const t = r.template as Template;
  return {
    id: r.id,
    groupId: r.groupId,
    description: t.description,
    amount: t.amount,
    currency: t.currency,
    category: t.category,
    frequency: r.frequency,
    interval: r.interval,
    startDate: r.startDate,
    endDate: r.endDate,
    nextDate: r.nextDate,
    active: r.active,
    pausedReason: r.pausedReason,
  };
}

/** The furthest-ahead date on Earth right now: no bill can be due later than this anywhere. */
function latestToday() {
  return todayIn("Pacific/Kiritimati");
}

/**
 * Create every occurrence that is due, for one group or all of them. Safe to
 * call often and concurrently: rules are locked while processed and
 * occurrence ids are deterministic. Returns the groups that changed.
 */
export async function materializeRecurring(db: Db, opts: { groupId?: string; today?: string } = {}) {
  // Coarse filter with the furthest-ahead date; each rule is then checked in its own zone.
  const horizon = opts.today ?? latestToday();
  const dueIds = (
    await db
      .select({ id: recurringRules.id })
      .from(recurringRules)
      .innerJoin(groups, eq(groups.id, recurringRules.groupId))
      .where(
        and(
          eq(recurringRules.active, true),
          lte(recurringRules.nextDate, horizon),
          ...(opts.groupId ? [eq(recurringRules.groupId, opts.groupId)] : []),
        ),
      )
      .limit(500)
  ).map((r) => r.id);

  const changed = new Set<string>();
  for (const ruleId of dueIds) {
    await db.transaction(async (tx) => {
      const [rule] = await tx
        .select()
        .from(recurringRules)
        .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.active, true)))
        .for("update", { skipLocked: true });
      if (!rule) return;
      const today = opts.today ?? todayIn(rule.timezone);
      if (rule.nextDate > today) return;
      const [group] = await tx.select().from(groups).where(eq(groups.id, rule.groupId));
      if (!group || group.deletedAt) return;

      const template = rule.template as Template;
      const due = dueOccurrences(rule.startDate, rule.frequency, rule.interval, rule.generated, today, {
        endIso: rule.endDate,
        limit: 24,
      });
      let made = 0;
      try {
        for (const { date } of due) {
          const id = occurrenceExpenseId(rule.id, date);
          const body: ExpenseInput = { ...template, date } as ExpenseInput;
          const { fxRate, groupAmount, rows } = await computeLines(tx, group, body);
          const inserted = await tx
            .insert(expenses)
            .values({
              id,
              groupId: group.id,
              description: body.description,
              amount: body.amount,
              currency: body.currency,
              fxRate,
              groupAmount,
              category: body.category,
              date,
              notes: body.notes ?? null,
              split: body.split as SplitSpec,
              recurringRuleId: rule.id,
              createdByUserId: rule.createdByUserId,
              updatedByUserId: rule.createdByUserId,
            })
            .onConflictDoNothing({ target: expenses.id })
            .returning({ id: expenses.id });
          made++;
          if (inserted.length === 0) continue; // already created earlier
          await tx.insert(expenseLines).values(rows.map((r) => ({ ...r, expenseId: id })));
          await recordActivity(tx, {
            groupId: group.id,
            type: "expense.created",
            actorUserId: null,
            actorMemberId: null,
            entityId: id,
            data: { ...expenseSummary(body), recurring: true },
          });
          changed.add(group.id);
        }
        const generated = rule.generated + made;
        const nextDate = occurrenceDate(rule.startDate, rule.frequency, rule.interval, generated);
        await tx
          .update(recurringRules)
          .set({
            generated,
            nextDate,
            active: !(rule.endDate && nextDate > rule.endDate),
            updatedAt: new Date(),
          })
          .where(eq(recurringRules.id, rule.id));
      } catch (err) {
        // Can't be created as set up (someone left, no exchange rate…): pause
        // with a reason instead of guessing. The group can fix and restart it.
        if (!(err instanceof AppError || err instanceof MoneyError)) throw err;
        await tx
          .update(recurringRules)
          .set({ active: false, pausedReason: err.message.slice(0, 200), updatedAt: new Date() })
          .where(eq(recurringRules.id, rule.id));
        changed.add(group.id);
      }
    });
  }
  return changed;
}

/** Rules for a group, active first. */
export async function listRules(db: Db, groupIds: string[]) {
  if (!groupIds.length) return [];
  return db.select().from(recurringRules).where(inArray(recurringRules.groupId, groupIds));
}
