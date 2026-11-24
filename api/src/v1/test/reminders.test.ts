import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GroupDetailDto } from "@settlemint/shared";
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
const rand = () => Math.random().toString(36).slice(2, 8);

/** Ana creates a group with Ben and Cy added by name. */
async function tripWithFriends() {
  const ana = client();
  await ana.signUp("Ana");
  const res = await ana.post<GroupDetailDto>("/v1/groups", {
    name: "Lisbon trip",
    currency: "USD",
    type: "trip",
    people: [{ displayName: "Ben" }, { displayName: "Cy" }],
  });
  expect(res.status).toBe(201);
  const g = res.body;
  const id = (name: string) => g.members.find((m) => m.displayName === name)!.id;
  return { ana, group: g, anaId: g.myMemberId, benId: id("Ben"), cyId: id("Cy") };
}

const keys = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};

// A realistic bank QR text (EMV-style payload, as Raast and wallet apps make).
const BANK_QR = "00020101021126400014A000000677010112011234567890123456789005204739953035865802PK5909Ana Souza6007Karachi6304ABCD";

/** Ana paid for two and an equal split makes `owedBy` owe her half. */
async function ana_paid(
  ana: TestClient,
  groupId: string,
  anaId: string,
  owedBy: string,
  amount: number,
  description = "Dinner",
) {
  const res = await ana.post(`/v1/groups/${groupId}/expenses`, {
    description,
    amount,
    currency: "USD",
    date: today,
    payers: [{ memberId: anaId, amount }],
    split: { method: "equal", memberIds: [anaId, owedBy] },
  });
  expect(res.status).toBe(201);
}

/** Ana paid $10 for her and Ben, so Ben owes her $5. Ben has an account; Cy was added by name. */
async function owedByBen() {
  const trip = await tripWithFriends();
  const link = (await trip.ana.post(`/v1/groups/${trip.group.id}/invite`)).body.token;
  const ben = client();
  await ben.signUp("Ben");
  await ben.post(`/v1/invites/${link}/join`, { memberId: trip.benId });
  const benEmail = (await ben.get("/v1/me")).body.email as string;
  await ana_paid(trip.ana, trip.group.id, trip.anaId, trip.benId, 1000);
  return { ...trip, ben, benEmail };
}

const mailsTo = (email: string) => t.mailer.sent.filter((m) => m.to === email && m.subject.startsWith("Payment reminder"));

