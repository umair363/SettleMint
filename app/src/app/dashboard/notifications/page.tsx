"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";

export default function NotificationsPage() {
  const [token, setToken] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      setToken(JSON.parse(session).token);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}`/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!token,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const notifications = data?.notifications || [];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "600", color: "var(--text-primary)" }}>Notifications</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          Stay on top of payments, invites, and reminders.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {isLoading ? (
          <>
            <Skeleton height="80px" borderRadius="12px" />
            <Skeleton height="80px" borderRadius="12px" />
          </>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", border: "1px dashed var(--border-default)", borderRadius: "12px" }}>
            You're all caught up!
          </div>
        ) : (
          notifications.map((notif: any) => (
            <div key={notif.id} style={{ 
              padding: "1.5rem", 
              background: notif.isRead ? "var(--bg-card)" : "rgba(61, 214, 140, 0.05)", 
              border: `1px solid ${notif.isRead ? "var(--border-default)" : "var(--brand-mint-40)"}`, 
              borderRadius: "12px", 
              display: "flex", 
              alignItems: "center", 
              gap: "1rem" 
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "var(--text-primary)", fontWeight: "500", fontSize: "1rem" }}>{notif.title}</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{notif.message}</p>
              </div>
              {!notif.isRead && (
                <button 
                  onClick={() => markReadMutation.mutate(notif.id)}
                  style={{ background: "transparent", color: "var(--brand-mint)", border: "1px solid var(--brand-mint-40)", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
