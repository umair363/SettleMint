"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import styles from "./group-detail.module.css";


export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const [filter, setFilter] = useState<"all" | "yours">("all");
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

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

  const myBalance = group.balances?.[currentUserId] || 0.00;
  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
  const suggestedSettlements = group.suggestedSettlements || [];
  
  // Get currency symbol
  const getSymbol = (curr: string) => curr === "USD" ? "$" : curr === "PKR" ? "Rs" : curr;
  const sym = getSymbol(group.baseCurrency);

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
          <button
            className={`btn btn-secondary ${styles.actionBtn}`}
            onClick={async () => {
              try {
                const res = await fetch(`https://settlemint.onrender.com/api/groups/${groupId}/invite`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setInviteUrl(data.inviteUrl);
                await navigator.clipboard.writeText(data.inviteUrl);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 3000);
              } catch (err: any) {
                alert("Could not generate invite link: " + err.message);
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {inviteCopied ? "Link Copied! ✓" : "Invite"}
          </button>
          <Link href={`/dashboard/new-expense?group=${groupId}`} className={`btn btn-primary ${styles.actionBtn}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Add Expense
          </Link>
        </div>
      </header>

      {/* 2. Main Balance Section */}
      <section className={styles.balanceSection}>
        <div className={styles.balanceContent}>
          <div className={styles.balanceMain}>
            <span className={styles.balanceLabel}>Your Balance</span>
            <span className={`${styles.balanceValue} ${myBalance > 0 ? styles.positive : myBalance < 0 ? styles.negative : styles.neutral}`}>
              {myBalance > 0 ? '+' : ''}{sym}{Math.abs(myBalance).toFixed(2)}
            </span>
          </div>
          
          <Link href={`/dashboard/settle?group=${groupId}`} className={`btn btn-primary ${styles.settleBtn}`}>
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
            Total group spending: {sym}{totalExpenses.toFixed(2)}
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
                    <span className={styles.amount}>{sym}{parseFloat(exp.amount).toFixed(2)}</span>
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
              
              {suggestedSettlements.length > 0 ? suggestedSettlements.map((s: any, i: number) => (
                <div key={i} className={styles.settlementItem}>
                  <div className={styles.settlementUsers}>
                    <span style={{ fontWeight: s.fromId === currentUserId ? 600 : 400 }}>
                      {s.fromId === currentUserId ? "You" : s.from}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={styles.settlementArrow}>
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontWeight: s.toId === currentUserId ? 600 : 400 }}>
                      {s.toId === currentUserId ? "You" : s.to}
                    </span>
                  </div>
                  <span className={styles.settlementAmount}>{sym}{s.amount.toFixed(2)}</span>
                </div>
              )) : (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Everyone is completely settled up! No debts. 🎉
                </p>
              )}
              
              {suggestedSettlements.length > 0 && (
                <Link href={`/dashboard/settle?group=${groupId}`} className={`btn btn-secondary ${styles.settlementAction}`}>
                  Record a payment
                </Link>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
