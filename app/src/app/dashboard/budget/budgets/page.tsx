"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/utils/currency";
import Skeleton from "@/components/Skeleton";
import { CATEGORIES, getCategoryMeta, getApiUrl } from "@settlemint/shared";
import CategoryPicker from "@/components/CategoryPicker";
import styles from "./budgets.module.css";

const API = getApiUrl();

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [token, setToken]       = useState("");
  const [currency, setCurrency] = useState("USD");
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ category: "food", limitAmount: "", currency: "" });

  useEffect(() => {
    const s = localStorage.getItem("settlemint_session");
    if (s) {
      const p = JSON.parse(s);
      setToken(p.token);
      const cur = p.user?.defaultCurrency || "USD";
      setCurrency(cur);
      setForm(f => ({ ...f, currency: cur }));
    }
  }, []);

  const sym = getCurrencySymbol(currency);

  // Queries
  const { data: budgetsData, isLoading } = useQuery({
    queryKey: ["budget_goals", viewMonth, viewYear],
    queryFn: async () => {
      const res = await fetch(`${API}/api/budget/budgets?month=${viewMonth}&year=${viewYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["budget_analytics", viewMonth, viewYear],
    queryFn: async () => {
      const res = await fetch(`${API}/api/budget/analytics?month=${viewMonth}&year=${viewYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const budgets    = budgetsData?.budgets    || [];
  const byCategory = analyticsData?.byCategory || [];
  const spendMap: Record<string, number> = {};
  byCategory.forEach((b: any) => { spendMap[b.category] = parseFloat(b.total) || 0; });

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/budget/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category:    form.category,
          limitAmount: parseFloat(form.limitAmount),
          currency:    form.currency || currency,
          month:       viewMonth,
          year:        viewYear,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_goals"] });
      setShowForm(false);
      setEditId(null);
      setForm(f => ({ ...f, limitAmount: "", category: "food" }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/api/budget/budgets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget_goals"] }),
  });

  // Month nav
  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const prevMonth  = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth  = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const isCurrent  = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

  // Categories that don't have a budget yet
  const setBudgetCategories = CATEGORIES.filter(c => !budgets.find((b: any) => b.category === c.id));

  function openEdit(b: any) {
    setEditId(b.id);
    setForm({ category: b.category, limitAmount: parseFloat(b.limitAmount).toString(), currency: b.currency });
    setShowForm(true);
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <Link href="/dashboard/budget" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Budget Hub
          </Link>
          <h1 className={styles.title}>Budget Goals</h1>
          <p className={styles.subtitle}>Set monthly spending limits per category</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.monthNav}>
            <button className={styles.monthBtn} onClick={prevMonth} aria-label="Prev">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button className={styles.monthBtn} onClick={nextMonth} disabled={isCurrent} aria-label="Next">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {setBudgetCategories.length > 0 && (
            <button className={styles.primaryBtn} onClick={() => { setEditId(null); setForm(f => ({ ...f, category: setBudgetCategories[0].id, limitAmount: "" })); setShowForm(true); }} id="budget-add-goal">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Goal
            </button>
          )}
        </div>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className={styles.skeletonGrid}>
          <Skeleton height="130px" borderRadius="12px" />
          <Skeleton height="130px" borderRadius="12px" />
          <Skeleton height="130px" borderRadius="12px" />
        </div>
      ) : budgets.length === 0 ? (
        <div className={styles.emptyFull}>
          <div className={styles.emptyIcon}>🎯</div>
          <h2 className={styles.emptyTitle}>No budget goals yet</h2>
          <p className={styles.emptyText}>Set monthly spending limits for each category to stay on track.</p>
          <button className={styles.primaryBtn} onClick={() => { setForm(f => ({ ...f, category: CATEGORIES[0].id, limitAmount: "" })); setShowForm(true); }}>
            Set your first goal
          </button>
        </div>
      ) : (
        <div className={styles.goalsGrid}>
          {budgets.map((b: any) => {
            const meta    = getCategoryMeta(b.category);
            const limit   = parseFloat(b.limitAmount) || 0;
            const spent   = spendMap[b.category] || 0;
            const pct     = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const over    = spent > limit;
            const remaining = Math.max(limit - spent, 0);

            return (
              <div key={b.id} className={`${styles.goalCard} ${over ? styles.goalCardOver : ""}`}>
                <div className={styles.goalCardTop}>
                  <div className={styles.goalIcon} style={{ background: `${meta.color}18`, color: meta.color }}>
                    {meta.emoji}
                  </div>
                  <div className={styles.goalInfo}>
                    <span className={styles.goalLabel}>{meta.label}</span>
                    {over
                      ? <span className={styles.overBadge}>Over budget!</span>
                      : <span className={styles.goalRemaining}>{sym}{remaining.toFixed(2)} left</span>
                    }
                  </div>
                  <div className={styles.goalActions}>
                    <button className={styles.iconBtn} onClick={() => openEdit(b)} aria-label="Edit">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteMutation.mutate(b.id)} aria-label="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className={styles.goalAmounts}>
                  <span className={styles.goalSpent}>{sym}{spent.toFixed(2)}</span>
                  <span className={styles.goalLimit}>of {sym}{limit.toFixed(2)}</span>
                </div>

                <div className={styles.goalTrack}>
                  <div
                    className={styles.goalBar}
                    style={{
                      width: `${pct}%`,
                      background: over ? "#ff6b6b" : meta.color,
                    }}
                  />
                </div>

                <div className={styles.goalPct}>
                  <span style={{ color: over ? "#ff6b6b" : meta.color }}>
                    {pct.toFixed(0)}%{over ? " over" : " used"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Add more goal card */}
          {setBudgetCategories.length > 0 && (
            <button
              className={styles.addGoalCard}
              onClick={() => { setEditId(null); setForm(f => ({ ...f, category: setBudgetCategories[0].id, limitAmount: "" })); setShowForm(true); }}
            >
              <div className={styles.addGoalPlus}>+</div>
              <span className={styles.addGoalLabel}>Add another goal</span>
            </button>
          )}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editId ? "Edit Goal" : "New Budget Goal"}</h2>
              <button className={styles.modalClose} onClick={() => setShowForm(false)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate(); }}>

              {/* Category */}
              <CategoryPicker
                categories={CATEGORIES}
                value={form.category}
                onChange={(id) => setForm(f => ({ ...f, category: id }))}
                label="Category"
                colorized
              />

              {/* Monthly limit */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Monthly Limit</label>
                <div className={styles.amountRow}>
                  <span className={styles.currencyBadge}>{sym}</span>
                  <input
                    id="goal-limit"
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 5000"
                    value={form.limitAmount}
                    onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))}
                    step="0.01" min="0" required autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={upsertMutation.isPending || !form.limitAmount}
                id="goal-submit"
              >
                {upsertMutation.isPending ? "Saving…" : editId ? "Update Goal" : "Create Goal"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
