import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { dueOccurrences, todayIn, type ExpenseDto, type GroupDetailDto, type GroupSummaryDto } from "@settlemint/shared";
import { materializeRecurring } from "../services/recurring";
import { createTestApp, TestClient } from "./harness";

let t: Awaited<ReturnType<typeof createTestApp>>;
const today = "2026-11-15";

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

const client = () => new TestClient(t.app, t.mailer);

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

describe("request hardening", () => {
  it("rejects writes from a foreign origin even with a valid session", async () => {
    const c = client();
    await c.signUp("Olga");
    // An attacker page that somehow got the browser to send the session cookie.
    const res = await t.app.inject({
      method: "POST",
      url: "/v1/groups",
      payload: { name: "Evil", currency: "USD" },
      headers: { origin: "https://evil.example", cookie: c.cookieHeader() },
    });
    expect(res.statusCode).toBe(403);
    expect((await c.get("/v1/groups")).body).toEqual([]);
  });

  it("marks API responses as not cacheable", async () => {
    const c = client();
    await c.signUp("Pia");
    const res = await t.app.inject({
      method: "GET",
      url: "/v1/groups",
      headers: { origin: "http://localhost:3000", cookie: c.cookieHeader() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("refuses oversized request bodies", async () => {
    const c = client();
    await c.signUp("Quinn");
    const res = await c.post("/v1/groups", { name: "x".repeat(2 * 1024 * 1024), currency: "USD" });
    expect(res.status).toBe(413);
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

  it("serves the mobile app: no browser origin, session cookie sent by hand", async () => {
    const email = `mo-${Date.now()}@example.com`;
    const signUp = await t.app.inject({
      method: "POST",
      url: "/v1/auth/sign-up/email",
      headers: { "expo-origin": "settlemint://" },
      payload: { name: "Mo", email, password: "correct-horse-battery" },
    });
    expect(signUp.statusCode).toBe(200);
    const otp = await client().lastCode(email);
    const verified = await t.app.inject({
      method: "POST",
      url: "/v1/auth/email-otp/verify-email",
      headers: { "expo-origin": "settlemint://" },
      payload: { email, otp },
    });
    expect(verified.statusCode).toBe(200);
    const raw = verified.headers["set-cookie"];
    const cookie = (Array.isArray(raw) ? raw : [raw ?? ""]).map((c) => c.split(";")[0]).join("; ");
    const me = await t.app.inject({ method: "GET", url: "/v1/me", headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().name).toBe("Mo");
    const write = await t.app.inject({ method: "PATCH", url: "/v1/me", headers: { cookie }, payload: { defaultCurrency: "PKR" } });
    expect(write.statusCode).toBe(200);
  });

  it("only redirects after sign-in to the app's own scheme", async () => {
    // Better Auth skips its origin checks under NODE_ENV=test, so ask it directly.
    const ctx = await t.app.auth.$context;
    expect(ctx.isTrustedOrigin("settlemint://home", { allowRelativePaths: false })).toBe(true);
    expect(ctx.isTrustedOrigin("evilapp://home", { allowRelativePaths: false })).toBe(false);
    expect(ctx.isTrustedOrigin("exp://192.168.1.5:8081", { allowRelativePaths: false })).toBe(false);
  });

  it("won't let a password account sign in until its email is confirmed", async () => {
    // Someone signs up with an address that isn't theirs: no session, and the password doesn't work.
    const email = `victim-${Date.now()}@example.com`;
    const intruder = client();
    const signUp = await intruder.post("/v1/auth/sign-up/email", { name: "Not Vic", email, password: "intruder-password" });
    expect(signUp.status).toBe(200);
    expect(signUp.body.token).toBeNull();
    expect((await intruder.get("/v1/me")).status).toBe(401);
    const before = t.mailer.sent.length;
    const signIn = await intruder.post("/v1/auth/sign-in/email", { email, password: "intruder-password" });
    expect(signIn.status).toBe(403);
    expect(signIn.body.code).toBe("EMAIL_NOT_VERIFIED");
    // A fresh code goes to the real owner, who signs in with it; the intruder's password stops working.
    const owner = client();
    await owner.lastCode(email, before);
    const sent = t.mailer.sent.length;
    await owner.post("/v1/auth/email-otp/send-verification-otp", { email, type: "sign-in" });
    const code = await owner.lastCode(email, sent);
    expect((await owner.post("/v1/auth/sign-in/email-otp", { email, otp: code })).status).toBe(200);
    expect((await owner.get("/v1/me")).status).toBe(200);
    expect((await intruder.post("/v1/auth/sign-in/email", { email, password: "intruder-password" })).status).toBe(401);
  });

  it("lets someone who forgot their password set a new one with an emailed code", async () => {
    const owner = client();
    const { email } = await owner.signUp("Fiona");
    // Forgot password: a code goes to the inbox...
    const before = t.mailer.sent.length;
    const ask = await owner.post("/v1/auth/email-otp/request-password-reset", { email });
    expect(ask.status).toBe(200);
    const code = await owner.lastCode(email, before);
    // ...a wrong code does nothing...
    const wrong = await owner.post("/v1/auth/email-otp/reset-password", { email, otp: code === "000000" ? "111111" : "000000", password: "brand-new-password-1" });
    expect(wrong.status).toBe(400);
    // ...the right one sets the new password; the old one stops working, the new one signs in.
    const done = await owner.post("/v1/auth/email-otp/reset-password", { email, otp: code, password: "brand-new-password-1" });
    expect(done.status).toBe(200);
    const fresh = client();
    expect((await fresh.post("/v1/auth/sign-in/email", { email, password: "correct-horse-battery" })).status).toBe(401);
    expect((await fresh.post("/v1/auth/sign-in/email", { email, password: "brand-new-password-1" })).status).toBe(200);
    expect((await fresh.get("/v1/me")).status).toBe(200);
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

  it("lists what was deleted recently, for members only, until it is restored", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const lunch = (
      await ana.post<ExpenseDto>(`/v1/groups/${group.id}/expenses`, {
        description: "Lunch",
        amount: 1200,
        currency: "USD",
        date: today,
        payers: [{ memberId: anaId, amount: 1200 }],
        split: { method: "equal", memberIds: [anaId, benId] },
      })
    ).body;
    expect((await ana.get("/v1/me/trash")).body).toEqual([]);

    await ana.del(`/v1/expenses/${lunch.id}`);
    const trash = (await ana.get<{ kind: string; title: string; amount: number; canRestore: boolean }[]>("/v1/me/trash")).body;
    expect(trash).toHaveLength(1);
    expect(trash[0]).toMatchObject({ kind: "expense", title: "Lunch", amount: 1200, canRestore: true });

    const stranger = client();
    await stranger.signUp("Stranger");
    expect((await stranger.get("/v1/me/trash")).body).toEqual([]);

    await ana.post(`/v1/expenses/${lunch.id}/restore`);
    expect((await ana.get("/v1/me/trash")).body).toEqual([]);
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

describe("people", () => {
  it("adds up what one person owes you across every group you share", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body;
    const ben = client();
    await ben.signUp("Ben");
    await ben.post(`/v1/invites/${link.token}/join`, { memberId: benId });

    // Ana paid 20.00 for the two of them: Ben owes her 10.00.
    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Lunch", amount: 2000, currency: "USD", date: today,
      payers: [{ memberId: anaId, amount: 2000 }], split: { method: "equal", memberIds: [anaId, benId] },
    });
    // A second group they share, where Ben paid 6.00 for the two of them: Ana owes him 3.00.
    const flat = (await ana.post<GroupDetailDto>("/v1/groups", { name: "Flat", currency: "USD", type: "home", people: [{ displayName: "Ben" }] })).body;
    const flatBen = flat.members.find((m) => m.displayName === "Ben")!.id;
    const flatLink = (await ana.post(`/v1/groups/${flat.id}/invite`)).body;
    await ben.post(`/v1/invites/${flatLink.token}/join`, { memberId: flatBen });
    await ben.post(`/v1/groups/${flat.id}/expenses`, {
      description: "Wifi", amount: 600, currency: "USD", date: today,
      payers: [{ memberId: flatBen, amount: 600 }], split: { method: "equal", memberIds: [flat.myMemberId, flatBen] },
    });

    const people = (await ana.get<{ name: string; totals: { currency: string; amount: number }[]; groups: { amount: number }[] }[]>("/v1/people")).body;
    const benRow = people.find((p) => p.name === "Ben")!;
    expect(benRow.totals).toEqual([{ currency: "USD", amount: 700 }]); // 10.00 - 3.00
    expect(benRow.groups.map((g) => g.amount).sort((x, y) => x - y)).toEqual([-300, 1000]);
    // Cy was only added by name in a group, so they can't be told apart from another Cy: not listed.
    expect(people.some((p) => p.name === "Cy")).toBe(false);
  });
});

describe("invites and guests", () => {
  it("no longer starts new guest sessions", async () => {
    const closed = await createTestApp({ guestSignIn: false });
    try {
      const res = await new TestClient(closed.app).post("/v1/auth/sign-in/anonymous");
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    } finally {
      await closed.close();
    }
  });

  it("keeps the place of a guest that already existed when they sign up", async () => {
    const { ana, group, benId } = await tripWithFriends();
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body;
    const ben = client();
    await ben.signInAsGuest();
    expect((await ben.post(`/v1/invites/${link.token}/join`, { memberId: benId })).status).toBe(200);
    await ben.signUp("Ben");
    expect((await ben.get("/v1/me")).body.isGuest).toBe(false);
    expect((await ben.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body.myMemberId).toBe(benId);
  });

  it("lets someone with an account join by link and claim their spot", async () => {
    const { ana, group, benId } = await tripWithFriends();
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body;
    expect(link.url).toContain(`/join?t=${link.token}`);

    const preview = await client().get(`/v1/invites/${link.token}`);
    expect(preview.status).toBe(200);
    expect(preview.body.group.name).toBe("Lisbon trip");
    expect(preview.body.openSpots.map((s: { displayName: string }) => s.displayName)).toEqual(["Ben", "Cy"]);

    const ben = client();
    expect((await ben.post(`/v1/invites/${link.token}/join`, { memberId: benId })).status).toBe(401);
    await ben.signUp("Ben");
    const joined = await ben.post<GroupDetailDto>(`/v1/invites/${link.token}/join`, { memberId: benId });
    expect(joined.status).toBe(200);
    expect(joined.body.myMemberId).toBe(benId);
    expect((await ben.get("/v1/me")).body.isGuest).toBe(false);

    const intruder = client();
    await intruder.signUp("Intruder");
    const taken = await intruder.post(`/v1/invites/${link.token}/join`, { memberId: benId });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe("ALREADY_CLAIMED");
  });

  it("invalidates the old link when an admin resets it", async () => {
    const { ana, group } = await tripWithFriends();
    const first = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
    const second = (await ana.post(`/v1/groups/${group.id}/invite?rotate=true`)).body.token;
    expect(second).not.toBe(first);
    expect((await client().get(`/v1/invites/${first}`)).status).toBe(404);
  });
});

describe("getting paid, search, export and account deletion", () => {
  it("stores payment methods, normalised, and shows them only to people in my groups", async () => {
    const { ana, group, benId } = await tripWithFriends();
    const bad = await ana.request("PUT", "/v1/me/payment-handles", { handles: [{ kind: "upi", value: "nope" }] });
    expect(bad.status).toBe(400);

    const saved = await ana.request("PUT", "/v1/me/payment-handles", {
      handles: [
        { kind: "paypal", value: "https://paypal.me/AnaSouza" },
        { kind: "iban", value: "gb82west12345698765432" },
      ],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.map((h: { value: string }) => h.value)).toEqual(["AnaSouza", "GB82 WEST 1234 5698 7654 32"]);

    // Ben joins and can see how to pay Ana.
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
    const ben = client();
    await ben.signUp("Ben");
    const joined = await ben.post<GroupDetailDto>(`/v1/invites/${link}/join`, { memberId: benId });
    const anaAsSeenByBen = joined.body.members.find((m) => m.displayName === "Ana")!;
    expect(anaAsSeenByBen.paymentHandles.map((h) => h.kind)).toEqual(["paypal", "iban"]);

    // Someone outside the group can't see them anywhere.
    const outsider = client();
    await outsider.signUp("Olly");
    expect((await outsider.get(`/v1/groups/${group.id}`)).status).toBe(404);
  });

  it("searches only my own groups, treating % literally", async () => {
    const { ana, group, anaId } = await tripWithFriends();
    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Pastéis de nata 50% off",
      amount: 600,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 600 }],
      split: { method: "equal", memberIds: [anaId] },
    });
    const other = await tripWithFriends();
    await other.ana.post(`/v1/groups/${other.group.id}/expenses`, {
      description: "Pastéis for someone else",
      amount: 600,
      currency: "USD",
      date: today,
      payers: [{ memberId: other.anaId, amount: 600 }],
      split: { method: "equal", memberIds: [other.anaId] },
    });

    const hits = (await ana.get(`/v1/search?q=${encodeURIComponent("pastéis")}`)).body;
    expect(hits.expenses.map((e: { description: string }) => e.description)).toEqual(["Pastéis de nata 50% off"]);
    expect((await ana.get(`/v1/search?q=${encodeURIComponent("50%")}`)).body.expenses).toHaveLength(1);
    expect((await ana.get(`/v1/search?q=${encodeURIComponent("%")}`)).body.expenses).toHaveLength(1);
    expect((await ana.get("/v1/search?q=lisbon")).body.groups.map((g: { id: string }) => g.id)).toEqual([group.id]);
  });

  it("exports everything that involves me", async () => {
    const { ana, group, anaId } = await tripWithFriends();
    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Tram",
      amount: 300,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 300 }],
      split: { method: "equal", memberIds: [anaId] },
    });
    const res = await ana.get("/v1/me/export");
    expect(res.status).toBe(200);
    expect(res.body.format).toBe("settlemint-export-v1");
    const g = res.body.groups.find((x: { id: string }) => x.id === group.id);
    expect(g.expenses.map((e: { description: string }) => e.description)).toEqual(["Tram"]);
    expect(g.members).toHaveLength(3);
  });

  it("deletes an account but keeps the group's history and balances intact", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
    const ben = client();
    await ben.signUp("Ben");
    await ben.post(`/v1/invites/${link}/join`, { memberId: benId });
    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Hotel",
      amount: 10000,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 10000 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });

    expect((await ana.request("DELETE", "/v1/me", {})).status).toBe(400); // needs typed confirmation
    expect((await ana.request("DELETE", "/v1/me", { confirm: "DELETE" })).status).toBe(204);
    expect((await ana.get("/v1/me")).status).toBe(401);

    const seenByBen = (await ben.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    const anaSpot = seenByBen.members.find((m) => m.id === anaId)!;
    expect(anaSpot).toMatchObject({ displayName: "Ana", claimed: false, role: "member" });
    expect(seenByBen.members.find((m) => m.id === benId)?.role).toBe("owner");
    expect(seenByBen.balances[benId]).toBe(-5000);
  });
});

describe("recurring expenses", () => {
  const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const todayUtc = () => new Date().toISOString().slice(0, 10);

  it("catches up on due occurrences once, at the right dates, with no duplicates", async () => {
    const { ana, group, anaId, benId } = await tripWithFriends();
    const startDate = isoDaysAgo(70);
    const res = await ana.post(`/v1/groups/${group.id}/recurring`, {
      template: {
        description: "Rent",
        amount: 120000,
        currency: "USD",
        category: "bills",
        payers: [{ memberId: anaId, amount: 120000 }],
        split: { method: "equal", memberIds: [anaId, benId] },
      },
      frequency: "monthly",
      startDate,
    });
    expect(res.status).toBe(201);
    const expected = dueOccurrences(startDate, "monthly", 1, 0, todayUtc()).map((o) => o.date);
    expect(expected.length).toBeGreaterThanOrEqual(3);

    const list = async () =>
      ((await ana.get(`/v1/groups/${group.id}/expenses?limit=100`)).body.items as ExpenseDto[])
        .filter((e) => e.description === "Rent")
        .map((e) => e.date)
        .sort();
    expect(await list()).toEqual(expected);
    expect(res.body.nextDate > todayUtc()).toBe(true);

    // Reading the group again, and generating concurrently, adds nothing.
    await ana.get(`/v1/groups/${group.id}`);
    await Promise.all([materializeRecurring(t.db), materializeRecurring(t.db), materializeRecurring(t.db)]);
    expect(await list()).toEqual(expected);

    const detail = (await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    expect(detail.balances[benId]).toBe(-60000 * expected.length);

    const created = ((await ana.get(`/v1/groups/${group.id}/expenses?limit=100`)).body.items as ExpenseDto[])[0];
    expect(created.recurringRuleId).toBe(res.body.id);
  });

  it("uses the creator's time zone to decide that a bill is due today", async () => {
    const { ana, group, anaId } = await tripWithFriends();
    // Kiritimati is UTC+14: its "today" is usually tomorrow in UTC.
    const kiriToday = todayIn("Pacific/Kiritimati");
    const res = await ana.post(`/v1/groups/${group.id}/recurring`, {
      template: {
        description: "Island rent",
        amount: 5000,
        currency: "USD",
        payers: [{ memberId: anaId, amount: 5000 }],
        split: { method: "equal", memberIds: [anaId] },
      },
      frequency: "monthly",
      startDate: kiriToday,
      timezone: "Pacific/Kiritimati",
    });
    expect(res.status).toBe(201);
    const dates = ((await ana.get(`/v1/groups/${group.id}/expenses`)).body.items as ExpenseDto[])
      .filter((e) => e.description === "Island rent")
      .map((e) => e.date);
    expect(dates).toEqual([kiriToday]);

    const bad = await ana.post(`/v1/groups/${group.id}/recurring`, {
      template: { description: "x", amount: 1, currency: "USD", payers: [{ memberId: anaId, amount: 1 }], split: { method: "equal", memberIds: [anaId] } },
      frequency: "monthly",
      startDate: kiriToday,
      timezone: "Mars/Olympus",
    });
    expect(bad.status).toBe(400);
  });

  it("stops creating once stopped", async () => {
    const { ana, group, anaId } = await tripWithFriends();
    const rule = (
      await ana.post(`/v1/groups/${group.id}/recurring`, {
        template: {
          description: "Gym",
          amount: 3000,
          currency: "USD",
          payers: [{ memberId: anaId, amount: 3000 }],
          split: { method: "equal", memberIds: [anaId] },
        },
        frequency: "weekly",
        startDate: todayUtc(),
      })
    ).body;
    const stopped = await ana.del(`/v1/recurring/${rule.id}`);
    expect(stopped.body.active).toBe(false);
    const far = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
    await materializeRecurring(t.db, { groupId: group.id, today: far });
    const gyms = (await ana.get(`/v1/groups/${group.id}/expenses?limit=100`)).body.items.filter(
      (e: ExpenseDto) => e.description === "Gym",
    );
    expect(gyms).toHaveLength(1);
  });

  it("pauses with a reason when someone on the bill has left", async () => {
    const { ana, group, anaId, cyId } = await tripWithFriends();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const rule = (
      await ana.post(`/v1/groups/${group.id}/recurring`, {
        template: {
          description: "Netflix",
          amount: 1500,
          currency: "USD",
          payers: [{ memberId: anaId, amount: 1500 }],
          split: { method: "equal", memberIds: [anaId, cyId] },
        },
        frequency: "monthly",
        startDate: tomorrow,
      })
    ).body;
    await ana.del(`/v1/groups/${group.id}/members/${cyId}`);
    const later = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    await materializeRecurring(t.db, { groupId: group.id, today: later });
    const rules = (await ana.get(`/v1/groups/${group.id}/recurring`)).body;
    const r = rules.find((x: { id: string }) => x.id === rule.id);
    expect(r.active).toBe(false);
    expect(r.pausedReason).toMatch(/isn't in the group/);
  });

  it("is invisible to outsiders", async () => {
    const { ana, group, anaId } = await tripWithFriends();
    const rule = (
      await ana.post(`/v1/groups/${group.id}/recurring`, {
        template: {
          description: "Water",
          amount: 900,
          currency: "USD",
          payers: [{ memberId: anaId, amount: 900 }],
          split: { method: "equal", memberIds: [anaId] },
        },
        frequency: "monthly",
        startDate: todayUtc(),
      })
    ).body;
    const mallory = client();
    await mallory.signUp("Mallory");
    expect((await mallory.get(`/v1/groups/${group.id}/recurring`)).status).toBe(404);
    expect((await mallory.del(`/v1/recurring/${rule.id}`)).status).toBe(404);
    expect(
      (
        await mallory.post(`/v1/groups/${group.id}/recurring`, {
          template: { description: "x", amount: 1, currency: "USD", payers: [{ memberId: anaId, amount: 1 }], split: { method: "equal", memberIds: [anaId] } },
          frequency: "monthly",
          startDate: todayUtc(),
        })
      ).status,
    ).toBe(404);
  });
});

describe("receipt scanning", () => {
  const image = "A".repeat(200); // the fake reader doesn't look at it

  it("turns the AI's reading into exact amounts with tax and tip as extras", async () => {
    const ana = client();
    await ana.signUp("Ana");
    t.receiptReader.next = {
      merchant: "  Time Out   Market ",
      date: "2026-11-14",
      currency: "eur",
      total: "42.40",
      tax: 3.4,
      items: [
        { name: "Bifana", quantity: 2, price: 9 },
        { name: "Pastel de nata", price: "6.50" },
        { name: "Vinho verde", price: 23.5 },
        { name: "Free water", price: 0 },
      ],
    };
    const res = await ana.post("/v1/ai/receipt", { image, mimeType: "image/jpeg" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      merchant: "Time Out Market",
      date: "2026-11-14",
      currency: "EUR",
      total: 4240,
      items: [
        { label: "Bifana", amount: 900 },
        { label: "Pastel de nata", amount: 650 },
        { label: "Vinho verde", amount: 2350 },
      ],
      extras: 340,
      scansLeft: 2,
    });
  });

  it("falls back to the person's currency and drops a future date", async () => {
    const ana = client();
    await ana.signUp("Ana");
    await ana.patch("/v1/me", { defaultCurrency: "JPY" });
    t.receiptReader.next = { total: 1500.4, date: "2999-01-01", items: [] };
    const res = await ana.post("/v1/ai/receipt", { image, mimeType: "image/png" });
    expect(res.body).toMatchObject({ currency: "JPY", total: 1500, date: null, items: [], extras: 0 });
  });

  it("refunds failed reads and enforces the monthly limit", async () => {
    const ana = client();
    await ana.signUp("Ana");
    t.receiptReader.next = { items: [] }; // nothing usable
    const bad = await ana.post("/v1/ai/receipt", { image, mimeType: "image/jpeg" });
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe("AI_FAILED");

    t.receiptReader.next = { total: 10, items: [] };
    for (let i = 0; i < 3; i++) expect((await ana.post("/v1/ai/receipt", { image, mimeType: "image/jpeg" })).status).toBe(200);
    const over = await ana.post("/v1/ai/receipt", { image, mimeType: "image/jpeg" });
    expect(over.status).toBe(429);
    expect(over.body.error.code).toBe("AI_QUOTA");
  });

  it("says when scanning isn't switched on", async () => {
    const ana = client();
    await ana.signUp("Ana");
    const saved = t.app.receiptReader;
    t.app.receiptReader = null;
    try {
      const res = await ana.post("/v1/ai/receipt", { image, mimeType: "image/jpeg" });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("AI_UNAVAILABLE");
    } finally {
      t.app.receiptReader = saved;
    }
  });
});

describe("push notifications", () => {
  const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };
  const endpoint = (who: string) => `https://push.example.com/${who}-${Math.random().toString(36).slice(2)}`;
  const sentTo = (ep: string) => t.pushSender.sent.filter((s) => s.endpoint === ep);

  async function groupWithBen() {
    const trip = await tripWithFriends();
    const link = (await trip.ana.post(`/v1/groups/${trip.group.id}/invite`)).body.token;
    const ben = client();
    await ben.signUp("Ben");
    await ben.post(`/v1/invites/${link}/join`, { memberId: trip.benId });
    return { ...trip, ben };
  }

  it("publishes the public key and only lets signed-in people subscribe", async () => {
    expect((await client().get("/v1/push/key")).body).toEqual({ publicKey: "test-public-key" });
    expect((await client().post("/v1/push/subscribe", { endpoint: endpoint("x"), keys })).status).toBe(401);
    const ana = client();
    await ana.signUp("Ana");
    expect((await ana.post("/v1/push/subscribe", { endpoint: "http://insecure.example/x", keys })).status).toBe(400);
    // Only real push services: the API must never be made to call other servers.
    for (const endpoint of ["https://internal.example.net/hook", "https://fcm.googleapis.com.evil.example/x", "https://169.254.169.254/latest"]) {
      expect((await ana.post("/v1/push/subscribe", { endpoint, keys })).status).toBe(400);
    }
    expect((await ana.post("/v1/push/subscribe", { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys })).status).toBe(204);
  });

  it("tells the other members, never the person who acted or outsiders", async () => {
    const { ana, ben, group, anaId, benId } = await groupWithBen();
    const outsider = client();
    await outsider.signUp("Olly");
    const [anaEp, benEp, ollyEp] = [endpoint("ana"), endpoint("ben"), endpoint("olly")];
    for (const [c, ep] of [[ana, anaEp], [ben, benEp], [outsider, ollyEp]] as const) {
      expect((await c.post("/v1/push/subscribe", { endpoint: ep, keys })).status).toBe(204);
    }

    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Pastéis",
      amount: 1250,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 1250 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });
    await t.app.notifier!.idle();

    expect(sentTo(anaEp)).toEqual([]);
    expect(sentTo(ollyEp)).toEqual([]);
    expect(sentTo(benEp).map((s) => s.payload)).toEqual([
      {
        title: "Lisbon trip",
        body: "Ana added “Pastéis” · $12.50",
        url: `http://localhost:3000/group?id=${group.id}`,
        tag: group.id,
      },
    ]);
  });

  it("notifies phones through their Expo token", async () => {
    const { ana, ben, group, anaId, benId } = await groupWithBen();
    const token = `ExponentPushToken[ben${Math.random().toString(36).slice(2)}]`;
    expect((await ben.post("/v1/push/expo", { token: "not-a-token" })).status).toBe(400);
    expect((await client().post("/v1/push/expo", { token })).status).toBe(401);
    expect((await ben.post("/v1/push/expo", { token })).status).toBe(204);
    // Sending it again (every app launch) is harmless.
    expect((await ben.post("/v1/push/expo", { token })).status).toBe(204);

    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Gelato",
      amount: 900,
      currency: "USD",
      date: today,
      payers: [{ memberId: anaId, amount: 900 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });
    await t.app.notifier!.idle();
    expect(sentTo(token).map((s) => s.payload.body)).toEqual(["Ana added “Gelato” · $9.00"]);
    expect(t.pushSender.sent.find((s) => s.endpoint === token)?.kind).toBe("expo");

    expect((await ben.request("DELETE", "/v1/push/expo", { token })).status).toBe(204);
  });

  it("writes each notification in the recipient's language", async () => {
    const { ana, ben, group, anaId, benId } = await groupWithBen();
    await ben.patch("/v1/me", { locale: "es-ES" });
    const ep = endpoint("ben-es");
    await ben.post("/v1/push/subscribe", { endpoint: ep, keys });
    await ana.post(`/v1/groups/${group.id}/expenses`, {
      description: "Tapas",
      amount: 2400,
      currency: "EUR",
      fxRate: "1.08",
      date: today,
      payers: [{ memberId: anaId, amount: 2400 }],
      split: { method: "equal", memberIds: [anaId, benId] },
    });
    await t.app.notifier!.idle();
    // Intl puts a no-break space before the euro sign.
    expect(sentTo(ep).map((s) => s.payload.body.replace(/\s/g, " "))).toEqual(["Ana añadió “Tapas” · 24,00 €"]);
  });

  it("sends payments only to the two people involved", async () => {
    const { ana, ben, group, anaId, benId, cyId } = await groupWithBen();
    const cy = client();
    await cy.signUp("Cy");
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
    await cy.post(`/v1/invites/${link}/join`, { memberId: cyId });
    const [benEp, cyEp] = [endpoint("ben"), endpoint("cy")];
    await ben.post("/v1/push/subscribe", { endpoint: benEp, keys });
    await cy.post("/v1/push/subscribe", { endpoint: cyEp, keys });

    const res = await ana.post(`/v1/groups/${group.id}/settlements`, {
      fromMemberId: anaId,
      toMemberId: benId,
      amount: 500,
      currency: "USD",
      date: today,
    });
    expect(res.status).toBe(201);
    await t.app.notifier!.idle();

    expect(sentTo(benEp).map((s) => s.payload.body)).toEqual(["Ana paid you $5.00"]);
    expect(sentTo(cyEp)).toEqual([]);
  });

  it("forgets browsers that unsubscribed, and lets people turn it off", async () => {
    const { ana, ben, group, anaId, benId } = await groupWithBen();
    const [old, current] = [endpoint("ben-old"), endpoint("ben-new")];
    await ben.post("/v1/push/subscribe", { endpoint: old, keys });
    await ben.post("/v1/push/subscribe", { endpoint: current, keys });
    t.pushSender.gone.add(old);

    const add = (description: string) =>
      ana.post(`/v1/groups/${group.id}/expenses`, {
        description,
        amount: 300,
        currency: "USD",
        date: today,
        payers: [{ memberId: anaId, amount: 300 }],
        split: { method: "equal", memberIds: [anaId, benId] },
      });
    await add("Coffee");
    await t.app.notifier!.idle();
    expect(sentTo(current)).toHaveLength(1);

    // Someone else can't remove Ben's subscription; Ben can.
    await ana.request("DELETE", "/v1/push/subscribe", { endpoint: current });
    await add("Tea");
    await t.app.notifier!.idle();
    expect(sentTo(current)).toHaveLength(2);

    expect((await ben.request("DELETE", "/v1/push/subscribe", { endpoint: current })).status).toBe(204);
    t.pushSender.gone.delete(old); // would deliver again if it had been kept
    await add("Cake");
    await t.app.notifier!.idle();
    expect(sentTo(current)).toHaveLength(2);
    expect(sentTo(old)).toEqual([]);
  });
});

describe("Splitwise import", () => {
  const SAMPLE = `Date,Description,Category,Cost,Currency,Ana Souza,Bilal Khan,Chen
2024-03-01,Hotel,Hotels,300.00,EUR,200.00,-100.00,-100.00
2024-03-02,"Dinner, with wine",Dining out,90.00,EUR,-30.00,60.00,-30.00
2024-03-03,Taxi,Taxi,10.00,EUR,-3.33,-3.33,6.66
2024-03-04,Souvenir,General,20.00,USD,-10.00,10.00,0.00
2024-03-05,Bilal K. paid Ana S.,Payment,40.00,EUR,-40.00,40.00,0.00

2024-03-06,Total balance, , ,EUR,126.67,-3.33,-123.34
`;

  it("recreates the group with balances identical to Splitwise", async () => {
    const ana = client();
    await ana.signUp("Ana");
    const res = await ana.post("/v1/import/splitwise", { csv: SAMPLE, groupName: "Lisbon (from Splitwise)", meIndex: 0 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ expenses: 3, payments: 1 });
    expect(res.body.skipped.map((s: { reason: string }) => s.reason)).toEqual([
      "In USD; the group uses EUR and the export has no exchange rate",
    ]);

    const g = (await ana.get<GroupDetailDto>(`/v1/groups/${res.body.groupId}`)).body;
    expect(g.currency).toBe("EUR");
    const by = (name: string) => g.members.find((m) => m.displayName === name)!;
    expect(by("Ana Souza")).toMatchObject({ isMe: true, role: "owner", claimed: true });
    expect(by("Chen").claimed).toBe(false);
    // The export's "Total balance" row: 126.67 / -3.33 / -123.34
    expect(g.balances[by("Ana Souza").id]).toBe(12667);
    expect(g.balances[by("Bilal Khan").id]).toBe(-333);
    expect(g.balances[by("Chen").id]).toBe(-12334);

    const items = (await ana.get(`/v1/groups/${res.body.groupId}/expenses?limit=50`)).body.items as ExpenseDto[];
    expect(items.map((e) => [e.description, e.category]).sort()).toEqual([
      ["Dinner, with wine", "food"],
      ["Hotel", "accommodation"],
      ["Taxi", "transport"],
    ]);
  });

  it("refuses files it can't read", async () => {
    const ana = client();
    await ana.signUp("Ana");
    const res = await ana.post("/v1/import/splitwise", { csv: "hello,world", groupName: "x", meIndex: 0 });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Splitwise export/);
    const notMe = await ana.post("/v1/import/splitwise", { csv: SAMPLE, groupName: "x", meIndex: 9 });
    expect(notMe.status).toBe(422);
  });
});

