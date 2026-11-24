import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FriendRequestsDto, GroupSummaryDto, PersonDto } from "@settlemint/shared";
import { createTestApp, TestClient } from "./harness";

let t: Awaited<ReturnType<typeof createTestApp>>;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

const client = () => new TestClient(t.app, t.mailer);
const rand = () => Math.random().toString(36).slice(2, 8);

async function person(name: string, username?: string) {
  const c = client();
  const { email } = await c.signUp(name);
  if (username) expect((await c.patch("/v1/me", { username })).status).toBe(200);
  return { c, email, name };
}
const mailsTo = (email: string, startsWith: string) => t.mailer.sent.filter((m) => m.to === email && m.subject.startsWith(startsWith));

describe("usernames", () => {
  it("are optional, lower-cased, unique, and not on a reserved list", async () => {
    const ana = await person("Ana");
    const ben = await person("Ben");
    const handle = `ana_${rand()}`;
    const set = await ana.c.patch("/v1/me", { username: handle.toUpperCase() });
    expect(set.status).toBe(200);
    expect(set.body.username).toBe(handle);
    expect((await ana.c.get("/v1/me")).body.username).toBe(handle);

    const taken = await ben.c.patch("/v1/me", { username: handle });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe("CONFLICT");
    // Keeping your own name is fine.
    expect((await ana.c.patch("/v1/me", { username: handle })).status).toBe(200);

    for (const bad of ["ab", "has space", "a".repeat(21), "admin", "settlemint", "caféname"]) {
      expect((await ben.c.patch("/v1/me", { username: bad })).status, bad).toBe(400);
    }
    expect((await ana.c.patch("/v1/me", { username: null })).body.username).toBeNull();
    // Freed names can be taken by someone else.
    expect((await ben.c.patch("/v1/me", { username: handle })).status).toBe(200);
  });
});

