import { afterEach, describe, expect, it, vi } from "vitest";
import { startKeepAlive, startKeepAliveFromEnv } from "./keepAlive";

afterEach(() => {
  vi.useRealTimers();
});

const quietLog = { warn: vi.fn(), info: vi.fn() };

describe("keep-alive", () => {
  it("pings the URL on the interval and keeps going after a failure", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    let fail = true;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      if (fail) {
        fail = false;
        throw new Error("network down");
      }
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    const stop = startKeepAlive({
      url: "https://api.example.com/health",
      intervalMs: 600_000,
      jitterMs: 0,
      fetchImpl,
      log: quietLog,
    });

    await vi.advanceTimersByTimeAsync(599_000);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(calls).toEqual(["https://api.example.com/health"]);
    expect(quietLog.warn).toHaveBeenCalledWith(expect.stringContaining("network down"));

    await vi.advanceTimersByTimeAsync(600_000);
    expect(calls).toHaveLength(2);

    stop();
    await vi.advanceTimersByTimeAsync(1_800_000);
    expect(calls).toHaveLength(2);
  });

  it("keeps every ping under Render's 15-minute idle limit even with jitter", async () => {
    vi.useFakeTimers();
    const times: number[] = [];
    const fetchImpl = (async () => {
      times.push(Date.now());
      return new Response("ok");
    }) as unknown as typeof fetch;
    const start = Date.now();
    const stop = startKeepAlive({ url: "https://x/health", fetchImpl, log: quietLog, random: () => 1 });
    await vi.advanceTimersByTimeAsync(3 * 60 * 60 * 1000);
    stop();
    expect(times.length).toBeGreaterThan(10);
    const gaps = times.map((t, i) => t - (i === 0 ? start : times[i - 1]));
    expect(Math.max(...gaps)).toBeLessThan(15 * 60 * 1000);
  });

  it("does nothing unless KEEP_ALIVE_URL is set", () => {
    const log = { warn: vi.fn(), info: vi.fn() };
    startKeepAliveFromEnv({ NODE_ENV: "production" }, log)();
    expect(log.info).not.toHaveBeenCalled();
    startKeepAliveFromEnv({ NODE_ENV: "production", KEEP_ALIVE_URL: "https://x/health" }, log)();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining("pinging https://x/health"));
  });
});
