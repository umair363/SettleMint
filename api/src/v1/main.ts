import * as dotenv from "dotenv";
import { buildApp } from "./app";
import { configFromEnv } from "./config";
import { connectPostgres } from "./db/client";
import { createMailer } from "./mailer";

dotenv.config();

async function main() {
  const url = process.env.V1_DATABASE_URL;
  if (!url) throw new Error("V1_DATABASE_URL must be set");
  const config = configFromEnv();
  const { db, close } = await connectPostgres(url);
  const app = await buildApp({ db, config, mailer: createMailer() });

  const shutdown = async () => {
    await app.close();
    await close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await app.listen({ port: Number(process.env.PORT ?? 8001), host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
