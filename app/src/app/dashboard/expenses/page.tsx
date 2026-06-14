"use client";

import { useState } from "react";
import styles from "./expenses.module.css";

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  groupName: string;
  groupColor: string;
  category: string;
  categoryColor: string;
  splitType: string;
  date: string;
  time: string;
}

const mockExpenses: Expense[] = [
  { id: "e1", description: "Airport Taxi", amount: 45.00, currency: "USD", paidBy: "You", groupName: "SE Asia Trip", groupColor: "#5B8DEF", category: "Transport", categoryColor: "#5B8DEF", splitType: "Equal", date: "Jun 14", time: "2h ago" },
  { id: "e2", description: "Groceries (Aldi)", amount: 87.30, currency: "USD", paidBy: "Hamza", groupName: "Apartment 4B", groupColor: "#20C997", category: "Food", categoryColor: "#FF6B6B", splitType: "Equal", date: "Jun 14", time: "5h ago" },
  { id: "e3", description: "Museum Tickets", amount: 36.00, currency: "USD", paidBy: "You", groupName: "SE Asia Trip", groupColor: "#5B8DEF", category: "Activities", categoryColor: "#FFA94D", splitType: "Equal", date: "Jun 13", time: "Yesterday" },
  { id: "e4", description: "WiFi Bill (June)", amount: 49.99, currency: "USD", paidBy: "Sarah", groupName: "Apartment 4B", groupColor: "#20C997", category: "Bills", categoryColor: "#20C997", splitType: "Equal", date: "Jun 12", time: "2 days" },
  { id: "e5", description: "Dinner at Sakura", amount: 128.00, currency: "USD", paidBy: "You", groupName: "Date Night Fund", groupColor: "#B197FC", category: "Restaurant", categoryColor: "#E05D9E", splitType: "Custom (60/40)", date: "Jun 11", time: "3 days" },
  { id: "e6", description: "Uber to Hotel", amount: 22.50, currency: "USD", paidBy: "Zain", groupName: "SE Asia Trip", groupColor: "#5B8DEF", category: "Transport", categoryColor: "#5B8DEF", splitType: "Equal", date: "Jun 11", time: "3 days" },
  { id: "e7", description: "Street Food Tour", amount: 65.00, currency: "THB", paidBy: "You", groupName: "SE Asia Trip", groupColor: "#5B8DEF", category: "Food", categoryColor: "#FF6B6B", splitType: "Equal", date: "Jun 10", time: "4 days" },
  { id: "e8", description: "Electricity Bill", amount: 142.00, currency: "USD", paidBy: "You", groupName: "Apartment 4B", groupColor: "#20C997", category: "Bills", categoryColor: "#20C997", splitType: "Shares (2:1:1)", date: "Jun 9", time: "5 days" },
];

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");

  const groups = ["all", "SE Asia Trip", "Apartment 4B", "Date Night Fund"];

  const filtered = mockExpenses.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup === "all" || e.groupName === filterGroup;
    return matchSearch && matchGroup;
  });

  const totalSpent = filtered.reduce((sum, e) => sum + e.amount, 0);

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
          {groups.map((g) => (
            <option key={g} value={g}>
              {g === "all" ? "All Groups" : g}
            </option>
          ))}
        </select>
      </div>

      {/* Expense Table */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span className={styles.colMain}>Expense</span>
          <span className={styles.colGroup}>Group</span>
          <span className={styles.colSplit}>Split</span>
          <span className={styles.colDate}>Date</span>
          <span className={styles.colAmount}>Amount</span>
        </div>
        {filtered.map((exp) => (
          <div key={exp.id} className={styles.tableRow}>
            <div className={styles.colMain}>
              <div
                className={styles.catDot}
                style={{ background: exp.categoryColor }}
              />
              <div className={styles.expInfo}>
                <span className={styles.expDesc}>{exp.description}</span>
                <span className={styles.expPayer}>Paid by {exp.paidBy}</span>
              </div>
            </div>
            <div className={styles.colGroup}>
              <span
                className={styles.groupTag}
                style={{ borderColor: `${exp.groupColor}40`, color: exp.groupColor }}
              >
                {exp.groupName}
              </span>
            </div>
            <div className={styles.colSplit}>
              <span className={styles.splitType}>{exp.splitType}</span>
            </div>
            <div className={styles.colDate}>
              <span className={styles.dateText}>{exp.date}</span>
            </div>
            <div className={styles.colAmount}>
              <span className={styles.amountText}>
                ${exp.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
