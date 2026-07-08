"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/utils/currency";
import styles from "./analytics.module.css";

const CATEGORIES = [
  { id: "food",          label: "Food & Drink",     emoji: "🍽️", color: "#FF6B6B" },
  { id: "transport",     label: "Transport",         emoji: "🚕", color: "#FFA94D" },
  { id: "accommodation", label: "Accommodation",     emoji: "🏨", color: "#74C0FC" },
  { id: "entertainment", label: "Entertainment",     emoji: "🎬", color: "#B197FC" },
  { id: "shopping",      label: "Shopping",          emoji: "🛍️", color: "#F783AC" },
  { id: "bills",         label: "Bills & Utilities", emoji: "💡", color: "#63E6BE" },
  { id: "groceries",     label: "Groceries",         emoji: "🛒", color: "#A9E34B" },
  { id: "health",        label: "Health",            emoji: "💊", color: "#74C0FC" },
  { id: "other",         label: "Other",             emoji: "📌", color: "#adb5bd" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com";

function getCategoryMeta(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const SIZE = 180;
  const STROKE = 28;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;

  let offset = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const dash = pct * CIRC;
    const slice = { ...d, dash, offset, pct };
    offset += dash;
    return slice;
  });

  return (
    <div className={styles.donutWrap}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.donutSvg}>
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
            strokeDashoffset={-(s.offset - CIRC / 4)}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray 600ms cubic-bezier(.4,0,.2,1)" }}
          />
        ))}
        {/* Center hole */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R - STROKE / 2 - 2} fill="var(--surface-card)" />
      </svg>
      <div className={styles.donutCenter}>
        <span className={styles.donutCenterLabel}>Spent</span>
        <span className={styles.donutCenterValue}>{slices.length}</span>
        <span className={styles.donutCenterSub}>categories</span>
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { month: string; expense: number; income: number }[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.expense, d.income]), 1);

  return (
    <div className={styles.barChart}>
      {data.map((d, i) => {
        const monthLabel = new Date(d.month + "-01").toLocaleString("en-US", { month: "short" });
        return (
          <div key={i} className={styles.barGroup}>
            <div className={styles.bars}>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.bar} ${styles.barExpense}`}
                  style={{ height: `${(d.expense / maxVal) * 100}%` }}
                  title={`Expense: ${d.expense.toFixed(2)}`}
                />
              </div>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.bar} ${styles.barIncome}`}
                  style={{ height: `${(d.income / maxVal) * 100}%` }}
                  title={`Income: ${d.income.toFixed(2)}`}
                />
              </div>
            </div>
            <span className={styles.barLabel}>{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [token, setToken]       = useState("");
  const [currency, setCurrency] = useState("USD");
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

  const { data: analyticsData, isLoading } = useQuery({
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

  const byCategory: any[]   = analyticsData?.byCategory  || [];
  const monthlyTotals: any[] = analyticsData?.monthlyTotals || [];
  const summary             = analyticsData?.summary || { totalExpense: "0", totalIncome: "0", txnCount: 0 };

  const totalExpense = parseFloat(summary.totalExpense) || 0;
  const totalIncome  = parseFloat(summary.totalIncome)  || 0;
  const savings      = totalIncome - totalExpense;

  // Donut data
  const donutData = byCategory
    .filter((c: any) => parseFloat(c.total) > 0)
    .map((c: any) => ({
      label: getCategoryMeta(c.category).label,
      value: parseFloat(c.total),
      color: getCategoryMeta(c.category).color,
    }));

  // Bar chart data
  const barData = monthlyTotals.map((m: any) => ({
    month:   m.month,
    expense: parseFloat(m.expense) || 0,
    income:  parseFloat(m.income)  || 0,
  }));

  // Month nav
  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const prevMonth  = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth  = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const isCurrent  = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

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
          <h1 className={styles.title}>Analytics</h1>
        </div>
        <div className={styles.monthNav}>
          <button className={styles.monthBtn} onClick={prevMonth} aria-label="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button className={styles.monthBtn} onClick={nextMonth} disabled={isCurrent} aria-label="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className={styles.kpiRow}>
        <div className={`${styles.kpiCard} ${styles.kpiExpense}`}>
          <p className={styles.kpiLabel}>Total Spent</p>
          <p className={styles.kpiValue}>{sym}{totalExpense.toFixed(2)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiIncome}`}>
          <p className={styles.kpiLabel}>Total Income</p>
          <p className={styles.kpiValue}>{sym}{totalIncome.toFixed(2)}</p>
        </div>
        <div className={`${styles.kpiCard} ${savings >= 0 ? styles.kpiSavingsPos : styles.kpiSavingsNeg}`}>
          <p className={styles.kpiLabel}>Net Savings</p>
          <p className={styles.kpiValue}>
            {savings >= 0 ? "+" : "-"}{sym}{Math.abs(savings).toFixed(2)}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Avg / Day</p>
          <p className={styles.kpiValue}>
            {sym}{(totalExpense / new Date(viewYear, viewMonth, 0).getDate()).toFixed(2)}
          </p>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className={styles.chartsGrid}>

        {/* Donut */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Spending by Category</h2>
          </div>
          <div className={styles.panelBody}>
            {isLoading ? (
              <div className={styles.chartPlaceholder}>Loading…</div>
            ) : donutData.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <p>No data for this month</p>
              </div>
            ) : (
              <div className={styles.donutSection}>
                <DonutChart data={donutData} />
                <div className={styles.legend}>
                  {donutData
                    .sort((a, b) => b.value - a.value)
                    .map((d, i) => {
                      const pct = ((d.value / (totalExpense || 1)) * 100).toFixed(1);
                      return (
                        <div key={i} className={styles.legendRow}>
                          <span className={styles.legendDot} style={{ background: d.color }} />
                          <span className={styles.legendLabel}>{d.label}</span>
                          <span className={styles.legendPct}>{pct}%</span>
                          <span className={styles.legendAmt}>{sym}{d.value.toFixed(2)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart — last 6 months */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Monthly Trend (Last 6 Months)</h2>
            <div className={styles.barLegend}>
              <span className={styles.barLegendItem}>
                <span className={styles.barLegendDot} style={{ background: "#ff6b6b" }} /> Expense
              </span>
              <span className={styles.barLegendItem}>
                <span className={styles.barLegendDot} style={{ background: "#3DD68C" }} /> Income
              </span>
            </div>
          </div>
          <div className={styles.panelBody}>
            {isLoading ? (
              <div className={styles.chartPlaceholder}>Loading…</div>
            ) : barData.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📈</div>
                <p>Not enough data yet</p>
              </div>
            ) : (
              <BarChart data={barData} />
            )}
          </div>
        </div>
      </div>

      {/* ── Top Categories Table ── */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Category Breakdown</h2>
        </div>
        <div className={styles.panelBody}>
          {byCategory.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏷️</div>
              <p>No spending recorded</p>
            </div>
          ) : (
            <div className={styles.breakdownTable}>
              {byCategory
                .sort((a: any, b: any) => parseFloat(b.total) - parseFloat(a.total))
                .map((c: any, i: number) => {
                  const meta  = getCategoryMeta(c.category);
                  const spent = parseFloat(c.total) || 0;
                  const pct   = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
                  return (
                    <div key={c.category} className={styles.breakdownRow}>
                      <span className={styles.breakdownRank}>#{i + 1}</span>
                      <span className={styles.breakdownEmoji}>{meta.emoji}</span>
                      <div className={styles.breakdownInfo}>
                        <span className={styles.breakdownLabel}>{meta.label}</span>
                        <div className={styles.breakdownBar}>
                          <div
                            className={styles.breakdownBarFill}
                            style={{ width: `${pct}%`, background: meta.color }}
                          />
                        </div>
                      </div>
                      <span className={styles.breakdownPct}>{pct.toFixed(1)}%</span>
                      <span className={styles.breakdownAmt}>{sym}{spent.toFixed(2)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
