import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// All money is integer minor units (bigint, read as JS numbers: the money
// engine caps amounts far below 2^53). Every amount sits next to its ISO
// currency code. Exchange rates are exact decimals, read as strings.

const money = (name: string) => bigint(name, { mode: "number" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

// ─── Auth (columns as Better Auth expects them) ────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false),
  defaultCurrency: varchar("default_currency", { length: 3 }),
  locale: varchar("locale", { length: 35 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ─── Groups and members ────────────────────────────────────────────────────

export const GROUP_TYPES = ["trip", "home", "couple", "event", "other", "direct"] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  type: varchar("type", { length: 16 }).$type<GroupType>().notNull().default("other"),
  emoji: varchar("emoji", { length: 16 }),
  color: varchar("color", { length: 16 }),
  simplifyDebts: boolean("simplify_debts").notNull().default(true),
  inviteToken: varchar("invite_token", { length: 64 }).unique(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  archivedAt: ts("archived_at"),
  deletedAt: ts("deleted_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const MEMBER_ROLES = ["owner", "admin", "member"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * A person in a group. `userId` is null for someone added by name who has
 * not joined yet; they can claim this member later and inherit its history.
 * Expenses always point at members, never directly at users.
 */
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    displayName: varchar("display_name", { length: 60 }).notNull(),
    role: varchar("role", { length: 8 }).$type<MemberRole>().notNull().default("member"),
    leftAt: ts("left_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("members_group_idx").on(t.groupId),
    index("members_user_idx").on(t.userId),
    uniqueIndex("members_group_user_uq")
      .on(t.groupId, t.userId)
      .where(sql`${t.userId} is not null`),
  ],
);

// ─── Expenses ──────────────────────────────────────────────────────────────

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 140 }).notNull(),
    amount: money("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    /** Group-currency units per one unit of `currency`, frozen when saved. "1" if the same. */
    fxRate: numeric("fx_rate", { precision: 30, scale: 12 }).notNull().default("1"),
    groupAmount: money("group_amount_minor").notNull(),
    category: varchar("category", { length: 32 }).notNull().default("general"),
    date: date("date", { mode: "string" }).notNull(),
    notes: text("notes"),
    /** The full split as entered, so it can be edited later exactly as it was. */
    split: jsonb("split").notNull(),
    /** Set when this expense was created by a recurring rule. */
    recurringRuleId: uuid("recurring_rule_id"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("expenses_group_date_idx").on(t.groupId, t.date, t.createdAt)],
);

/** One row per person involved in an expense: what they paid and what they owe. */
export const expenseLines = pgTable(
  "expense_lines",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    paid: money("paid_minor").notNull(),
    owed: money("owed_minor").notNull(),
    paidGroup: money("paid_group_minor").notNull(),
    owedGroup: money("owed_group_minor").notNull(),
  },
  (t) => [primaryKey({ columns: [t.expenseId, t.memberId] }), index("expense_lines_member_idx").on(t.memberId)],
);

// ─── Settlements ───────────────────────────────────────────────────────────

export const SETTLEMENT_METHODS = ["cash", "bank", "app", "other"] as const;
export type SettlementMethod = (typeof SETTLEMENT_METHODS)[number];

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromMemberId: uuid("from_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    toMemberId: uuid("to_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    amount: money("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    fxRate: numeric("fx_rate", { precision: 30, scale: 12 }).notNull().default("1"),
    groupAmount: money("group_amount_minor").notNull(),
    method: varchar("method", { length: 8 }).$type<SettlementMethod>().notNull().default("cash"),
    note: varchar("note", { length: 280 }),
    date: date("date", { mode: "string" }).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("settlements_group_idx").on(t.groupId, t.date)],
);

// ─── Activity ──────────────────────────────────────────────────────────────

/**
 * Structured events (type + data), not English sentences, so every client
 * can render them in the viewer's language. Also the edit history.
 */
export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorMemberId: uuid("actor_member_id").references(() => members.id, { onDelete: "set null" }),
    type: varchar("type", { length: 40 }).notNull(),
    entityId: uuid("entity_id"),
    data: jsonb("data").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("activity_group_created_idx").on(t.groupId, t.createdAt),
    index("activity_entity_idx").on(t.entityId),
  ],
);

// ─── Exchange rates ────────────────────────────────────────────────────────

/** Daily rates: units of `quote` per one unit of `base`. */
export const fxRates = pgTable(
  "fx_rates",
  {
    base: varchar("base", { length: 3 }).notNull(),
    quote: varchar("quote", { length: 3 }).notNull(),
    asOf: date("as_of", { mode: "string" }).notNull(),
    rate: numeric("rate", { precision: 30, scale: 12 }).notNull(),
    source: varchar("source", { length: 32 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote, t.asOf] })],
);

// ─── Payment handles ───────────────────────────────────────────────────────

export const PAYMENT_KINDS = [
  "upi",
  "paypal",
  "venmo",
  "cashapp",
  "revolut",
  "monzo",
  "wise",
  "iban",
  "bank",
  "raast",
  "jazzcash",
  "easypaisa",
  "other",
] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

/**
 * How someone likes to be paid. Shown only to people who share a group with
 * them, so a payer can open a pre-filled payment link or copy the details.
 * SettleMint never moves money itself.
 */
export const paymentHandles = pgTable(
  "payment_handles",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).$type<PaymentKind>().notNull(),
    value: varchar("value", { length: 120 }).notNull(),
    label: varchar("label", { length: 40 }),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("payment_handles_user_idx").on(t.userId)],
);

// ─── Recurring expenses ────────────────────────────────────────────────────

/**
 * A bill that repeats (rent, subscriptions). Occurrence dates are always
 * computed from `startDate` (no drift); `generated` counts occurrences made.
 * Each occurrence's expense id is derived from (rule, date), so generating
 * twice can never create a duplicate.
 */
export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    /** The expense to create each time (createExpenseBody without id/date). */
    template: jsonb("template").notNull(),
    frequency: varchar("frequency", { length: 8 }).$type<"weekly" | "monthly" | "yearly">().notNull(),
    interval: integer("interval").notNull().default(1),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    /** IANA zone used to decide which day it is for this bill (the creator's). */
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    generated: integer("generated").notNull().default(0),
    nextDate: date("next_date", { mode: "string" }).notNull(),
    active: boolean("active").notNull().default(true),
    /** Why it stopped by itself (e.g. someone on the bill left the group). */
    pausedReason: varchar("paused_reason", { length: 200 }),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("recurring_due_idx").on(t.active, t.nextDate), index("recurring_group_idx").on(t.groupId)],
);
