import { uuidv7 } from "uuidv7";
import type { DbOrTx } from "../db/client";
import { activityEvents } from "../db/schema";
import { markGroupChanged } from "../live";

export type ActivityType =
  | "group.created"
  | "group.updated"
  | "group.deleted"
  | "group.restored"
  | "group.imported"
  | "member.added"
  | "member.joined"
  | "member.renamed"
  | "member.left"
  | "member.removed"
  | "expense.created"
  | "expense.updated"
  | "expense.deleted"
  | "expense.restored"
  | "settlement.created"
  | "settlement.updated"
  | "settlement.deleted"
  | "settlement.restored"
  | "recurring.created"
  | "recurring.stopped";

export async function recordActivity(
  db: DbOrTx,
  e: {
    groupId: string;
    type: ActivityType;
    actorUserId: string | null;
    actorMemberId: string | null;
    entityId?: string | null;
    data?: Record<string, unknown>;
  },
) {
  markGroupChanged({
    groupId: e.groupId,
    type: e.type,
    actorUserId: e.actorUserId,
    actorMemberId: e.actorMemberId,
    data: e.data ?? {},
  });
  await db.insert(activityEvents).values({
    id: uuidv7(),
    groupId: e.groupId,
    type: e.type,
    actorUserId: e.actorUserId,
    actorMemberId: e.actorMemberId,
    entityId: e.entityId ?? null,
    data: e.data ?? {},
  });
}
