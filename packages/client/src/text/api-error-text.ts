import { ApiError } from "@settlemint/shared";
import { tr } from "../i18n/runtime";

/** Error codes with their own translated sentence (others fall back to a generic one). */
const KNOWN = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VERSION_CONFLICT",
  "FX_RATE_REQUIRED",
  "MEMBER_NOT_IN_GROUP",
  "MEMBER_HAS_BALANCE",
  "ALREADY_CLAIMED",
  "RATE_LIMITED",
  "AI_UNAVAILABLE",
  "AI_QUOTA",
  "AI_FAILED",
  "PUSH_UNAVAILABLE",
] as const;
type KnownCode = (typeof KNOWN)[number];

/**
 * A sentence for an API failure in the viewer's language. The server's own
 * message is English and is only used when nothing better is known.
 */
export function apiErrorText(err: unknown): string {
  const t = tr();
  if (!(err instanceof ApiError)) return t("errors.generic");
  if (err.isNetwork) return t("errors.network");
  if ((KNOWN as readonly string[]).includes(err.code)) return t(`errors.code.${err.code as KnownCode}`);
  return t("errors.generic");
}
