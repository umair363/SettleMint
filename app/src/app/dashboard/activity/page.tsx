"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import styles from "./activity.module.css";

const ACTION_META: Record<string, { icon: string; color: string }> = {
  "Expense Created": { icon: "📝", color: "#5B8DEF" },
  "Payment Recorded": { icon: "✅", color: "#3DD68C" },
  "Group Created": { icon: "🏷️", color: "#B197FC" },
  "Member Joined": { icon: "👋", color: "#FFA94D" },
  default: { icon: "⚡", color: "#5B8DEF" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityPage() {
  const [token, setToken] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) setToken(JSON.parse(session).token);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000, // poll every 30s
  });

  const activity = data?.activity || [];

  // Group by date heading
  const grouped: Record<string, any[]> = {};
  activity.forEach((log: any) => {
    const d = new Date(log.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let key: string;
    if (d.toDateString() === today.toDateString()) key = "Today";
    else if (d.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else key = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Activity</h1>
          <p className={styles.subtitle}>Everything happening across your groups and friends.</p>
        </div>
      </div>

      <div className={styles.feed}>
        {isLoading ? (
          <div className={styles.skeletonList}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height="72px" borderRadius="14px" />
            ))}
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⚠️</span>
            <p>Failed to load activity.</p>
          </div>
        ) : activity.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🌱</span>
            <h3 className={styles.emptyTitle}>No activity yet</h3>
            <p className={styles.emptyText}>
              Create a group or add an expense to get started. Your timeline will appear here.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, logs]) => (
            <div key={dateLabel} className={styles.group}>
              <div className={styles.dateDivider}>
                <span className={styles.dateLabel}>{dateLabel}</span>
              </div>

              <div className={styles.logList}>
                {logs.map((log: any, idx: number) => {
                  const meta = ACTION_META[log.action] || ACTION_META.default;
                  return (
                    <div key={log.id} className={styles.logRow} style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className={styles.iconWrap} style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                        <span className={styles.logIcon}>{meta.icon}</span>
                      </div>
                      <div className={styles.logBody}>
                        <p className={styles.logAction}>{log.action}</p>
                        <p className={styles.logDesc}>{log.description}</p>
                      </div>
                      <time className={styles.logTime} dateTime={log.createdAt}>
                        {timeAgo(log.createdAt)}
                      </time>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
