"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@settlemint/shared";
import styles from "./GlobalSearch.module.css";

interface ExpenseSplit {
  id: string;
  userId: string;
  amountOwed: string;
  isSettled: boolean;
}

interface SearchResult {
  id: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  category: string | null;
  paidBy: string;
  payerName: string;
  splits: ExpenseSplit[];
}

const API_URL =
  getApiUrl();

function formatCurrency(amount: string, currency: string) {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCategoryIcon(category: string | null) {
  const icons: Record<string, string> = {
    food: "🍔",
    transport: "🚗",
    entertainment: "🎬",
    utilities: "💡",
    shopping: "🛍️",
    travel: "✈️",
    health: "💊",
    other: "📌",
  };
  return icons[category?.toLowerCase() || "other"] || "📌";
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      setNoResults(false);
      return;
    }

    setIsLoading(true);
    setNoResults(false);

    try {
      const sessionStr = localStorage.getItem("settlemint_session");
      if (!sessionStr) return;
      const { token } = JSON.parse(sessionStr);

      const res = await fetch(
        `${API_URL}/api/expenses/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      const found: SearchResult[] = data.expenses || [];
      setResults(found);
      setNoResults(found.length === 0);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
      setNoResults(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search — fires 300ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      setNoResults(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceTimer.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsExpanded(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Arrow key navigation through results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      navigateToExpense(results[selectedIndex]);
    }
  };

  const navigateToExpense = (expense: SearchResult) => {
    setIsOpen(false);
    setIsExpanded(false);
    setQuery("");
    router.push(`/dashboard/expenses`);
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.searchWrapper} ${isExpanded ? styles.expanded : ""}`}
    >
      {/* Collapsed icon-only trigger */}
      {!isExpanded && (
        <button
          className={styles.searchTrigger}
          onClick={handleExpand}
          aria-label="Search expenses (Ctrl+K)"
          id="topbar-search-trigger"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M21 21L16.65 16.65"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {/* Expanded search input */}
      {isExpanded && (
        <div className={styles.searchInputWrapper}>
          <svg
            className={styles.searchIcon}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M21 21L16.65 16.65"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          <input
            ref={inputRef}
            id="global-search-input"
            className={styles.searchInput}
            type="text"
            placeholder="Search expenses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search expenses"
            aria-autocomplete="list"
            aria-expanded={isOpen}
          />

          {isLoading && <div className={styles.loadingDot} aria-hidden="true" />}

          {query && !isLoading && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          <kbd className={styles.kbdHint}>ESC</kbd>
        </div>
      )}

      {/* Results dropdown */}
      {isExpanded && isOpen && (
        <div
          className={styles.dropdown}
          role="listbox"
          aria-label="Search results"
        >
          {results.length > 0 ? (
            <>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownLabel}>
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </span>
                <span className={styles.dropdownHint}>↑↓ navigate · ↵ open</span>
              </div>

              <ul className={styles.resultsList}>
                {results.map((expense, index) => (
                  <li
                    key={expense.id}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`${styles.resultItem} ${
                      index === selectedIndex ? styles.resultItemActive : ""
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => navigateToExpense(expense)}
                    id={`search-result-${index}`}
                  >
                    <span className={styles.resultIcon} aria-hidden="true">
                      {getCategoryIcon(expense.category)}
                    </span>

                    <div className={styles.resultBody}>
                      <span className={styles.resultDescription}>
                        {expense.description}
                      </span>
                      <span className={styles.resultMeta}>
                        Paid by {expense.payerName} · {formatDate(expense.date)}
                      </span>
                    </div>

                    <div className={styles.resultAmount}>
                      <span>{formatCurrency(expense.amount, expense.currency)}</span>
                      <span className={styles.resultCurrency}>
                        {expense.currency}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className={styles.dropdownFooter}>
                <span>Powered by Typesense · instant search</span>
              </div>
            </>
          ) : noResults ? (
            <div className={styles.emptyState}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className={styles.emptyIcon}
              >
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className={styles.emptyTitle}>No expenses found</span>
              <span className={styles.emptySubtitle}>
                Try searching by description, category, or notes
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
