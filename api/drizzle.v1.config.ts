import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

// v1 API: its own schema, migrations and database. Generate migrations with
// `npm run v1:db:generate`; they are applied on start-up by the API itself.
export default {
  schema: "./src/v1/db/schema.ts",
  out: "./src/v1/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.V1_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/settlemint_v1",
  },
} satisfies Config;
