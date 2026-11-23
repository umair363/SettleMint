import type { SplitSpec } from "../splits/split";

// Response shapes of the v1 API. Amounts are integer minor units.

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VERSION_CONFLICT"
  | "FX_RATE_REQUIRED"
  | "MEMBER_NOT_IN_GROUP"
  | "MEMBER_HAS_BALANCE"
  | "ALREADY_CLAIMED"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "AI_QUOTA"
  | "AI_FAILED"
  | "PUSH_UNAVAILABLE"
  | "INTERNAL"
  // Money engine codes (see MoneyErrorCode)
  | "INVALID_AMOUNT"
  | "UNKNOWN_CURRENCY"
  | "INVALID_RATE"
  | "INVALID_WEIGHT"
  | "ZERO_TOTAL_WEIGHT"
  | "NO_PARTICIPANTS"
  | "DUPLICATE_MEMBER"
  | "EXACT_SUM_MISMATCH"
  | "PERCENT_SUM_MISMATCH"
  | "ITEMS_SUM_MISMATCH"
  | "PAYERS_SUM_MISMATCH"
  | "NEGATIVE_SHARE";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

export interface Me {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  isGuest: boolean;
  defaultCurrency: string | null;
  locale: string | null;
}

export interface PaymentHandleDto {
  id: string;
  kind: import("../payments/handles").PaymentKind;
  value: string;
  label: string | null;
}

/** Something deleted in the last 30 days that can still be brought back. */
export interface TrashItemDto {
  kind: "group" | "expense" | "payment";
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  amount: number | null;
  currency: string | null;
  deletedAt: string;
  /** Only a group's owner can bring a whole group back. */
  canRestore: boolean;
}

export interface SearchResultDto {
  groups: { id: string; name: string; emoji: string | null; type: string }[];
  expenses: {
    id: string;
    groupId: string;
    groupName: string;
    description: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
  }[];
}

export interface MemberDto {
  id: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  userId: string | null;
  image: string | null;
  isMe: boolean;
  /** Joined the app, as opposed to added by name. */
  claimed: boolean;
  left: boolean;
  /** How this person likes to be paid (only for people who joined). */
  paymentHandles: PaymentHandleDto[];
}

export interface TransferDto {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface GroupSummaryDto {
  id: string;
  name: string;
  currency: string;
  type: string;
  emoji: string | null;
  color: string | null;
  memberCount: number;
  /** Your net position in the group currency: positive means you are owed. */
  myBalance: number;
  archived: boolean;
  lastActivityAt: string;
  version: number;
}

export interface GroupDetailDto extends Omit<GroupSummaryDto, "memberCount"> {
  simplifyDebts: boolean;
  myMemberId: string;
  members: MemberDto[];
  balances: Record<string, number>;
  /** Payments that settle everyone (simplified or pairwise per group setting). */
  transfers: TransferDto[];
  totalSpent: number;
}

export interface ExpenseLineDto {
  memberId: string;
  paid: number;
  owed: number;
  paidGroup: number;
  owedGroup: number;
}

export interface ExpenseDto {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  fxRate: string;
  groupAmount: number;
  category: string;
  date: string;
  notes: string | null;
  split: SplitSpec;
  lines: ExpenseLineDto[];
  createdByUserId: string | null;
  /** Set when a recurring bill created this expense. */
  recurringRuleId: string | null;
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What a receipt photo was read as. Amounts in minor units of `currency`. */
export interface ReceiptScanDto {
  merchant: string | null;
  date: string | null;
  currency: string;
  total: number;
  items: { label: string; amount: number }[];
  /** Tax + tip + service - discounts: total minus the items. */
  extras: number;
  /** Scans left this month. */
  scansLeft: number;
}

export interface ImportResultDto {
  groupId: string;
  expenses: number;
  payments: number;
  /** Rows not imported, with why (1-based line numbers in the file). */
  skipped: { line: number; reason: string }[];
}

export interface RecurringRuleDto {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  frequency: "weekly" | "monthly" | "yearly";
  interval: number;
  startDate: string;
  endDate: string | null;
  nextDate: string;
  active: boolean;
  pausedReason: string | null;
}

export interface SettlementDto {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  fxRate: string;
  groupAmount: number;
  method: "cash" | "bank" | "app" | "other";
  note: string | null;
  date: string;
  version: number;
  deleted: boolean;
  createdAt: string;
}

export interface ActivityDto {
  id: string;
  groupId: string;
  groupName: string;
  groupEmoji: string | null;
  /** The viewer's own member id in this group, so clients can say "you". */
  viewerMemberId: string | null;
  type: string;
  entityId: string | null;
  actorMemberId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  /** Event details, e.g. { description, amount, currency } or { fromName, toName, ... }. */
  data: Record<string, unknown>;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface InvitePreviewDto {
  group: { id: string; name: string; emoji: string | null; currency: string; memberCount: number };
  /** Spots added by name that a newcomer can claim. */
  openSpots: { id: string; displayName: string }[];
  alreadyMember: boolean;
}
