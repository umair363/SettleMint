"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";

export default function ActivityPage() {
  const [token, setToken] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      setToken(JSON.parse(session).token);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await fetch("https://settlemint.onrender.com/api/activity", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: !!token,
  });

  const activity = data?.activity || [];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "600", color: "var(--text-primary)" }}>Recent Activity</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          Everything happening across your groups and friendships.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {isLoading ? (
          <>
            <Skeleton height="80px" borderRadius="12px" />
            <Skeleton height="80px" borderRadius="12px" />
            <Skeleton height="80px" borderRadius="12px" />
          </>
        ) : activity.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", border: "1px dashed var(--border-default)", borderRadius: "12px" }}>
            No activity yet.
          </div>
        ) : (
          activity.map((log: any) => (
            <div key={log.id} style={{ padding: "1.5rem", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--slate-800)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                ⚡
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "var(--text-primary)", fontWeight: "500", fontSize: "1rem" }}>{log.action}</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{log.description}</p>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                {new Date(log.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
