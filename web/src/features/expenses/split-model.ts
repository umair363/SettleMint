import {
  computeShares,
  minorToDecimalString,
  MoneyError,
  parseMoneyInput,
  type MemberAmount,
  type SplitSpec,
} from "@settlemint/shared";
import { tr } from "@settlemint/client/i18n/runtime";

export type EditableMethod = "equal" | "exact" | "percent" | "shares" | "adjustment" | "itemized";

/** One receipt line and who shared it. */
export interface DraftItem {
  key: string;
  label: string;
  amount: number;
  memberIds: string[];
}

/** What the split editor holds while the person types. */
export interface SplitDraft {
  method: EditableMethod;
  /** People included (equal and adjustment). */
  included: string[];
  /** Raw text per person for exact / percent / shares / adjustment. */
  values: Record<string, string>;
  /** Receipt lines (itemized). */
  items?: DraftItem[];
  /** Tax + tip + service - discounts (itemized), minor units. */
  extras?: number;
}

/** Draft from a scanned receipt: everyone shares every item until told otherwise. */
export function itemizedDraft(items: { label: string; amount: number }[], extras: number, memberIds: string[]): SplitDraft {
  return {
    method: "itemized",
    included: memberIds,
    values: {},
    items: items.map((it, i) => ({ key: `item-${i}`, label: it.label, amount: it.amount, memberIds })),
    extras,
  };
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
      return {
        method: "itemized",
        included: ids,
        values: {},
        items: spec.items.map((it, i) => ({ key: `item-${i}`, label: it.label ?? tr()("split.item", { n: i + 1 }), amount: it.amount, memberIds: it.memberIds })),
        extras: spec.extras ?? 0,
      };
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
    case "itemized":
      return {
        method: "itemized",
        items: (draft.items ?? []).map((it) => ({
          amount: it.amount,
          label: it.label,
          memberIds: memberOrder.filter((id) => it.memberIds.includes(id)),
        })),
        extras: draft.extras ?? 0,
      };
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

export const SPLIT_PROBLEMS = [
  "NO_PARTICIPANTS",
  "EXACT_SUM_MISMATCH",
  "PERCENT_SUM_MISMATCH",
  "ZERO_TOTAL_WEIGHT",
  "INVALID_WEIGHT",
  "NEGATIVE_SHARE",
  "ITEMS_SUM_MISMATCH",
  "DUPLICATE_MEMBER",
  "OTHER",
] as const;
export type SplitProblem = (typeof SPLIT_PROBLEMS)[number];

export interface SplitPreview {
  shares: MemberAmount[] | null;
  /** Why the split doesn't work (translated by the UI as split.problem.*), or null when it does. */
  problem: SplitProblem | null;
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
    const problem = (SPLIT_PROBLEMS as readonly string[]).includes(err.code) ? (err.code as SplitProblem) : "OTHER";
    return { shares: null, problem, remaining, percentTotal };
  }
}

/** Methods in the order the picker shows them (labels: split.method.*). */
export const EDITABLE_METHODS: readonly EditableMethod[] = ["equal", "exact", "percent", "shares", "adjustment", "itemized"];
