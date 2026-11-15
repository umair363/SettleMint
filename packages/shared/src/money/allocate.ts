import { assertMinor } from "./amount";
import { MoneyError } from "./errors";

/** Weights are compared exactly after scaling to this many decimal places. */
const WEIGHT_DECIMALS = 6;
const WEIGHT_SCALE = 10 ** WEIGHT_DECIMALS;

function toScaledWeight(w: number): bigint {
  if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
    throw new MoneyError("INVALID_WEIGHT", "Weights must be finite and not negative");
  }
  const scaled = Math.round(w * WEIGHT_SCALE);
  if (!Number.isSafeInteger(scaled)) {
    throw new MoneyError("INVALID_WEIGHT", "Weight is too large");
  }
  return BigInt(scaled);
}

/**
 * Split an integer amount into integer parts proportional to `weights`,
 * so that the parts always add up to exactly `total`.
 *
 * Uses the largest-remainder method with exact integer arithmetic:
 * everyone gets the floor of their exact share, and the leftover minor units
 * go to the largest fractional remainders (ties go to the earlier entry, so
 * the result is deterministic). A zero weight always gets zero.
 *
 * Works for negative totals too (the parts are negated).
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  assertMinor(total, "total");
  if (weights.length === 0) {
    throw new MoneyError("NO_PARTICIPANTS", "Nothing to allocate to");
  }
  const scaled = weights.map(toScaledWeight);
  const sumW = scaled.reduce((a, b) => a + b, 0n);
  if (total === 0) return weights.map(() => 0);
  if (sumW === 0n) {
    throw new MoneyError("ZERO_TOTAL_WEIGHT", "Weights must not all be zero");
  }

  const negative = total < 0;
  const T = BigInt(Math.abs(total));
  const base: bigint[] = [];
  const rema: bigint[] = [];
  let assigned = 0n;
  for (const w of scaled) {
    const product = T * w;
    const q = product / sumW;
    base.push(q);
    rema.push(product % sumW);
    assigned += q;
  }

  let leftover = Number(T - assigned);
  const order = rema
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const { i } of order) {
    if (leftover === 0) break;
    base[i] += 1n;
    leftover--;
  }

  return base.map((b) => {
    const n = Number(b);
    return negative ? (n === 0 ? 0 : -n) : n;
  });
}

/** Split an amount into `count` near-equal integer parts that add up exactly. */
export function allocateEqually(total: number, count: number): number[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new MoneyError("NO_PARTICIPANTS", "Need at least one participant");
  }
  return allocate(total, new Array<number>(count).fill(1));
}
