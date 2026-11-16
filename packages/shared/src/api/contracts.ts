import { z } from "zod";
import { isValidMinor } from "../money/amount";
import { isCurrencyCode } from "../money/currencies";
import { isValidRate } from "../money/fx";
import { normalizePaymentHandle, PAYMENT_KIND_VALUES } from "../payments/handles";
import { isTimeZone, RECURRENCE_FREQUENCIES } from "../recurrence/recurrence";

// Request bodies for the v1 API. The API validates with these and the web and
// mobile clients build requests from the inferred types, so they cannot drift.

export const zId = z.uuid();
export const zCurrency = z.string().refine(isCurrencyCode, { message: "Unknown currency" });
export const zMinor = z.number().int().refine(isValidMinor, { message: "Invalid amount" });
export const zPositiveMinor = zMinor.refine((v) => v > 0, { message: "Must be greater than zero" });
export const zRate = z.string().refine(isValidRate, { message: "Invalid exchange rate" });
export const zDate = z.iso.date();
const zName = (max: number) => z.string().trim().min(1).max(max);

/** "direct" is a two-person group: splitting with one friend. */
export const GROUP_TYPE_VALUES = ["trip", "home", "couple", "event", "other", "direct"] as const;
export const SETTLEMENT_METHOD_VALUES = ["cash", "bank", "app", "other"] as const;

// ─── Splits ────────────────────────────────────────────────────────────────

const zWeight = z.number().finite().min(0).max(1_000_000);

export const zSplitSpec = z.discriminatedUnion("method", [
  z.object({ method: z.literal("equal"), memberIds: z.array(zId).min(1).max(200) }),
  z.object({
    method: z.literal("exact"),
    entries: z.array(z.object({ memberId: zId, amount: zMinor })).min(1).max(200),
  }),
  z.object({
    method: z.literal("percent"),
    entries: z.array(z.object({ memberId: zId, percent: z.number().finite().min(0).max(100) })).min(1).max(200),
  }),
  z.object({
    method: z.literal("shares"),
    entries: z.array(z.object({ memberId: zId, shares: zWeight })).min(1).max(200),
  }),
  z.object({
    method: z.literal("adjustment"),
    entries: z.array(z.object({ memberId: zId, adjustment: zMinor })).min(1).max(200),
  }),
  z.object({
    method: z.literal("itemized"),
    items: z
      .array(
        z.object({
          amount: zPositiveMinor,
          memberIds: z.array(zId).min(1).max(200),
          weights: z.array(zWeight).optional(),
          label: z.string().trim().max(80).optional(),
        }),
      )
      .min(1)
      .max(300),
    extras: zMinor.optional(),
  }),
]);

export const zPayers = z.array(z.object({ memberId: zId, amount: zMinor })).min(1).max(50);

// ─── Groups and members ────────────────────────────────────────────────────

export const createGroupBody = z.object({
  id: zId.optional(),
  name: zName(100),
  currency: zCurrency,
  type: z.enum(GROUP_TYPE_VALUES).default("other"),
  emoji: z.string().max(16).optional(),
  color: z.string().max(16).optional(),
  simplifyDebts: z.boolean().default(true),
  /** What to call the creator inside this group (defaults to their name). */
  myDisplayName: zName(60).optional(),
  /** People to add by name right away; they can claim their spot later. */
  people: z.array(z.object({ displayName: zName(60) })).max(50).default([]),
});

