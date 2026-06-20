"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import styles from "./friends.module.css";
import { getCurrencySymbol } from "@/utils/currency";

export default function FriendsPage() {
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setCurrentUserId(parsed.user.id);
      setDefaultCurrency(parsed.user.defaultCurrency || "USD");
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("https://settlemint.onrender.com/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json();
    },
    enabled: !!token,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (friendEmail: string) => {
      const res = await fetch("https://settlemint.onrender.com/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: friendEmail }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add friend");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setEmail("");
      setAddError("");
    },
    onError: (err: any) => setAddError(err.message),
  });

  const friends = data?.friends || [];
  const sym = getCurrencySymbol(defaultCurrency);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Friends</h1>
          <p className={styles.subtitle}>Split expenses 1-on-1, no group needed.</p>
        </div>

        <form
          className={styles.addForm}
          onSubmit={(e) => {
            e.preventDefault();
            setAddError("");
            if (email) addFriendMutation.mutate(email);
          }}
        >
          <input
            type="email"
            placeholder="Add by email address…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.emailInput}
            required
          />
          <button
            type="submit"
            className={`btn btn-primary ${styles.addBtn}`}
            disabled={addFriendMutation.isPending || !email}
          >
            {addFriendMutation.isPending ? "Adding…" : "Add Friend"}
          </button>
        </form>
      </div>

      {addError && (
        <div className={styles.errorBanner}>{addError}</div>
      )}

      {/* Friends list */}
      <div className={styles.list}>
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} height="84px" borderRadius="14px" />)
        ) : friends.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🤝</span>
            <h3 className={styles.emptyTitle}>No friends yet</h3>
            <p className={styles.emptyText}>
              Add a friend by their email to start splitting expenses 1-on-1.
            </p>
          </div>
        ) : (
          friends.map((friend: any) => {
            const initials = (friend.friendName || "?").charAt(0).toUpperCase();
            const balance = friend.balance || 0; // future: API will return this
            const isPositive = balance >= 0;

            return (
              <div key={friend.friendshipId} className={styles.friendRow}>
                <div className={styles.avatar}>{initials}</div>

                <div className={styles.friendInfo}>
                  <span className={styles.friendName}>{friend.friendName}</span>
                  <span className={styles.friendEmail}>{friend.friendEmail || ""}</span>
                </div>

                <div className={styles.balanceArea}>
                  {balance !== 0 ? (
                    <span className={`${styles.balance} ${isPositive ? styles.owed : styles.owes}`}>
                      {isPositive ? `They owe you ${sym}${Math.abs(balance).toFixed(2)}` : `You owe ${sym}${Math.abs(balance).toFixed(2)}`}
                    </span>
                  ) : (
                    <span className={styles.settled}>All settled ✓</span>
                  )}
                </div>

                <div className={styles.actions}>
                  <Link
                    href={`/dashboard/new-expense?friend=${friend.friendId}`}
                    className={`btn btn-secondary ${styles.actionBtn}`}
                  >
                    Add expense
                  </Link>
                  {balance !== 0 && (
                    <Link
                      href={`/dashboard/settle?friend=${friend.friendId}`}
                      className={`btn btn-primary ${styles.actionBtn}`}
                    >
                      Settle up
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
