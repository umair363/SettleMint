import { describe, expect, it } from "vitest";
import { canMakeQr, crc16, epcQr, makeQrText, pakistanP2pQr } from "./qr-formats";

// A well-known sample Pakistani IBAN (not anyone's real account).
const PK_IBAN = "PK36SCBL0000001123456702";

/** Splits an EMV-style payload into [tag, value] pairs. */
function fields(payload: string): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < payload.length; ) {
    const len = Number(payload.slice(i + 2, i + 4));
    out.push([payload.slice(i, i + 2), payload.slice(i + 4, i + 4 + len)]);
    i += 4 + len;
  }
  return out;
}

describe("Pakistan person-to-person QR", () => {
  it("has the State Bank's fields: format, static, the IBAN, and a checksum over everything before it", () => {
    const qr = pakistanP2pQr(PK_IBAN)!;
    expect(fields(qr).map(([t]) => t)).toEqual(["00", "01", "02", "04", "10"]);
    expect(Object.fromEntries(fields(qr))).toMatchObject({ "00": "02", "01": "11", "02": "00", "04": PK_IBAN });
    const body = qr.slice(0, -4);
    expect(body.endsWith("1004")).toBe(true);
    expect(qr.slice(-4)).toBe(crc16(body));
    expect(qr.length).toBe(54);
  });

  it("matches the standard CRC-16 test vector", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("accepts spaces and lower case, and refuses anything that isn't a valid Pakistani IBAN", () => {
    expect(pakistanP2pQr("pk36 scbl 0000 0011 2345 6702")).toBe(pakistanP2pQr(PK_IBAN));
    expect(pakistanP2pQr("PK36SCBL0000001123456703")).toBeNull(); // wrong check digits
    expect(pakistanP2pQr("PK36SCBL00000011234567")).toBeNull(); // too short
    expect(pakistanP2pQr("GB82WEST12345698765432")).toBeNull(); // not Pakistani
  });
});

describe("European bank QR", () => {
  it("writes the EPC lines: tag, version, UTF-8, SCT, (BIC), name, IBAN", () => {
    expect(epcQr("DE89 3704 0044 0532 0130 00", "Ana  Souza")).toBe(["BCD", "002", "1", "SCT", "", "Ana Souza", "DE89370400440532013000"].join("\n"));
  });
  it("needs a name and a SEPA IBAN", () => {
    expect(epcQr("DE89370400440532013000", " ")).toBeNull();
    expect(epcQr(PK_IBAN, "Ana")).toBeNull();
  });
});

describe("making a QR from a saved method", () => {
  it("uses the right format for each method", () => {
    expect(makeQrText({ kind: "iban", value: PK_IBAN })).toBe(pakistanP2pQr(PK_IBAN));
    expect(makeQrText({ kind: "iban", value: "DE89370400440532013000" }, { name: "Ana" })).toContain("BCD\n002");
    expect(makeQrText({ kind: "upi", value: "Ana@okhdfc" }, { name: "Ana Souza" })).toBe("upi://pay?pa=ana%40okhdfc&cu=INR&pn=Ana+Souza");
    expect(makeQrText({ kind: "paypal", value: "paypal.me/anasouza" })).toBe("https://paypal.me/anasouza");
    expect(makeQrText({ kind: "revolut", value: "@ana" })).toBe("https://revolut.me/ana");
  });
  it("makes a Pakistani QR from an IBAN typed into any wallet or bank, and nothing from a phone number", () => {
    for (const kind of ["raast", "jazzcash", "easypaisa", "sadapay", "nayapay", "bank", "other"] as const) {
      expect(canMakeQr(kind)).toBe(true);
      expect(makeQrText({ kind, value: PK_IBAN })).toBe(pakistanP2pQr(PK_IBAN));
      expect(makeQrText({ kind, value: "0300 1234567" })).toBeNull();
    }
    expect(canMakeQr("qr")).toBe(false);
    expect(makeQrText({ kind: "qr", value: PK_IBAN })).toBeNull();
  });

  it("makes nothing it can't make reliably", () => {
    expect(makeQrText({ kind: "iban", value: "not an iban" })).toBeNull();
    expect(makeQrText({ kind: "iban", value: "DE89370400440532013000" })).toBeNull(); // European code needs the holder's name
  });
});
