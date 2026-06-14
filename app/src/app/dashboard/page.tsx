"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

import { useQuery } from "@tanstack/react-query";

interface Group {
  id: string;
  name: string;
  mode: string;
  emoji: string;
  color: string;
  baseCurrency: string;
  role: string;
}

const mockExpenses = [
  { id: "e1", description: "Airport Taxi", amount: 45.00, paidBy: "You", groupName: "SE Asia Trip", time: "2h ago", category: "Transport", categoryColor: "#5B8DEF" },
  { id: "e2", description: "Groceries (Aldi)", amount: 87.30, paidBy: "Hamza", groupName: "Apartment 4B", time: "5h ago", category: "Food", categoryColor: "#FF6B6B" },
];

export default function DashboardHome() {
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setUserName(parsed.user.name || parsed.user.fullName || "");
      setToken(parsed.token);
    }
  }, []);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/groups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
    enabled: !!token,
  });

  const groups: Group[] = groupsData?.groups || [];

  const totalOwed = 0; // Will be calculated when we pull balances
  const totalOwe = 0;
  const netBalance = 0;

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <h1 className={styles.title}>
          Welcome back, {userName ? userName.split(" ")[0] : "there"}
        </h1>
        <p className={styles.subtitle}>
          Here is what is happening across your groups.
        </p>
      </div>

      {/* Balance overview cards */}
      <div className={styles.balanceCards}>
        <div className={`${styles.balanceCard} ${styles.balanceNet}`}>
          <span className={styles.balanceLabel}>Net Balance</span>
          <span className={`${styles.balanceValue} ${netBalance >= 0 ? styles.positive : styles.negative}`}>
            {netBalance >= 0 ? "+" : "-"}${Math.abs(netBalance).toFixed(2)}
          </span>
          <span className={styles.balanceSub}>Across {groups.length} groups</span>
        </div>
        <div className={styles.balanceCard}>
          <span className={styles.balanceLabel}>You are owed</span>
          <span className={`${styles.balanceValue} ${styles.positive}`}>
            +${totalOwed.toFixed(2)}
          </span>
        </div>
        <div className={styles.balanceCard}>
          <span className={styles.balanceLabel}>You owe</span>
          <span className={`${styles.balanceValue} ${styles.negative}`}>
            -${totalOwe.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Groups + Recent Activity */}
      <div className={styles.twoCol}>
        {/* Groups */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Groups</h2>
            <Link href="/dashboard/groups" className={styles.seeAll}>
              See all
            </Link>
          </div>
          <div className={styles.groupList}>
            {isLoading ? (
              <div className="text-secondary">Loading groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-secondary" style={{ padding: '1rem', border: '1px dashed var(--border-default)', borderRadius: '12px', textAlign: 'center' }}>
                You aren't in any groups yet.
              </div>
            ) : (
              groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/dashboard/groups/${group.id}`}
                  className={styles.groupCard}
                >
                  <div
                    className={styles.groupIcon}
                    style={{ background: `${group.color}20`, color: group.color }}
                  >
                    {group.emoji || group.name[0]}
                  </div>
                  <div className={styles.groupInfo}>
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.groupMeta}>
                      {group.mode} &middot; {group.role}
                    </span>
                  </div>
                  <span className={`${styles.groupBalance} ${styles.neutral}`}>
                    $0.00
                  </span>
                </Link>
              ))
            )}
            <Link href="/dashboard/groups/new" className={styles.newGroupBtn} id="dashboard-new-group">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 3.75V14.25M3.75 9H14.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Create New Group
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Expenses</h2>
            <Link href="/dashboard/expenses" className={styles.seeAll}>
              See all
            </Link>
          </div>
          <div className={styles.expenseList}>
            {mockExpenses.map((exp) => (
              <div key={exp.id} className={styles.expenseRow}>
                <div
                  className={styles.expenseCat}
                  style={{ background: `${exp.categoryColor}15`, color: exp.categoryColor }}
                >
                  {exp.category[0]}
                </div>
                <div className={styles.expenseInfo}>
                  <span className={styles.expenseDesc}>{exp.description}</span>
                  <span className={styles.expenseMeta}>
                    {exp.paidBy} &middot; {exp.groupName} &middot; {exp.time}
                  </span>
                </div>
                <span className={styles.expenseAmount}>
                  ${exp.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Link href="/dashboard/new-expense" className={styles.actionCard} id="quick-add-expense">
            <div className={styles.actionIcon} style={{ background: "rgba(61, 214, 140, 0.1)", color: "var(--mint-400)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className={styles.actionLabel}>Add Expense</span>
          </Link>
          <Link href="/dashboard/scan" className={styles.actionCard} id="quick-scan-receipt">
            <div className={styles.actionIcon} style={{ background: "rgba(91, 141, 239, 0.1)", color: "#5B8DEF" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 12H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 8H21" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                <path d="M3 16H21" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              </svg>
            </div>
            <span className={styles.actionLabel}>Scan Receipt</span>
          </Link>
          <Link href="/dashboard/settle" className={styles.actionCard} id="quick-settle-up">
            <div className={styles.actionIcon} style={{ background: "rgba(255, 169, 77, 0.1)", color: "#FFA94D" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <span className={styles.actionLabel}>Settle Up</span>
          </Link>
          <Link href="/dashboard/groups/new" className={styles.actionCard} id="quick-new-group">
            <div className={styles.actionIcon} style={{ background: "rgba(177, 151, 252, 0.1)", color: "#B197FC" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 21V18C2 15.79 3.79 14 6 14H12C14.21 14 16 15.79 16 18V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M19 8V14M16 11H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className={styles.actionLabel}>New Group</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
