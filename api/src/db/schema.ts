import { pgTable, uuid, text, timestamp, numeric, varchar, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Users ---
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  defaultCurrency: varchar("default_currency", { length: 3 }).default("USD").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  otpCode: varchar("otp_code", { length: 6 }),
  otpExpiresAt: timestamp("otp_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("users_email_idx").on(t.email),
]);

// --- Groups ---
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  baseCurrency: varchar("base_currency", { length: 3 }).default("USD").notNull(),
  mode: varchar("mode", { length: 50 }).notNull(), // 'Trip', 'Roommate', 'Couple'
  emoji: varchar("emoji", { length: 10 }),
  color: varchar("color", { length: 7 }),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  inviteToken: varchar("invite_token", { length: 64 }),
  inviteExpiresAt: timestamp("invite_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("groups_created_by_idx").on(t.createdBy),
  uniqueIndex("groups_invite_token_idx").on(t.inviteToken),
]);

// --- Group Members ---
export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  role: varchar("role", { length: 50 }).default("member").notNull(), // 'admin', 'member'
}, (t) => [
  index("group_members_group_id_idx").on(t.groupId),
  index("group_members_user_id_idx").on(t.userId),
  uniqueIndex("group_members_group_user_idx").on(t.groupId, t.userId),
]);

// --- Expenses ---
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  paidBy: uuid("paid_by").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("expenses_group_id_idx").on(t.groupId),
  index("expenses_paid_by_idx").on(t.paidBy),
  index("expenses_date_idx").on(t.date),
]);

// --- Expense Splits ---
export const expenseSplits = pgTable("expense_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  amountOwed: numeric("amount_owed", { precision: 12, scale: 2 }).notNull(),
  isSettled: boolean("is_settled").default(false).notNull(),
}, (t) => [
  index("expense_splits_expense_id_idx").on(t.expenseId),
  index("expense_splits_user_id_idx").on(t.userId),
]);

// --- Settlements (Payments) ---
export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }), // Can be null if out of group
  paidBy: uuid("paid_by").references(() => users.id).notNull(),
  paidTo: uuid("paid_to").references(() => users.id).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  method: varchar("method", { length: 50 }).notNull(), // 'cash', 'transfer', 'app'
  notes: text("notes"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("settlements_group_id_idx").on(t.groupId),
  index("settlements_paid_by_idx").on(t.paidBy),
  index("settlements_paid_to_idx").on(t.paidTo),
]);

// --- Relations Definitions ---
export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  expensesPaid: many(expenses),
  splits: many(expenseSplits),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, { fields: [groups.createdBy], references: [users.id] }),
  members: many(groupMembers),
  expenses: many(expenses),
  settlements: many(settlements),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  payer: one(users, { fields: [expenses.paidBy], references: [users.id] }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  user: one(users, { fields: [expenseSplits.userId], references: [users.id] }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  group: one(groups, { fields: [settlements.groupId], references: [groups.id] }),
  payer: one(users, { fields: [settlements.paidBy], references: [users.id] }),
  receiver: one(users, { fields: [settlements.paidTo], references: [users.id] }),
}));

// --- Friendships ---
export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  user1Id: uuid("user1_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  user2Id: uuid("user2_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 50 }).default("accepted").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("friendships_user1_id_idx").on(t.user1Id),
  index("friendships_user2_id_idx").on(t.user2Id),
]);

// --- Activity Logs ---
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("activity_logs_group_id_idx").on(t.groupId),
]);

// --- Notifications ---
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("notifications_user_id_idx").on(t.userId),
  index("notifications_is_read_idx").on(t.isRead),
]);

// ─── Personal Budget Tracker ─────────────────────────────────────────────────

// --- Personal Transactions ---
export const personalTransactions = pgTable("personal_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: varchar("type", { length: 10 }).default("expense").notNull(), // 'expense' | 'income'
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  wallet: varchar("wallet", { length: 50 }).default("card").notNull(), // 'cash' | 'bank' | 'card'
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringFrequency: varchar("recurring_frequency", { length: 20 }), // 'daily'|'weekly'|'monthly'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("personal_txn_user_id_idx").on(t.userId),
  index("personal_txn_date_idx").on(t.date),
  index("personal_txn_type_idx").on(t.type),
]);

// --- Budget Goals ---
export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  month: numeric("month", { precision: 2, scale: 0 }).notNull(), // 1-12
  year: numeric("year", { precision: 4, scale: 0 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("budgets_user_id_idx").on(t.userId),
  index("budgets_month_year_idx").on(t.month, t.year),
]);

// --- Budget Tracker Relations ---
export const personalTransactionsRelations = relations(personalTransactions, ({ one }) => ({
  user: one(users, { fields: [personalTransactions.userId], references: [users.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
}));

