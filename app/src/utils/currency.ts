// Re-exported from the shared package so both api and app consume one
// canonical currency table — this file is kept only so existing
// `@/utils/currency` imports across the app don't need to change.
export { getCurrencySymbol, convertCurrency, SUPPORTED_CURRENCIES } from "@settlemint/shared";
