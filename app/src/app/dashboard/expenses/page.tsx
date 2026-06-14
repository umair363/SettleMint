"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./expenses.module.css";

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");

  const [token, setToken] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
    }
  }, []);

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ["all_expenses"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/expenses/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!token,
  });

  const expenses = expensesData?.expenses || [];

  const filtered = expenses.filter((e: any) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalSpent = filtered.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Expenses</h1>
          <p className={styles.subtitle}>
            {filtered.length} expenses &middot; ${totalSpent.toFixed(2)} total
          </p>
        </div>
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
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="expenses-search"
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          id="expenses-group-filter"
        >
          <option value="all">All Groups</option>
        </select>
      </div>

      {/* Expense Table */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span className={styles.colMain}>Expense</span>
          <span className={styles.colGroup}>Category</span>
          <span className={styles.colSplit}>Split</span>
          <span className={styles.colDate}>Date</span>
          <span className={styles.colAmount}>Amount</span>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses found.</div>
        ) : (
          filtered.map((exp: any) => (
            <div key={exp.id} className={styles.tableRow}>
              <div className={styles.colMain}>
                <div
                  className={styles.catDot}
                  style={{ background: "#5B8DEF" }}
                />
                <div className={styles.expInfo}>
                  <span className={styles.expDesc}>{exp.description}</span>
                  <span className={styles.expPayer}>Paid by {exp.payerName}</span>
                </div>
              </div>
              <div className={styles.colGroup}>
                <span
                  className={styles.groupTag}
                  style={{ borderColor: `#5B8DEF40`, color: "#5B8DEF" }}
                >
                  {exp.category || "General"}
                </span>
              </div>
              <div className={styles.colSplit}>
                <span className={styles.splitType}>Equal</span>
              </div>
              <div className={styles.colDate}>
                <span className={styles.dateText}>{new Date(exp.date).toLocaleDateString()}</span>
              </div>
              <div className={styles.colAmount}>
                <span className={styles.amountText}>
                  ${parseFloat(exp.amount).toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
