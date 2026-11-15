import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import type { ExpenseDto, GroupDetailDto, GroupSummaryDto } from "@settlemint/shared";
import { createTestApp, TestClient } from "./harness";

let t: Awaited<ReturnType<typeof createTestApp>>;
const today = "2026-11-15";

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

const client = () => new TestClient(t.app);

/** Ana creates a group with Ben and Cy added by name. */
async function tripWithFriends(currency = "USD") {
  const ana = client();
  await ana.signUp("Ana");
  const res = await ana.post<GroupDetailDto>("/v1/groups", {
    name: "Lisbon trip",
    currency,
    type: "trip",
    people: [{ displayName: "Ben" }, { displayName: "Cy" }],
  });
  expect(res.status).toBe(201);
  const g = res.body;
  const id = (name: string) => g.members.find((m) => m.displayName === name)!.id;
  return { ana, group: g, anaId: g.myMemberId, benId: id("Ben"), cyId: id("Cy") };
}

describe("api document", () => {
  it("publishes an OpenAPI document with the v1 routes", async () => {
    const res = await client().get("/v1/openapi.json");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(["/v1/groups", "/v1/groups/{id}/expenses", "/v1/expenses/{id}", "/v1/invites/{token}/join"]),
    );
  });
});

describe("auth", () => {
  it("rejects requests without a session", async () => {
    const res = await client().get("/v1/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("signs up and reads the profile", async () => {
    const c = client();
    const { email } = await c.signUp("Dana");
    const me = await c.get("/v1/me");
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ name: "Dana", email, isGuest: false });

    const updated = await c.patch("/v1/me", { defaultCurrency: "PKR", locale: "ur-PK" });
    expect(updated.body).toMatchObject({ defaultCurrency: "PKR", locale: "ur-PK" });
    expect((await c.patch("/v1/me", { defaultCurrency: "ABC" })).status).toBe(400);
  });

  it("sends a sign-in code by email", async () => {
    const c = client();
    const { email } = await c.signUp("Eli");
    const res = await client().post("/v1/auth/email-otp/send-verification-otp", { email, type: "sign-in" });
    expect(res.status).toBe(200);
    const mail = t.mailer.sent.find((m) => m.to === email);
    expect(mail?.text).toMatch(/\b\d{6}\b/);
  });
});

