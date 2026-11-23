/**
 * Understand an expense typed like a message: "Dinner 45 with Sam and Ana".
 * Pulls out the amount, the people who share it and what's left as the
 * description. Pure text work; the form decides what to do with the result.
 */
export interface QuickAdd {
  description: string;
  /** The number as typed, e.g. "45" or "45.50". */
  amount: string;
  /** Names of group members mentioned after "with", as written in the group. */
  people: string[];
}

/** Words that introduce the people sharing the cost. */
const BEFORE_NAMES = new Set(["with", "con", "com", "avec", "mit", "مع"]);
/** Languages where the word follows the name ("Sam के साथ"). */
const AFTER_NAMES = [["के", "साथ"], ["کے", "ساتھ"]];
const JOINERS = new Set(["and", "&", "y", "e", "et", "und", "و", "और", "اور", ","]);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const CURRENCY_SYMBOL = /^[$€£¥₹]+|[$€£¥₹]+$/g;

function numberOf(token: string): string | null {
  const t = token.replace(CURRENCY_SYMBOL, "");
  return /^\d+(?:[.,]\d{1,2})?$/.test(t) ? t.replace(",", ".") : null;
}

export function parseQuickAdd(text: string, memberNames: string[]): QuickAdd | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  const amountAt = tokens.findIndex((t) => numberOf(t) !== null);
  if (amountAt < 0) return null;
  const amount = numberOf(tokens[amountAt])!;

  // Everything that isn't the amount or the "with …" clause is the description.
  const used = new Set<number>([amountAt]);
  const wanted: string[] = [];

  const matchName = (raw: string) => {
    const cleaned = fold(raw.replace(/[,.;]+$/g, ""));
    if (!cleaned) return;
    const hit = memberNames.find((n) => fold(n) === cleaned) ?? memberNames.find((n) => fold(n).startsWith(cleaned) && cleaned.length >= 2);
    if (hit && !wanted.includes(hit)) wanted.push(hit);
  };

  const beforeAt = tokens.findIndex((t, i) => i !== amountAt && BEFORE_NAMES.has(fold(t)));
  if (beforeAt >= 0) {
    used.add(beforeAt);
    for (let i = beforeAt + 1; i < tokens.length; i++) {
      if (i === amountAt) continue;
      if (JOINERS.has(fold(tokens[i]))) {
        used.add(i);
        continue;
      }
      // A two-word name ("María José") is tried before its first word alone.
      const pair = i + 1 < tokens.length && i + 1 !== amountAt ? `${tokens[i]} ${tokens[i + 1]}` : "";
      const full = pair ? memberNames.find((n) => fold(n) === fold(pair.replace(/[,.;]+$/g, ""))) : undefined;
      if (full) {
        if (!wanted.includes(full)) wanted.push(full);
        used.add(i);
        used.add(i + 1);
        i++;
        continue;
      }
      const before = wanted.length;
      for (const part of tokens[i].split(",")) matchName(part);
      if (wanted.length > before || memberNames.some((n) => fold(n) === fold(tokens[i]))) used.add(i);
      else break; // not a name: the clause is over
    }
  } else {
    for (const [a, b] of AFTER_NAMES) {
      const at = tokens.findIndex((t, i) => i > 0 && t === a && tokens[i + 1] === b);
      if (at > 0) {
        used.add(at);
        used.add(at + 1);
        // Names sit before the phrase: walk back over names and joiners.
        for (let i = at - 1; i >= 0; i--) {
          if (i === amountAt) continue;
          if (JOINERS.has(fold(tokens[i]))) {
            used.add(i);
            continue;
          }
          const before = wanted.length;
          matchName(tokens[i]);
          if (wanted.length > before) used.add(i);
          else break;
        }
      }
    }
  }

  const description = tokens
    .filter((_, i) => !used.has(i))
    .join(" ")
    .replace(/[,\s]+$/g, "")
    .trim();
  const nice = description ? description[0].toLocaleUpperCase() + description.slice(1) : "";
  return { description: nice, amount, people: wanted };
}
