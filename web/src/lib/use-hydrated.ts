import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while React is hydrating the static HTML, true afterwards.
 *
 * Next hydrates page content inside Suspense boundaries that can finish after
 * the providers above them. By then the data cache may already have been
 * restored from the device, so a screen that renders cached data straight away
 * would no longer match the static HTML (React error #418). Screens that read
 * the restored cache render their static form until this turns true.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
