/**
 * Stable error codes so clients can show translated messages instead of
 * relying on English error text.
 */
export type MoneyErrorCode =
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

export class MoneyError extends Error {
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.name = "MoneyError";
    this.code = code;
  }
}
