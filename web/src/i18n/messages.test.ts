import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import { LANGUAGES, type Language } from "./languages";
import ar from "./messages/ar";
import de from "./messages/de";
import en from "./messages/en";
import es from "./messages/es";
import fr from "./messages/fr";
import hi from "./messages/hi";
import pt from "./messages/pt";
import ur from "./messages/ur";
import { landingMessages } from "./landing";

const catalogs: Record<Language, unknown> = { en, es, pt, fr, de, hi, ur, ar };

type Tree = { [k: string]: string | Tree };
function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

/** Placeholders and rich tags a message uses, and the plural categories of each plural. */
function shape(elements: MessageFormatElement[], acc = { args: new Set<string>(), plurals: [] as Set<string>[] }) {
  for (const el of elements) {
    if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) {
      acc.args.add(el.value);
    } else if (el.type === TYPE.tag) {
      acc.args.add(`<${el.value}>`);
      shape(el.children, acc);
    } else if (el.type === TYPE.select || el.type === TYPE.plural) {
      acc.args.add(el.value);
      if (el.type === TYPE.plural) acc.plurals.push(new Set(Object.keys(el.options).filter((o) => !o.startsWith("="))));
      for (const option of Object.values(el.options)) shape(option.value, acc);
    }
  }
  return acc;
}

/** Plural categories a language really needs for counts people see (0–200). */
function neededCategories(lang: Language) {
  const rules = new Intl.PluralRules(lang);
  return new Set(Array.from({ length: 201 }, (_, n) => rules.select(n)));
}

const SETS = [
  { name: "app", source: en as unknown, catalogs },
  { name: "landing", source: landingMessages.en as unknown, catalogs: landingMessages as Record<Language, unknown> },
];
const sample = (name: string) =>
  /count|n$|expenses|payments|people|total|seconds/.test(name) ? 3 : name.startsWith("<") ? undefined : "x";

describe.each(SETS)("$name translations", ({ source, catalogs }) => {
  const english = flatten(source as Tree);

  it("covers every language in the picker", () => {
    expect(Object.keys(catalogs).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  for (const lang of Object.keys(catalogs) as Language[]) {
    describe(lang, () => {
      const messages = flatten(catalogs[lang] as Tree);

      it("has exactly the English keys", () => {
        expect([...messages.keys()].sort()).toEqual([...english.keys()].sort());
      });

      it("keeps every placeholder and tag, with complete plurals", () => {
        const needed = neededCategories(lang);
        const problems: string[] = [];
        for (const [key, source] of english) {
          const text = messages.get(key);
          if (text === undefined) continue;
          let mine;
          try {
            mine = shape(parse(text));
          } catch (err) {
            problems.push(`${key}: does not parse (${(err as Error).message})`);
            continue;
          }
          const theirs = shape(parse(source));
          const a = [...mine.args].sort().join(",");
          const b = [...theirs.args].sort().join(",");
          if (a !== b) problems.push(`${key}: placeholders [${a}] but English has [${b}]`);
          for (const cats of mine.plurals) {
            const missing = [...needed].filter((c) => !cats.has(c));
            if (missing.length) problems.push(`${key}: plural missing ${missing.join("/")}`);
          }
        }
        expect(problems).toEqual([]);
      });

      it("formats every message", () => {
        const problems: string[] = [];
        for (const [key, text] of messages) {
          const args = shape(parse(text)).args;
          const values: Record<string, unknown> = {};
          for (const name of args) {
            if (name.startsWith("<")) values[name.slice(1, -1)] = (chunks: unknown) => chunks;
            else values[name] = sample(name);
          }
          try {
            new IntlMessageFormat(text, lang).format(values);
          } catch (err) {
            problems.push(`${key}: ${(err as Error).message}`);
          }
        }
        expect(problems).toEqual([]);
      });
    });
  }
});
