import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

/**
 * The data cache lives in IndexedDB, so the app opens instantly with what
 * was last seen: offline, or while a free-tier server is waking up.
 * Queued (offline) expenses and payments are saved with it.
 */
export const persister = createAsyncStoragePersister({
  key: "sm-cache",
  throttleTime: 1000,
  storage:
    typeof window === "undefined"
      ? undefined
      : {
          getItem: (k: string) => get<string>(k).then((v) => v ?? null),
          setItem: (k: string, v: string) => set(k, v),
          removeItem: (k: string) => del(k),
        },
});

/** Change when cached data shapes change, so old caches are dropped. */
export const CACHE_BUSTER = "v1-2026-11";
