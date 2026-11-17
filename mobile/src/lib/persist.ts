import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The data cache is saved on the device, so the app opens instantly with what
 * was last seen: offline, or while a free-tier server is waking up. Queued
 * (offline) expenses and payments are saved with it.
 */
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "sm-cache",
  throttleTime: 1000,
});

/** Change when cached data shapes change, so old caches are dropped. */
export const CACHE_BUSTER = "v1-2026-11";
