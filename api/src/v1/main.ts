import { mkdirSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import { startKeepAliveFromEnv } from "../utils/keepAlive";
import { buildApp } from "./app";
import { configFromEnv } from "./config";
import { connectPostgres, MIGRATIONS_FOLDER, type Db } from "./db/client";
import * as schema from "./db/schema";
import { createMailer } from "./mailer";

dotenv.config();

/**
 * Local development without installing Postgres: PGlite (Postgres compiled
 * to WebAssembly) stored in api/.data. Never used in production.
 */
async function connectLocalPglite(): Promise<{ db: Db; close: () => Promise<void> }> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = path.resolve(__dirname, "../../.data/v1-dev");
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  console.info(`[v1] No V1_DATABASE_URL set; using local PGlite database in ${dataDir}`);
  return { db: drizzle(client, { schema }) as unknown as Db, close: () => client.close() };
}

async function main() {
  const config = configFromEnv();
  const url = process.env.V1_DATABASE_URL;
  if (!url && config.env === "production") throw new Error("V1_DATABASE_URL must be set in production");
  const { db, close } = url ? await connectPostgres(url) : await connectLocalPglite();
  const app = await buildApp({ db, config, mailer: createMailer() });

  await app.listen({ port: Number(process.env.PORT ?? 8001), host: "0.0.0.0" });
  const stopKeepAlive = startKeepAliveFromEnv(process.env, {
    warn: (m) => app.log.warn(m),
    info: (m) => app.log.info(m),
  });

  const shutdown = async () => {
    stopKeepAlive();
    await app.close();
    await close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
