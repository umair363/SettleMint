import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { convertMinor, createSettlementBody, updateSettlementBody } from "@settlemint/shared";
import { requireUser } from "../app";
import type { DbOrTx } from "../db/client";
import { settlements } from "../db/schema";
import { AppError, notFound, versionConflict } from "../errors";
import { recordActivity } from "../services/activity";
import { assertActiveMembers, requireMembership } from "../services/access";
import { settlementToDto } from "../services/dto";
import { resolveRate } from "../services/fx";

const groupParams = z.object({ id: z.uuid() });
const idParams = z.object({ id: z.uuid() });

const summary = (s: { fromMemberId: string; toMemberId: string; amount: number; currency: string }) => ({
  fromMemberId: s.fromMemberId,
  toMemberId: s.toMemberId,
  amount: s.amount,
  currency: s.currency,
});

export const settlementRoutes: FastifyPluginAsyncZod = async (app) => {
  async function loadSettlement(db: DbOrTx, id: string, userId: string) {
    const [row] = await db.select().from(settlements).where(eq(settlements.id, id));
    if (!row) throw notFound("Payment not found");
    return { row, ...(await requireMembership(db, row.groupId, userId)) };
  }

  app.get("/groups/:id/settlements", { schema: { params: groupParams } }, async (req) => {
    const user = requireUser(req);
    const { group } = await requireMembership(app.db, req.params.id, user.id);
    const rows = await app.db
      .select()
      .from(settlements)
      .where(eq(settlements.groupId, group.id))
      .orderBy(desc(settlements.date), desc(settlements.createdAt))
      .limit(500);
    return rows.map(settlementToDto);
  });

  /**
   * Record that one member paid another. Any member may record any payment
   * in their group (the activity log shows who did it), as in real life the
   * person who received cash is often the one who logs it.
   */
  app.post(
    "/groups/:id/settlements",
    { schema: { params: groupParams, body: createSettlementBody } },
    async (req, reply) => {
      const user = requireUser(req);
      const body = req.body;
      const id = body.id ?? uuidv7();
      const result = await app.db.transaction(async (tx) => {
        const { group, me } = await requireMembership(tx, req.params.id, user.id);
        const [existing] = await tx.select().from(settlements).where(eq(settlements.id, id));
        if (existing) {
          if (existing.groupId !== group.id || existing.createdByUserId !== user.id) {
            throw new AppError(409, "CONFLICT", "That id is already in use");
          }
          return { status: 200, dto: settlementToDto(existing) };
        }
        await assertActiveMembers(tx, group.id, [body.fromMemberId, body.toMemberId]);
        const fxRate = await resolveRate(tx, body.currency, group.currency, body.date, body.fxRate);
        const [row] = await tx
          .insert(settlements)
          .values({
            id,
            groupId: group.id,
            fromMemberId: body.fromMemberId,
            toMemberId: body.toMemberId,
            amount: body.amount,
            currency: body.currency,
            fxRate,
            groupAmount: convertMinor(body.amount, body.currency, group.currency, fxRate),
            method: body.method,
            note: body.note ?? null,
            date: body.date,
            createdByUserId: user.id,
          })
          .returning();
        await recordActivity(tx, {
          groupId: group.id,
          type: "settlement.created",
          actorUserId: user.id,
          actorMemberId: me.id,
          entityId: id,
          data: summary(body),
        });
        return { status: 201, dto: settlementToDto(row) };
      });
      return reply.status(result.status).send(result.dto);
    },
  );

  app.patch("/settlements/:id", { schema: { params: idParams, body: updateSettlementBody } }, async (req) => {
    const user = requireUser(req);
    const body = req.body;
    return app.db.transaction(async (tx) => {
      const { row, group, me } = await loadSettlement(tx, req.params.id, user.id);
      if (row.deletedAt) throw notFound("Payment was deleted");
      if (row.version !== body.version) throw versionConflict(settlementToDto(row));
      const keep = new Set([row.fromMemberId, row.toMemberId]);
      await assertActiveMembers(
        tx,
        group.id,
        [body.fromMemberId, body.toMemberId].filter((m) => !keep.has(m)),
      );
      const fxRate = await resolveRate(tx, body.currency, group.currency, body.date, body.fxRate);
      const [updated] = await tx
        .update(settlements)
        .set({
          fromMemberId: body.fromMemberId,
          toMemberId: body.toMemberId,
          amount: body.amount,
          currency: body.currency,
          fxRate,
          groupAmount: convertMinor(body.amount, body.currency, group.currency, fxRate),
          method: body.method,
          note: body.note ?? null,
          date: body.date,
          version: sql`${settlements.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(settlements.id, row.id), eq(settlements.version, body.version)))
        .returning();
      if (!updated) throw versionConflict(settlementToDto(row));
      await recordActivity(tx, {
        groupId: group.id,
        type: "settlement.updated",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: row.id,
        data: { before: summary(row), after: summary(body) },
      });
      return settlementToDto(updated);
    });
  });

  for (const [method, path, deleted] of [
    ["DELETE", "/settlements/:id", true],
    ["POST", "/settlements/:id/restore", false],
  ] as const) {
    app.route({
      method,
      url: path,
      schema: { params: idParams },
      handler: async (req) => {
        const user = requireUser(req);
        return app.db.transaction(async (tx) => {
          const { row, group, me } = await loadSettlement(tx, req.params.id, user.id);
          if (Boolean(row.deletedAt) === deleted) return settlementToDto(row);
          const [updated] = await tx
            .update(settlements)
            .set({ deletedAt: deleted ? new Date() : null, version: sql`${settlements.version} + 1`, updatedAt: new Date() })
            .where(eq(settlements.id, row.id))
            .returning();
          await recordActivity(tx, {
            groupId: group.id,
            type: deleted ? "settlement.deleted" : "settlement.restored",
            actorUserId: user.id,
            actorMemberId: me.id,
            entityId: row.id,
            data: summary(row),
          });
          return settlementToDto(updated);
        });
      },
    });
  }
};
