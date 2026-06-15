"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import styles from "./group-detail.module.css";

// --- Mock Data ---
const mockGroup = {
  id: "g1",
  name: "SE Asia Trip",
  emoji: "✈️",
  color: "#5B8DEF",
  mode: "Trip",
  currency: "USD",
  createdAt: "2026-05-10T10:00:00Z",
  members: [
    { id: "u1", name: "You", avatar: "Y" },
    { id: "u2", name: "Sarah", avatar: "S" },
    { id: "u3", name: "Hamza", avatar: "H" },
    { id: "u4", name: "Ali", avatar: "A" },
    { id: "u5", name: "Zara", avatar: "Z" },
  ],
  myBalance: 247.50, // Positive means I am owed
  totalExpenses: 1450.25,
};

const mockExpenses = [
  {
    id: "e1",
    description: "Airbnb Bangkok (4 nights)",
    amount: 450.00,
    paidBy: "u1", // You
    paidByName: "You",
    date: "2026-06-12",
    category: "Lodging",
    categoryIcon: "🏠",
    color: "#B197FC",
    splitSummary: "You lent $360.00",
    splitStatus: "lent", // 'lent', 'borrowed', 'settled'
  },
  {
    id: "e2",
    description: "Dinner at Night Market",
    amount: 85.50,
    paidBy: "u2", // Sarah
    paidByName: "Sarah",
    date: "2026-06-13",
    category: "Food",
    categoryIcon: "🍜",
    color: "#FF6B6B",
    splitSummary: "You borrowed $17.10",
    splitStatus: "borrowed",
  },
  {
    id: "e3",
    description: "Train to Chiang Mai",
    amount: 120.00,
    paidBy: "u3", // Hamza
    paidByName: "Hamza",
    date: "2026-06-14",
    category: "Transport",
    categoryIcon: "🚆",
    color: "#5B8DEF",
    splitSummary: "You borrowed $24.00",
    splitStatus: "borrowed",
  },
  {
    id: "e4",
    description: "TukTuk rides",
    amount: 15.00,
    paidBy: "u1", // You
    paidByName: "You",
    date: "2026-06-14",
    category: "Transport",
    categoryIcon: "🚕",
    color: "#5B8DEF",
    splitSummary: "You lent $12.00",
    splitStatus: "lent",
  }
];

