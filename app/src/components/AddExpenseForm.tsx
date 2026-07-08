"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./AddExpenseForm.module.css";
import { getCurrencySymbol } from "@/utils/currency";
import { offlineSync } from "@/utils/offlineSync";

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

type SplitType = "equal" | "unequal" | "percentage" | "shares";

interface MemberSplit {
  userId: string;
  fullName: string;
  checked: boolean; // for equal mode
  value: string;    // amount | percentage | shares depending on mode
}

interface AddExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddExpenseForm({ onSuccess, onCancel }: AddExpenseFormProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [expenseMode, setExpenseMode] = useState<"group" | "individual">("group");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFriend, setSelectedFriend] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("food");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [paidByUserId, setPaidByUserId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [memberSplits, setMemberSplits] = useState<MemberSplit[]>([]);
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [errorMsg, setErrorMsg] = useState("");

  // AI states
  const [mintBotText, setMintBotText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setCurrentUserId(parsed.user.id);
      setDefaultCurrency(parsed.user.defaultCurrency || "USD");
      setPaidByUserId(parsed.user.id);
    }
  }, []);

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!token && expenseMode === "group",
  });
  const groups = groupsData?.groups || [];

  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json();
    },
    enabled: !!token && expenseMode === "individual",
  });
  const friends = friendsData?.friends || [];

  const { data: selectedGroupData, isLoading: groupDetailsLoading } = useQuery({
    queryKey: ["group", selectedGroup],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/groups/${selectedGroup}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch group details");
      return res.json();
    },
    enabled: !!token && !!selectedGroup && expenseMode === "group",
  });

  const activeCurrency =
    expenseMode === "group"
      ? selectedGroupData?.group?.baseCurrency || defaultCurrency
      : defaultCurrency;
  const sym = getCurrencySymbol(activeCurrency);

  // When group members load, initialise the split rows
  useEffect(() => {
    const members = selectedGroupData?.group?.members || [];
    if (members.length > 0) {
      setMemberSplits(
        members.map((m: any) => ({
          userId: m.id,
          fullName: m.fullName,
          checked: true,
          value: "",
        }))
      );
      // Default paid-by to current user if they're a member
      if (members.find((m: any) => m.id === currentUserId)) {
        setPaidByUserId(currentUserId);
      } else {
        setPaidByUserId(members[0].id);
      }
    }
  }, [selectedGroupData, currentUserId]);

  // When individual friend selected, seed a 2-person split
  useEffect(() => {
    if (expenseMode === "individual" && selectedFriend && currentUserId) {
      const friend = friends.find((f: any) => f.friendId === selectedFriend);
      setMemberSplits([
        { userId: currentUserId, fullName: "You", checked: true, value: "" },
        {
          userId: selectedFriend,
          fullName: friend?.friendName || "Friend",
          checked: true,
          value: "",
        },
      ]);
      setPaidByUserId(currentUserId);
    }
  }, [selectedFriend, expenseMode, currentUserId]);

  // Derived: participants (checked in equal mode / always all in other modes)
  const participants = useMemo(
    () =>
      splitType === "equal"
        ? memberSplits.filter((m) => m.checked)
        : memberSplits,
    [memberSplits, splitType]
  );

  const totalAmount = parseFloat(amount) || 0;

  // Validation helpers
  const splitValidation = useMemo(() => {
    if (!amount || totalAmount <= 0) return { valid: false, message: "" };
    if (splitType === "equal") {
      if (participants.length === 0)
        return { valid: false, message: "Select at least one person to split with." };
      return { valid: true, message: "" };
    }
    if (splitType === "unequal") {
      const sum = memberSplits.reduce(
        (acc, m) => acc + (parseFloat(m.value) || 0),
        0
      );
      const diff = Math.abs(sum - totalAmount);
      if (diff > 0.01)
        return {
          valid: false,
          message: `Amounts must add up to ${sym}${totalAmount.toFixed(2)}. Current total: ${sym}${sum.toFixed(2)}.`,
        };
      return { valid: true, message: "" };
    }
    if (splitType === "percentage") {
      const sum = memberSplits.reduce(
        (acc, m) => acc + (parseFloat(m.value) || 0),
        0
      );
      const diff = Math.abs(sum - 100);
      if (diff > 0.01)
        return {
          valid: false,
          message: `Percentages must add up to 100%. Current total: ${sum.toFixed(1)}%.`,
        };
      return { valid: true, message: "" };
    }
    if (splitType === "shares") {
      const totalShares = memberSplits.reduce(
        (acc, m) => acc + (parseFloat(m.value) || 0),
        0
      );
      if (totalShares <= 0)
        return { valid: false, message: "Enter at least one share value." };
      return { valid: true, message: "" };
    }
    return { valid: true, message: "" };
  }, [splitType, memberSplits, totalAmount, amount, sym]);

  // Compute preview splits
  const splitPreviews = useMemo(() => {
    if (!totalAmount || memberSplits.length === 0) return [];
    if (splitType === "equal") {
      const n = participants.length || 1;
      const per = totalAmount / n;
      return memberSplits.map((m) => ({
        userId: m.userId,
        amountOwed: m.checked ? per : 0,
        label: m.checked ? `${sym}${per.toFixed(2)}` : "excluded",
      }));
    }
    if (splitType === "unequal") {
      return memberSplits.map((m) => ({
        userId: m.userId,
        amountOwed: parseFloat(m.value) || 0,
        label: `${sym}${(parseFloat(m.value) || 0).toFixed(2)}`,
      }));
    }
    if (splitType === "percentage") {
      return memberSplits.map((m) => {
        const pct = parseFloat(m.value) || 0;
        const amt = (pct / 100) * totalAmount;
        return {
          userId: m.userId,
          amountOwed: amt,
          label: `${sym}${amt.toFixed(2)} (${pct}%)`,
        };
      });
    }
    if (splitType === "shares") {
      const totalShares = memberSplits.reduce(
        (acc, m) => acc + (parseFloat(m.value) || 0),
        0
      );
      return memberSplits.map((m) => {
        const sh = parseFloat(m.value) || 0;
        const amt = totalShares > 0 ? (sh / totalShares) * totalAmount : 0;
        return {
          userId: m.userId,
          amountOwed: amt,
          label: `${sym}${amt.toFixed(2)} (${sh} share${sh !== 1 ? "s" : ""})`,
        };
      });
    }
    return [];
  }, [splitType, memberSplits, totalAmount, participants, sym]);

  function updateMemberValue(userId: string, val: string) {
    setMemberSplits((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, value: val } : m))
    );
  }

  function toggleMemberCheck(userId: string) {
    setMemberSplits((prev) =>
      prev.map((m) =>
        m.userId === userId ? { ...m, checked: !m.checked } : m
      )
    );
  }

  // --- AI MUTATIONS --- //
  const parseNLPMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/ai/parse-nlp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to parse natural language");
      return res.json();
    },
    onSuccess: (data) => {
      const { description: nlpDesc, totalAmount, currency, splitType: nlpSplitType } = data.result;
      if (nlpDesc) setDescription(nlpDesc);
      if (totalAmount) setAmount(totalAmount.toString());
      if (nlpSplitType) setSplitType(nlpSplitType.toLowerCase() as SplitType);
      setMintBotText(""); // clear input after success
    },
    onError: (err: any) => setErrorMsg(err.message),
  });

  const handleMintBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mintBotText.trim()) {
      parseNLPMutation.mutate(mintBotText);
    }
  };

  const scanReceiptMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/ai/scan-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base64Image }),
      });
      if (!res.ok) throw new Error("Failed to scan receipt");
      return res.json();
    },
    onSuccess: (data) => {
      const { merchantName, totalAmount, date: receiptDate } = data.result;
      if (merchantName) setDescription(merchantName);
      if (totalAmount) setAmount(totalAmount.toString());
      if (receiptDate) setDate(receiptDate);
    },
    onError: (err: any) => setErrorMsg(err.message),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      scanReceiptMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };
  // --------------------- //

  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      const splits = splitPreviews
        .filter((s) => s.amountOwed > 0)
        .map((s) => ({ userId: s.userId, amountOwed: s.amountOwed.toFixed(2) }));

      if (splits.length === 0) throw new Error("No valid splits.");

      const payload = {
        groupId: expenseMode === "group" ? selectedGroup : null,
        description,
        amount: totalAmount,
        category: selectedCategory,
        splits,
        currency: activeCurrency,
        paidBy: paidByUserId,
        date,
        notes: notes || null,
      };

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create expense");
        }
        return res.json();
      } catch (err: any) {
        // TypeError indicates a network error (e.g. offline)
        if (err.name === "TypeError" || (typeof navigator !== "undefined" && !navigator.onLine)) {
          console.warn("Network error creating expense, queuing offline...");
          offlineSync.queueExpense(payload);
          return { offline: true };
        }
        throw err;
      }
    },
    onSuccess: () => {
      // Clear form
      setDescription("");
      setAmount("");
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
      }
    },
    onError: (err: any) => {setErrorMsg(err.message)},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!splitValidation.valid) {
      setErrorMsg(splitValidation.message);
      return;
    }
    createExpenseMutation.mutate();
  };

  const members = selectedGroupData?.group?.members || [];
  const canSubmit =
    !createExpenseMutation.isPending &&
    !!amount &&
    !!description &&
    (expenseMode === "group"
      ? !!selectedGroup && !groupDetailsLoading && members.length > 0
      : !!selectedFriend) &&
    splitValidation.valid;

  return (
    <div className={styles.formContainer}>
      {/* Header handled by BottomSheet, but we keep a subtitle if needed, or remove completely */}
      <div className={styles.pageHeader}>
        <p className={styles.subtitle}>
          Log a shared expense and split it exactly how you want.
        </p>
      </div>

        {/* Mode Toggle */}
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeBtn} ${expenseMode === "group" ? styles.modeBtnActive : ""}`}
            onClick={() => setExpenseMode("group")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            With a Group
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${expenseMode === "individual" ? styles.modeBtnActive : ""}`}
            onClick={() => setExpenseMode("individual")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 20v-1a8 8 0 0116 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Individual Friend
          </button>
        </div>

        {errorMsg && (
          <div className={styles.errorBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {errorMsg}
          </div>
        )}

        {/* --- AI Magic Tools Section --- */}
        <div className={styles.aiContainer}>
          <div className={styles.aiHeader}>
            <span className={styles.aiBadge}>✨ AI Tools</span>
            <p className={styles.aiSub}>Auto-fill your expense instantly.</p>
          </div>
          
          <div className={styles.aiToolsGrid}>
            <div className={styles.mintBotBox}>
              <form onSubmit={handleMintBotSubmit} className={styles.mintBotForm}>
                <input
                  type="text"
                  placeholder="e.g. Dinner 4500 split 3 ways I paid"
                  className={styles.mintBotInput}
                  value={mintBotText}
                  onChange={(e) => setMintBotText(e.target.value)}
                />
                <button type="submit" className={styles.mintBotBtn} disabled={parseNLPMutation.isPending}>
                  {parseNLPMutation.isPending ? "Parsing..." : "Ask MintBot"}
                </button>
              </form>
            </div>

            <div className={styles.receiptBox}>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className={styles.hiddenFile}
                style={{ display: 'none' }}
              />
              <button 
                type="button" 
                className={styles.receiptBtn} 
                onClick={() => fileInputRef.current?.click()}
                disabled={scanReceiptMutation.isPending}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 15l4-4c1.33-1.33 3.67-1.33 5 0l2 2m2-2c1.33-1.33 3.67-1.33 5 0l4 4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {scanReceiptMutation.isPending ? "Scanning..." : "Scan Receipt"}
              </button>
            </div>
          </div>
        </div>
        {/* ------------------------------- */}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* HERO: Amount + Currency */}
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

          {/* Description + Date row */}
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="expense-desc">Description</label>
              <input
                id="expense-desc"
                type="text"
                className={styles.input}
                placeholder='e.g. "Dinner at Sakura"'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="expense-date">Date</label>
              <input
                id="expense-date"
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Context: Group or Friend */}
          <div className={styles.field}>
            <label className={styles.label}>{expenseMode === "group" ? "Group" : "Friend"}</label>
            <div className={styles.chipPicker}>
              {expenseMode === "group" ? (
                groupsLoading ? (
                  <span className={styles.loadingHint}>Loading groups…</span>
                ) : groups.length === 0 ? (
                  <span className={styles.loadingHint}>No groups. Create one first.</span>
                ) : (
                  groups.map((g: any) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`${styles.chip} ${selectedGroup === g.id ? styles.chipSelected : ""}`}
                      onClick={() => { setSelectedGroup(g.id); setErrorMsg(""); }}
                      style={{ "--chip-color": g.color || "#3DD68C" } as React.CSSProperties}
                    >
                      <span className={styles.chipDot} style={{ background: g.color || "#3DD68C" }} />
                      {g.emoji && <span>{g.emoji}</span>}
                      {g.name}
                    </button>
                  ))
                )
              ) : (
                friendsLoading ? (
                  <span className={styles.loadingHint}>Loading friends…</span>
                ) : friends.length === 0 ? (
                  <span className={styles.loadingHint}>No friends yet. Add friends first.</span>
                ) : (
                  friends.map((f: any) => (
                    <button
                      key={f.friendId}
                      type="button"
                      className={`${styles.chip} ${selectedFriend === f.friendId ? styles.chipSelected : ""}`}
                      onClick={() => { setSelectedFriend(f.friendId); setErrorMsg(""); }}
                      style={{ "--chip-color": "#5B8DEF" } as React.CSSProperties}
                    >
                      <span className={styles.chipAvatar}>{(f.friendName || "?")[0].toUpperCase()}</span>
                      {f.friendName}
                    </button>
                  ))
                )
              )}
            </div>
          </div>

          {/* Paid By */}
          {memberSplits.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Paid by</label>
              <div className={styles.chipPicker}>
                {memberSplits.map((m) => (
                  <button
                    key={m.userId}
                    type="button"
                    className={`${styles.chip} ${paidByUserId === m.userId ? styles.chipSelectedGreen : ""}`}
                    onClick={() => setPaidByUserId(m.userId)}
                    style={{ "--chip-color": "#3DD68C" } as React.CSSProperties}
                  >
                    <span className={styles.chipAvatar}>{m.fullName[0].toUpperCase()}</span>
                    {m.userId === currentUserId ? "You" : m.fullName}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {/* Split Controls */}
          {memberSplits.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>How to split</label>

              {/* Split type tabs */}
              <div className={styles.splitTabs}>
                {(["equal", "unequal", "percentage", "shares"] as SplitType[]).map((t) => {
                  const labels: Record<SplitType, string> = {
                    equal: "Equal",
                    unequal: "Exact amounts",
                    percentage: "Percentages",
                    shares: "Shares (ratio)",
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.splitTab} ${splitType === t ? styles.splitTabActive : ""}`}
                      onClick={() => setSplitType(t)}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>

              {/* Per-member inputs */}
              <div className={styles.splitTable}>
                {memberSplits.map((m, idx) => {
                  const preview = splitPreviews[idx];
                  return (
                    <div key={m.userId} className={styles.splitRow}>
                      {/* Equal: toggle checkbox */}
                      {splitType === "equal" && (
                        <button
                          type="button"
                          className={`${styles.splitCheck} ${m.checked ? styles.splitCheckOn : ""}`}
                          onClick={() => toggleMemberCheck(m.userId)}
                          aria-label={m.checked ? "Exclude" : "Include"}
                        >
                          {m.checked && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      )}

                      {/* Avatar + name */}
                      <div className={styles.splitAvatar}>
                        {m.fullName[0].toUpperCase()}
                      </div>
                      <span className={`${styles.splitName} ${splitType === "equal" && !m.checked ? styles.splitNameDimmed : ""}`}>
                        {m.userId === currentUserId ? "You" : m.fullName}
                      </span>

                      {/* Input for non-equal types */}
                      {splitType !== "equal" && (
                        <div className={styles.splitInputWrapper}>
                          {splitType === "unequal" && (
                            <span className={styles.splitInputPrefix}>{sym}</span>
                          )}
                          <input
                            type="number"
                            className={styles.splitInput}
                            placeholder={
                              splitType === "unequal"
                                ? "0.00"
                                : splitType === "percentage"
                                ? "0"
                                : "1"
                            }
                            value={m.value}
                            onChange={(e) => updateMemberValue(m.userId, e.target.value)}
                            min="0"
                            step={splitType === "unequal" ? "0.01" : "1"}
                          />
                          {splitType === "percentage" && (
                            <span className={styles.splitInputSuffix}>%</span>
                          )}
                          {splitType === "shares" && (
                            <span className={styles.splitInputSuffix}>sh</span>
                          )}
                        </div>
                      )}

                      {/* Preview amount */}
                      <span className={`${styles.splitPreview} ${preview && preview.amountOwed > 0 ? styles.splitPreviewActive : ""}`}>
                        {preview ? preview.label : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Validation hint */}
              {!splitValidation.valid && splitValidation.message && (
                <p className={styles.splitError}>{splitValidation.message}</p>
              )}
              {splitValidation.valid && totalAmount > 0 && (
                <p className={styles.splitSuccess}>
                  ✓ Splits add up correctly
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="expense-notes">Notes (optional)</label>
            <textarea
              id="expense-notes"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Any extra details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={!canSubmit}
            id="expense-submit"
          >
            {createExpenseMutation.isPending ? (
              <>
                <span className={styles.spinner} />
                Adding…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Add Expense
              </>
            )}
          </button>
        </form>
    </div>
  );
}
