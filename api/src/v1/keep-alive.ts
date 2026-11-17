/**
 * Keeps a free Render instance awake by requesting its own public /health
 * URL on a timer. Render's free plan sleeps after 15 minutes without
 * inbound traffic; a request through the public URL counts as traffic.
 *
 * The ping hits /health, which must never touch the database: Neon's free
 * plan only scales to zero (and stays inside its monthly compute) when
 * nothing queries it.
 *
 * Enabled only when KEEP_ALIVE_URL is set, e.g.
 * KEEP_ALIVE_URL=https://settlemint.onrender.com/health
 */
export interface KeepAliveOptions {
  url: string;
  /** Default 10 minutes, safely under Render's 15-minute idle limit. */
  intervalMs?: number;
  /** Random +/- spread so pings don't land at exactly the same second. */
  jitterMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  log?: { warn: (msg: string) => void; info?: (msg: string) => void };
  random?: () => number;
}

export const DEFAULT_KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;

export function startKeepAlive(opts: KeepAliveOptions): () => void {
  const {
    url,
    intervalMs = DEFAULT_KEEP_ALIVE_INTERVAL_MS,
    jitterMs = 30_000,
    timeoutMs = 15_000,
    fetchImpl = fetch,
    log = console,
    random = Math.random,
  } = opts;

  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const ping = async () => {
    try {
      const res = await fetchImpl(url, {
        method: "GET",
        headers: { "user-agent": "settlemint-keepalive" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) log.warn(`keep-alive: ${url} answered ${res.status}`);
    } catch (err) {
      log.warn(`keep-alive: ${url} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const schedule = () => {
    if (stopped) return;
    const delay = Math.max(60_000, intervalMs + Math.round((random() * 2 - 1) * jitterMs));
    timer = setTimeout(async () => {
      await ping();
      schedule();
    }, delay);
    // Never keep the process alive just for this timer.
    timer.unref?.();
  };

  schedule();
  log.info?.(`keep-alive: pinging ${url} about every ${Math.round(intervalMs / 60_000)} min`);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

/** Start from environment variables; returns a stop function (no-op when disabled). */
export function startKeepAliveFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  log?: KeepAliveOptions["log"],
): () => void {
  const url = env.KEEP_ALIVE_URL?.trim();
  if (!url || env.NODE_ENV === "test") return () => {};
  const minutes = Number(env.KEEP_ALIVE_INTERVAL_MINUTES);
  return startKeepAlive({
    url,
    ...(Number.isFinite(minutes) && minutes >= 1 ? { intervalMs: minutes * 60_000 } : {}),
    ...(log ? { log } : {}),
  });
}
