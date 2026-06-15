"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../login/login.module.css";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!emailParam) {
      router.push("/login");
    }
  }, [emailParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://settlemint.onrender.com/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Store real session
      localStorage.setItem(
        "settlemint_session",
        JSON.stringify({
          user: data.user,
          token: data.token,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      );

      setSuccess("Email verified! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResendLoading(true);

    try {
      const response = await fetch("https://settlemint.onrender.com/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      setSuccess("A new code has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.mobileLogoWrap}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" rx="8" fill="#3DD68C" />
            <path
              d="M10 16.5C10 13.46 12.46 11 15.5 11H17V14H15.5C14.12 14 13 15.12 13 16.5C13 17.88 14.12 19 15.5 19H17.5C18.33 19 19 18.33 19 17.5V17H22V17.5C22 19.99 19.99 22 17.5 22H15.5C12.46 22 10 19.54 10 16.5Z"
              fill="#0f1219"
            />
          </svg>
        </div>
        <h2 className={styles.title}>Verify your email</h2>
        <p className={styles.subtitle}>
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#FF6B6B" strokeWidth="1.5" />
              <path
                d="M8 5V8.5M8 11H8.01"
                stroke="#FF6B6B"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className={styles.errorBanner} style={{ backgroundColor: "rgba(61, 214, 140, 0.1)", color: "#3DD68C", borderColor: "rgba(61, 214, 140, 0.2)" }} role="alert">
            {success}
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="verify-otp" className={styles.label}>
            Verification Code
          </label>
          <input
            id="verify-otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            className={styles.input}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            autoFocus
            style={{ fontSize: "1.5rem", letterSpacing: "8px", textAlign: "center" }}
          />
        </div>

        <button
          type="submit"
          className={`btn btn-primary btn-lg ${styles.submitBtn}`}
          disabled={loading || otp.length !== 6}
          id="verify-submit"
        >
          {loading ? <span className={styles.spinner} /> : "Verify Account"}
        </button>
      </form>

      <p className={styles.footerText}>
        Didn't receive a code?{" "}
        <button 
          type="button" 
          onClick={handleResend} 
          className={styles.footerLink} 
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
          disabled={resendLoading}
        >
          {resendLoading ? "Sending..." : "Resend"}
        </button>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
