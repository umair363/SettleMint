import { z } from "zod";
import { CATEGORY_IDS, WALLET_IDS } from "./categories";
import { SPLIT_TYPES } from "./splitTypes";

// ─── Primitives ─────────────────────────────────────────────────────────────

export const currencyCode = z
  .string()
  .trim()
  .length(3)
  .transform((v) => v.toUpperCase());

// Positive, finite, at most 2 decimal places, capped to a sane upper bound
// to reject fat-fingered / abusive amounts (e.g. 1e30).
export const money = z
  .number()
  .finite()
  .positive()
  .max(100_000_000)
  .refine((v) => Math.round(v * 100) === v * 100, {
    message: "Amount must have at most 2 decimal places",
  });

// Some flows (e.g. income of exactly 0 is nonsensical, but a $0 line item
// should still be rejected — 0 is not a valid transaction amount).
export const nonNegativeMoney = money;

export const isoDateString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Invalid date",
});

// ─── Auth ───────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  fullName: z.string().trim().min(1).max(255),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().length(6),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(200),
});

// ─── Expenses (group splitting) ─────────────────────────────────────────────

export const splitParticipantSchema = z.object({
  userId: z.string().uuid(),
  value: z.number().finite().nonnegative().optional(),
});

export const createExpenseSchema = z.object({
  groupId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1).max(500),
  amount: money,
  category: z.enum(CATEGORY_IDS).optional(),
  notes: z.string().max(2000).optional().nullable(),
  currency: currencyCode.optional(),
  paidBy: z.string().uuid().optional(),
  date: isoDateString.optional(),
  splitType: z.enum(SPLIT_TYPES),
  participants: z.array(splitParticipantSchema).min(1),
});

// ─── Personal budget tracker ────────────────────────────────────────────────

export const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export const createTransactionSchema = z.object({
  amount: money,
  type: z.enum(["expense", "income"]).default("expense"),
  category: z.enum(CATEGORY_IDS),
  description: z.string().trim().min(1).max(500),
  wallet: z.enum(WALLET_IDS).default("card"),
  currency: currencyCode.optional(),
  date: isoDateString.optional(),
  notes: z.string().max(2000).optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(RECURRING_FREQUENCIES).optional(),
}).refine((data) => !data.isRecurring || !!data.recurringFrequency, {
  message: "recurringFrequency is required when isRecurring is true",
  path: ["recurringFrequency"],
});

export const budgetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  category: z.enum(CATEGORY_IDS).optional(),
  type: z.enum(["expense", "income"]).optional(),
});

export const upsertBudgetSchema = z.object({
  category: z.enum(CATEGORY_IDS),
  limitAmount: money,
  currency: currencyCode.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

// ─── AI ─────────────────────────────────────────────────────────────────────

export const mintBotParseSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

// 6MB base64 ceiling — keeps real phone photos working while still
// bounding request size (base64 inflates payload ~33% over raw bytes).
export const receiptScanSchema = z.object({
  imageBase64: z.string().min(1).max(8_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]).default("image/jpeg"),
});
