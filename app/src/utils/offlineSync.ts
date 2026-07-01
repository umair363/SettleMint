const QUEUE_KEY = "settlemint_offline_queue";

export interface QueuedExpense {
  id: string;
  payload: any;
  timestamp: number;
}

export const offlineSync = {
  queueExpense: (payload: any) => {
    try {
      const queueStr = localStorage.getItem(QUEUE_KEY);
      const queue: QueuedExpense[] = queueStr ? JSON.parse(queueStr) : [];
      
      const newEntry: QueuedExpense = {
        id: crypto.randomUUID(),
        payload,
        timestamp: Date.now()
      };
      
      queue.push(newEntry);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      
      // Dispatch an event so the UI can update offline count
      window.dispatchEvent(new CustomEvent("offline-queue-updated"));
      
      return newEntry;
    } catch (err) {
      console.error("Failed to queue expense:", err);
      return null;
    }
  },

  getQueueCount: (): number => {
    if (typeof window === "undefined") return 0;
    try {
      const queueStr = localStorage.getItem(QUEUE_KEY);
      if (!queueStr) return 0;
      const queue = JSON.parse(queueStr);
      return Array.isArray(queue) ? queue.length : 0;
    } catch {
      return 0;
    }
  },

  syncAll: async (token: string) => {
    try {
      const queueStr = localStorage.getItem(QUEUE_KEY);
      if (!queueStr) return;
      
      const queue: QueuedExpense[] = JSON.parse(queueStr);
      if (!Array.isArray(queue) || queue.length === 0) return;

      console.log(`[Offline Sync] Attempting to sync ${queue.length} offline expenses...`);

      const remainingQueue: QueuedExpense[] = [];
      
      for (const item of queue) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}`"}/api/expenses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(item.payload),
          });

          if (!res.ok) {
            // If it's a 4xx error (e.g., bad request), don't retry, let it drop or move to a failed queue
            // If it's a 5xx error, we might want to retry later.
            if (res.status >= 500) {
              remainingQueue.push(item);
            } else {
              console.error(`[Offline Sync] Request failed permanently with status ${res.status}`, await res.text());
            }
          }
        } catch (fetchErr) {
          // Network error, keep in queue
          remainingQueue.push(item);
        }
      }

      localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
      window.dispatchEvent(new CustomEvent("offline-queue-updated"));
      
      if (remainingQueue.length < queue.length) {
        console.log(`[Offline Sync] Successfully synced ${queue.length - remainingQueue.length} expenses.`);
        // Notify dashboard to refresh data if needed
        window.dispatchEvent(new CustomEvent("expense-created"));
      }
    } catch (err) {
      console.error("Failed to sync offline queue:", err);
    }
  }
};