describe("saved payment QR codes", () => {
  it("stores a QR's text, shows it to the group, and keeps limits", async () => {
    const { ana, group, benId } = await tripWithFriends();
    const link = (await ana.post(`/v1/groups/${group.id}/invite`)).body.token;
    const ben = client();
    await ben.signUp("Ben");
    await ben.post(`/v1/invites/${link}/join`, { memberId: benId });

    const saved = await ana.put("/v1/me/payment-handles", {
      handles: [
        { kind: "raast", value: "0300 1234567" },
        { kind: "qr", value: BANK_QR, label: "HBL Raast" },
      ],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.map((h: { kind: string }) => h.kind)).toEqual(["raast", "qr"]);
    // Exactly as scanned: a bank checks the text, so it is never reflowed.
    expect(saved.body[1]).toMatchObject({ kind: "qr", value: BANK_QR, label: "HBL Raast" });

    const seen = (await ben.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    const anaAsSeen = seen.members.find((m) => !m.isMe && m.displayName === "Ana")!;
    expect(anaAsSeen.paymentHandles.find((h) => h.kind === "qr")?.value).toBe(BANK_QR);

    // Too long, control characters, and more than five are all refused.
    expect((await ana.put("/v1/me/payment-handles", { handles: [{ kind: "qr", value: "x".repeat(1025) }] })).status).toBe(400);
    expect((await ana.put("/v1/me/payment-handles", { handles: [{ kind: "qr", value: "ab\ncd" }] })).status).toBe(400);
    const six = Array.from({ length: 6 }, (_, i) => ({ kind: "qr", value: `${BANK_QR}${i}` }));
    expect((await ana.put("/v1/me/payment-handles", { handles: six })).status).toBe(400);
    // Other kinds keep their short limit.
    expect((await ana.put("/v1/me/payment-handles", { handles: [{ kind: "raast", value: "9".repeat(200) }] })).status).toBe(400);
  });
});

describe("payment reminders", () => {
  it("sends a notification and an email that never say who is asking", async () => {
    const { ana, ben, group, benId, benEmail } = await owedByBen();
    const ep = `https://push.example.com/ben-${rand()}`;
    expect((await ben.post("/v1/push/subscribe", { endpoint: ep, keys })).status).toBe(204);

    const res = await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: benId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ reachable: true, push: 1, email: true });

    const push = t.pushSender.sent.find((s) => s.endpoint === ep)!;
    expect(push.payload).toMatchObject({ title: "Lisbon trip", body: "A payment of $5.00 is waiting to be settled." });
    expect(JSON.stringify(push.payload)).not.toContain("Ana");

    const [mail] = mailsTo(benEmail);
    expect(mail.subject).toBe("Payment reminder · Lisbon trip");
    expect(mail.text).toContain("$5.00");
    expect(mail.text).not.toContain("Ana");
    expect(mail.html).not.toContain("Ana");
    // No payment details unless the sender chose to include them.
    expect(mail.attachments).toBeUndefined();
    expect(mail.text).toContain("/reminders/mute?");
    expect(mail.headers?.["List-Unsubscribe"]).toContain("/reminders/mute?");
  });

  it("allows one reminder a day per person and only for a real debt", async () => {
    const { ana, ben, group, anaId, benId, cyId } = await owedByBen();
    expect((await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: benId })).status).toBe(200);
    const again = await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: benId });
    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe("RATE_LIMITED");
    expect(new Date(again.body.error.details.nextAllowedAt).getTime()).toBeGreaterThan(Date.now() + 23 * 3600_000);

    expect((await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: cyId })).status).toBe(409); // owes nothing
    expect((await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: anaId })).status).toBe(400); // herself
    // The person who is owed can't be "reminded" by the one who owes.
    expect((await ben.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: anaId })).status).toBe(409);
  });

  it("adds payment details and the saved QR only when asked", async () => {
    const { ana, group, benEmail, benId } = await owedByBen();
    await ana.put("/v1/me/payment-handles", {
      handles: [
        { kind: "paypal", value: "anasouza" },
        { kind: "qr", value: BANK_QR, label: "HBL Raast" },
      ],
    });
    const res = await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: benId, includePayment: true });
    expect(res.body.email).toBe(true);

    const [mail] = mailsTo(benEmail);
    expect(mail.text).toContain("Pay Ana");
    expect(mail.text).toContain("https://paypal.me/anasouza/5.00USD");
    expect(mail.attachments).toHaveLength(1);
    const qr = mail.attachments![0];
    expect(qr).toMatchObject({ contentType: "image/png", contentId: "qr1" });
    expect([...qr.content.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(mail.html).toContain("cid:qr1");
    // The QR is a picture; its raw text isn't pasted into the email.
    expect(mail.html).not.toContain(BANK_QR);
    expect(mail.text).not.toContain(BANK_QR);
  });

  it("reaches someone added by name through an email you give, and says so when it can't", async () => {
    const { ana, group, anaId, cyId } = await owedByBen();
    await ana_paid(ana, group.id, anaId, cyId, 800, "Taxi");
    let detail = (await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    expect(detail.members.find((m) => m.id === cyId)!.hasEmail).toBe(false);

    // No email, no app: nothing is sent and nothing is used up.
    const none = await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: cyId });
    expect(none.body).toEqual({ reachable: false, push: 0, email: false, nextAllowedAt: null });

    const cyEmail = `cy-${rand()}@example.com`;
    const patched = await ana.patch<GroupDetailDto["members"]>(`/v1/groups/${group.id}/members/${cyId}`, { email: cyEmail });
    expect(patched.status).toBe(200);
    expect(patched.body.find((m) => m.id === cyId)!.hasEmail).toBe(true);
    // The address itself never comes back out.
    expect(JSON.stringify(patched.body)).not.toContain(cyEmail);
    detail = (await ana.get<GroupDetailDto>(`/v1/groups/${group.id}`)).body;
    expect(JSON.stringify(detail)).not.toContain(cyEmail);

    const sent = await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: cyId });
    expect(sent.body).toMatchObject({ reachable: true, push: 0, email: true });
    expect(mailsTo(cyEmail)).toHaveLength(1);
    expect((await ana.patch(`/v1/groups/${group.id}/members/${cyId}`, { email: "not-an-email" })).status).toBe(400);
  });

  it("stops reminder emails from the link, only after a click, and can undo it", async () => {
    const { ana, group, anaId, cyId } = await owedByBen();
    await ana_paid(ana, group.id, anaId, cyId, 800, "Taxi");
    const cyEmail = `muted-${rand()}@example.com`;
    await ana.patch(`/v1/groups/${group.id}/members/${cyId}`, { email: cyEmail });
    expect((await ana.post(`/v1/groups/${group.id}/remind`, { debtorMemberId: cyId })).body.email).toBe(true);

    const link = /(https?:\/\/\S+\/reminders\/mute\?\S+)/.exec(mailsTo(cyEmail)[0].text)![1];
    const path = (u: string) => {
      const url = new URL(u);
      return url.pathname + url.search;
    };
    // Opening the link (as a mail scanner would) only shows a question.
    const opened = await t.app.inject({ method: "GET", url: path(link) });
    expect(opened.statusCode).toBe(200);
    expect(opened.headers["content-type"]).toContain("text/html");
    expect(opened.body).toContain("Stop these emails");

    // A forged or altered link does nothing.
    const forged = await t.app.inject({ method: "POST", url: path(link).replace(/t=[0-9a-f]{40}/, `t=${"0".repeat(40)}`) });
    expect(forged.statusCode).toBe(403);
    expect((await t.app.inject({ method: "POST", url: path(link).replace(encodeURIComponent(cyEmail), encodeURIComponent(`x${cyEmail}`)) })).statusCode).toBe(403);

    // The button (or a mail app's one-click unsubscribe) switches it off.
    const done = await t.app.inject({
      method: "POST",
      url: path(link),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "List-Unsubscribe=One-Click",
    });
    expect(done.statusCode).toBe(200);
    expect(done.body).toContain("Undo");

    // A new debt, same address: no email, and so no allowance used.
    const trip2 = await tripWithFriends();
    await ana_paid(trip2.ana, trip2.group.id, trip2.anaId, trip2.cyId, 600, "Lunch");
    await trip2.ana.patch(`/v1/groups/${trip2.group.id}/members/${trip2.cyId}`, { email: cyEmail });
    const blocked = await trip2.ana.post(`/v1/groups/${trip2.group.id}/remind`, { debtorMemberId: trip2.cyId });
    expect(blocked.body).toMatchObject({ reachable: false, email: false });
    expect(mailsTo(cyEmail)).toHaveLength(1);

    // Undo brings reminders back.
    expect((await t.app.inject({ method: "POST", url: `${path(link)}&undo=1` })).statusCode).toBe(200);
    expect((await trip2.ana.post(`/v1/groups/${trip2.group.id}/remind`, { debtorMemberId: trip2.cyId })).body.email).toBe(true);
  });
});
