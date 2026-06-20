"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./settle.module.css";
import { getCurrencySymbol } from "@/utils/currency";

export default function SettleUpPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [settleMode, setSettleMode] = useState<"group" | "individual">("group");

  const [payer, setPayer] = useState("");
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFriend, setSelectedFriend] = useState("");
  const [notes, setNotes] = useState("");

  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setCurrentUserId(parsed.user.id);
      setPayer(parsed.user.id); // default to user paying someone
      setDefaultCurrency(parsed.user.defaultCurrency || "USD");
    }
  }, []);

  // Fetch user's groups
  const { data: groupsData } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("https://settlemint.onrender.com/api/groups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!token && settleMode === "group",
  });

  // Fetch user's friends
  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("https://settlemint.onrender.com/api/friends", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json();
    },
    enabled: !!token && settleMode === "individual",
  });

  // Fetch group details for members list
  const { data: groupDetailsData } = useQuery({
    queryKey: ["group", selectedGroup],
    queryFn: async () => {
      const res = await fetch(`https://settlemint.onrender.com/api/groups/${selectedGroup}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch group details");
      return res.json();
    },
    enabled: !!token && !!selectedGroup && settleMode === "group",
  });

  const groups = groupsData?.groups || [];
  const friends = friendsData?.friends || [];
  const members = groupDetailsData?.group?.members || [];

  // Determine active currency
  const activeCurrency = settleMode === "group" 
    ? (groupDetailsData?.group?.baseCurrency || defaultCurrency) 
    : defaultCurrency;
  const sym = getCurrencySymbol(activeCurrency);

  const createSettlementMutation = useMutation({
    mutationFn: async () => {
      const isUserPaying = payer === currentUserId;
      let finalPaidTo = "";

      if (settleMode === "group") {
        if (!receiver && isUserPaying) throw new Error("Select who you are paying");
        if (!payer && !isUserPaying) throw new Error("Select who paid you");
        finalPaidTo = isUserPaying ? receiver : payer; 
      } else {
        if (!selectedFriend) throw new Error("Select a friend");
        finalPaidTo = isUserPaying ? selectedFriend : currentUserId;
        // If the other person paid the user, the API expects paidBy=userId, paidTo=them? 
        // Wait, the API assumes the authenticated user is logging the settlement. 
        // Our controller uses `paidBy: userId` always. So the user must be the payer in the API.
        // Actually, let's keep the API call as we structured it: user is recording it.
      }
      
      const res = await fetch("https://settlemint.onrender.com/api/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId: settleMode === "group" ? selectedGroup : null,
          paidTo: finalPaidTo,
          amount: parseFloat(amount),
          method,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to record settlement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["group"] });
      queryClient.invalidateQueries({ queryKey: ["all_expenses"] });
      router.push("/dashboard");
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const handleSwap = () => {
    setPayer(receiver || selectedFriend);
    if (settleMode === "group") {
      setReceiver(payer);
    } else {
      setSelectedFriend(payer);
    }
    setAmount("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (settleMode === "group" && !selectedGroup) {
      alert("Please select a group first.");
      return;
    }
    if (settleMode === "individual" && !selectedFriend) {
      alert("Please select a friend first.");
      return;
    }
    
    createSettlementMutation.mutate();
  };

  return (
    <div className={styles.settlePage}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Settle Up</h1>
          <p className={styles.subtitle}>Record a payment to settle debts</p>
        </div>
        <Link href="/dashboard" className={styles.backBtn} aria-label="Cancel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </header>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        
        {/* Mode Selector */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", background: "var(--bg-secondary)", padding: "0.5rem", borderRadius: "12px" }}>
          <button 
            type="button"
            onClick={() => setSettleMode("group")}
            style={{ 
              flex: 1, padding: "0.8rem", borderRadius: "8px", border: "none", fontWeight: 600,
              backgroundColor: settleMode === "group" ? "var(--bg-primary)" : "transparent",
              color: settleMode === "group" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: settleMode === "group" ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            In a Group
          </button>
          <button 
            type="button"
            onClick={() => setSettleMode("individual")}
            style={{ 
              flex: 1, padding: "0.8rem", borderRadius: "8px", border: "none", fontWeight: 600,
              backgroundColor: settleMode === "individual" ? "var(--bg-primary)" : "transparent",
              color: settleMode === "individual" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: settleMode === "individual" ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Individual Friend
          </button>
        </div>

        {/* Date, Group & Friend Selectors */}
        <div className={styles.partySelection} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: "2rem" }}>
          <div className={styles.partyBox}>
            <span className={styles.partyLabel}>Date</span>
            <input 
              type="date" 
              className={styles.userSelect} 
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className={styles.partyBox}>
            <span className={styles.partyLabel}>{settleMode === "group" ? "Group" : "Friend"}</span>
            {settleMode === "group" ? (
              <select 
                className={styles.userSelect} 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                required
              >
                <option value="" disabled>Select a group...</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            ) : (
              <select 
                className={styles.userSelect} 
                value={selectedFriend}
                onChange={(e) => setSelectedFriend(e.target.value)}
                required
              >
                <option value="" disabled>Select a friend...</option>
                {friends.map((f: any) => (
                  <option key={f.friendId} value={f.friendId}>{f.friendName}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Who is paying whom? */}
        <div className={styles.partySelection}>
          <div className={styles.partyBox}>
            <span className={styles.partyLabel}>Who Paid</span>
            <select 
              className={styles.userSelect} 
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              disabled={settleMode === "group" ? !selectedGroup : !selectedFriend}
            >
              <option value={currentUserId}>You</option>
              {settleMode === "group" && members.filter((m: any) => m.id !== currentUserId).map((u: any) => (
                <option key={`payer-${u.id}`} value={u.id}>{u.fullName}</option>
              ))}
              {settleMode === "individual" && selectedFriend && friends.filter((f: any) => f.friendId === selectedFriend).map((f: any) => (
                <option key={`payer-${f.friendId}`} value={f.friendId}>{f.friendName}</option>
              ))}
            </select>
          </div>

          <button 
            type="button" 
            className={styles.directionIcon} 
            onClick={handleSwap}
            aria-label="Swap payer and receiver"
            disabled={settleMode === "group" ? !selectedGroup : !selectedFriend}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M17 4V20M17 20L13 16M17 20L21 16M7 20V4M7 4L3 8M7 4L11 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className={styles.partyBox}>
            <span className={styles.partyLabel}>Who Received</span>
            <select 
              className={styles.userSelect} 
              value={settleMode === "group" ? receiver : (payer === currentUserId ? selectedFriend : currentUserId)}
              onChange={(e) => settleMode === "group" && setReceiver(e.target.value)}
              disabled={settleMode === "group" ? !selectedGroup : true} // Individual mode automatically locks receiver based on payer
            >
              <option value="" disabled>Select...</option>
              {settleMode === "group" && (
                <>
                  <option value={currentUserId}>You</option>
                  {members.filter((m: any) => m.id !== currentUserId).map((u: any) => (
                    <option key={`receiver-${u.id}`} value={u.id}>{u.fullName}</option>
                  ))}
                </>
              )}
              {settleMode === "individual" && selectedFriend && (
                <>
                  <option value={currentUserId}>You</option>
                  {friends.filter((f: any) => f.friendId === selectedFriend).map((f: any) => (
                    <option key={`receiver-${f.friendId}`} value={f.friendId}>{f.friendName}</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div className={styles.amountSection}>
          <div className={styles.amountInputWrapper}>
            <span className={styles.currency}>{sym}</span>
            <input 
              type="number" 
              className={styles.amountInput}
              placeholder="0.00"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className={styles.methodSection}>
          <span className={styles.methodLabel}>Payment Method</span>
          <div className={styles.methodGrid}>
            <button 
              type="button"
              className={`${styles.methodBtn} ${method === "cash" ? styles.active : ""}`}
              onClick={() => setMethod("cash")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 12h.01M18 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Cash</span>
            </button>
            
            <button 
              type="button"
              className={`${styles.methodBtn} ${method === "transfer" ? styles.active : ""}`}
              onClick={() => setMethod("transfer")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Bank Transfer</span>
            </button>

            <button 
              type="button"
              className={`${styles.methodBtn} ${method === "app" ? styles.active : ""}`}
              onClick={() => setMethod("app")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="2" width="10" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Payment App</span>
            </button>
          </div>
        </div>

        {/* Notes */}
        <textarea 
          className={styles.noteInput}
          placeholder="Add a note (optional)..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button 
          type="submit" 
          className={`btn btn-primary ${styles.submitBtn}`}
          disabled={!amount || parseFloat(amount) <= 0 || (settleMode === "group" ? !selectedGroup : !selectedFriend) || createSettlementMutation.isPending}
        >
          {createSettlementMutation.isPending ? "Recording..." : "Record Payment"}
        </button>

      </form>
    </div>
  );
}
