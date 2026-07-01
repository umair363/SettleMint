"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import styles from "./expenses.module.css";
import { getCurrencySymbol, convertCurrency } from "@/utils/currency";

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");

  const [token, setToken] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setDefaultCurrency(parsed.user.defaultCurrency || "USD");
    }
  }, []);

  const sym = getCurrencySymbol(defaultCurrency);

  // Fetch all user's expenses
  const { data: expensesData, isLoading: isAllLoading } = useQuery({
    queryKey: ["all_expenses"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com";
      const res = await fetch(`${baseUrl}/api/expenses/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch user's groups to populate dropdown
  const { data: groupsData } = useQuery({
    queryKey: ["my_groups"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com";
      const res = await fetch(`${baseUrl}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch search results via Typesense if query is active
  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ["expenses_search", search, filterGroup],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com";
      let url = `${baseUrl}/api/expenses/search?q=${encodeURIComponent(search)}`;
      if (filterGroup !== "all") {
        url += `&groupId=${filterGroup}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to search expenses");
      return res.json();
    },
    enabled: !!token && search.trim().length > 0,
  });

  const groupsList = groupsData?.groups || [];
  const rawExpenses = search.trim().length > 0 
    ? (searchData?.expenses || []) 
    : (expensesData?.expenses || []);

  // Client-side group filter when search is not active, or as backup
  const filtered = rawExpenses.filter((e: any) => {
    if (filterGroup !== "all" && e.groupId !== filterGroup) {
      return false;
    }
    return true;
  });

  const isLoading = isAllLoading || (search.trim().length > 0 && isSearchLoading);

  const totalSpent = filtered.reduce((sum: number, e: any) => {
    const amountInDefault = convertCurrency(parseFloat(e.amount), e.currency || "USD", defaultCurrency);
    return sum + amountInDefault;
  }, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Expenses</h1>
          <p className={styles.subtitle}>
            {filtered.length} expenses &middot; {sym}{totalSpent.toFixed(2)} total (converted to {defaultCurrency})
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
          {groupsList.map((g: any) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem 0' }}>
            <Skeleton height="48px" borderRadius="8px" />
            <Skeleton height="48px" borderRadius="8px" />
            <Skeleton height="48px" borderRadius="8px" />
            <Skeleton height="48px" borderRadius="8px" />
            <Skeleton height="48px" borderRadius="8px" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses found.</div>
        ) : (
          filtered.map((exp: any) => {
            const amountInDefault = convertCurrency(parseFloat(exp.amount), exp.currency || "USD", defaultCurrency);
            return (
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className={styles.amountText}>
                      {getCurrencySymbol(exp.currency)}{parseFloat(exp.amount).toFixed(2)}
                    </span>
                    {exp.currency !== defaultCurrency && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        ({sym}{amountInDefault.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
