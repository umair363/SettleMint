import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Schema = typeof schema;

/** Works for both postgres-js (production) and PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

export const MIGRATIONS_FOLDER = path.join(__dirname, "migrations");

/** Production database: postgres-js, migrations applied on start-up. */
export async function connectPostgres(url: string): Promise<{ db: Db; close: () => Promise<void> }> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");

  const migrationClient = postgres(url, { max: 1 });
  await migrate(drizzle(migrationClient), { migrationsFolder: MIGRATIONS_FOLDER });
  await migrationClient.end();

  const client = postgres(url, { max: 10, prepare: false });
  const db = drizzle(client, { schema }) as unknown as Db;
  return { db, close: () => client.end() };
}
