"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./new-group.module.css";

const modes = [
  { id: "trip", label: "Trip", emoji: "✈️", description: "Multi-day travel with friends", color: "#5B8DEF" },
  { id: "roommate", label: "Roommate", emoji: "🏠", description: "Recurring shared living costs", color: "#20C997" },
  { id: "couple", label: "Couple", emoji: "💜", description: "Custom ratios for two people", color: "#B197FC" },
  { id: "event", label: "Event", emoji: "🎉", description: "Party, wedding, or gathering", color: "#FFA94D" },
];

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
];

export default function NewGroupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [inviteEmails, setInviteEmails] = useState("");
  const queryClient = useQueryClient();

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const token = JSON.parse(localStorage.getItem("settlemint_session") || "{}").token;
      
      const modeData = modes.find(m => m.id === selectedMode);

      const res = await fetch("http://localhost:8000/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          mode: selectedMode,
          emoji: modeData?.emoji,
          color: modeData?.color,
          baseCurrency: currency,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create group");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/dashboard/groups");
    },
    onError: (err) => {
      console.error("Group creation failed:", err);
      alert("Failed to create group. Please try again.");
    }
  });

  const handleCreate = () => {
    createGroupMutation.mutate();
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return selectedMode !== "";
    return true;
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Progress */}
        <div className={styles.progress}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`${styles.progressDot} ${s <= step ? styles.progressDotActive : ""}`}
            />
          ))}
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Name your group</h2>
            <p className={styles.stepSub}>
              Pick something descriptive. You can always change it later.
            </p>
            <input
              type="text"
              className={styles.nameInput}
              placeholder='e.g. "Bali Trip 2026" or "Apartment Bills"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              id="new-group-name"
            />
          </div>
        )}

        {/* Step 2: Mode */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Choose a mode</h2>
            <p className={styles.stepSub}>
              This adjusts defaults and the interface for your use case.
            </p>
            <div className={styles.modeGrid}>
              {modes.map((m) => (
                <button
                  key={m.id}
                  className={`${styles.modeCard} ${selectedMode === m.id ? styles.modeCardSelected : ""}`}
                  onClick={() => setSelectedMode(m.id)}
                  style={{ "--mode-color": m.color } as React.CSSProperties}
                >
                  <span className={styles.modeEmoji}>{m.emoji}</span>
                  <span className={styles.modeLabel}>{m.label}</span>
                  <span className={styles.modeDesc}>{m.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Currency + Invite */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Final details</h2>
            <p className={styles.stepSub}>
              Set your default currency and invite members.
            </p>
            <div className={styles.field}>
              <label className={styles.label}>Default Currency</label>
              <select
                className={styles.select}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                id="new-group-currency"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Invite Members (optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Enter email addresses, one per line..."
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={4}
                id="new-group-emails"
              />
              <span className={styles.fieldHint}>
                You can also share an invite link after creating the group.
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {step > 1 && (
            <button
              className="btn btn-secondary"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              id="new-group-next"
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={createGroupMutation.isPending}
              id="new-group-create"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
