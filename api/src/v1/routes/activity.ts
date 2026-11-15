import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { pageQuery, type ActivityDto, type Page } from "@settlemint/shared";
import { requireUser } from "../app";
import { activityEvents, groups, members } from "../db/schema";
import { requireMembership } from "../services/access";
import { activityToDto, decodeCursor, encodeCursor } from "../services/dto";

const groupParams = z.object({ id: z.uuid() });

export const activityRoutes: FastifyPluginAsyncZod = async (app) => {
  async function page(groupIds: string[], cursorText: string | undefined, limit: number, entityId?: string) {
    if (groupIds.length === 0) return { items: [], nextCursor: null };
    const cursor = decodeCursor(cursorText);
    const conditions = [inArray(activityEvents.groupId, groupIds)];
    if (entityId) conditions.push(eq(activityEvents.entityId, entityId));
    if (cursor && cursor.length === 2) {
      const [c, id] = cursor.map(String);
      conditions.push(sql`(${activityEvents.createdAt}, ${activityEvents.id}) < (${c}::timestamptz, ${id}::uuid)`);
    }
    const rows = await app.db
      .select()
      .from(activityEvents)
      .where(and(...conditions))
      .orderBy(desc(activityEvents.createdAt), desc(activityEvents.id))
      .limit(limit + 1);
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items: items.map(activityToDto),
      nextCursor: rows.length > limit && last ? encodeCursor([last.createdAt.toISOString(), last.id]) : null,
    };
  }

  /** Everything across the caller's groups. */
  app.get("/activity", { schema: { querystring: pageQuery } }, async (req): Promise<Page<ActivityDto>> => {
    const user = requireUser(req);
    const mine = await app.db
      .select({ groupId: members.groupId })
      .from(members)
      .innerJoin(groups, eq(groups.id, members.groupId))
      .where(and(eq(members.userId, user.id), isNull(members.leftAt), isNull(groups.deletedAt)));
    return page(
      mine.map((m) => m.groupId),
      req.query.cursor,
      req.query.limit,
    );
  });

  /** One group's feed, or the edit history of one expense/payment (`entityId`). */
  app.get(
    "/groups/:id/activity",
    { schema: { params: groupParams, querystring: pageQuery.extend({ entityId: z.uuid().optional() }) } },
    async (req): Promise<Page<ActivityDto>> => {
      const user = requireUser(req);
      const { group } = await requireMembership(app.db, req.params.id, user.id);
      return page([group.id], req.query.cursor, req.query.limit, req.query.entityId);
    },
  );
};
