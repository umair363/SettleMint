import { eq, and, lte, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { personalTransactions } from "../db/schema";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

// Caps how many missed occurrences a single read will backfill. Without this,
// a transaction that's been recurring-but-unvisited for years (e.g. an app
// the user stopped opening) would generate thousands of rows in one request.
const MAX_OCCURRENCES_PER_READ = 36;

/**
 * Advances a date by one recurrence interval. Exported standalone so the
 * date math can be unit tested without touching the database.
 */
export function computeNextRunDate(from: Date, frequency: RecurringFrequency): Date {
  const next = new Date(from);
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Generate-on-read materialization: instead of relying on a background
 * scheduler (unreliable on Render's free tier, which sleeps when idle), each
 * occurrence of a recurring transaction is created lazily the next time the
 * user reads their transactions — backfilling every interval that elapsed
 * since nextRunDate, up to "now".
 */
export async function materializeDueRecurringTransactions(userId: string, now: Date = new Date()) {
  const dueTemplates = await db
    .select()
    .from(personalTransactions)
    .where(
      and(
        eq(personalTransactions.userId, userId),
        eq(personalTransactions.isRecurring, true),
        isNotNull(personalTransactions.nextRunDate),
        lte(personalTransactions.nextRunDate, now),
      )
    );

  for (const template of dueTemplates) {
    if (!template.recurringFrequency || !template.nextRunDate) continue;

    const frequency = template.recurringFrequency as RecurringFrequency;
    const newRows: (typeof personalTransactions.$inferInsert)[] = [];
    let cursor = new Date(template.nextRunDate);
    let occurrences = 0;

    while (cursor <= now && occurrences < MAX_OCCURRENCES_PER_READ) {
      newRows.push({
        userId: template.userId,
        amount: template.amount,
        type: template.type,
        category: template.category,
        description: template.description,
        wallet: template.wallet,
        currency: template.currency,
        date: cursor,
        notes: template.notes,
        // Generated occurrences are plain transactions, not new recurrence
        // templates — only the original row drives future generation.
        isRecurring: false,
        recurringFrequency: null,
      });
      cursor = computeNextRunDate(cursor, frequency);
      occurrences++;
    }

    if (newRows.length > 0) {
      await db.insert(personalTransactions).values(newRows);
    }

    await db
      .update(personalTransactions)
      .set({ nextRunDate: cursor, lastGeneratedAt: now, updatedAt: now })
      .where(eq(personalTransactions.id, template.id));
  }
}
