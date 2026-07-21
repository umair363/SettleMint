"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Skeleton from "@/components/Skeleton";
import PageHeader from "@/components/PageHeader";
import { getApiUrl } from "@settlemint/shared";
import styles from "./groups.module.css";

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");

  const [token, setToken] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setDefaultCurrency(parsed.user.defaultCurrency || "USD");
    }
  }, []);

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      USD: "$", EUR: "€", GBP: "£", PKR: "Rs", INR: "₹",
      CAD: "$", AUD: "$", AED: "د.إ", SAR: "﷼", THB: "฿",
      SGD: "$", JPY: "¥", CNY: "¥", CHF: "Fr"
    };
    return symbols[code] || "$";
  };
  const sym = getCurrencySymbol(defaultCurrency);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!token,
  });

  const allGroups = groupsData?.groups || [];

  const filtered = allGroups.filter((g: any) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className={`${styles.page} pageShell`}>
      <PageHeader
        title="Groups"
        subtitle="Manage your shared expense groups."
        action={
          <Link href="/dashboard/groups/new" className="btn btn-primary" id="groups-create-new">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Group
          </Link>
        }
      />

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="groups-search"
          />
        </div>
      </div>

      {/* Group Cards */}
      <div className={styles.groupGrid}>
        {isLoading ? (
          <>
            <Skeleton height="180px" borderRadius="16px" />
            <Skeleton height="180px" borderRadius="16px" />
            <Skeleton height="180px" borderRadius="16px" />
          </>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--slate-700)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M24 18V30M18 24H30" stroke="var(--slate-600)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p>No groups found matching your filters.</p>
          </div>
        ) : (
          filtered.map((group: any) => (
            <Link
              key={group.id}
              href={`/dashboard/groups/${group.id}`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <div
                  className={styles.cardIcon}
                  style={{ background: "#5B8DEF" }}
                >
                  {group.name[0]}
                </div>
                <span className={styles.cardMode}>
                  {new Date(group.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className={styles.cardName}>{group.name}</h3>
              <p className={styles.cardMeta}>
                {group.memberCount || 1} members &middot; {group.currency || "USD"}
              </p>
              <div className={styles.cardBottom}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>Group Currency</span>
                  <span className={styles.cardStatValue}>
                    {group.currency}
                  </span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>Your balance</span>
                  <span
                    className={`${styles.cardStatValue} ${
                      0 > 0
                        ? styles.positive
                        : 0 < 0
                        ? styles.negative
                        : ""
                    }`}
                  >
                    Settled
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
