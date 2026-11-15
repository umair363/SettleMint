import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DbOrTx } from "../db/client";
import { groups, members, type MemberRole } from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";

export type GroupRow = typeof groups.$inferSelect;
export type MemberRow = typeof members.$inferSelect;

/**
 * The one gate for every group-scoped route. Returns the group and the
 * caller's membership, or 404 when the group doesn't exist, is deleted, or
 * the caller isn't in it, so outsiders can't even confirm a group exists.
 */
export async function requireMembership(
  db: DbOrTx,
  groupId: string,
  userId: string,
  opts: { roles?: MemberRole[]; includeDeleted?: boolean } = {},
): Promise<{ group: GroupRow; me: MemberRow }> {
  const rows = await db
    .select({ group: groups, me: members })
    .from(members)
    .innerJoin(groups, eq(groups.id, members.groupId))
    .where(and(eq(members.groupId, groupId), eq(members.userId, userId), isNull(members.leftAt)))
    .limit(1);

  const row = rows[0];
  if (!row || (row.group.deletedAt && !opts.includeDeleted)) throw notFound("Group not found");
  if (opts.roles && !opts.roles.includes(row.me.role)) throw forbidden();
  return row;
}

/**
 * Check that every member id belongs to this group and hasn't left.
 * Stops expenses and settlements from pointing at people in other groups.
 */
export async function assertActiveMembers(db: DbOrTx, groupId: string, memberIds: readonly string[]) {
  const unique = [...new Set(memberIds)];
  if (unique.length === 0) return;
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.groupId, groupId), inArray(members.id, unique), isNull(members.leftAt)));
  if (rows.length !== unique.length) {
    const found = new Set(rows.map((r) => r.id));
    throw new AppError(422, "MEMBER_NOT_IN_GROUP", "Someone in this split isn't in the group", {
      memberIds: unique.filter((id) => !found.has(id)),
    });
  }
}

export function canManageGroup(me: MemberRow) {
  return me.role === "owner" || me.role === "admin";
}