describe("adding a friend by username", () => {
  it("sends a request they accept, which makes the one-to-one group both can use", async () => {
    const handle = `ben_${rand()}`;
    const ana = await person("Ana");
    const ben = await person("Ben", handle);

    const asked = await ana.c.post("/v1/friends/requests", { to: `@${handle}` });
    expect(asked.status).toBe(200);
    expect(asked.body).toEqual({ state: "sent" });

    // Ben is told, in the app and by email, and sees who is asking.
    const mail = mailsTo(ben.email, "Ana wants to add you")[0];
    expect(mail).toBeTruthy();
    expect(mail.text).toContain("/groups");
    expect(mail.headers?.["List-Unsubscribe"]).toContain("/reminders/mute?");
    const incoming = (await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body;
    expect(incoming.incoming).toHaveLength(1);
    expect(incoming.incoming[0]).toMatchObject({ name: "Ana" });
    const sent = (await ana.c.get<FriendRequestsDto>("/v1/friends/requests")).body;
    expect(sent.outgoing.map((r) => r.label)).toEqual([`@${handle}`]);

    // Asking again changes nothing.
    expect((await ana.c.post("/v1/friends/requests", { to: handle })).status).toBe(200);
    expect((await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming).toHaveLength(1);
    expect(mailsTo(ben.email, "Ana wants to add you")).toHaveLength(1);

    const accepted = await ben.c.post(`/v1/friends/requests/${incoming.incoming[0].id}/accept`);
    expect(accepted.status).toBe(200);

    const anaGroups = (await ana.c.get<GroupSummaryDto[]>("/v1/groups")).body;
    const benGroups = (await ben.c.get<GroupSummaryDto[]>("/v1/groups")).body;
    expect(anaGroups.find((g) => g.id === accepted.body.groupId)).toMatchObject({ type: "direct" });
    expect(benGroups.find((g) => g.id === accepted.body.groupId)).toMatchObject({ type: "direct" });
    const anaFriends = (await ana.c.get<PersonDto[]>("/v1/people")).body;
    expect(anaFriends.map((p) => p.name)).toContain("Ben");
    expect((await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming).toHaveLength(0);
    expect((await ana.c.get<FriendRequestsDto>("/v1/friends/requests")).body.outgoing).toHaveLength(0);

    // Already friends: asking again is a quiet no-op, with no second group.
    expect((await ana.c.post("/v1/friends/requests", { to: handle })).status).toBe(200);
    const again = (await ana.c.get<GroupSummaryDto[]>("/v1/groups")).body.filter((g) => g.type === "direct");
    expect(again).toHaveLength(1);
  });

  it("says plainly when nobody has that username, and refuses yourself and guests", async () => {
    const ana = await person("Ana", `ana_${rand()}`);
    expect((await ana.c.post("/v1/friends/requests", { to: "@nobody_here_9" })).status).toBe(404);
    expect((await ana.c.post("/v1/friends/requests", { to: "not a handle!" })).status).toBe(400);
    const me = (await ana.c.get("/v1/me")).body;
    expect((await ana.c.post("/v1/friends/requests", { to: `@${me.username}` })).status).toBe(400);
    expect((await ana.c.post("/v1/friends/requests", { to: me.email })).status).toBe(400);

    const guest = client();
    await guest.signInAsGuest();
    expect((await guest.post("/v1/friends/requests", { to: "@anyone" })).status).toBe(403);
  });

  it("a declined request is never revealed, and can't be repeated", async () => {
    const handle = `ben_${rand()}`;
    const ana = await person("Ana");
    const ben = await person("Ben", handle);
    await ana.c.post("/v1/friends/requests", { to: handle });
    const id = (await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming[0].id;
    expect((await ben.c.post(`/v1/friends/requests/${id}/decline`)).status).toBe(204);

    // Ana still sees it as waiting, and asking again looks like it worked.
    expect((await ana.c.get<FriendRequestsDto>("/v1/friends/requests")).body.outgoing).toHaveLength(1);
    expect((await ana.c.post("/v1/friends/requests", { to: handle })).status).toBe(200);
    expect((await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming).toHaveLength(0);
    expect(mailsTo(ben.email, "Ana wants to add you")).toHaveLength(1);
    expect((await ana.c.get<GroupSummaryDto[]>("/v1/groups")).body.filter((g) => g.type === "direct")).toHaveLength(0);
  });

  it("asking someone who already asked you is a yes", async () => {
    const [ha, hb] = [`ana_${rand()}`, `ben_${rand()}`];
    const ana = await person("Ana", ha);
    const ben = await person("Ben", hb);
    await ana.c.post("/v1/friends/requests", { to: hb });
    await ben.c.post("/v1/friends/requests", { to: ha });
    expect((await ana.c.get<GroupSummaryDto[]>("/v1/groups")).body.filter((g) => g.type === "direct")).toHaveLength(1);
    expect((await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming).toHaveLength(0);
  });

  it("only the person asked can answer, and the sender can take it back", async () => {
    const handle = `ben_${rand()}`;
    const ana = await person("Ana");
    const ben = await person("Ben", handle);
    const eve = await person("Eve");
    await ana.c.post("/v1/friends/requests", { to: handle });
    const id = (await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming[0].id;
    expect((await eve.c.post(`/v1/friends/requests/${id}/accept`)).status).toBe(404);
    expect((await ana.c.post(`/v1/friends/requests/${id}/accept`)).status).toBe(404); // not the sender either
    expect((await eve.c.del(`/v1/friends/requests/${id}`)).status).toBe(204);
    expect((await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming).toHaveLength(1); // untouched
    expect((await ana.c.del(`/v1/friends/requests/${id}`)).status).toBe(204);
    expect((await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming).toHaveLength(0);
  });
});

describe("adding a friend by email", () => {
  it("looks the same whether or not the address has an account", async () => {
    const ana = await person("Ana");
    const ben = await person("Ben");
    const stranger = `new-${rand()}@example.com`;
    const toBen = await ana.c.post("/v1/friends/requests", { to: ben.email.toUpperCase() });
    const toStranger = await ana.c.post("/v1/friends/requests", { to: stranger });
    expect(toBen.status).toBe(200);
    expect(toStranger.status).toBe(200);
    expect(toBen.body).toEqual(toStranger.body);

    // Ben (has an account) gets a request to accept; the stranger gets an invitation.
    expect((await ben.c.get<FriendRequestsDto>("/v1/friends/requests")).body.incoming).toHaveLength(1);
    expect(mailsTo(ben.email, "Ana wants to add you")).toHaveLength(1);
    const invite = mailsTo(stranger, "Ana invited you")[0];
    expect(invite.text).toMatch(/\/join\?t=[\w-]{16,}/);
    expect(invite.text).toContain("/reminders/mute?");
    // The sender sees both as waiting, by what they typed.
    expect((await ana.c.get<FriendRequestsDto>("/v1/friends/requests")).body.outgoing).toHaveLength(2);
  });

  it("an invited person who signs up and opens the link becomes the friend", async () => {
    const ana = await person("Ana");
    const stranger = `sam.k-${rand()}@example.com`;
    await ana.c.post("/v1/friends/requests", { to: stranger });
    // Asking again doesn't send a second email.
    await ana.c.post("/v1/friends/requests", { to: stranger });
    expect(mailsTo(stranger, "Ana invited you")).toHaveLength(1);

    const token = /\/join\?t=([\w-]+)/.exec(mailsTo(stranger, "Ana invited you")[0].text)![1];
    const sam = client();
    await sam.signUp("Sam", stranger);
    const preview = (await sam.get(`/v1/invites/${token}`)).body;
    const spot = preview.openSpots[0];
    expect(spot.displayName).toMatch(/^Sam K/);
    expect((await sam.post(`/v1/invites/${token}/join`, { memberId: spot.id })).status).toBe(200);

    expect((await ana.c.get<PersonDto[]>("/v1/people")).body.some((p) => p.groups.some((g) => g.type === "direct"))).toBe(true);
    expect((await sam.get<GroupSummaryDto[]>("/v1/groups")).body.filter((g) => g.type === "direct")).toHaveLength(1);
  });

  it("stops after ten requests and invitations in a day", async () => {
    const ana = await person("Ana");
    for (let i = 0; i < 10; i++) expect((await ana.c.post("/v1/friends/requests", { to: `cap-${i}-${rand()}@example.com` })).status).toBe(200);
    const eleventh = await ana.c.post("/v1/friends/requests", { to: `cap-x-${rand()}@example.com` });
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe("RATE_LIMITED");
  });
});
