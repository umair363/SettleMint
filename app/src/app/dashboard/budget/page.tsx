"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import BottomSheet from "@/components/BottomSheet";
import CategoryPicker from "@/components/CategoryPicker";
import { getCurrencySymbol } from "@/utils/currency";
import { CATEGORIES, WALLETS, getCategoryMeta, getApiUrl } from "@settlemint/shared";
import styles from "./budget.module.css";

const API = getApiUrl();

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BudgetPage() {
  const queryClient = useQueryClient();
  const [token, setToken]       = useState("");
  const [currency, setCurrency] = useState("USD");
  const [showModal, setShowModal] = useState(false);

  // Quick-add form state
  const [form, setForm] = useState({
    amount: "",
    type: "expense" as "expense" | "income",
    category: "food",
    description: "",
    wallet: "card",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    isRecurring: false,
    recurringFrequency: "monthly",
  });

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear,  setViewYear]  = useState(now.getFullYear());

  useEffect(() => {
    const s = localStorage.getItem("settlemint_session");
    if (s) {
      const p = JSON.parse(s);
      setToken(p.token);
      setCurrency(p.user?.defaultCurrency || "USD");
    }
  }, []);

  const sym = getCurrencySymbol(currency);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: txnData, isLoading: txnLoading } = useQuery({
    queryKey: ["budget_txns", viewMonth, viewYear],
    queryFn: async () => {
      const res = await fetch(`${API}/api/budget/transactions?month=${viewMonth}&year=${viewYear}`, {
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

  const { data: budgetsData } = useQuery({
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

  // ── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/budget/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), currency }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_txns"] });
      queryClient.invalidateQueries({ queryKey: ["budget_analytics"] });
      setShowModal(false);
      setForm({ amount: "", type: "expense", category: "food", description: "", wallet: "card", date: new Date().toISOString().split("T")[0], notes: "", isRecurring: false, recurringFrequency: "monthly" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/api/budget/transactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_txns"] });
      queryClient.invalidateQueries({ queryKey: ["budget_analytics"] });
    },
  });

  // ── Derived data ─────────────────────────────────────────────────────────

  const transactions   = txnData?.transactions     || [];
  const byCategory     = analyticsData?.byCategory || [];
  const summary        = analyticsData?.summary    || { totalExpense: "0", totalIncome: "0", txnCount: 0 };
  const budgetGoals    = budgetsData?.budgets       || [];
  const totalExpense   = parseFloat(summary.totalExpense) || 0;
  const totalIncome    = parseFloat(summary.totalIncome)  || 0;
  const netSavings     = totalIncome - totalExpense;

  // Category spending map
  const spendMap: Record<string, number> = {};
  byCategory.forEach((b: any) => {
    spendMap[b.category] = parseFloat(b.total) || 0;
  });

  // Recap: top category + single biggest expense — surfaced in-line rather
  // than as a new card, reusing data already loaded for the summary grid.
  const topCategory = [...byCategory].sort((a: any, b: any) => parseFloat(b.total) - parseFloat(a.total))[0];
  const biggestExpense = transactions
    .filter((t: any) => t.type === "expense")
    .sort((a: any, b: any) => parseFloat(b.amount) - parseFloat(a.amount))[0];

  // Month nav helpers
  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const isCurrentMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.label}>PERSONAL FINANCE</p>
          <h1 className={styles.title}>My Budget</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/budget/analytics" className={styles.secondaryBtn} id="budget-analytics-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 16l4-4 4 4 4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Analytics
          </Link>
          <Link href="/dashboard/budget/budgets" className={styles.secondaryBtn} id="budget-goals-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Goals
          </Link>
          <button className={styles.primaryBtn} onClick={() => setShowModal(true)} id="budget-add-txn">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Transaction
          </button>
        </div>
      </div>

      {/* ── Month Picker ── */}
      <div className={styles.monthNav}>
        <button className={styles.monthBtn} onClick={prevMonth} aria-label="Previous month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button className={styles.monthBtn} onClick={nextMonth} disabled={isCurrentMonth} aria-label="Next month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.expenseCard}`}>
          <div className={styles.summaryCardGlow} />
          <div>
            <p className={styles.summaryCardLabel}>Total Spent</p>
            <p className={styles.summaryCardValue}>{sym}{totalExpense.toFixed(2)}</p>
          </div>
          <div className={styles.summaryCardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
          <div className={styles.summaryCardGlow} />
          <div>
            <p className={styles.summaryCardLabel}>Total Income</p>
            <p className={styles.summaryCardValue}>{sym}{totalIncome.toFixed(2)}</p>
          </div>
          <div className={styles.summaryCardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${netSavings >= 0 ? styles.savingsCardPos : styles.savingsCardNeg}`}>
          <div className={styles.summaryCardGlow} />
          <div>
            <p className={styles.summaryCardLabel}>Net Savings</p>
            <p className={styles.summaryCardValue}>
              {netSavings >= 0 ? "+" : "-"}{sym}{Math.abs(netSavings).toFixed(2)}
            </p>
          </div>
          <div className={styles.summaryCardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" opacity=".7"/>
            </svg>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div>
            <p className={styles.summaryCardLabel}>Transactions</p>
            <p className={styles.summaryCardValue}>{summary.txnCount}</p>
          </div>
          <div className={styles.summaryCardIcon} style={{ color: "var(--text-tertiary)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Recap strip ── */}
      {(topCategory || biggestExpense) && (
        <p className={styles.recapStrip}>
          {topCategory && (
            <>
              {getCategoryMeta(topCategory.category).emoji} Most spent on{" "}
              <strong>{getCategoryMeta(topCategory.category).label}</strong> this month
              ({sym}{parseFloat(topCategory.total).toFixed(2)}).
            </>
          )}
          {topCategory && biggestExpense && "  "}
          {biggestExpense && (
            <>
              Biggest single expense: <strong>{biggestExpense.description}</strong> for{" "}
              {sym}{parseFloat(biggestExpense.amount).toFixed(2)}.
            </>
          )}
        </p>
      )}

      {/* ── Main grid: Category progress + Transactions ── */}
      <div className={styles.mainGrid}>

        {/* Category Budgets */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Spending by Category</h2>
            <Link href="/dashboard/budget/budgets" className={styles.panelLink}>Set goals →</Link>
          </div>
          <div className={styles.panelBody}>
            {byCategory.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <p>No spending this month</p>
              </div>
            ) : (
              byCategory
                .sort((a: any, b: any) => parseFloat(b.total) - parseFloat(a.total))
                .map((cat: any) => {
                  const meta    = getCategoryMeta(cat.category);
                  const spent   = parseFloat(cat.total) || 0;
                  const goal    = budgetGoals.find((g: any) => g.category === cat.category);
                  const limit   = goal ? parseFloat(goal.limitAmount) : 0;
                  const pct     = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                  const over    = limit > 0 && spent > limit;

                  // Pace forecast: only meaningful for the month actually in
                  // progress — projecting a closed or future month is noise.
                  let paceWarning: string | null = null;
                  if (limit > 0 && !over && isCurrentMonth) {
                    const dayOfMonth  = now.getDate();
                    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
                    const dailyRate   = spent / dayOfMonth;
                    const projected   = dailyRate * daysInMonth;
                    if (projected > limit) {
                      const overspendDay = Math.min(daysInMonth, Math.ceil(limit / (dailyRate || 1)));
                      paceWarning = `On pace to exceed by day ${overspendDay}`;
                    }
                  }

                  return (
                    <div key={cat.category} className={styles.categoryRow}>
                      <div className={styles.categoryRowTop}>
                        <span className={styles.categoryRowEmoji}>{meta.emoji}</span>
                        <span className={styles.categoryRowLabel}>{meta.label}</span>
                        {over && <span className={styles.overBadge}>Over!</span>}
                        <div className={styles.categoryRowAmounts}>
                          <span className={styles.categorySpent}>{sym}{spent.toFixed(0)}</span>
                          {limit > 0 && <span className={styles.categoryLimit}> / {sym}{limit.toFixed(0)}</span>}
                        </div>
                      </div>
                      {limit > 0 && (
                        <div className={styles.progressTrack}>
                          <div
                            className={`${styles.progressBar} ${over ? styles.progressBarOver : ""}`}
                            style={{ width: `${pct}%`, background: over ? "#ff6b6b" : meta.color }}
                          />
                        </div>
                      )}
                      {paceWarning && (
                        <p className={styles.paceWarning}>⚠️ {paceWarning}</p>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Transactions</h2>
            <span className={styles.txnCount}>{transactions.length} this month</span>
          </div>
          <div className={styles.panelBody}>
            {txnLoading ? (
              <div className={styles.skeletonStack}>
                <Skeleton height="52px" borderRadius="10px" />
                <Skeleton height="52px" borderRadius="10px" />
                <Skeleton height="52px" borderRadius="10px" />
              </div>
            ) : transactions.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🧾</div>
                <p>No transactions yet</p>
                <button className={styles.emptyAction} onClick={() => setShowModal(true)}>Log your first</button>
              </div>
            ) : (
              <div className={styles.txnList}>
                {transactions.map((txn: any) => {
                  const meta = getCategoryMeta(txn.category);
                  const isIncome = txn.type === "income";
                  return (
                    <div key={txn.id} className={styles.txnRow}>
                      <div className={styles.txnIcon} style={{ background: `${meta.color}18`, color: meta.color }}>
                        {meta.emoji}
                      </div>
                      <div className={styles.txnBody}>
                        <span className={styles.txnDesc}>{txn.description}</span>
                        <span className={styles.txnMeta}>{meta.label} · {formatDate(txn.date)}</span>
                      </div>
                      <div className={styles.txnRight}>
                        <span className={`${styles.txnAmount} ${isIncome ? styles.incomeAmt : styles.expenseAmt}`}>
                          {isIncome ? "+" : "-"}{sym}{parseFloat(txn.amount).toFixed(2)}
                        </span>
                        <span className={styles.txnWallet}>{txn.wallet}</span>
                      </div>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => deleteMutation.mutate(txn.id)}
                        aria-label="Delete"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick-Add Bottom Sheet ── */}
      <BottomSheet isOpen={showModal} onClose={() => setShowModal(false)} ariaLabel="Add Transaction">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add Transaction</h2>
          <p className={styles.modalSubtitle}>Log a personal expense or income.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className={styles.bottomSheetForm}>
          {/* Type toggle */}
          <div className={styles.typeToggle}>
            <button
              type="button"
              className={`${styles.typeBtn} ${form.type === "expense" ? styles.typeBtnExpense : ""}`}
              onClick={() => setForm(f => ({ ...f, type: "expense" }))}
            >💸 Expense</button>
            <button
              type="button"
              className={`${styles.typeBtn} ${form.type === "income" ? styles.typeBtnIncome : ""}`}
              onClick={() => setForm(f => ({ ...f, type: "income" }))}
            >💰 Income</button>
          </div>

          {/* Amount */}
          <div className={styles.amountSection}>
            <span className={styles.currencyPrefix}>{sym}</span>
            <input
              id="modal-amount"
              type="number"
              className={styles.amountInput}
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              step="0.01" min="0" required autoFocus
            />
          </div>

          <div className={styles.formGrid}>
            {/* Description */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Description</label>
              <input
                type="text"
                className={styles.input}
                placeholder='e.g. "Chai at Burns Road"'
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            {/* Date */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Date</label>
              <input
                type="date"
                className={styles.input}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          {/* Recurring Toggle */}
          <div className={styles.recurringField}>
            <label className={styles.recurringToggle}>
              <input 
                type="checkbox" 
                checked={form.isRecurring} 
                onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} 
                className={styles.recurringCheckbox}
              />
              <span className={styles.recurringLabel}>🔁 Make this a recurring {form.type}</span>
            </label>
            {form.isRecurring && (
              <select 
                className={styles.recurringSelect}
                value={form.recurringFrequency}
                onChange={e => setForm(f => ({ ...f, recurringFrequency: e.target.value }))}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            )}
          </div>

          {/* Category */}
          <CategoryPicker
            categories={CATEGORIES}
            value={form.category}
            onChange={(id) => setForm(f => ({ ...f, category: id }))}
            label="Category"
            colorized
          />

          {/* Wallet */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Wallet</label>
            <div className={styles.walletPicker}>
              {WALLETS.map(w => (
                <button
                  key={w.id}
                  type="button"
                  className={`${styles.walletBtn} ${form.wallet === w.id ? styles.walletBtnSelected : ""}`}
                  onClick={() => setForm(f => ({ ...f, wallet: w.id }))}
                >
                  {w.emoji} {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={createMutation.isPending || !form.amount || !form.description}
            id="modal-submit"
          >
            {createMutation.isPending ? "Saving…" : "Save Transaction"}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