describe("live updates", () => {
  /** Open the event stream as this client and collect events. */
  async function listen(base: string, c: TestClient) {
    // node:http (not fetch): fetch drops a hand-set Cookie header.
    const events: { event: string; data: { groupId: string; byMe: boolean } }[] = [];
    const url = new URL(`${base}/v1/events`);
    const { req, status, contentType } = await new Promise<{
      req: http.ClientRequest;
      status: number;
      contentType: string;
    }>((resolve, reject) => {
      const req = http.get(
        url,
        { headers: { cookie: c.cookieHeader(), origin: "http://localhost:3000" } },
        (res) => {
          let buffer = "";
          res.setEncoding("utf8");
          res.on("data", (chunk: string) => {
            buffer += chunk;
            let i;
            while ((i = buffer.indexOf("\n\n")) !== -1) {
              const block = buffer.slice(0, i);
              buffer = buffer.slice(i + 2);
              const event = /^event: (.+)$/m.exec(block)?.[1];
              const data = /^data: (.+)$/m.exec(block)?.[1];
              if (event && data) events.push({ event, data: JSON.parse(data) });
            }
          });
          res.on("error", () => {});
          resolve({ req, status: res.statusCode ?? 0, contentType: String(res.headers["content-type"] ?? "") });
        },
      );
      req.on("error", (err) => (err.message.includes("aborted") || err.message.includes("socket hang up") ? undefined : reject(err)));
    });
    return { status, contentType, events, close: () => req.destroy() };
  }

  it("tells group members (and only them) when something changes", async () => {
    const address = await t.app.listen({ port: 0, host: "127.0.0.1" });
    try {
      const { ana, group, anaId, benId } = await tripWithFriends();
      const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
      const ben = client();
      await ben.signUp("Ben");
      await ben.post(`/v1/invites/${link}/join`, { memberId: benId });
      const outsider = client();
      await outsider.signUp("Olly");

      const benStream = await listen(address, ben);
      const outsiderStream = await listen(address, outsider);
      expect(benStream.status).toBe(200);
      expect(benStream.contentType).toContain("text/event-stream");

      await ana.post(`/v1/groups/${group.id}/expenses`, {
        description: "Snacks",
        amount: 800,
        currency: "USD",
        date: today,
        payers: [{ memberId: anaId, amount: 800 }],
        split: { method: "equal", memberIds: [anaId, benId] },
      });
      await new Promise((r) => setTimeout(r, 300));

      expect(benStream.events).toEqual([{ event: "group", data: { groupId: group.id, byMe: false } }]);
      expect(outsiderStream.events).toEqual([]);

      // Failed writes announce nothing.
      await ana.post(`/v1/groups/${group.id}/expenses`, { description: "bad" });
      await new Promise((r) => setTimeout(r, 200));
      expect(benStream.events).toHaveLength(1);

      benStream.close();
      outsiderStream.close();
    } finally {
      // Keep the shared app usable for later tests (inject works without listening).
      await new Promise((r) => setTimeout(r, 50));
    }
  });

  it("requires a session", async () => {
    expect((await client().get("/v1/events")).status).toBe(401);
  });
});

describe("one-to-one friends", () => {
  it("shows a direct group as the other person, from each side", async () => {
    const ana = client();
    await ana.signUp("Ana");
    const created = await ana.post<GroupDetailDto>("/v1/groups", {
      name: "Sam",
      currency: "EUR",
      type: "direct",
      people: [{ displayName: "Sam" }],
    });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Sam");

    const samSpot = created.body.members.find((m) => m.displayName === "Sam")!;
    const link = (await ana.post(`/v1/groups/${created.body.id}/invite`)).body.token;
    const sam = client();
    await sam.signUp("Sam Rivera");
    const joined = await sam.post<GroupDetailDto>(`/v1/invites/${link}/join`, { memberId: samSpot.id });
    expect(joined.body.name).toBe("Ana");
    const list = (await sam.get<GroupSummaryDto[]>("/v1/groups")).body;
    expect(list.find((g) => g.id === created.body.id)?.name).toBe("Ana");
    expect((await ana.get<GroupSummaryDto[]>("/v1/groups")).body.find((g) => g.id === created.body.id)?.name).toBe("Sam");
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
      ["remind", () => mallory.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: benId })],
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
