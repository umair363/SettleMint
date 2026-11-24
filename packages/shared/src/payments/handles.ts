import { minorToDecimalString } from "../money/amount";
import { QR_MAX_LENGTH } from "./qr";

/**
 * Ways someone can be paid. SettleMint never moves money: it opens the
 * payee's own payment app with the amount filled in where that app supports
 * it, or offers their details to copy.
 */
export const PAYMENT_KIND_VALUES = [
  "upi",
  "paypal",
  "venmo",
  "cashapp",
  "revolut",
  "monzo",
  "wise",
  "iban",
  "bank",
  "raast",
  "jazzcash",
  "easypaisa",
  "sadapay",
  "nayapay",
  "qr",
  "other",
] as const;
export type PaymentKind = (typeof PAYMENT_KIND_VALUES)[number];

export interface PaymentKindInfo {
  label: string;
  /** Hint shown in the input. */
  placeholder: string;
  /** Currencies whose amount the link can pre-fill; empty means "any". */
  amountCurrencies?: string[];
  /** Opens an app/site, as opposed to details to copy. */
  linkable: boolean;
}

export const PAYMENT_KINDS: Record<PaymentKind, PaymentKindInfo> = {
  upi: { label: "UPI", placeholder: "name@bank", amountCurrencies: ["INR"], linkable: true },
  paypal: { label: "PayPal", placeholder: "paypal.me username", amountCurrencies: [], linkable: true },
  venmo: { label: "Venmo", placeholder: "@username", amountCurrencies: ["USD"], linkable: true },
  cashapp: { label: "Cash App", placeholder: "$cashtag", amountCurrencies: ["USD", "GBP"], linkable: true },
  revolut: { label: "Revolut", placeholder: "revolut.me username", linkable: true },
  monzo: { label: "Monzo", placeholder: "monzo.me username", amountCurrencies: ["GBP"], linkable: true },
  wise: { label: "Wise", placeholder: "Wisetag", linkable: true },
  iban: { label: "IBAN", placeholder: "GB33 BUKB 2020 1555 5555 55", linkable: false },
  bank: { label: "Bank account", placeholder: "Bank, account number, sort code…", linkable: false },
  raast: { label: "Raast", placeholder: "Raast ID or phone", linkable: false },
  jazzcash: { label: "JazzCash", placeholder: "03xx xxxxxxx", linkable: false },
  easypaisa: { label: "Easypaisa", placeholder: "03xx xxxxxxx", linkable: false },
  sadapay: { label: "SadaPay", placeholder: "PK IBAN or 03xx xxxxxxx", linkable: false },
  nayapay: { label: "NayaPay", placeholder: "PK IBAN or 03xx xxxxxxx", linkable: false },
  /** The QR code a bank or wallet app made for them: stored as its text, redrawn on demand. */
  qr: { label: "QR code", placeholder: "", linkable: false },
  other: { label: "Other", placeholder: "How to pay you", linkable: false },
};

/** ISO 13616 mod-97 check. */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

