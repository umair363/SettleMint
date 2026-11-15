import { describe, expect, it } from "vitest";
import { buildPayAction, isValidIban, normalizePaymentHandle } from "./handles";

describe("normalizePaymentHandle", () => {
  it("accepts the ways people actually type their handles", () => {
    expect(normalizePaymentHandle("paypal", "https://paypal.me/AnaSouza")).toBe("AnaSouza");
    expect(normalizePaymentHandle("paypal", "@AnaSouza")).toBe("AnaSouza");
    expect(normalizePaymentHandle("venmo", "@ana-souza")).toBe("ana-souza");
    expect(normalizePaymentHandle("venmo", "venmo.com/u/ana-souza")).toBe("ana-souza");
    expect(normalizePaymentHandle("cashapp", "$AnaS")).toBe("AnaS");
    expect(normalizePaymentHandle("upi", "Ana.Souza@okhdfc")).toBe("ana.souza@okhdfc");
    expect(normalizePaymentHandle("revolut", "revolut.me/AnaS")).toBe("anas");
    expect(normalizePaymentHandle("monzo", "https://monzo.me/anasouza/")).toBe("anasouza");
    expect(normalizePaymentHandle("bank", "  HBL   0123  4567 ")).toBe("HBL 0123 4567");
  });

  it("rejects malformed handles", () => {
    expect(normalizePaymentHandle("upi", "not-a-vpa")).toBeNull();
    expect(normalizePaymentHandle("paypal", "has spaces")).toBeNull();
    expect(normalizePaymentHandle("cashapp", "$1abc")).toBeNull();
    expect(normalizePaymentHandle("iban", "GB00 1234")).toBeNull();
    expect(normalizePaymentHandle("other", "")).toBeNull();
  });

  it("checks IBAN checksums and formats them in groups of four", () => {
    expect(isValidIban("GB82 WEST 1234 5698 7654 32")).toBe(true);
    expect(isValidIban("GB82 WEST 1234 5698 7654 33")).toBe(false);
    expect(isValidIban("PK36SCBL0000001123456702")).toBe(true);
    expect(normalizePaymentHandle("iban", "gb82west12345698765432")).toBe("GB82 WEST 1234 5698 7654 32");
  });
});

describe("buildPayAction", () => {
  it("pre-fills the amount where the service supports the currency", () => {
    expect(buildPayAction({ kind: "paypal", value: "AnaSouza" }, { amount: 4250, currency: "EUR" }).url).toBe(
      "https://paypal.me/AnaSouza/42.50EUR",
    );
    const upi = new URL(
      buildPayAction({ kind: "upi", value: "ana@okhdfc" }, { amount: 50000, currency: "INR", payeeName: "Ana", note: "Goa trip" }).url!,
    );
    expect(upi.protocol).toBe("upi:");
    expect(Object.fromEntries(upi.searchParams)).toEqual({ pa: "ana@okhdfc", pn: "Ana", am: "500.00", cu: "INR", tn: "Goa trip" });
    expect(buildPayAction({ kind: "monzo", value: "ana" }, { amount: 1999, currency: "GBP" }).url).toBe("https://monzo.me/ana/19.99");
    expect(buildPayAction({ kind: "cashapp", value: "AnaS" }, { amount: 1000, currency: "USD" }).url).toBe("https://cash.app/$AnaS/10.00");
  });

  it("leaves the amount out when the service can't take that currency", () => {
    const venmo = buildPayAction({ kind: "venmo", value: "ana" }, { amount: 1000, currency: "EUR" });
    expect(venmo.amountIncluded).toBe(false);
    expect(venmo.url).toBe("https://venmo.com/ana?txn=pay");
    const upi = buildPayAction({ kind: "upi", value: "ana@okhdfc" }, { amount: 1000, currency: "USD" });
    expect(upi.amountIncluded).toBe(false);
    expect(new URL(upi.url!).searchParams.has("am")).toBe(false);
  });

  it("offers details to copy for bank-style methods", () => {
    expect(buildPayAction({ kind: "iban", value: "GB82 WEST 1234 5698 7654 32" }, { amount: 1, currency: "GBP" })).toEqual({
      kind: "iban",
      label: "IBAN",
      copy: "GB82 WEST 1234 5698 7654 32",
      amountIncluded: false,
    });
  });
});
