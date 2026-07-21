"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/utils/currency";
import { CATEGORIES, getCategoryMeta, getApiUrl } from "@settlemint/shared";
import PageHeader from "@/components/PageHeader";
import styles from "./analytics.module.css";

const API = getApiUrl();

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ data, currencySymbol }: { data: { label: string; value: number; color: string }[]; currencySymbol: string }) {
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

  // Screen-reader summary — the SVG itself conveys the same breakdown that's
  // already rendered as text in the legend, so this mirrors that rather than
  // relying on color/position alone.
  const summary = slices
    .sort((a, b) => b.value - a.value)
    .map(s => `${s.label}: ${currencySymbol}${s.value.toFixed(2)} (${(s.pct * 100).toFixed(0)}%)`)
    .join(", ");

  return (
    <div className={styles.donutWrap}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.donutSvg}
        role="img"
        aria-label={`Spending by category: ${summary}`}
      >
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
      <div className={styles.donutCenter} aria-hidden="true">
        <span className={styles.donutCenterLabel}>Spent</span>
        <span className={styles.donutCenterValue}>{slices.length}</span>
        <span className={styles.donutCenterSub}>categories</span>
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function BarChart({ data, currencySymbol }: { data: { month: string; expense: number; income: number }[]; currencySymbol: string }) {
  const maxVal = Math.max(...data.flatMap(d => [d.expense, d.income]), 1);

  const summary = data
    .map(d => {
      const monthLabel = new Date(d.month + "-01").toLocaleString("en-US", { month: "short", year: "numeric" });
      return `${monthLabel}: ${currencySymbol}${d.expense.toFixed(2)} expense, ${currencySymbol}${d.income.toFixed(2)} income`;
    })
    .join("; ");

  return (
    <div className={styles.barChart} role="img" aria-label={`Monthly expense and income trend: ${summary}`}>
      {data.map((d, i) => {
        const monthLabel = new Date(d.month + "-01").toLocaleString("en-US", { month: "short" });
        return (
          <div key={i} className={styles.barGroup} aria-hidden="true">
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

  const byCategory: any[]         = analyticsData?.byCategory  || [];
  const byCategoryPrevMonth: any[] = analyticsData?.byCategoryPrevMonth || [];
  const monthlyTotals: any[]      = analyticsData?.monthlyTotals || [];
  const summary                   = analyticsData?.summary || { totalExpense: "0", totalIncome: "0", txnCount: 0 };

  const totalExpense = parseFloat(summary.totalExpense) || 0;
  const totalIncome  = parseFloat(summary.totalIncome)  || 0;
  const savings      = totalIncome - totalExpense;

  // Previous month's spend per category, for the "vs last month" trend badges below
  const prevMonthByCategory = new Map<string, number>(
    byCategoryPrevMonth.map((c: any) => [c.category, parseFloat(c.total) || 0])
  );

  // Donut data
  const donutData = byCategory
    .filter((c: any) => parseFloat(c.total) > 0)
    .map((c: any) => {
      const value = parseFloat(c.total);
      const prevValue = prevMonthByCategory.get(c.category) ?? 0;
      // null = no prior-month baseline to compare against (new category, or
      // the previous month had zero spend) rather than a misleading 0%/∞%.
      const trendPct = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
      return {
        category: c.category,
        label: getCategoryMeta(c.category).label,
        value,
        color: getCategoryMeta(c.category).color,
        trendPct,
      };
    });

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
    <div className={`${styles.page} pageShell`}>

      <PageHeader
        backHref="/dashboard/budget"
        backLabel="Budget Hub"
        title="Analytics"
        action={
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
        }
      />

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
                <DonutChart data={donutData} currencySymbol={sym} />
                <div className={styles.legend}>
                  {donutData
                    .sort((a, b) => b.value - a.value)
                    .map((d, i) => {
                      const pct = ((d.value / (totalExpense || 1)) * 100).toFixed(1);
                      return (
                        <div key={i} className={styles.legendRow}>
                          <span className={styles.legendDot} style={{ background: d.color }} />
                          <span className={styles.legendLabel}>{d.label}</span>
                          {d.trendPct !== null && Math.abs(d.trendPct) >= 1 && (
                            <span
                              className={`${styles.legendTrend} ${d.trendPct > 0 ? styles.legendTrendUp : styles.legendTrendDown}`}
                              title={`${d.trendPct > 0 ? "Up" : "Down"} ${Math.abs(d.trendPct).toFixed(0)}% vs last month`}
                            >
                              {d.trendPct > 0 ? "↑" : "↓"}{Math.abs(d.trendPct).toFixed(0)}%
                            </span>
                          )}
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
              <BarChart data={barData} currencySymbol={sym} />
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
