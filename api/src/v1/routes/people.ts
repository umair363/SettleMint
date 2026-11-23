import { and, eq, isNull } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { PersonDto } from "@settlemint/shared";
import { requireUser } from "../app";
import { groups, members } from "../db/schema";
import { loadMembers } from "../services/dto";
import { groupLedger } from "../services/ledger";

/** Everyone you share a group with, and what is owed between you and them across all those groups. */
export const peopleRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/people", async (req): Promise<PersonDto[]> => {
    const me = requireUser(req);
    const mine = await app.db
      .select({ group: groups, memberId: members.id })
      .from(members)
      .innerJoin(groups, eq(groups.id, members.groupId))
      .where(and(eq(members.userId, me.id), isNull(members.leftAt), isNull(groups.deletedAt), isNull(groups.archivedAt)));

    const people = new Map<string, PersonDto>();
    for (const { group, memberId } of mine) {
      const [roster, ledger] = await Promise.all([loadMembers(app.db, group.id, me.id), groupLedger(app.db, group.id, group.simplifyDebts)]);
      for (const other of roster) {
        if (other.id === memberId || other.left) continue;
        // A person is known by their account. An unclaimed name only counts in a one-to-one group,
        // because the same name in two groups could be two different people.
        const key = other.userId ? `u:${other.userId}` : group.type === "direct" ? `m:${other.id}` : null;
        if (!key) continue;
        let amount = 0;
        for (const t of ledger.transfers) {
          if (t.fromMemberId === other.id && t.toMemberId === memberId) amount += t.amount;
          else if (t.fromMemberId === memberId && t.toMemberId === other.id) amount -= t.amount;
        }
        const person = people.get(key) ?? { key, name: other.displayName, image: other.image, totals: [], groups: [] };
        person.groups.push({ id: group.id, name: group.type === "direct" ? other.displayName : group.name, type: group.type, currency: group.currency, amount });
        if (amount !== 0) {
          const row = person.totals.find((t) => t.currency === group.currency);
          if (row) row.amount += amount;
          else person.totals.push({ currency: group.currency, amount });
        }
        people.set(key, person);
      }
    }
    for (const p of people.values()) p.totals = p.totals.filter((t) => t.amount !== 0);
    const size = (p: PersonDto) => p.totals.reduce((s, t) => s + Math.abs(t.amount), 0);
    return [...people.values()].sort((a, b) => size(b) - size(a) || a.name.localeCompare(b.name));
  });
};
