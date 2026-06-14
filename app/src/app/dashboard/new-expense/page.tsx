"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./new-expense.module.css";
import { getCurrencySymbol } from "@/utils/currency";

const categories = [
  { id: "food", label: "Food & Drink", emoji: "🍽" },
  { id: "transport", label: "Transport", emoji: "🚕" },
  { id: "accommodation", label: "Accommodation", emoji: "🏨" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "shopping", label: "Shopping", emoji: "🛍" },
  { id: "bills", label: "Bills & Utilities", emoji: "💡" },
  { id: "groceries", label: "Groceries", emoji: "🛒" },
  { id: "health", label: "Health", emoji: "💊" },
  { id: "other", label: "Other", emoji: "📌" },
];

const splitTypes = [
  { id: "equal", label: "Split Equally", description: "Divide evenly among all members" },
  { id: "unequal", label: "Exact Amounts", description: "Enter specific amount per person" },
  { id: "percentage", label: "By Percentage", description: "Split by percentage shares" },
  { id: "shares", label: "By Shares", description: "2:1:1 ratio style splitting" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [expenseMode, setExpenseMode] = useState<"group" | "individual">("group");
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFriend, setSelectedFriend] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("food");
  const [selectedSplit, setSelectedSplit] = useState("equal");
  
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setCurrentUserId(parsed.user.id);
      setDefaultCurrency(parsed.user.defaultCurrency || "USD");
    }
  }, []);

  // Fetch user's groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/groups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!token && expenseMode === "group",
  });
  const groups = groupsData?.groups || [];

  // Fetch user's friends
  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/friends", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json();
    },
    enabled: !!token && expenseMode === "individual",
  });
  const friends = friendsData?.friends || [];

  // Fetch selected group details to get members for splitting
  const { data: selectedGroupData, isLoading: groupDetailsLoading } = useQuery({
    queryKey: ["group", selectedGroup],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/groups/${selectedGroup}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch group details");
      return res.json();
    },
    enabled: !!token && !!selectedGroup && expenseMode === "group",
  });

  const activeCurrency = expenseMode === "group" 
    ? (selectedGroupData?.group?.baseCurrency || defaultCurrency) 
    : defaultCurrency;
  
  const sym = getCurrencySymbol(activeCurrency);

  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      let splits = [];
      const totalAmount = parseFloat(amount);

      if (expenseMode === "group") {
        const members = selectedGroupData?.group?.members || [];
        if (members.length === 0) throw new Error("Group has no members");
        const perPerson = totalAmount / members.length;
        splits = members.map((m: any) => ({
          userId: m.id,
          amountOwed: perPerson.toFixed(2),
        }));
      } else {
        if (!selectedFriend) throw new Error("No friend selected");
        const perPerson = totalAmount / 2;
        splits = [
          { userId: currentUserId, amountOwed: perPerson.toFixed(2) },
          { userId: selectedFriend, amountOwed: perPerson.toFixed(2) }
        ];
      }

      const res = await fetch("http://localhost:8000/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId: expenseMode === "group" ? selectedGroup : null,
          description,
          amount: totalAmount,
          category: selectedCategory,
          splits,
          currency: activeCurrency,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create expense");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["group"] });
      queryClient.invalidateQueries({ queryKey: ["all_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["recent_expenses"] });
      
      if (expenseMode === "group") {
        router.push(`/dashboard/groups/${selectedGroup}`);
      } else {
        router.push(`/dashboard/friends`);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (expenseMode === "group" && !selectedGroupData) {
      setErrorMsg("Please wait for group details to load or select a valid group.");
      return;
    }
    if (expenseMode === "individual" && !selectedFriend) {
      setErrorMsg("Please select a friend to split with.");
      return;
    }
    createExpenseMutation.mutate();
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>Add Expense</h2>
        <p className={styles.subtitle}>
          Log a new shared expense with a group or a friend directly.
        </p>

        {/* Mode Selector */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", background: "var(--bg-secondary)", padding: "0.5rem", borderRadius: "12px" }}>
          <button 
            type="button"
            onClick={() => setExpenseMode("group")}
            style={{ 
              flex: 1, 
              padding: "0.8rem", 
              borderRadius: "8px", 
              border: "none", 
              fontWeight: 600,
              backgroundColor: expenseMode === "group" ? "var(--bg-primary)" : "transparent",
              color: expenseMode === "group" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: expenseMode === "group" ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            With a Group
          </button>
          <button 
            type="button"
            onClick={() => setExpenseMode("individual")}
            style={{ 
              flex: 1, 
              padding: "0.8rem", 
              borderRadius: "8px", 
              border: "none", 
              fontWeight: 600,
              backgroundColor: expenseMode === "individual" ? "var(--bg-primary)" : "transparent",
              color: expenseMode === "individual" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: expenseMode === "individual" ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Individual Friend
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: "#ff6b6b", background: "rgba(255, 107, 107, 0.1)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: "8px", padding: "0.8rem 1rem", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Amount - Big hero input */}
          <div className={styles.amountSection}>
            <span className={styles.currencyPrefix}>{sym}</span>
            <input
              type="number"
              className={styles.amountInput}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              required
              autoFocus
              id="expense-amount"
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="expense-desc">What was it for?</label>
            <input
              id="expense-desc"
              type="text"
              className={styles.input}
              placeholder='e.g. "Dinner at Sakura" or "Uber to airport"'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Context Selector */}
          <div className={styles.field}>
            <label className={styles.label}>{expenseMode === "group" ? "Group" : "Friend"}</label>
            
            {expenseMode === "group" ? (
              <div className={styles.groupPicker}>
                {groupsLoading ? (
                  <div className="text-secondary" style={{ fontSize: "0.9rem" }}>Loading your groups...</div>
                ) : groups.length === 0 ? (
                  <div className="text-secondary" style={{ fontSize: "0.9rem" }}>No groups found. Create a group first!</div>
                ) : (
                  groups.map((g: any) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`${styles.groupChip} ${selectedGroup === g.id ? styles.groupChipSelected : ""}`}
                      onClick={() => {
                        setSelectedGroup(g.id);
                        setErrorMsg("");
                      }}
                      style={{ "--chip-color": g.color || "#3DD68C" } as React.CSSProperties}
                    >
                      <span className={styles.chipDot} style={{ background: g.color || "#3DD68C" }} />
                      {g.name}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className={styles.groupPicker}>
                {friendsLoading ? (
                  <div className="text-secondary" style={{ fontSize: "0.9rem" }}>Loading your friends...</div>
                ) : friends.length === 0 ? (
                  <div className="text-secondary" style={{ fontSize: "0.9rem" }}>No friends found. Add friends first!</div>
                ) : (
                  friends.map((f: any) => (
                    <button
                      key={f.friendId}
                      type="button"
                      className={`${styles.groupChip} ${selectedFriend === f.friendId ? styles.groupChipSelected : ""}`}
                      onClick={() => {
                        setSelectedFriend(f.friendId);
                        setErrorMsg("");
                      }}
                      style={{ "--chip-color": "#4a90e2" } as React.CSSProperties}
                    >
                      {f.friendAvatar ? (
                        <img src={f.friendAvatar} alt="" style={{ width: 16, height: 16, borderRadius: "50%", marginRight: 6 }} />
                      ) : (
                        <span className={styles.chipDot} style={{ background: "#4a90e2" }} />
                      )}
                      {f.friendName}
                    </button>
                  ))
                )}
              </div>
            )}
            
            {expenseMode === "group" && selectedGroup && groupDetailsLoading && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Loading splitting participants...
              </div>
            )}
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <div className={styles.categoryGrid}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.categoryBtn} ${selectedCategory === c.id ? styles.categoryBtnSelected : ""}`}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  <span className={styles.categoryEmoji}>{c.emoji}</span>
                  <span className={styles.categoryLabel}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split type */}
          <div className={styles.field}>
            <label className={styles.label}>How to split</label>
            <div className={styles.splitOptions}>
              {splitTypes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.splitOption} ${selectedSplit === s.id ? styles.splitOptionSelected : ""}`}
                  onClick={() => setSelectedSplit(s.id)}
                >
                  <span className={styles.splitLabel}>{s.label}</span>
                  <span className={styles.splitDesc}>{s.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={
              createExpenseMutation.isPending || 
              !amount || 
              !description || 
              (expenseMode === "group" ? !selectedGroup || groupDetailsLoading : !selectedFriend)
            }
            id="expense-submit"
          >
            {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