describe("groups and expenses", () => {
  it("creates a group with people added by name", async () => {
    const { group } = await tripWithFriends();
    expect(group.members.map((m) => [m.displayName, m.role, m.claimed])).toEqual([
      ["Ana", "owner", true],
      ["Ben", "member", false],
      ["Cy", "member", false],
    ]);
    expect(group.transfers).toEqual([]);
  });

  it("splits equally with exact cents and suggests payments", async () => {
    const { ana, group, anaId, benId, cyId } = await tripWithFriends();
    const res = await ana.post<ExpenseDto>(`/v1/groups/${group.id}/expenses`, {
      description: "Dinner",
      amount: 10000,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 10000 }],
      split: { method: "equal", memberIds: [anaId, benId, cyId] },
    });
    expect(res.status).toBe(201);
    expect(res.body.lines.reduce((s, l) => s + l.owed, 0)).toBe(10000);

    const detail = (await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    expect(detail.balances).toEqual({ [anaId]: 6666, [benId]: -3333, [cyId]: -3333 });
    expect(detail.transfers).toHaveLength(2);
    expect(detail.totalSpent).toBe(10000);

    const list = (await ana.get<GroupSummaryDto[]>("/v1/groups")).body;
    expect(list.find((g) => g.id === group.id)).toMatchObject({ myBalance: 6666, memberCount: 3 });
  });

  it("handles amounts like 19.99 and itemized receipts with tax", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const res = await ana.post<ExpenseDto>(`/v1/groups/${group.id}/expenses`, {
      description: "Lunch",
      amount: 1999,
      currency: "USD",
      date: today,
      payers: [{ memberId: benId, amount: 1999 }],
      split: {
        method: "itemized",
        items: [
          { amount: 1000, memberIds: [anaId] },
          { amount: 800, memberIds: [benId] },
        ],
        extras: 199,
      },
    });
    expect(res.status).toBe(201);
    const owed = Object.fromEntries(res.body.lines.map((l) => [l.memberId, l.owed]));
    expect(owed[anaId] + owed[benId]).toBe(1999);
    expect(owed[anaId]).toBe(1111); // 1000 + 199 * 10/18 = 1110.56 -> 1111
  });

  it("converts foreign-currency expenses at a frozen rate", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends("USD");
    const missing = await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Museum",
      amount: 3000,
      currency: "EUR",
      date: today,
      payers: [{ memberId: anaId, amount: 3000 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });
    expect(missing.status).toBe(422);
    expect(missing.body.error.code).toBe("FX_RATE_REQUIRED");

    const res = await ana.post<ExpenseDto>(`/v1/groups/${group.id}/expenses`, {
      description: "Museum",
      amount: 3000,
      currency: "EUR",
      fxRate: "1.0833",
      date: today,
      payers: [{ memberId: anaId, amount: 3000 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });
    expect(res.status).toBe(201);
    expect(res.body.groupAmount).toBe(3250);
    expect(res.body.lines.reduce((s, l) => s + l.owedGroup, 0)).toBe(3250);
    const detail = (await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    expect(detail.balances[anaId] + detail.balances[benId]).toBe(0);
  });

  it("rejects bad splits with stable error codes", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const other = await tripWithFriends();
    const base = { description: "x", amount: 1000, currency: "USD", date: today };

    const wrongPayers = await ana.post(`/v1/groups/${group.id}/expenses`, {
      ...base,
      payers: [{ memberId: anaId, amount: 900 }],
      split: { method: "equal", memberIds: [anaId] },
    });
    expect(wrongPayers.body.error.code).toBe("PAYERS_SUM_MISMATCH");

    const foreignMember = await ana.post(`/v1/groups/${group.id}/expenses`, {
      ...base,
      payers: [{ memberId: anaId, amount: 1000 }],
      split: { method: "equal", memberIds: [anaId, other.benId] },
    });
    expect(foreignMember.status).toBe(422);
    expect(foreignMember.body.error.code).toBe("MEMBER_NOT_IN_GROUP");

    const badPercent = await ana.post(`/v1/groups/${group.id}/expenses`, {
      ...base,
      payers: [{ memberId: anaId, amount: 1000 }],
      split: {
        method: "percent",
        entries: [
          { memberId: anaId, percent: 50 },
          { memberId: benId, percent: 40 },
        ],
      },
    });
    expect(badPercent.body.error.code).toBe("PERCENT_SUM_MISMATCH");

    const floaty = await ana.post(`/v1/groups/${group.id}/expenses`, {
      ...base,
      amount: 19.99,
      payers: [{ memberId: anaId, amount: 19.99 }],
      split: { method: "equal", memberIds: [anaId] },
    });
    expect(floaty.status).toBe(400);
  });

  it("is idempotent when a client retries with the same id", async () => {
    const { ana, group, anaId } = await tripWithFriends();
    const body = {
      id: uuidv7(),
      description: "Taxi",
      amount: 1500,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 1500 }],
      split: { method: "equal", memberIds: [anaId] },
    };
    expect((await ana.post(`/v1/groups/${group.id}/expenses`, body)).status).toBe(201);
    expect((await ana.post(`/v1/groups/${group.id}/expenses`, body)).status).toBe(200);
    const page = (await ana.get(`/v1/groups/${group.id}/expenses`)).body;
    expect(page.items).toHaveLength(1);
  });

  it("edits with version checks, deletes and restores", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const created = (
      await ana.post<ExpenseDto>(`/v1/groups/${group.id}/expenses`, {
        description: "Groceries",
        amount: 2000,
        currency: "USD",
        date: today,
        payers: [{ memberId: anaId, amount: 2000 }],
        split: { method: "equal", memberIds: [anaId, benId] },
      })
    ).body;

    const edit = {
      version: created.version,
      description: "Groceries + wine",
      amount: 3000,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 3000 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    };
    const updated = await ana.patch<ExpenseDto>(`/v1/expenses/${created.id}`, edit);
    expect(updated.status).toBe(200);
    expect(updated.body.version).toBe(2);

    const stale = await ana.patch(`/v1/expenses/${created.id}`, edit);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("VERSION_CONFLICT");
    expect(stale.body.error.details.current.description).toBe("Groceries + wine");

    expect((await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body.balances[benId]).toBe(-1500);
    expect((await ana.del(`/v1/expenses/${created.id}`)).body.deleted).toBe(true);
    expect((await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body.balances[benId]).toBe(0);
    expect((await ana.post(`/v1/expenses/${created.id}/restore`)).body.deleted).toBe(false);
    expect((await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body.balances[benId]).toBe(-1500);

    const history = (await ana.get(`/v1/groups/${group.id}/activity?entityId=${created.id}`)).body.items;
    expect(history.map((h: { type: string }) => h.type)).toEqual([
      "expense.restored",
      "expense.deleted",
      "expense.updated",
      "expense.created",
    ]);
  });

  it("records payments in the right direction", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Hotel",
      amount: 20000,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 20000 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });
    // Ben pays Ana back 60.00 of the 100.00 he owes.
    const pay = await ana.post(`/v1/groups/${group.id}/settlements`, {
      fromMemberId: benId,
      toMemberId: anaId,
      amount: 6000,
      currency: "USD",
      date: today,
    });
    expect(pay.status).toBe(201);
    const detail = (await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    expect(detail.balances[benId]).toBe(-4000);
    expect(detail.transfers).toEqual([{ fromMemberId: benId, toMemberId: anaId, amount: 4000 }]);

    const self = await ana.post(`/v1/groups/${group.id}/settlements`, {
      fromMemberId: anaId,
      toMemberId: anaId,
      amount: 100,
      currency: "USD",
      date: today,
    });
    expect(self.status).toBe(400);
  });

  it("pages through expenses", async () => {
    const { ana, group, anaId } = await tripWithFriends();
    for (let i = 0; i < 5; i++) {
      await ana.post(`/v1/groups/${group.id}/expenses`, {
        description: `Item ${i}`,
        amount: 100 + i,
        currency: "USD",
        date: `2026-11-0${i + 1}`,
        payers: [{ memberId: anaId, amount: 100 + i }],
        split: { method: "equal", memberIds: [anaId] },
      });
    }
    const first = (await ana.get(`/v1/groups/${group.id}/expenses?limit=2`)).body;
    expect(first.items.map((e: ExpenseDto) => e.description)).toEqual(["Item 4", "Item 3"]);
    const second = (await ana.get(`/v1/groups/${group.id}/expenses?limit=2&cursor=${first.nextCursor}`)).body;
    expect(second.items.map((e: ExpenseDto) => e.description)).toEqual(["Item 2", "Item 1"]);
    const third = (await ana.get(`/v1/groups/${group.id}/expenses?limit=2&cursor=${second.nextCursor}`)).body;
    expect(third.items.map((e: ExpenseDto) => e.description)).toEqual(["Item 0"]);
    expect(third.nextCursor).toBeNull();
  });

  it("won't let someone leave or be removed while they owe money", async () => {
    const { ana, group, anaId, benId, cyId } = await tripWithFriends();
    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Tickets",
      amount: 4000,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 4000 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });
    const blocked = await ana.del(`/v1/groups/${group.id}/members/${benId}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("MEMBER_HAS_BALANCE");
    expect((await ana.post(`/v1/groups/${group.id}/leave`)).body.error.code).toBe("MEMBER_HAS_BALANCE");

    const removed = await ana.del(`/v1/groups/${group.id}/members/${cyId}`);
    expect(removed.status).toBe(200);
    expect(removed.body.some((m: { id: string }) => m.id === cyId)).toBe(false);
  });
});

describe("invites and guests", () => {
  it("lets a guest join by link, claim a spot and later keep it after signing up", async () => {
    const { ana, group, benId } = await tripWithFriends();
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body;
    expect(link.url).toContain(`/join/${link.token}`);

    const preview = await client().get(`/v1/invites/${link.token}`);
    expect(preview.status).toBe(200);
    expect(preview.body.group.name).toBe("Lisbon trip");
    expect(preview.body.openSpots.map((s: { displayName: string }) => s.displayName)).toEqual(["Ben", "Cy"]);

    const ben = client();
    expect((await ben.post(`/v1/invites/${link.token}/join`, { memberId: benId })).status).toBe(401);
    await ben.signInAsGuest();
    const joined = await ben.post<GroupDetailDto>(`/v1/invites/${link.token}/join`, { memberId: benId });
    expect(joined.status).toBe(200);
    expect(joined.body.myMemberId).toBe(benId);
    expect((await ben.get("/v1/me")).body.isGuest).toBe(true);

    const intruder = client();
    await intruder.signInAsGuest();
    const taken = await intruder.post(`/v1/invites/${link.token}/join`, { memberId: benId });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe("ALREADY_CLAIMED");

    // The guest creates a real account and keeps their place in the group.
    await ben.signUp("Ben");
    const me = (await ben.get("/v1/me")).body;
    expect(me.isGuest).toBe(false);
    const detail = await ben.get<GroupDetailDto>(`/v1/groups/${group.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.myMemberId).toBe(benId);
  });

  it("invalidates the old link when an admin resets it", async () => {
    const { ana, group } = await tripWithFriends();
    const first = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
    const second = (await ana.post(`/v1/groups/${group.id}/invite?rotate=true`)).body.token;
    expect(second).not.toBe(first);
    expect((await client().get(`/v1/invites/${first}`)).status).toBe(404);
  });
});

