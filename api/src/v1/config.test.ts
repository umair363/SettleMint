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

  it("trusts the mobile app's scheme, and Expo dev URLs only in development", () => {
    const prod = configFromEnv({ NODE_ENV: "production", AUTH_SECRET: secret, WEB_ORIGINS: "https://app.example.com" });
    expect(prod.trustedOrigins).toEqual(["https://app.example.com", "settlemint://"]);
    expect(configFromEnv({}).trustedOrigins).toContain("exp://**");
  });

  it("never lets production skip email confirmation", () => {
    expect(configFromEnv({ NODE_ENV: "production", AUTH_SECRET: secret, EMAIL_VERIFICATION: "off" }).requireEmailVerification).toBe(true);
    expect(configFromEnv({ EMAIL_VERIFICATION: "off" }).requireEmailVerification).toBe(false);
    expect(configFromEnv({}).requireEmailVerification).toBe(true);
  });

  it("trusts one proxy hop in production (Render), none locally, or what TRUST_PROXY_HOPS says", () => {
    expect(configFromEnv({ NODE_ENV: "production", AUTH_SECRET: secret }).trustProxyHops).toBe(1);
    expect(configFromEnv({}).trustProxyHops).toBe(0);
    expect(configFromEnv({ NODE_ENV: "production", AUTH_SECRET: secret, TRUST_PROXY_HOPS: "2" }).trustProxyHops).toBe(2);
  });
});
