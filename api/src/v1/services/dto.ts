import { asc, eq, inArray } from "drizzle-orm";
import type {
  ActivityDto,
  ExpenseDto,
  MemberDto,
  PaymentHandleDto,
  SettlementDto,
  SplitSpec,
} from "@settlemint/shared";
import type { DbOrTx } from "../db/client";
import { activityEvents, expenseLines, expenses, members, paymentHandles, settlements, user } from "../db/schema";

type ExpenseRow = typeof expenses.$inferSelect;
type SettlementRow = typeof settlements.$inferSelect;
type ActivityRow = typeof activityEvents.$inferSelect;

export async function loadMembers(db: DbOrTx, groupId: string, myUserId: string): Promise<MemberDto[]> {
  const rows = await db
    .select({ m: members, image: user.image })
    .from(members)
    .leftJoin(user, eq(user.id, members.userId))
    .where(eq(members.groupId, groupId))
    .orderBy(members.createdAt);

  // How each person who joined likes to be paid (visible only to their groups).
  const userIds = rows.map((r) => r.m.userId).filter((id): id is string => id !== null);
  const handles = userIds.length
    ? await db
        .select()
        .from(paymentHandles)
        .where(inArray(paymentHandles.userId, userIds))
        .orderBy(asc(paymentHandles.position))
    : [];
  const handlesBy = new Map<string, PaymentHandleDto[]>();
  for (const h of handles) {
    const list = handlesBy.get(h.userId) ?? [];
    list.push({ id: h.id, kind: h.kind, value: h.value, label: h.label });
    handlesBy.set(h.userId, list);
  }

  return rows.map(({ m, image }) => ({
    paymentHandles: m.userId ? (handlesBy.get(m.userId) ?? []) : [],
    id: m.id,
    displayName: m.displayName,
    role: m.role,
    userId: m.userId,
    image: image ?? null,
    isMe: m.userId === myUserId,
    claimed: m.userId !== null,
    left: m.leftAt !== null,
  }));
}

export async function expensesToDto(db: DbOrTx, rows: ExpenseRow[]): Promise<ExpenseDto[]> {
  if (rows.length === 0) return [];
  const lines = await db
    .select()
    .from(expenseLines)
    .where(
      inArray(
        expenseLines.expenseId,
        rows.map((r) => r.id),
      ),
    );
  const byExpense = new Map<string, ExpenseDto["lines"]>();
  for (const l of lines) {
    const list = byExpense.get(l.expenseId) ?? [];
    list.push({ memberId: l.memberId, paid: l.paid, owed: l.owed, paidGroup: l.paidGroup, owedGroup: l.owedGroup });
    byExpense.set(l.expenseId, list);
  }
  return rows.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    fxRate: r.fxRate,
    groupAmount: r.groupAmount,
    category: r.category,
    date: r.date,
    notes: r.notes,
    split: r.split as SplitSpec,
    lines: byExpense.get(r.id) ?? [],
    createdByUserId: r.createdByUserId,
    recurringRuleId: r.recurringRuleId,
    version: r.version,
    deleted: r.deletedAt !== null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export function settlementToDto(r: SettlementRow): SettlementDto {
  return {
    id: r.id,
    groupId: r.groupId,
    fromMemberId: r.fromMemberId,
    toMemberId: r.toMemberId,
    amount: r.amount,
    currency: r.currency,
    fxRate: r.fxRate,
    groupAmount: r.groupAmount,
    method: r.method,
    note: r.note,
    date: r.date,
    version: r.version,
    deleted: r.deletedAt !== null,
    createdAt: r.createdAt.toISOString(),
  };
}

export function activityToDto(
  r: ActivityRow,
  names: { actorName: string | null; groupName: string; groupEmoji: string | null; viewerMemberId: string | null },
): ActivityDto {
  return {
    id: r.id,
    groupId: r.groupId,
    groupName: names.groupName,
    groupEmoji: names.groupEmoji,
    viewerMemberId: names.viewerMemberId,
    type: r.type,
    entityId: r.entityId,
    actorMemberId: r.actorMemberId,
    actorUserId: r.actorUserId,
    actorName: names.actorName,
    data: (r.data ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Opaque cursor for keyset pagination. */
export function encodeCursor(parts: (string | number)[]): string {
  return Buffer.from(JSON.stringify(parts)).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): (string | number)[] | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
