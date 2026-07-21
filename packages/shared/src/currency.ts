// Static fallback rates — used only if a live-rate fetch is unavailable.
// NOTE: production should replace this with a live FX rate provider
// (see Track A follow-up); these are approximate, point-in-time values.
const STATIC_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  PKR: 278.0,
  INR: 83.0,
  CAD: 1.37,
  AUD: 1.51,
  AED: 3.67,
  SAR: 3.75,
  THB: 36.5,
  SGD: 1.35,
  JPY: 157.0,
  CNY: 7.25,
  CHF: 0.9,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "Rs",
  INR: "₹",
  CAD: "$",
  AUD: "$",
  AED: "د.إ",
  SAR: "﷼",
  THB: "฿",
  SGD: "$",
  JPY: "¥",
  CNY: "¥",
  CHF: "Fr",
};

export const SUPPORTED_CURRENCIES = Object.keys(STATIC_RATES) as [string, ...string[]];

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code?.toUpperCase()] || "$";
}

export function convertCurrency(amount: number, from: string, to: string): number {
  const cleanFrom = from.toUpperCase();
  const cleanTo = to.toUpperCase();

  if (cleanFrom === cleanTo) return amount;

  const fromRate = STATIC_RATES[cleanFrom];
  const toRate = STATIC_RATES[cleanTo];

  if (!fromRate || !toRate) return amount;

  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}
