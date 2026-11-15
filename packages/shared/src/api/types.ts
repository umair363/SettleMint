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
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
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
  type: string;
  entityId: string | null;
  actorMemberId: string | null;
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