const mockSettlements = [
  { from: "Hamza", to: "You", amount: 120.50 },
  { from: "Sarah", to: "You", amount: 127.00 },
];

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const [filter, setFilter] = useState<"all" | "yours">("all");
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setCurrentUserId(parsed.user.id);
    }
  }, []);

  const { data: groupData, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const res = await fetch(`https://settlemint.onrender.com/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 403 || res.status === 404) {
        router.push("/dashboard");
        throw new Error("Group not found or forbidden");
      }
      if (!res.ok) throw new Error("Failed to fetch group");
      return res.json();
    },
    enabled: !!token && !!groupId,
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", groupId],
    queryFn: async () => {
      const res = await fetch(`https://settlemint.onrender.com/api/expenses/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!token && !!groupId,
  });

  if (groupLoading || !groupData) {
    return <div className={styles.groupDetail} style={{ padding: "2rem" }}>Loading group details...</div>;
  }

  const group = groupData.group;
  const expenses = expensesData?.expenses || [];

  const filteredExpenses = filter === "all" 
    ? expenses 
    : expenses.filter((e: any) => e.paidBy === currentUserId || false /* To-do: filter splits */);

  // Temporary calculate totals (will be improved when we fetch actual split balances)
  const myBalance = 0.00;
  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);

  return (
    <div className={styles.groupDetail}>
      
      {/* 1. Header Area */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard" className={styles.backBtn} aria-label="Back to dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className={styles.groupIcon} style={{ backgroundColor: group.color + '20', color: group.color }}>
            {group.emoji}
          </div>
          <div className={styles.groupInfo}>
            <h1 className={styles.title}>{group.name}</h1>
            <div className={styles.meta}>
              <span>{group.mode} Mode</span>
              <span className={styles.metaDot} />
              <span>{group.members.length} members</span>
              <span className={styles.metaDot} />
              <span>Base: {group.baseCurrency}</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button className={`btn btn-secondary ${styles.actionBtn}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Invite
          </button>
          <button className={`btn btn-secondary ${styles.actionBtn}`} aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </header>

      {/* 2. Main Balance Section */}
      <section className={styles.balanceSection}>
        <div className={styles.balanceContent}>
          <div className={styles.balanceMain}>
            <span className={styles.balanceLabel}>Your Balance</span>
            <span className={`${styles.balanceValue} ${myBalance > 0 ? styles.positive : myBalance < 0 ? styles.negative : styles.neutral}`}>
              {myBalance > 0 ? '+' : ''}${Math.abs(myBalance).toFixed(2)}
            </span>
          </div>
          
          <Link href="/dashboard/settle" className={`btn btn-primary ${styles.settleBtn}`}>
            Settle Up
          </Link>
        </div>
        
        <div className={styles.membersRibbon}>
          <div className={styles.avatars}>
            {group.members.slice(0, 4).map((m: any) => (
              <div key={m.id} className={styles.avatar} title={m.fullName}>
                {m.avatarUrl ? <img src={m.avatarUrl} alt={m.fullName} /> : m.fullName[0].toUpperCase()}
              </div>
            ))}
            {group.members.length > 4 && (
              <div className={styles.avatar}>
                +{group.members.length - 4}
              </div>
            )}
          </div>
          <span className={styles.membersText}>
            Total group spending: ${totalExpenses.toFixed(2)}
          </span>
        </div>
      </section>

      {/* 3. Grid Layout: Expenses & Settlements */}
      <div className={styles.grid}>
        
        {/* Left Col: Expenses */}
        <div className={styles.mainCol}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Expenses</h2>
            <div className={styles.filters}>
              <button 
                className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button 
                className={`${styles.filterBtn} ${filter === "yours" ? styles.active : ""}`}
                onClick={() => setFilter("yours")}
              >
                Involving You
              </button>
            </div>
          </div>
          
          {expensesLoading ? (
            <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Loading expenses...</div>
          ) : filteredExpenses.length > 0 ? (
            <div className={styles.expenseList}>
              {filteredExpenses.map((exp: any) => (
                <Link key={exp.id} href={`/dashboard/groups/${groupId}/${exp.id}`} className={styles.expenseCard}>
                  <div className={styles.expenseIcon} style={{ backgroundColor: `rgba(91, 141, 239, 0.15)`, color: "#5B8DEF" }}>
                    📝
                  </div>
                  
                  <div className={styles.expenseDetails}>
                    <span className={styles.expenseTitle}>{exp.description}</span>
                    <div className={styles.expenseMeta}>
                      <span>{exp.payerName} paid</span>
                      <span className={styles.metaDot} />
                      <span>{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  <div className={styles.expenseAmount}>
                    <span className={styles.amount}>${parseFloat(exp.amount).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className={styles.emptyTitle}>No expenses yet</h3>
              <p className={styles.emptyText}>Add your first group expense to start tracking who owes what.</p>
              <Link href="/dashboard/new-expense" className="btn btn-primary">
                Add Expense
              </Link>
            </div>
          )}
        </div>

        {/* Right Col: Settlement Plan */}
        <aside className={styles.sideCol}>
          <div className={styles.settlementPanel}>
            <div className={styles.panelCard}>
              <h3 className={styles.panelTitle}>Suggested Settlements</h3>
              
              {mockSettlements.map((s, i) => (
                <div key={i} className={styles.settlementItem}>
                  <div className={styles.settlementUsers}>
                    <span>{s.from}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={styles.settlementArrow}>
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{s.to}</span>
                  </div>
                  <span className={styles.settlementAmount}>${s.amount.toFixed(2)}</span>
                </div>
              ))}
              
              <Link href="/dashboard/settle" className={`btn btn-secondary ${styles.settlementAction}`}>
                Record a payment
              </Link>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
