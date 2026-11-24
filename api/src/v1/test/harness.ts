import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import { PUSH_HOSTS, type AppConfig } from "../config";
import { MIGRATIONS_FOLDER, type Db } from "../db/client";
import * as schema from "../db/schema";
import { createMemoryMailer } from "../mailer";

export const WEB_ORIGIN = "http://localhost:3000";

/** Stand-in for the AI receipt reader: tests set what it answers next. */
export function createFakeReceiptReader() {
  const fake = {
    next: null as unknown,
    calls: 0,
    async read() {
      fake.calls++;
      if (fake.next instanceof Error) throw fake.next;
      return fake.next;
    },
  };
  return fake;
}

/** Stand-in for Web Push: records what would be delivered. */
export function createFakePushSender() {
  const fake = {
    sent: [] as { kind: string; endpoint: string; payload: { title: string; body: string; url: string; tag: string } }[],
    /** Endpoints the "browser" has unsubscribed. */
    gone: new Set<string>(),
    async send(target: { kind: string; endpoint: string }, payload: string) {
      if (fake.gone.has(target.endpoint)) return { gone: true };
      fake.sent.push({ kind: target.kind, endpoint: target.endpoint, payload: JSON.parse(payload) });
      return { gone: false };
    },
  };
  return fake;
}

/** A fresh API on an in-memory Postgres (PGlite), with migrations applied. */
export async function createTestApp(overrides: Partial<AppConfig> = {}) {
  const client = new PGlite();
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  const db = drizzle(client, { schema }) as unknown as Db;
  const mailer = createMemoryMailer();
  const config: AppConfig = {
    env: "test",
    apiUrl: "http://localhost:8001",
    webOrigins: [WEB_ORIGIN],
    trustedOrigins: [WEB_ORIGIN, "settlemint://"],
    trustProxyHops: 0,
    requireEmailVerification: true,
    pushHosts: [...PUSH_HOSTS, "push.example.com"],
    webUrl: WEB_ORIGIN,
    authSecret: "test-secret-0123456789-0123456789-0123456789",
    aiScansPerMonth: 3,
    vapid: { publicKey: "test-public-key", privateKey: "test-private-key", subject: "mailto:test@example.com" },
    // New guest sessions are closed for real; tests open them to stand in for guests that already exist.
    guestSignIn: true,
    ...overrides,
  };
  const receiptReader = createFakeReceiptReader();
  const pushSender = createFakePushSender();
  const app = await buildApp({ db, config, mailer, logger: false, receiptReader, pushSender });
  return {
    app,
    db,
    mailer,
    receiptReader,
    pushSender,
    async close() {
      await app.close();
      await client.close();
    },
  };
}

export interface Res<T = any> {
  status: number;
  body: T;
}

/** A browser-like client: keeps the session cookie between requests. */
export class TestClient {
  private cookies = new Map<string, string>();

  constructor(
    private app: FastifyInstance,
    private mailer?: { sent: { to: string; subject: string; text: string }[] },
  ) {}

  /** The session cookie header this client would send (for replay tests). */
  cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async request<T = any>(method: string, url: string, payload?: unknown): Promise<Res<T>> {
    const cookie = this.cookieHeader();
    const res = await this.app.inject({
      method: method as "GET",
      url,
      ...(payload !== undefined ? { payload: payload as object } : {}),
      headers: { origin: WEB_ORIGIN, ...(cookie ? { cookie } : {}) },
    });
    const setCookie = res.headers["set-cookie"];
    for (const c of Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []) {
      const [pair, ...attrs] = c.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      const expired = attrs.some((a) => /max-age=0\b/i.test(a.trim())) || value === "";
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    let body: any = null;
    if (res.body) {
      try {
        body = JSON.parse(res.body);
      } catch {
        body = res.body;
      }
    }
    return { status: res.statusCode, body };
  }

  get = <T = any>(url: string) => this.request<T>("GET", url);
  post = <T = any>(url: string, body: unknown = {}) => this.request<T>("POST", url, body);
  patch = <T = any>(url: string, body: unknown) => this.request<T>("PATCH", url, body);
  put = <T = any>(url: string, body: unknown) => this.request<T>("PUT", url, body);
  del = <T = any>(url: string) => this.request<T>("DELETE", url);

  async signUp(name: string, email = `${name.toLowerCase().replace(/\W/g, "")}-${Math.random().toString(36).slice(2, 8)}@example.com`) {
    const res = await this.post("/v1/auth/sign-up/email", { name, email, password: "correct-horse-battery" });
    if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
    // Like a real person: read the code from the email and confirm, which signs in.
    const otp = await this.lastCode(email);
    const verified = await this.post("/v1/auth/email-otp/verify-email", { email, otp });
    if (verified.status !== 200) throw new Error(`verify failed: ${verified.status} ${JSON.stringify(verified.body)}`);
    return { email, ...verified };
  }

  /** The newest 6-digit code emailed to this address (emails go out in the background, so wait a little). */
  async lastCode(email: string, after = 0): Promise<string> {
    for (let i = 0; i < 100; i++) {
      const mails = (this.mailer?.sent ?? []).slice(after).filter((m) => m.to === email);
      const found = mails.at(-1)?.text.match(/(\d{6})/)?.[1];
      if (found) return found;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`no code emailed to ${email}`);
  }

  /** A guest that already existed before guest sessions were closed. */
  async signInAsGuest() {
    const res = await this.post("/v1/auth/sign-in/anonymous");
    if (res.status !== 200) throw new Error(`guest sign-in failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res;
  }
}
