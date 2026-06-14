"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";

export default function FriendsPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      setToken(JSON.parse(session).token);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/friends", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json();
    },
    enabled: !!token,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (friendEmail: string) => {
      const res = await fetch("http://localhost:8000/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: friendEmail })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add friend");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setEmail("");
    },
    onError: (error: any) => {
      alert(error.message);
    }
  });

  const friends = data?.friends || [];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "600", color: "var(--text-primary)" }}>Friends</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Split expenses 1-on-1 without creating a group.
          </p>
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); if (email) addFriendMutation.mutate(email); }}
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <input 
            type="email" 
            placeholder="Friend's email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", outline: "none", width: "250px" }}
            required
          />
          <button 
            type="submit"
            disabled={addFriendMutation.isPending}
            style={{ background: "var(--brand-mint)", color: "var(--slate-900)", padding: "0 1.5rem", borderRadius: "8px", fontWeight: "600", cursor: "pointer", border: "none", opacity: addFriendMutation.isPending ? 0.7 : 1 }}
          >
            {addFriendMutation.isPending ? "Adding..." : "Add Friend"}
          </button>
        </form>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {isLoading ? (
          <>
            <Skeleton height="70px" borderRadius="12px" />
            <Skeleton height="70px" borderRadius="12px" />
          </>
        ) : friends.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", border: "1px dashed var(--border-default)", borderRadius: "12px" }}>
            No friends yet. Add someone by their email to start splitting!
          </div>
        ) : (
          friends.map((friend: any) => (
            <div key={friend.friendshipId} style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--slate-700)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: "600" }}>
                {friend.friendName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "var(--text-primary)", fontWeight: "600", fontSize: "1.1rem" }}>{friend.friendName}</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.15rem" }}>Status: {friend.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
