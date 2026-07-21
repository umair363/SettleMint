-- Track A hardening: enums, budget integrity, recurring-transaction bookkeeping.
--
-- IMPORTANT: this project's dev workflow uses `drizzle-kit push` (schema-diff
-- apply), not tracked migrations — there was no prior migration history to
-- generate an incremental diff from. This file is hand-written to contain
-- ONLY the actual deltas introduced in this change, so it's safe to run once
-- against the existing production/dev database. Review before running.
--
-- Run with: psql "$DATABASE_URL" -f src/db/migrations/0001_track_a_hardening.sql
-- (or apply via your usual migration runner)

BEGIN;

-- ─── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "group_mode" AS ENUM ('Trip', 'Roommate', 'Couple', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "group_role" AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "settlement_method" AS ENUM ('cash', 'transfer', 'app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "transaction_type" AS ENUM ('expense', 'income');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "wallet" AS ENUM ('cash', 'bank', 'card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "recurring_frequency" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Convert existing varchar columns to enums ─────────────────────────────
-- Any row with a value outside the enum set will make these ALTERs fail —
-- that's intentional: it surfaces bad existing data instead of silently
-- coercing it. Inspect with e.g.
--   SELECT DISTINCT mode FROM groups WHERE mode NOT IN ('Trip','Roommate','Couple','Other');
-- before running, and clean up any stragglers first.

ALTER TABLE "groups"
  ALTER COLUMN "mode" TYPE "group_mode" USING "mode"::"group_mode";

ALTER TABLE "group_members"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "group_role" USING "role"::"group_role",
  ALTER COLUMN "role" SET DEFAULT 'member';

ALTER TABLE "settlements"
  ALTER COLUMN "method" TYPE "settlement_method" USING "method"::"settlement_method";

ALTER TABLE "personal_transactions"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "transaction_type" USING "type"::"transaction_type",
  ALTER COLUMN "type" SET DEFAULT 'expense';

ALTER TABLE "personal_transactions"
  ALTER COLUMN "wallet" DROP DEFAULT,
  ALTER COLUMN "wallet" TYPE "wallet" USING "wallet"::"wallet",
  ALTER COLUMN "wallet" SET DEFAULT 'card';

-- recurring_frequency was nullable free text; NULL stays NULL through the cast
ALTER TABLE "personal_transactions"
  ALTER COLUMN "recurring_frequency" TYPE "recurring_frequency" USING "recurring_frequency"::"recurring_frequency";

-- ─── personal_transactions: recurrence bookkeeping + updatedAt ─────────────
ALTER TABLE "personal_transactions"
  ADD COLUMN IF NOT EXISTS "next_run_date" timestamp,
  ADD COLUMN IF NOT EXISTS "last_generated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS "personal_txn_next_run_date_idx" ON "personal_transactions" ("next_run_date");

-- ─── budgets: month/year numeric -> integer, updatedAt, unique constraint ──
-- numeric(2,0)/(4,0) values are always whole numbers already, so this cast
-- is lossless.
ALTER TABLE "budgets"
  ALTER COLUMN "month" TYPE integer USING "month"::integer,
  ALTER COLUMN "year"  TYPE integer USING "year"::integer;

ALTER TABLE "budgets"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- If duplicate (user_id, category, month, year) rows already exist, this
-- index creation will fail — dedupe first, e.g. keep the most recent:
--   DELETE FROM budgets a USING budgets b
--   WHERE a.id < b.id AND a.user_id = b.user_id AND a.category = b.category
--     AND a.month = b.month AND a.year = b.year;
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_category_month_year_idx"
  ON "budgets" ("user_id", "category", "month", "year");

COMMIT;
