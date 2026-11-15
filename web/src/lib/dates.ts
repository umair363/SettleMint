/** Today's date in the viewer's timezone as YYYY-MM-DD (what the API stores). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Today", "Yesterday", "Mon 10 Nov", or "10 Nov 2024" for older years. */
export function dayLabel(iso: string, locale: string): string {
  const date = parseIsoDate(iso);
  const today = parseIsoDate(todayIso());
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff === 0 || diff === 1) {
    const s = rtf.format(-diff, "day");
    return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: diff < 7 ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

/** "just now", "5 min ago", "3 days ago". */
export function timeAgo(isoDateTime: string, locale: string): string {
  const seconds = Math.round((new Date(isoDateTime).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const abs = Math.abs(seconds);
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(seconds / 86_400), "day");
  if (abs < 86_400 * 365) return rtf.format(Math.round(seconds / (86_400 * 30)), "month");
  return rtf.format(Math.round(seconds / (86_400 * 365)), "year");
}
