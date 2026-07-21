// Canonical split-type casing. The money-math core (splitCalculator.ts)
// used UPPERCASE while the AI parser and frontend form used lowercase —
// that mismatch was a live integration bug. UPPERCASE wins because it's
// the casing the settlement math already ships with in the database layer.
export const SPLIT_TYPES = ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

// Lowercase aliases accepted from user input / AI output — normalize
// at the boundary instead of letting casing drift deeper into the app.
const ALIASES: Record<string, SplitType> = {
  equal: "EQUAL",
  unequal: "EXACT",
  exact: "EXACT",
  percentage: "PERCENTAGE",
  shares: "SHARES",
};

export function normalizeSplitType(value: string): SplitType | null {
  const upper = value.toUpperCase();
  if ((SPLIT_TYPES as readonly string[]).includes(upper)) return upper as SplitType;
  return ALIASES[value.toLowerCase()] ?? null;
}
