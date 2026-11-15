export const RECURRENCE_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

function parse(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function fmt(y: number, m: number, d: number) {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * The date of the n-th occurrence (n = 0 is the start), always computed from
 * the start date so it never drifts: a monthly bill on the 31st falls on the
 * last day of shorter months and returns to the 31st afterwards.
 */
export function occurrenceDate(startIso: string, frequency: RecurrenceFrequency, interval: number, n: number): string {
  const { y, m, d } = parse(startIso);
  if (frequency === "weekly") {
    const t = Date.UTC(y, m - 1, d) + n * interval * 7 * 86_400_000;
    const date = new Date(t);
    return fmt(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const monthsToAdd = frequency === "monthly" ? n * interval : n * interval * 12;
  const total = y * 12 + (m - 1) + monthsToAdd;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmt(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Today's date (YYYY-MM-DD) in an IANA time zone; falls back to UTC for unknown zones. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** All occurrence dates from index `fromN` up to and including `untilIso`, at most `limit`. */
export function dueOccurrences(
  startIso: string,
  frequency: RecurrenceFrequency,
  interval: number,
  fromN: number,
  untilIso: string,
  opts: { endIso?: string | null; limit?: number } = {},
): { n: number; date: string }[] {
  const out: { n: number; date: string }[] = [];
  const limit = opts.limit ?? 60;
  for (let n = fromN; out.length < limit; n++) {
    const date = occurrenceDate(startIso, frequency, interval, n);
    if (date > untilIso || (opts.endIso && date > opts.endIso)) break;
    out.push({ n, date });
  }
  return out;
}