describe("outsiders can't touch a group", () => {
  it("returns 404 for every group-scoped read and write", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const expense = (
      await ana.post<ExpenseDto>(`/v1/groups/${group.id}/expenses`, {
        description: "Secret",
        amount: 500,
        currency: "USD",
        date: today,
        payers: [{ memberId: anaId, amount: 500 }],
        split: { method: "equal", memberIds: [anaId, benId] },
      })
    ).body;
    const settlement = (
      await ana.post(`/v1/groups/${group.id}/settlements`, {
        fromMemberId: benId,
        toMemberId: anaId,
        amount: 100,
        currency: "USD",
        date: today,
      })
    ).body;

    const mallory = client();
    await mallory.signUp("Mallory");
    const expenseBody = {
      description: "Hack",
      amount: 100,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 100 }],
      split: { method: "equal", memberIds: [anaId] },
    };
    const attempts: [string, () => Promise<{ status: number }>][] = [
      ["read group", () => mallory.get(`/v1/groups/${group.id}`)],
      ["edit group", () => mallory.patch(`/v1/groups/${group.id}`, { version: 1, name: "pwned" })],
      ["delete group", () => mallory.del(`/v1/groups/${group.id}`)],
      ["list expenses", () => mallory.get(`/v1/groups/${group.id}/expenses`)],
      ["add expense", () => mallory.post(`/v1/groups/${group.id}/expenses`, expenseBody)],
      ["read expense", () => mallory.get(`/v1/expenses/${expense.id}`)],
      ["edit expense", () => mallory.patch(`/v1/expenses/${expense.id}`, { version: 1, ...expenseBody })],
      ["delete expense", () => mallory.del(`/v1/expenses/${expense.id}`)],
      ["restore expense", () => mallory.post(`/v1/expenses/${expense.id}/restore`)],
      ["list payments", () => mallory.get(`/v1/groups/${group.id}/settlements`)],
      [
        "add payment",
        () =>
          mallory.post(`/v1/groups/${group.id}/settlements`, {
            fromMemberId: anaId,
            toMemberId: benId,
            amount: 100000,
            currency: "USD",
            date: today,
          }),
      ],
      ["delete payment", () => mallory.del(`/v1/settlements/${settlement.id}`)],
      ["read activity", () => mallory.get(`/v1/groups/${group.id}/activity`)],
      ["add member", () => mallory.post(`/v1/groups/${group.id}/members`, { displayName: "x" })],
      ["rename member", () => mallory.patch(`/v1/groups/${group.id}/members/${benId}`, { displayName: "x" })],
      ["remove member", () => mallory.del(`/v1/groups/${group.id}/members/${benId}`)],
      ["get invite link", () => mallory.post(`/v1/groups/${group.id}/invite`)],
      ["leave", () => mallory.post(`/v1/groups/${group.id}/leave`)],
    ];
    for (const [name, attempt] of attempts) {
      const res = await attempt();
      expect(res.status, name).toBe(404);
    }

    expect((await mallory.get("/v1/groups")).body).toEqual([]);
    expect((await mallory.get("/v1/activity")).body.items).toEqual([]);

    // Nothing changed for Ana.
    const detail = (await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    expect(detail.name).toBe("Lisbon trip");
    expect(detail.balances[benId]).toBe(-150);
  });

  it("stops non-owners from deleting the group", async () => {
    const { ana, group, benId } = await tripWithFriends();
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
    const ben = client();
    await ben.signUp("Ben");
    await ben.post(`/v1/invites/${link}/join`, { memberId: benId });
    const res = await ben.del(`/v1/groups/${group.id}`);
    expect(res.status).toBe(403);
  });
});
