/**
 * Has this password appeared in a known data breach? Advice only: the sign-up
 * screens show a gentle note and let people keep their choice.
 *
 * Uses the free Have I Been Pwned range lookup. Only the first 5 characters of
 * the password's SHA-1 hash leave the device, never the password. Any failure
 * (offline, blocked, slow) simply means "no note".
 */
export async function isPasswordBreached(password: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-1", bytes);
    const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      signal,
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return false;
    const suffix = hash.slice(5);
    for (const line of (await res.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}
