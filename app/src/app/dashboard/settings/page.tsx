"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@settlemint/shared";
import { getStoredTheme, setTheme as persistTheme, type Theme } from "@/utils/theme";
import PageHeader from "@/components/PageHeader";
import styles from "./settings.module.css";

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "💻" },
];

export default function SettingsPage() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [token, setToken] = useState("");
  const [theme, setThemeState] = useState<Theme>("system");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) {
      const parsed = JSON.parse(session);
      setToken(parsed.token);
      setFullName(parsed.user.fullName || parsed.user.name || "");
      setAvatarUrl(parsed.user.avatarUrl || "");
      setDefaultCurrency(parsed.user.defaultCurrency || "USD");
    }
    setThemeState(getStoredTheme());
  }, []);

  const handleThemeChange = (next: Theme) => {
    setThemeState(next);
    persistTheme(next);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${getApiUrl()}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, avatarUrl, defaultCurrency }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: (data) => {
      // Update local storage session
      const sessionStr = localStorage.getItem("settlemint_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        session.user = {
          ...session.user,
          name: data.user.fullName,
          fullName: data.user.fullName,
          avatarUrl: data.user.avatarUrl,
          defaultCurrency: data.user.defaultCurrency
        };
        localStorage.setItem("settlemint_session", JSON.stringify(session));
        window.dispatchEvent(new Event("user-profile-updated"));
      }
      showToast("Profile updated successfully!");
    },
    onError: (err: any) => {
      showToast(err.message, "error");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  return (
    <div className={`${styles.page} pageShell`}>
      <PageHeader title="Settings" subtitle="Manage your profile and preferences." />

      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label}>Appearance</label>
          <div className={styles.themeToggle} role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={theme === opt.value}
                className={`${styles.themeOption} ${theme === opt.value ? styles.themeOptionActive : ""}`}
                onClick={() => handleThemeChange(opt.value)}
              >
                <span aria-hidden="true">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          
          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input 
              type="text" 
              className={styles.input} 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Avatar URL</label>
            <input 
              type="url" 
              className={styles.input} 
              placeholder="https://example.com/avatar.png"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Currency</label>
            <select 
              className={styles.select}
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="PKR">PKR (Rs) - Pakistani Rupee</option>
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="CAD">CAD ($) - Canadian Dollar</option>
              <option value="AUD">AUD ($) - Australian Dollar</option>
              <option value="AED">AED (د.إ) - UAE Dirham</option>
              <option value="SAR">SAR (﷼) - Saudi Riyal</option>
              <option value="THB">THB (฿) - Thai Baht</option>
              <option value="SGD">SGD ($) - Singapore Dollar</option>
              <option value="JPY">JPY (¥) - Japanese Yen</option>
              <option value="CNY">CNY (¥) - Chinese Yuan</option>
              <option value="CHF">CHF (Fr) - Swiss Franc</option>
            </select>
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : ""}`}>
          <span className={`${styles.toastIcon} ${toast.type === "error" ? styles.toastIconError : ""}`}>
            {toast.type === "success" ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 6V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="14" r="1" fill="currentColor" />
              </svg>
            )}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
