"use client";

import Link from "next/link";
import styles from "./offline.module.css";

export default function OfflinePage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Animated signal icon */}
        <div className={styles.iconWrap}>
          <div className={styles.iconRings}>
            <div className={styles.ring} />
            <div className={styles.ring} />
            <div className={styles.ring} />
          </div>
          <div className={styles.iconCore}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M1 6C3.2 3.7 6.5 2 12 2s8.8 1.7 11 4"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              />
              <path
                d="M4.5 10C6.2 8.2 8.8 7 12 7s5.8 1.2 7.5 3"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              />
              <path
                d="M8 14.5C9.2 13.3 10.5 12.5 12 12.5s2.8.8 4 2"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        <h1 className={styles.title}>You&apos;re offline</h1>
        <p className={styles.subtitle}>
          No internet connection detected. Some features may be unavailable,
          but cached pages are still accessible.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.retryBtn}
            onClick={() => window.location.reload()}
            id="offline-retry"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M1 4v6h6M23 20v-6h-6"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              <path
                d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Try again
          </button>
          <Link href="/dashboard" className={styles.homeBtn} id="offline-go-home">
            Go to Dashboard
          </Link>
        </div>

        <div className={styles.tip}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Cached data from your last session is still available
        </div>
      </div>
    </div>
  );
}
