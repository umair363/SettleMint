// Single source of truth for the backend base URL — previously hardcoded
// as "https://settlemint.onrender.com" in ~8 separate frontend files
// (several with a copy-pasted `X || X || default` redundancy).
export const DEFAULT_API_URL = "https://settlemint.onrender.com";

export function getApiUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return DEFAULT_API_URL;
}
