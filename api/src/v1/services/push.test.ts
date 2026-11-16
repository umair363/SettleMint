import { generateVAPIDKeys } from "web-push";
import { describe, expect, it } from "vitest";
import { webPushSender } from "./push";

describe("webPushSender", () => {
  it("really signs and sends (reaching the network, not failing in our code)", async () => {
    const vapid = { ...generateVAPIDKeys(), subject: "mailto:test@example.com" };
    const browserKeys = generateVAPIDKeys(); // any valid P-256 public key works as p256dh
    const sender = webPushSender(vapid);
    // Port 9 on localhost: nothing listens, so the request is refused.
    const err = await sender
      .send({ endpoint: "https://127.0.0.1:9/push/abc", p256dh: browserKeys.publicKey, auth: "tBHItJI5svbpez7KI4CCXg" }, "{}")
      .then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/ECONNREFUSED|connect/i);
  });
});
