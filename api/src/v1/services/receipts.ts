import { currencyExponent, isCurrencyCode, MAX_AMOUNT_MINOR } from "@settlemint/shared";
import { z } from "zod";

/**
 * Reads a receipt photo. Swappable: Gemini today, any vision model later, a
 * fake in tests. Implementations return the model's raw reading; everything
 * is validated and converted to exact minor units by `normalizeReceipt`.
 */
export interface ReceiptReader {
  read(image: { data: string; mimeType: string }): Promise<unknown>;
}

const num = z.union([z.number(), z.string()]).transform((v) => (typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""))));

const rawReceipt = z.object({
  merchant: z.string().nullish(),
  date: z.string().nullish(),
  currency: z.string().nullish(),
  total: num.nullish(),
  tax: num.nullish(),
  tip: num.nullish(),
  items: z
    .array(z.object({ name: z.string().nullish(), quantity: num.nullish(), price: num.nullish() }))
    .nullish(),
});

export class ReceiptReadError extends Error {}

/** Validate what the model said and turn it into exact minor units. */
export function normalizeReceipt(raw: unknown, fallbackCurrency: string, today: string) {
  const parsed = rawReceipt.safeParse(raw);
  if (!parsed.success) throw new ReceiptReadError("The receipt couldn't be read");
  const r = parsed.data;

  const code = (r.currency ?? "").trim().toUpperCase();
  const currency = isCurrencyCode(code) ? code : fallbackCurrency;
  const factor = 10 ** currencyExponent(currency);
  const minor = (v: number | null | undefined) =>
    v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * factor);

  const items = (r.items ?? [])
    .map((i) => ({
      label: (i.name ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || "Item",
      amount: minor(i.price) ?? 0,
    }))
    .filter((i) => i.amount > 0 && i.amount <= MAX_AMOUNT_MINOR)
    .slice(0, 100);
  const itemsSum = items.reduce((s, i) => s + i.amount, 0);

  let total = minor(r.total);
  if (!total || total <= 0) total = itemsSum + (minor(r.tax) ?? 0) + (minor(r.tip) ?? 0);
  if (!total || total <= 0 || total > MAX_AMOUNT_MINOR) throw new ReceiptReadError("No total found on the receipt");

  const date = r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date <= today ? r.date : null;
  return {
    merchant: r.merchant?.replace(/\s+/g, " ").trim().slice(0, 80) || null,
    date,
    currency,
    total,
    items,
    // Whatever isn't in the items (tax, tip, service, discounts) is spread by
    // what each person ordered. Items that don't add up stay explicit.
    extras: items.length ? total - itemsSum : 0,
  };
}

const PROMPT = `You read shop and restaurant receipts. Reply with JSON only:
{"merchant": string|null, "date": "YYYY-MM-DD"|null, "currency": ISO 4217 code|null,
 "total": number|null, "tax": number|null, "tip": number|null,
 "items": [{"name": string, "quantity": number|null, "price": number}]}
"price" is the line total (quantity already included), as printed. Use the amount
actually paid as "total". Don't invent items that aren't on the receipt.`;

/** Gemini vision through its REST API (no SDK, so nothing extra to install). */
export function geminiReceiptReader(apiKey: string, model = "gemini-2.5-flash"): ReceiptReader {
  return {
    async read(image) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: PROMPT }] },
          contents: [{ parts: [{ text: "Read this receipt." }, { inline_data: { mime_type: image.mimeType, data: image.data } }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0 },
        }),
      });
      if (!res.ok) throw new ReceiptReadError(`The AI service answered ${res.status}`);
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new ReceiptReadError("The AI returned nothing");
      try {
        return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      } catch {
        throw new ReceiptReadError("The AI reply wasn't readable");
      }
    },
  };
}

/** A fixed receipt, for local development and browser tests without an AI key. */
export const sampleReceiptReader: ReceiptReader = {
  async read() {
    return {
      merchant: "Time Out Market",
      date: null,
      currency: "USD",
      total: 61.6,
      tax: 5.6,
      items: [
        { name: "Burger", price: 18 },
        { name: "Pad thai", price: 16 },
        { name: "Lemonades", quantity: 2, price: 8 },
        { name: "Shared fries", price: 14 },
      ],
    };
  },
};