export const updateGroupBody = z.object({
  version: z.number().int().positive(),
  name: zName(100).optional(),
  currency: zCurrency.optional(),
  type: z.enum(GROUP_TYPE_VALUES).optional(),
  emoji: z.string().max(16).nullable().optional(),
  color: z.string().max(16).nullable().optional(),
  simplifyDebts: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const addMemberBody = z.object({ id: zId.optional(), displayName: zName(60) });
export const updateMemberBody = z.object({ displayName: zName(60) });
export const joinInviteBody = z.object({
  /** Claim an existing spot that was added by name. */
  memberId: zId.optional(),
  displayName: zName(60).optional(),
});

// ─── Expenses ──────────────────────────────────────────────────────────────

const expenseFields = {
  description: zName(140),
  amount: zPositiveMinor,
  currency: zCurrency,
  /** Group-currency units per one unit of `currency`. Required when they differ, unless the server has a rate. */
  fxRate: zRate.optional(),
  date: zDate,
  category: z.string().trim().min(1).max(32).default("general"),
  notes: z.string().trim().max(2000).nullable().optional(),
  payers: zPayers,
  split: zSplitSpec,
};

export const createExpenseBody = z.object({ id: zId.optional(), ...expenseFields });
export const updateExpenseBody = z.object({ version: z.number().int().positive(), ...expenseFields });

// ─── Recurring expenses ────────────────────────────────────────────────────

const { date: _date, ...templateFields } = expenseFields;

export const createRecurringBody = z
  .object({
    id: zId.optional(),
    /** The expense to add each time. */
    template: z.object(templateFields),
    frequency: z.enum(RECURRENCE_FREQUENCIES),
    interval: z.number().int().min(1).max(12).default(1),
    /** First occurrence (today or in the past creates one straight away). */
    startDate: zDate,
    endDate: zDate.nullable().optional(),
    /** The creator's IANA time zone: decides which day is "today" for this bill. */
    timezone: z.string().max(64).refine(isTimeZone, { message: "Unknown time zone" }).default("UTC"),
  })
  .refine((r) => !r.endDate || r.endDate >= r.startDate, { message: "The end date is before the start", path: ["endDate"] });

// ─── Settlements ───────────────────────────────────────────────────────────

const settlementFields = {
  fromMemberId: zId,
  toMemberId: zId,
  amount: zPositiveMinor,
  currency: zCurrency,
  fxRate: zRate.optional(),
  method: z.enum(SETTLEMENT_METHOD_VALUES).default("cash"),
  note: z.string().trim().max(280).nullable().optional(),
  date: zDate,
};

export const createSettlementBody = z
  .object({ id: zId.optional(), ...settlementFields })
  .refine((s) => s.fromMemberId !== s.toMemberId, { message: "Payer and recipient must differ", path: ["toMemberId"] });
export const updateSettlementBody = z
  .object({ version: z.number().int().positive(), ...settlementFields })
  .refine((s) => s.fromMemberId !== s.toMemberId, { message: "Payer and recipient must differ", path: ["toMemberId"] });

// ─── Me ────────────────────────────────────────────────────────────────────

export const updateMeBody = z.object({
  name: zName(60).optional(),
  defaultCurrency: zCurrency.nullable().optional(),
  locale: z.string().trim().min(2).max(35).nullable().optional(),
});

export const zPaymentHandle = z
  .object({
    kind: z.enum(PAYMENT_KIND_VALUES),
    value: z.string().trim().min(1).max(120),
    label: z.string().trim().max(40).nullable().optional(),
  })
  .refine((h) => normalizePaymentHandle(h.kind, h.value) !== null, {
    message: "That doesn't look right for this payment method",
    path: ["value"],
  });

/** Replace the whole list (order = preference). */
export const putPaymentHandlesBody = z.object({ handles: z.array(zPaymentHandle).max(10) });

/** Typed confirmation, so an account can't be deleted by accident. */
export const deleteAccountBody = z.object({ confirm: z.literal("DELETE") });

/** A receipt photo (base64, no data: prefix), downscaled by the client. */
export const scanReceiptBody = z.object({
  image: z.string().min(100).max(4_500_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  /** Used when the receipt doesn't show its currency. */
  currency: zCurrency.optional(),
});

export const searchQuery = z.object({ q: z.string().trim().min(1).max(100) });

export const pageQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type CreateGroupBody = z.input<typeof createGroupBody>;
export type UpdateGroupBody = z.input<typeof updateGroupBody>;
export type AddMemberBody = z.input<typeof addMemberBody>;
export type JoinInviteBody = z.input<typeof joinInviteBody>;
export type CreateExpenseBody = z.input<typeof createExpenseBody>;
export type UpdateExpenseBody = z.input<typeof updateExpenseBody>;
export type CreateRecurringBody = z.input<typeof createRecurringBody>;
export type CreateSettlementBody = z.input<typeof createSettlementBody>;
export type UpdateSettlementBody = z.input<typeof updateSettlementBody>;
export type UpdateMeBody = z.input<typeof updateMeBody>;
export type PaymentHandleInput = z.input<typeof zPaymentHandle>;