const stripUrl = (v: string, hosts: string[]) => {
  let s = v.trim();
  for (const h of hosts) {
    const i = s.toLowerCase().indexOf(h);
    if (i !== -1) s = s.slice(i + h.length);
  }
  return s.replace(/^\/+|\/+$/g, "").split(/[/?#]/)[0];
};

/**
 * Clean up what someone typed into the canonical stored value, or null if
 * it isn't valid for that kind ("@ana" -> "ana", "paypal.me/Ana" -> "Ana").
 */
export function normalizePaymentHandle(kind: PaymentKind, raw: string): string | null {
  const v = raw.trim();
  if (!v || v.length > (kind === "qr" ? QR_MAX_LENGTH : 120)) return null;
  switch (kind) {
    case "qr":
      // Any text a QR can hold, exactly as scanned: banks check it, so it is never reflowed.
      return /[\u0000-\u001f\u007f]/.test(v) ? null : v;
    case "upi":
      return /^[\w.-]{2,64}@[a-zA-Z][\w.-]{1,64}$/.test(v) ? v.toLowerCase() : null;
    case "paypal": {
      const u = stripUrl(v, ["paypal.me/", "paypal.com/paypalme/"]).replace(/^@/, "");
      return /^[A-Za-z0-9]{1,20}$/.test(u) ? u : null;
    }
    case "venmo": {
      const u = stripUrl(v, ["venmo.com/u/", "venmo.com/"]).replace(/^@/, "");
      return /^[A-Za-z0-9_-]{2,30}$/.test(u) ? u : null;
    }
    case "cashapp": {
      const u = stripUrl(v, ["cash.app/"]).replace(/^\$/, "");
      return /^[A-Za-z][A-Za-z0-9]{0,19}$/.test(u) ? u : null;
    }
    case "revolut": {
      const u = stripUrl(v, ["revolut.me/"]).replace(/^@/, "");
      return /^[A-Za-z0-9_.-]{2,40}$/.test(u) ? u.toLowerCase() : null;
    }
    case "monzo": {
      const u = stripUrl(v, ["monzo.me/"]);
      return /^[A-Za-z0-9_.-]{1,40}$/.test(u) ? u.toLowerCase() : null;
    }
    case "wise": {
      const u = stripUrl(v, ["wise.com/pay/me/"]).replace(/^@/, "");
      return /^[A-Za-z0-9_.-]{2,40}$/.test(u) ? u.toLowerCase() : null;
    }
    case "iban": {
      if (!isValidIban(v)) return null;
      return v.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
    }
    default:
      // Free-form details (bank, wallets, other): keep as typed, single line.
      return v.replace(/\s+/g, " ");
  }
}

export interface PayAction {
  kind: PaymentKind;
  label: string;
  /** Link to open (payment app or site), when the method has one. */
  url?: string;
  /** Text to copy, for methods without a link. */
  copy?: string;
  /** The text inside a saved QR code, to draw it. */
  qr?: string;
  /** True when the link pre-fills the amount. */
  amountIncluded: boolean;
}

/**
 * Build what the payer taps: a link with the amount pre-filled where the
 * service supports this currency, otherwise a plain profile link or the
 * details to copy.
 */
export function buildPayAction(
  handle: { kind: PaymentKind; value: string; label?: string | null },
  opts: { amount: number; currency: string; note?: string; payeeName?: string },
): PayAction {
  const info = PAYMENT_KINDS[handle.kind];
  const allowed = info.amountCurrencies;
  const withAmount = Boolean(allowed && (allowed.length === 0 || allowed.includes(opts.currency)) && opts.amount > 0);
  const amount = minorToDecimalString(opts.amount, opts.currency);
  const note = opts.note?.slice(0, 80) ?? "";
  const enc = encodeURIComponent;
  const v = handle.value;
  const base = { kind: handle.kind, label: (handle.kind === "qr" && handle.label?.trim()) || info.label, amountIncluded: withAmount };

  switch (handle.kind) {
    case "upi": {
      const params = new URLSearchParams({ pa: v });
      if (opts.payeeName) params.set("pn", opts.payeeName);
      if (withAmount) {
        params.set("am", amount);
        params.set("cu", "INR");
      }
      if (note) params.set("tn", note);
      return { ...base, url: `upi://pay?${params.toString()}` };
    }
    case "paypal":
      return { ...base, url: `https://paypal.me/${enc(v)}${withAmount ? `/${amount}${opts.currency}` : ""}` };
    case "venmo": {
      const params = new URLSearchParams({ txn: "pay" });
      if (withAmount) params.set("amount", amount);
      if (note) params.set("note", note);
      return { ...base, url: `https://venmo.com/${enc(v)}?${params.toString()}` };
    }
    case "cashapp":
      return { ...base, url: `https://cash.app/$${enc(v)}${withAmount ? `/${amount}` : ""}` };
    case "revolut":
      return { ...base, url: `https://revolut.me/${enc(v)}` };
    case "monzo":
      return {
        ...base,
        url: `https://monzo.me/${enc(v)}${withAmount ? `/${amount}` : ""}${note ? `?d=${enc(note)}` : ""}`,
      };
    case "wise":
      return { ...base, url: `https://wise.com/pay/me/${enc(v)}` };
    case "qr":
      return { ...base, qr: v };
    default:
      return { ...base, copy: v };
  }
}
