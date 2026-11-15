import {
  computeShares,
  minorToDecimalString,
  MoneyError,
  parseMoneyInput,
  type MemberAmount,
  type SplitSpec,
} from "@settlemint/shared";

export type EditableMethod = "equal" | "exact" | "percent" | "shares" | "adjustment";

/** What the split editor holds while the person types. */
export interface SplitDraft {
  method: EditableMethod;
  /** People included (equal and adjustment). */
  included: string[];
  /** Raw text per person for exact / percent / shares / adjustment. */
  values: Record<string, string>;
}

/**
 * Minor units as text a person would type in their locale ("12,50" in
 * German). Exact, and always read back correctly by parseMoneyInput.
 */
export function minorToInputText(minor: number, currency: string, locale: string): string {
  const dec = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".";
  return minorToDecimalString(minor, currency).replace(".", dec);
}

export function equalDraft(memberIds: string[]): SplitDraft {
  return { method: "equal", included: memberIds, values: {} };
}

/** Rebuild an editable draft from a saved split. */
export function draftFromSpec(spec: SplitSpec, currency: string, locale: string): SplitDraft {
  const fmt = (minor: number) => minorToInputText(minor, currency, locale);
  switch (spec.method) {
    case "equal":
      return { method: "equal", included: spec.memberIds, values: {} };
    case "exact":
      return {
        method: "exact",
        included: spec.entries.map((e) => e.memberId),
        values: Object.fromEntries(spec.entries.map((e) => [e.memberId, fmt(e.amount)])),
      };
    case "percent":
      return {
        method: "percent",
        included: spec.entries.map((e) => e.memberId),
        values: Object.fromEntries(spec.entries.map((e) => [e.memberId, String(e.percent)])),
      };
    case "shares":
      return {
        method: "shares",
        included: spec.entries.map((e) => e.memberId),
        values: Object.fromEntries(spec.entries.map((e) => [e.memberId, String(e.shares)])),
      };
    case "adjustment":
      return {
        method: "adjustment",
        included: spec.entries.map((e) => e.memberId),
        values: Object.fromEntries(spec.entries.map((e) => [e.memberId, e.adjustment ? fmt(e.adjustment) : ""])),
      };
    case "itemized": {
      const ids = [...new Set(spec.items.flatMap((i) => i.memberIds))];
      return equalDraft(ids);
    }
  }
}

function parseNumber(text: string | undefined): number {
  if (!text) return 0;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Turn the draft into the API's split, keeping the group's member order. */
export function specFromDraft(draft: SplitDraft, memberOrder: string[], currency: string, locale: string): SplitSpec {
  const ordered = memberOrder.filter((id) => draft.method === "equal" || draft.method === "adjustment"
    ? draft.included.includes(id)
    : true);
  switch (draft.method) {
    case "equal":
      return { method: "equal", memberIds: ordered };
    case "adjustment":
      return {
        method: "adjustment",
        entries: ordered.map((memberId) => ({
          memberId,
          adjustment: parseMoneyInput(draft.values[memberId] ?? "", currency, locale) ?? 0,
        })),
      };
    case "exact":
      return {
        method: "exact",
        entries: ordered
          .map((memberId) => ({ memberId, amount: parseMoneyInput(draft.values[memberId] ?? "", currency, locale) ?? 0 }))
          .filter((e) => e.amount > 0),
      };
    case "percent":
      return {
        method: "percent",
        entries: ordered
          .map((memberId) => ({ memberId, percent: parseNumber(draft.values[memberId]) }))
          .filter((e) => e.percent > 0 || Number.isNaN(e.percent)),
      };
    case "shares":
      return {
        method: "shares",
        entries: ordered
          .map((memberId) => ({ memberId, shares: parseNumber(draft.values[memberId]) }))
          .filter((e) => e.shares > 0 || Number.isNaN(e.shares)),
      };
  }
}

export interface SplitPreview {
  shares: MemberAmount[] | null;
  /** Plain-language problem, or null when the split works. */
  problem: string | null;
  /** For exact amounts: how much is still unassigned (negative = too much). */
  remaining?: number;
  /** For percent: what the percentages add up to. */
  percentTotal?: number;
}

/** Run the shared money engine on the draft; this is exactly what the server will save. */
export function previewSplit(total: number, spec: SplitSpec): SplitPreview {
  const remaining =
    spec.method === "exact" ? total - spec.entries.reduce((s, e) => s + e.amount, 0) : undefined;
  const percentTotal =
    spec.method === "percent" ? Math.round(spec.entries.reduce((s, e) => s + e.percent, 0) * 1000) / 1000 : undefined;

  if (total <= 0) return { shares: null, problem: null, remaining, percentTotal };
  try {
    return { shares: computeShares(total, spec), problem: null, remaining, percentTotal };
  } catch (err) {
    if (!(err instanceof MoneyError)) throw err;
    const problem: Record<string, string> = {
      NO_PARTICIPANTS: "Pick at least one person to split with",
      EXACT_SUM_MISMATCH: "The amounts need to add up to the total",
      PERCENT_SUM_MISMATCH: "Percentages need to add up to 100%",
      ZERO_TOTAL_WEIGHT: "Give at least one person a share",
      INVALID_WEIGHT: "Shares must be numbers",
      NEGATIVE_SHARE: "Adjustments are bigger than the total",
      DUPLICATE_MEMBER: "Someone appears twice",
    };
    return { shares: null, problem: problem[err.code] ?? err.message, remaining, percentTotal };
  }
}

export const METHOD_LABEL: Record<EditableMethod, string> = {
  equal: "Equally",
  exact: "Amounts",
  percent: "Percent",
  shares: "Shares",
  adjustment: "Adjust",
};
