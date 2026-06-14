"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./groups.module.css";

const allGroups = [
  { id: "g1", name: "SE Asia Trip", mode: "Trip", emoji: "✈️", memberCount: 8, color: "#5B8DEF", totalExpenses: 2340.00, balance: 247.50, lastActivity: "2h ago" },
  { id: "g2", name: "Apartment 4B", mode: "Roommate", emoji: "🏠", memberCount: 3, color: "#20C997", totalExpenses: 1680.00, balance: -62.00, lastActivity: "5h ago" },
  { id: "g3", name: "Date Night Fund", mode: "Couple", emoji: "💜", memberCount: 2, color: "#B197FC", totalExpenses: 890.00, balance: 15.75, lastActivity: "3 days ago" },
  { id: "g4", name: "Office Lunch Club", mode: "Event", emoji: "🎉", memberCount: 12, color: "#FFA94D", totalExpenses: 567.00, balance: 0, lastActivity: "1 week ago" },
  { id: "g5", name: "Road Trip 2026", mode: "Trip", emoji: "✈️", memberCount: 5, color: "#5B8DEF", totalExpenses: 0, balance: 0, lastActivity: "Just created" },
];

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");

  const modes = ["all", "Trip", "Roommate", "Couple", "Event"];

  const filtered = allGroups.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchMode = filterMode === "all" || g.mode === filterMode;
    return matchSearch && matchMode;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Groups</h1>
          <p className={styles.subtitle}>Manage your shared expense groups.</p>
        </div>
        <Link href="/dashboard/groups/new" className="btn btn-primary" id="groups-create-new">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Group
        </Link>
      </div>

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
        <div className={styles.modeTabs}>
          {modes.map((m) => (
            <button
              key={m}
              className={`${styles.modeTab} ${filterMode === m ? styles.modeTabActive : ""}`}
              onClick={() => setFilterMode(m)}
            >
              {m === "all" ? "All" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Group Cards */}
      <div className={styles.groupGrid}>
        {filtered.map((group) => (
          <Link
            key={group.id}
            href={`/dashboard/groups/${group.id}`}
            className={styles.card}
          >
            <div className={styles.cardTop}>
              <div
                className={styles.cardIcon}
                style={{ background: group.color }}
              >
                {group.name[0]}
              </div>
              <span className={styles.cardMode}>
                {group.emoji} {group.mode}
              </span>
            </div>
            <h3 className={styles.cardName}>{group.name}</h3>
            <p className={styles.cardMeta}>
              {group.memberCount} members &middot; {group.lastActivity}
            </p>
            <div className={styles.cardBottom}>
              <div className={styles.cardStat}>
                <span className={styles.cardStatLabel}>Total</span>
                <span className={styles.cardStatValue}>
                  ${group.totalExpenses.toLocaleString()}
                </span>
              </div>
              <div className={styles.cardStat}>
                <span className={styles.cardStatLabel}>Your balance</span>
                <span
                  className={`${styles.cardStatValue} ${
                    group.balance > 0
                      ? styles.positive
                      : group.balance < 0
                      ? styles.negative
                      : ""
                  }`}
                >
                  {group.balance > 0
                    ? `+$${group.balance.toFixed(2)}`
                    : group.balance < 0
                    ? `-$${Math.abs(group.balance).toFixed(2)}`
                    : "Settled"}
                </span>
              </div>
            </div>
          </Link>
        ))}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--slate-700)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M24 18V30M18 24H30" stroke="var(--slate-600)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p>No groups found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
