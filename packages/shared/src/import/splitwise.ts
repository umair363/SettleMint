import { allocate } from "../money/allocate";
import { decimalStringToMinor } from "../money/amount";
import { currencyExponent, isCurrencyCode } from "../money/currencies";

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export interface SplitwiseRow {
  line: number;
  date: string;
  description: string;
  category: string;
  currency: string;
  /** Total cost in minor units. */
  cost: number;
  /** Net effect on each person's balance, minor units (positive = owed to them). */
  nets: number[];
  isPayment: boolean;
}

export interface SplitwiseExport {
  people: string[];
  rows: SplitwiseRow[];
  /** Rows that couldn't be read, with the reason (1-based line numbers). */
  problems: { line: number; reason: string }[];
}

const norm = (s: string) => s.trim().toLowerCase();

/** "2024-03-05", "2024/03/05", "05/03/2024" (day first) -> "2024-03-05", or null. */
function parseDate(s: string): string | null {
  const t = s.trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Amount text as exported ("12.50", "-3", "1,234.56") in minor units, or null. */
function parseAmount(s: string, currency: string): number | null {
  const t = s.trim().replace(/,/g, "");
  if (t === "") return 0;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  try {
    return decimalStringToMinor(t, currency);
  } catch {
    // More decimals than the currency has (e.g. "10.005"): round to its minor unit.
    return Math.round(Number(t) * 10 ** currencyExponent(currency));
  }
}

/**
 * Read a Splitwise group export ("Date, Description, Category, Cost,
 * Currency, <one column per person>"). Each person column is that row's net
 * effect on their balance. The trailing "Total balance" row is skipped.
 */
export function parseSplitwiseExport(text: string): SplitwiseExport {
  const table = parseCsv(text);
  const headerIndex = table.findIndex((r) => r.map(norm).includes("date") && r.map(norm).includes("cost"));
  if (headerIndex === -1) {
    return { people: [], rows: [], problems: [{ line: 1, reason: "This doesn't look like a Splitwise export (no Date and Cost columns)" }] };
  }
  const header = table[headerIndex].map((h) => h.trim());
  const col = (name: string) => header.findIndex((h) => norm(h) === name);
  const [iDate, iDesc, iCat, iCost, iCur] = ["date", "description", "category", "cost", "currency"].map(col);
  const fixed = new Set([iDate, iDesc, iCat, iCost, iCur].filter((i) => i >= 0));
  const personCols = header.map((_, i) => i).filter((i) => !fixed.has(i) && header[i] !== "");
  const people = personCols.map((i) => header[i]);

  const rows: SplitwiseRow[] = [];
  const problems: SplitwiseExport["problems"] = [];
  table.slice(headerIndex + 1).forEach((r, k) => {
    const line = headerIndex + k + 2;
    const description = (r[iDesc] ?? "").trim();
    if (/^total balance$/i.test(description) || (r[iDate] ?? "").trim() === "") return;
    const date = parseDate(r[iDate] ?? "");
    if (!date) return problems.push({ line, reason: `Unreadable date "${r[iDate]}"` });
    const currency = (r[iCur] ?? "").trim().toUpperCase();
    if (!isCurrencyCode(currency)) return problems.push({ line, reason: `Unknown currency "${r[iCur]}"` });
    const cost = parseAmount(r[iCost] ?? "", currency);
    const nets = personCols.map((i) => parseAmount(r[i] ?? "", currency));
    if (cost === null || nets.some((n) => n === null)) return problems.push({ line, reason: "Unreadable amount" });
    const n = nets as number[];
    // Exported nets are rounded; make them add up to exactly zero.
    const drift = n.reduce((a, b) => a + b, 0);
    if (Math.abs(drift) > n.length) return problems.push({ line, reason: "The amounts don't add up" });
    if (drift !== 0) {
      const biggest = n.reduce((best, v, i) => (Math.abs(v) > Math.abs(n[best]) ? i : best), 0);
      n[biggest] -= drift;
    }
    if (n.every((v) => v === 0)) return;
    const category = (r[iCat] ?? "").trim();
    rows.push({ line, date, description: description || category || "Expense", category, currency, cost: Math.abs(cost as number), nets: n, isPayment: /^payment$/i.test(category) });
  });
  return { people, rows, problems };
}

export interface ReconstructedExpense {
  payers: { index: number; amount: number }[];
  owed: { index: number; amount: number }[];
  total: number;
}

/**
 * Turn one row's net effects back into "who paid" and "who owes", so that
 * every person's paid - owed equals their net exactly (balances come out
 * right). The people who came out ahead are the ones who paid: for the
 * usual single-payer expense this reproduces it exactly ("Ana paid 300,
 * owes her 100 share"). Their own shares aren't in the export, so the rest
 * of the cost is spread across them in proportion to what they were owed.
 */
export function reconstructExpense(cost: number, nets: number[]): ReconstructedExpense {
  const creditors = nets.map((n, i) => ({ n, i })).filter((x) => x.n > 0);
  const debtors = nets.map((n, i) => ({ n, i })).filter((x) => x.n < 0);
  const positive = creditors.reduce((s, x) => s + x.n, 0);
  const total = Math.max(cost, positive);
  const ownShares = creditors.length ? allocate(total - positive, creditors.map((c) => c.n)) : [];
  const payers = creditors.map((c, k) => ({ index: c.i, amount: c.n + ownShares[k] }));
  const owed = [
    ...creditors.map((c, k) => ({ index: c.i, amount: ownShares[k] })),
    ...debtors.map((d) => ({ index: d.i, amount: -d.n })),
  ].filter((o) => o.amount > 0);
  return { payers, owed, total };
}
