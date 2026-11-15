import type { Transfer } from "./balances";

/**
 * Up to this many people with a non-zero balance, simplification is exact
 * (provably the fewest payments). The search is O(2^n * n): about 1M steps
 * at 16 people, which takes a few milliseconds.
 */
export const EXACT_SIMPLIFY_LIMIT = 16;

interface Entry {
  id: string;
  amount: number;
}

/** Largest debtor pays largest creditor until everyone is even. */
function greedySettle(entries: readonly Entry[]): Transfer[] {
  const debtors = entries.filter((e) => e.amount < 0).map((e) => ({ id: e.id, left: -e.amount }));
  const creditors = entries.filter((e) => e.amount > 0).map((e) => ({ id: e.id, left: e.amount }));
  const byLeft = (x: { id: string; left: number }, y: { id: string; left: number }) =>
    y.left - x.left || x.id.localeCompare(y.id);

  const out: Transfer[] = [];
  debtors.sort(byLeft);
  creditors.sort(byLeft);
  while (debtors.length > 0 && creditors.length > 0) {
    const d = debtors[0];
    const c = creditors[0];
    const amount = Math.min(d.left, c.left);
    out.push({ from: d.id, to: c.id, amount });
    d.left -= amount;
    c.left -= amount;
    if (d.left === 0) debtors.shift();
    if (c.left === 0) creditors.shift();
    debtors.sort(byLeft);
    creditors.sort(byLeft);
  }
  return out;
}

/**
 * Split people into the largest possible number of groups whose balances
 * each add up to zero. Every such group of k people can settle with k-1
 * payments, so more groups means fewer payments overall; this is the exact
 * optimum for "fewest payments".
 */
function zeroSumPartition(entries: readonly Entry[]): Entry[][] {
  const n = entries.length;
  const size = 1 << n;
  const sum = new Float64Array(size);
  const best = new Int8Array(size);
  for (let mask = 1; mask < size; mask++) {
    const low = mask & -mask;
    const i = 31 - Math.clz32(low);
    sum[mask] = sum[mask ^ low] + entries[i].amount;
    let b = 0;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) {
        const v = best[mask ^ (1 << j)];
        if (v > b) b = v;
      }
    }
    best[mask] = b + (sum[mask] === 0 ? 1 : 0);
  }

  // Walk back from the full set, removing one person at a time along an
  // optimal path; the removal order, reversed, closes a group each time the
  // running sum returns to zero.
  const removal: number[] = [];
  let mask = size - 1;
  while (mask) {
    let pick = -1;
    let pickVal = -1;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) {
        const v = best[mask ^ (1 << j)];
        if (v > pickVal) {
          pickVal = v;
          pick = j;
        }
      }
    }
    removal.push(pick);
    mask ^= 1 << pick;
  }

  const groups: Entry[][] = [];
  let current: Entry[] = [];
  let running = 0;
  for (const idx of removal.reverse()) {
    current.push(entries[idx]);
    running += entries[idx].amount;
    if (running === 0) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

/**
 * Turn net balances into a list of payments that settles everyone.
 * Never changes what anyone is owed in total; only who pays whom.
 *
 * - Up to EXACT_SIMPLIFY_LIMIT people with non-zero balances: the fewest
 *   possible payments.
 * - Larger groups: exact matches first (A owes exactly what B is owed), then
 *   largest-to-largest, which is near-optimal in practice.
 */
export function simplifyDebts(balances: ReadonlyMap<string, number>): Transfer[] {
  const entries: Entry[] = [...balances.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (entries.length === 0) return [];
  const total = entries.reduce((a, e) => a + e.amount, 0);
  if (total !== 0) {
    throw new Error(`Balances must add up to zero (got ${total})`);
  }

  let out: Transfer[];
  if (entries.length <= EXACT_SIMPLIFY_LIMIT) {
    out = zeroSumPartition(entries).flatMap(greedySettle);
  } else {
    out = [];
    const remaining = new Map(entries.map((e) => [e.id, e.amount]));
    const creditorsByAmount = new Map<number, string[]>();
    for (const e of entries) {
      if (e.amount > 0) {
        const list = creditorsByAmount.get(e.amount) ?? [];
        list.push(e.id);
        creditorsByAmount.set(e.amount, list);
      }
    }
    for (const e of entries) {
      if (e.amount >= 0) continue;
      const match = creditorsByAmount.get(-e.amount);
      const to = match?.shift();
      if (to) {
        out.push({ from: e.id, to, amount: -e.amount });
        remaining.set(e.id, 0);
        remaining.set(to, 0);
      }
    }
    out.push(...greedySettle([...remaining].map(([id, amount]) => ({ id, amount }))));
  }

  return out.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from) || x.to.localeCompare(y.to));
}
