/**
 * Tiny seeded random generator for property tests (mulberry32).
 * Deterministic, so a failing case can be reproduced from its seed.
 */
export function createRandom(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)];
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);
  return { next, int, pick, ids };
}

/** Run `check` for `runs` seeds; the seed is in the error if one fails. */
export function forAll(runs: number, check: (rnd: ReturnType<typeof createRandom>, seed: number) => void) {
  for (let seed = 1; seed <= runs; seed++) {
    try {
      check(createRandom(seed), seed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Property failed for seed ${seed}: ${message}`);
    }
  }
}
