import { buildPayAction, isValidIban, normalizePaymentHandle, type PaymentKind } from "./handles";

/**
 * Making a QR code from details someone already entered, in formats banking
 * and payment apps read. Static codes only: they carry who to pay, never an
 * amount (the payer types that).
 */

/** CRC-16/CCITT-FALSE (poly 0x1021, start 0xFFFF), as the State Bank's QR standard uses. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const tlv = (tag: string, value: string) => tag + String(value.length).padStart(2, "0") + value;
const compactIban = (iban: string) => iban.replace(/\s+/g, "").toUpperCase();

/**
 * The State Bank of Pakistan's person-to-person QR (the one every bank and
 * wallet app in Pakistan reads, e.g. JazzCash's own "my QR"): a format flag,
 * "static", the 24-character IBAN, and a checksum. Checked against a real
 * JazzCash code, which this reproduces byte for byte from its IBAN.
 */
export function pakistanP2pQr(iban: string): string | null {
  const v = compactIban(iban);
  if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(v) || !isValidIban(v)) return null;
  const body = tlv("00", "02") + tlv("01", "11") + tlv("02", "00") + tlv("04", v) + "1004";
  return body + crc16(body);
}

/** Countries whose banks read the European "pay by QR" code (EPC), which is IBAN-based. */
const SEPA = new Set(
  "AD AT BE BG CH CY CZ DE DK EE ES FI FR GB GI GR HR HU IE IS IT LI LT LU LV MC MT NL NO PL PT RO SE SI SK SM VA".split(" "),
);

/** The European Payments Council's transfer QR: name and IBAN, no amount. */
export function epcQr(iban: string, name: string): string | null {
  const v = compactIban(iban);
  const holder = name.trim().replace(/\s+/g, " ").slice(0, 70);
  if (!holder || !SEPA.has(v.slice(0, 2)) || !isValidIban(v)) return null;
  return ["BCD", "002", "1", "SCT", "", holder, v].join("\n");
}

/** Kinds that have a standard QR of their own. */
const LINK_KINDS: readonly PaymentKind[] = ["upi", "paypal", "venmo", "cashapp", "revolut", "monzo", "wise"];
/**
 * Pakistani wallets and banks, where the field can hold a phone number or an IBAN. Their personal QR
 * is the State Bank's IBAN code, so a QR can be made whenever an IBAN is what was entered.
 */
const IBAN_HOLDER_KINDS: readonly PaymentKind[] = ["raast", "jazzcash", "easypaisa", "sadapay", "nayapay", "bank", "other"];

/** Kinds a QR might be made from (the value still has to be valid). */
export const QR_CREATABLE_KINDS: readonly PaymentKind[] = ["iban", ...LINK_KINDS, ...IBAN_HOLDER_KINDS];

export const canMakeQr = (kind: PaymentKind) => QR_CREATABLE_KINDS.includes(kind);

/**
 * The text for a QR made from a saved payment method, or null when this method
 * (or this particular value) has no QR format we can produce reliably.
 * `name` is the account holder's name, needed for European bank codes.
 */
export function makeQrText(handle: { kind: PaymentKind; value: string }, ctx: { name?: string } = {}): string | null {
  const value = normalizePaymentHandle(handle.kind, handle.value);
  if (!value || !canMakeQr(handle.kind)) return null;
  if (handle.kind === "iban") return pakistanP2pQr(value) ?? epcQr(value, ctx.name ?? "");
  // A wallet or bank where an IBAN was typed instead of a phone number: no IBAN, no QR.
  if (IBAN_HOLDER_KINDS.includes(handle.kind)) return pakistanP2pQr(value);
  if (handle.kind === "upi") {
    const params = new URLSearchParams({ pa: value, cu: "INR" });
    if (ctx.name?.trim()) params.set("pn", ctx.name.trim());
    return `upi://pay?${params.toString()}`;
  }
  // Payment links open in any phone camera: the same link the "pay" button uses, without an amount.
  return buildPayAction({ kind: handle.kind, value }, { amount: 0, currency: "USD" }).url ?? null;
}
