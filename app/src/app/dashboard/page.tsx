"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import styles from "./page.module.css";
import { getCurrencySymbol, convertCurrency } from "@/utils/currency";

interface Group {
  id: string;
  name: string;
  mode: string;
  emoji: string;
  color: string;
  baseCurrency: string;
  role: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍽️", transport: "🚗", accommodation: "🏨",
  entertainment: "🎬", shopping: "🛍️", utilities: "⚡",
  health: "💊", travel: "✈️", default: "💳",
};

function getCategoryIcon(category?: string) {
  if (!category) return CATEGORY_ICONS.default;
  return CATEGORY_ICONS[category.toLowerCase()] ?? CATEGORY_ICONS.default;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHome() {
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  useEffect(() => {
    const loadSession = () => {
      const session = localStorage.getItem("settlemint_session");
      if (session) {
        const parsed = JSON.parse(session);
        setUserName(parsed.user.name || parsed.user.fullName || "");
        setUserId(parsed.user.id || "");
        setDefaultCurrency(parsed.user.defaultCurrency || "USD");
        setToken(parsed.token);
      }
    };
    loadSession();
    window.addEventListener("user-profile-updated", loadSession);
    return () => window.removeEventListener("user-profile-updated", loadSession);
  }, []);

  const sym = getCurrencySymbol(defaultCurrency);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["recent_expenses"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/expenses/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: settlementsData } = useQuery({
    queryKey: ["settlements"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/settlements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch settlements");
      return res.json();
    },
    enabled: !!token,
  });

  const groups: Group[] = groupsData?.groups || [];
  const expenses = expensesData?.expenses || [];

  let totalOwed = 0;
  let totalOwe = 0;

  expenses.forEach((exp: any) => {
    const isPayer = exp.paidBy === userId;
    exp.splits?.forEach((split: any) => {
      const splitAmount = convertCurrency(parseFloat(split.amountOwed), exp.currency || "USD", defaultCurrency);
      if (split.userId === userId && !isPayer) totalOwe += splitAmount;
      else if (split.userId !== userId && isPayer) totalOwed += splitAmount;
    });
  });

  const settlements = settlementsData?.settlements || [];
  settlements.forEach((st: any) => {
    const group = groups.find((g) => g.id === st.groupId);
    const currency = group ? group.baseCurrency : defaultCurrency;
    const amount = convertCurrency(parseFloat(st.amount), currency, defaultCurrency);
    if (st.paidBy === userId) totalOwe -= amount;
    else if (st.paidTo === userId) totalOwed -= amount;
  });

  totalOwe = Math.max(0, totalOwe);
  totalOwed = Math.max(0, totalOwed);
  const netBalance = totalOwed - totalOwe;
  const firstName = userName ? userName.split(" ")[0] : "there";

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.greeting}>{getGreeting()},</p>
          <h1 className={styles.title}>{firstName}</h1>
        </div>
      </div>

      {/* ── Balance strip ── */}
      <div className={styles.balanceStrip}>
        <div className={`${styles.balanceCard} ${styles.balanceNet} ${netBalance >= 0 ? styles.netPositive : styles.netNegative}`}>
          <div className={styles.balanceCardInner}>
            <span className={styles.balanceLabel}>Net Balance</span>
            <span className={styles.balanceValue}>
              {netBalance >= 0 ? "+" : "-"}{sym}{Math.abs(netBalance).toFixed(2)}
            </span>
            <span className={styles.balanceSub}>{groups.length} active group{groups.length !== 1 ? "s" : ""}</span>
          </div>
          <div className={styles.balanceGlow} />
        </div>

        <div className={styles.balanceCard}>
          <div className={styles.balanceCardInner}>
            <span className={styles.balanceLabel}>You are owed</span>
            <span className={`${styles.balanceValue} ${styles.positive}`}>{sym}{totalOwed.toFixed(2)}</span>
          </div>
          <svg className={styles.balanceIcon} width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className={styles.balanceCard}>
          <div className={styles.balanceCardInner}>
            <span className={styles.balanceLabel}>You owe</span>
            <span className={`${styles.balanceValue} ${styles.negative}`}>{sym}{totalOwe.toFixed(2)}</span>
          </div>
          <svg className={styles.balanceIcon} width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className={styles.mainGrid}>

        {/* Groups */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Groups</h2>
            <Link href="/dashboard/groups" className={styles.panelLink}>View all →</Link>
          </div>
          <div className={styles.panelBody}>
            {isLoading ? (
              <div className={styles.skeletonStack}>
                <Skeleton height="52px" borderRadius="10px" />
                <Skeleton height="52px" borderRadius="10px" />
                <Skeleton height="52px" borderRadius="10px" />
              </div>
            ) : groups.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👥</div>
                <p>No groups yet</p>
                <Link href="/dashboard/groups/new" className={styles.emptyAction}>Create your first group</Link>
              </div>
            ) : (
              <>
                {groups.slice(0, 5).map((group) => (
                  <Link key={group.id} href={`/dashboard/groups/${group.id}`} className={styles.listRow}>
                    <div className={styles.rowIcon} style={{ background: `${group.color || "#5B8DEF"}18`, color: group.color || "#5B8DEF" }}>
                      {group.emoji || group.name[0]}
                    </div>
                    <div className={styles.rowBody}>
                      <span className={styles.rowTitle}>{group.name}</span>
                      <span className={styles.rowSub}>{group.mode || "Group"} · {group.role}</span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={styles.rowChevron}>
                      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))}
                <Link href="/dashboard/groups/new" className={styles.addRow} id="dashboard-new-group">
                  <span className={styles.addRowPlus}>+</span>
                  New Group
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Expenses */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Expenses</h2>
            <Link href="/dashboard/expenses" className={styles.panelLink}>View all →</Link>
          </div>
          <div className={styles.panelBody}>
            {expensesLoading ? (
              <div className={styles.skeletonStack}>
                <Skeleton height="52px" borderRadius="10px" />
                <Skeleton height="52px" borderRadius="10px" />
                <Skeleton height="52px" borderRadius="10px" />
              </div>
            ) : expenses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🧾</div>
                <p>No expenses yet</p>
                <Link href="/dashboard/new-expense" className={styles.emptyAction}>Add your first expense</Link>
              </div>
            ) : (
              expenses.slice(0, 6).map((exp: any) => {
                const convertedAmt = convertCurrency(parseFloat(exp.amount), exp.currency || "USD", defaultCurrency);
                const isPayer = exp.paidBy === userId;
                return (
                  <div key={exp.id} className={styles.listRow}>
                    <div className={styles.rowIcon} style={{ background: "rgba(91,141,239,0.12)", color: "#5B8DEF" }}>
                      {getCategoryIcon(exp.category)}
                    </div>
                    <div className={styles.rowBody}>
                      <span className={styles.rowTitle}>{exp.description}</span>
                      <span className={styles.rowSub}>
                        {isPayer ? "You paid" : exp.payerName} · {new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className={styles.rowAmount}>
                      <span className={styles.rowAmountMain}>{getCurrencySymbol(exp.currency)}{parseFloat(exp.amount).toFixed(2)}</span>
                      {exp.currency !== defaultCurrency && (
                        <span className={styles.rowAmountSub}>{sym}{convertedAmt.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className={styles.quickRow}>
        <Link href="/dashboard/new-expense" className={styles.quickCard} id="quick-add-expense">
          <div className={styles.quickIcon} style={{ background: "rgba(61,214,140,0.1)", color: "var(--mint-400)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <span className={styles.quickLabel}>Add Expense</span>
        </Link>
        <Link href="/dashboard/settle" className={styles.quickCard} id="quick-settle">
          <div className={styles.quickIcon} style={{ background: "rgba(255,169,77,0.1)", color: "#FFA94D" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" /></svg>
          </div>
          <span className={styles.quickLabel}>Settle Up</span>
        </Link>
        <Link href="/dashboard/groups/new" className={styles.quickCard} id="quick-new-group">
          <div className={styles.quickIcon} style={{ background: "rgba(177,151,252,0.1)", color: "#B197FC" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M2 21V18C2 15.79 3.79 14 6 14H12C14.21 14 16 15.79 16 18V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M19 8V14M16 11H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <span className={styles.quickLabel}>New Group</span>
        </Link>
        <Link href="/dashboard/activity" className={styles.quickCard} id="quick-activity">
          <div className={styles.quickIcon} style={{ background: "rgba(91,141,239,0.1)", color: "#5B8DEF" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span className={styles.quickLabel}>Activity</span>
        </Link>
      </div>

    </div>
  );
}
