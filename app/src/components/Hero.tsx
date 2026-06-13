"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    el.classList.add(styles.visible);
  }, []);

  return (
    <section ref={heroRef} className={styles.hero} id="hero">
      <div className={styles.bgOrbs}>
        <div className={styles.orbPrimary} />
        <div className={styles.orbSecondary} />
        <div className={styles.orbTertiary} />
      </div>

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={`${styles.badge} animate-fade-up stagger-1`}>
            <span className={styles.badgeDot} />
            Now in Open Beta
          </div>

          <h1 className={`${styles.headline} animate-fade-up stagger-2`}>
            Split expenses,{" "}
            <span className={styles.headlineAccent}>not friendships</span>
          </h1>

          <p className={`${styles.subtext} animate-fade-up stagger-3`}>
            The fastest way to track, split, and settle shared money. AI-powered
            receipt scanning, smart settlements, and beautiful insights.
          </p>

          <div className={`${styles.ctas} animate-fade-up stagger-4`}>
            <a href="#" className="btn btn-primary btn-lg" id="hero-cta-primary">
              Start Splitting Free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3L11 8L6 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a href="#how-it-works" className="btn btn-secondary btn-lg" id="hero-cta-secondary">
              See How It Works
            </a>
          </div>

          <div className={`${styles.socialProof} animate-fade-up stagger-5`}>
            <div className={styles.avatarStack}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={styles.avatar}
                  style={{
                    background: `hsl(${140 + i * 30}, 60%, ${45 + i * 5}%)`,
                  }}
                >
                  {String.fromCharCode(64 + i * 3)}
                </div>
              ))}
            </div>
            <p className={styles.socialText}>
              <strong>2,400+</strong> groups already settling up
            </p>
          </div>
        </div>

        <div className={`${styles.visual} animate-fade-up stagger-3`}>
          <div className={styles.phoneFrame}>
            <div className={styles.phoneScreen}>
              {/* App Preview */}
              <div className={styles.appPreviewHeader}>
                <div className={styles.appPreviewAvatar} style={{ background: "var(--mint-400)" }}>S</div>
                <div>
                  <div className={styles.appPreviewTitle}>SE Asia Trip</div>
                  <div className={styles.appPreviewSub}>8 members</div>
                </div>
              </div>

              <div className={styles.appPreviewBalance}>
                <div className={styles.balanceLabel}>You are owed</div>
                <div className={styles.balanceAmount}>$247.50</div>
              </div>

              <div className={styles.expenseList}>
                {[
                  { name: "Airport Taxi", amount: "$45.00", category: "Transport", time: "2h ago", color: "#5B8DEF" },
                  { name: "Street Food Tour", amount: "$128.00", category: "Food", time: "5h ago", color: "#FF6B6B" },
                  { name: "Temple Tickets", amount: "$36.00", category: "Activities", time: "Yesterday", color: "#FFA94D" },
                ].map((expense, i) => (
                  <div key={i} className={styles.expenseItem}>
                    <div
                      className={styles.expenseIcon}
                      style={{ background: `${expense.color}20`, color: expense.color }}
                    >
                      {expense.category[0]}
                    </div>
                    <div className={styles.expenseInfo}>
                      <div className={styles.expenseName}>{expense.name}</div>
                      <div className={styles.expenseTime}>{expense.time}</div>
                    </div>
                    <div className={styles.expenseAmount}>{expense.amount}</div>
                  </div>
                ))}
              </div>

              <div className={styles.appPreviewFab}>+</div>
            </div>
          </div>

          {/* Floating Cards */}
          <div className={styles.floatingCard} style={{ top: "15%", right: "-10%" }}>
            <div className={styles.floatingCardIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="var(--mint-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="var(--mint-400)" strokeWidth="1.5" opacity="0.4"/>
              </svg>
            </div>
            <span>Settlement complete</span>
          </div>

          <div className={styles.floatingCard} style={{ bottom: "20%", left: "-8%" }}>
            <div className={styles.floatingCardIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="var(--mint-400)" strokeWidth="1.5" opacity="0.4"/>
                <path d="M3 10H21" stroke="var(--mint-400)" strokeWidth="1.5"/>
              </svg>
            </div>
            <span>Receipt scanned</span>
          </div>
        </div>
      </div>
    </section>
  );
}
