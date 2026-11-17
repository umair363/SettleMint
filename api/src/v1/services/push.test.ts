import { generateVAPIDKeys } from "web-push";
import { describe, expect, it } from "vitest";
import { combinedSender, EXPO_PUSH_URL, expoPushSender, webPushSender } from "./push";

describe("webPushSender", () => {
  it("really signs and sends (reaching the network, not failing in our code)", async () => {
    const vapid = { ...generateVAPIDKeys(), subject: "mailto:test@example.com" };
    const browserKeys = generateVAPIDKeys(); // any valid P-256 public key works as p256dh
    const sender = webPushSender(vapid);
    // Port 9 on localhost: nothing listens, so the request is refused.
    const err = await sender
      .send({ kind: "web", endpoint: "https://127.0.0.1:9/push/abc", p256dh: browserKeys.publicKey, auth: "tBHItJI5svbpez7KI4CCXg" }, "{}")
      .then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/ECONNREFUSED|connect/i);
  });
});

describe("expoPushSender", () => {
  const payload = JSON.stringify({ title: "🏖️ Lisbon", body: "Ana added “Taxi” · $9.00", url: "https://x/group?id=g1", tag: "g1" });
  const phone = { kind: "expo" as const, endpoint: "ExponentPushToken[abc123]" };

  function fakeFetch(answer: unknown, status = 200) {
    const calls: { url: string; init: RequestInit }[] = [];
    const fn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(answer), { status });
    }) as unknown as typeof fetch;
    return { fn, calls };
  }

  it("sends the notification to Expo with the group to open", async () => {
    const f = fakeFetch({ data: { status: "ok", id: "t1" } });
    await expect(expoPushSender({ fetch: f.fn }).send(phone, payload)).resolves.toEqual({ gone: false });
    expect(f.calls[0].url).toBe(EXPO_PUSH_URL);
    const body = JSON.parse(String(f.calls[0].init.body));
    expect(body).toMatchObject({ to: "ExponentPushToken[abc123]", title: "🏖️ Lisbon", body: "Ana added “Taxi” · $9.00", data: { groupId: "g1" } });
    expect((f.calls[0].init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("forgets phones that uninstalled the app", async () => {
    const f = fakeFetch({ data: { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } } });
    expect((await expoPushSender({ fetch: f.fn }).send(phone, payload)).gone).toBe(true);
  });

  it("reports other failures instead of dropping the phone", async () => {
    const f = fakeFetch({ data: { status: "error", details: { error: "MessageRateExceeded" } } });
    await expect(expoPushSender({ fetch: f.fn }).send(phone, payload)).rejects.toThrow(/MessageRateExceeded/);
  });

  it("sends the access token when one is set", async () => {
    const f = fakeFetch({ data: { status: "ok" } });
    await expoPushSender({ fetch: f.fn, accessToken: "secret" }).send(phone, payload);
    expect((f.calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer secret");
  });

  it("routes phones to Expo and skips browsers when Web Push is off", async () => {
    const f = fakeFetch({ data: { status: "ok" } });
    const sender = combinedSender(null, expoPushSender({ fetch: f.fn }));
    await sender.send({ kind: "web", endpoint: "https://push.example/x", p256dh: "k", auth: "a" }, payload);
    expect(f.calls).toHaveLength(0);
    await sender.send(phone, payload);
    expect(f.calls).toHaveLength(1);
  });
});
