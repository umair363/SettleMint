"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_URL } from "@/lib/env";
import { invalidateGroup } from "@settlemint/client/data/queries";

/**
 * Listen for changes other people make in your groups and refresh just that
 * group. The browser reconnects by itself if the stream drops (the server
 * asks it to retry after 5 s); your own changes are already on screen.
 */
export function useLiveUpdates(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    const source = new EventSource(`${API_URL}/v1/events`, { withCredentials: true });
    const onGroup = (e: MessageEvent<string>) => {
      try {
        const { groupId, byMe } = JSON.parse(e.data) as { groupId: string; byMe: boolean };
        if (!byMe) void invalidateGroup(qc, groupId);
      } catch {
        // Ignore malformed events.
      }
    };
    source.addEventListener("group", onGroup as EventListener);
    return () => {
      source.removeEventListener("group", onGroup as EventListener);
      source.close();
    };
  }, [enabled, qc]);
}
