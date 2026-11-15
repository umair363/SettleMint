const EURO = ["AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];

const BY_REGION: Record<string, string> = {
  ...Object.fromEntries(EURO.map((r) => [r, "EUR"])),
  US: "USD", GB: "GBP", IN: "INR", PK: "PKR", BD: "BDT", LK: "LKR", NP: "NPR", AE: "AED", SA: "SAR", QA: "QAR",
  KW: "KWD", BH: "BHD", OM: "OMR", JO: "JOD", EG: "EGP", MA: "MAD", TR: "TRY", CA: "CAD", AU: "AUD", NZ: "NZD",
  JP: "JPY", KR: "KRW", CN: "CNY", HK: "HKD", TW: "TWD", SG: "SGD", MY: "MYR", ID: "IDR", PH: "PHP", TH: "THB",
  VN: "VND", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", UA: "UAH",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN", NG: "NGN", KE: "KES", GH: "GHS", ZA: "ZAR",
  IL: "ILS", RU: "RUB", KZ: "KZT", UZ: "UZS", IR: "IRR", IQ: "IQD",
};

/** Best guess at someone's home currency from their browser locale. */
export function guessCurrency(locale: string): string {
  try {
    const region = new Intl.Locale(locale).maximize().region;
    return (region && BY_REGION[region]) || "USD";
  } catch {
    return "USD";
  }
}
