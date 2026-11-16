import { describe, expect, it } from "vitest";
import { configFromEnv } from "./config";

const secret = "x".repeat(40);

describe("config", () => {
  it("never lets production switch off sign-in rate limits", () => {
    expect(configFromEnv({ NODE_ENV: "production", AUTH_SECRET: secret, AUTH_RATE_LIMIT: "off" }).authRateLimit).toBe(true);
  });

  it("lets local browser tests switch them off", () => {
    expect(configFromEnv({ AUTH_RATE_LIMIT: "off" }).authRateLimit).toBe(false);
    expect(configFromEnv({}).authRateLimit).toBe(true);
  });
});
