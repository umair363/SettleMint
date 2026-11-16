import { mkdirSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import { startKeepAliveFromEnv } from "../utils/keepAlive";
import { buildApp } from "./app";
import { configFromEnv } from "./config";
import { connectPostgres, MIGRATIONS_FOLDER, type Db } from "./db/client";
import * as schema from "./db/schema";
import { announceGroupChanged } from "./live";
import { createMailer } from "./mailer";
import { sampleReceiptReader } from "./services/receipts";
import { materializeRecurring } from "./services/recurring";

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
  // FAKE_RECEIPT_READER=1: a canned receipt instead of the AI, for building and
  // testing the scanning screens without a key. Never in production.
  const fakeReader = process.env.FAKE_RECEIPT_READER === "1" && config.env !== "production" ? sampleReceiptReader : undefined;
  const app = await buildApp({ db, config, mailer: createMailer(), ...(fakeReader ? { receiptReader: fakeReader } : {}) });

  await app.listen({ port: Number(process.env.PORT ?? 8001), host: "0.0.0.0" });
  // Recurring bills: catch up now, then every hour. Opening a group also
  // catches up, so nothing is missed while a free instance sleeps.
  const runRecurring = () =>
    materializeRecurring(db)
      .then((changed) => changed.forEach(announceGroupChanged))
      .catch((err) => app.log.error({ err }, "recurring bills failed"));
  void runRecurring();
  const recurringTimer = setInterval(runRecurring, 60 * 60 * 1000);
  recurringTimer.unref();

  const stopKeepAlive = startKeepAliveFromEnv(process.env, {
    warn: (m) => app.log.warn(m),
    info: (m) => app.log.info(m),
  });

  const shutdown = async () => {
    stopKeepAlive();
    clearInterval(recurringTimer);
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
