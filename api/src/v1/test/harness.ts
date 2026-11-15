import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import type { AppConfig } from "../config";
import { MIGRATIONS_FOLDER, type Db } from "../db/client";
import * as schema from "../db/schema";
import { createMemoryMailer } from "../mailer";

export const WEB_ORIGIN = "http://localhost:3000";

/** A fresh API on an in-memory Postgres (PGlite), with migrations applied. */
export async function createTestApp() {
  const client = new PGlite();
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  const db = drizzle(client, { schema }) as unknown as Db;
  const mailer = createMemoryMailer();
  const config: AppConfig = {
    env: "test",
    apiUrl: "http://localhost:8001",
    webOrigins: [WEB_ORIGIN],
    webUrl: WEB_ORIGIN,
    authSecret: "test-secret-0123456789-0123456789-0123456789",
  };
  const app = await buildApp({ db, config, mailer, logger: false });
  return {
    app,
    db,
    mailer,
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

  constructor(private app: FastifyInstance) {}

  async request<T = any>(method: string, url: string, payload?: unknown): Promise<Res<T>> {
    const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
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
  del = <T = any>(url: string) => this.request<T>("DELETE", url);

  async signUp(name: string, email = `${name.toLowerCase().replace(/\W/g, "")}-${Math.random().toString(36).slice(2, 8)}@example.com`) {
    const res = await this.post("/v1/auth/sign-up/email", { name, email, password: "correct-horse-battery" });
    if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
    return { email, ...res };
  }

  async signInAsGuest() {
    const res = await this.post("/v1/auth/sign-in/anonymous");
    if (res.status !== 200) throw new Error(`guest sign-in failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res;
  }
}
