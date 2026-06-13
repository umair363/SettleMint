"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Pricing.module.css";

export default function Pricing() {
  const ref = useRef<HTMLElement>(null);
  const [annual, setAnnual] = useState(true);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed);
          }
        });
      },
      { threshold: 0.15 }
    );

    const cards = ref.current?.querySelectorAll(`.${styles.pricingCard}`);
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={styles.section} id="pricing">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Generous free. Powerful <span className={styles.accent}>Pro</span>.
          </h2>
          <p className={styles.subtext}>
            Most people never need to pay. When you do, it costs less than forgetting
            who paid for what.
          </p>
        </div>

        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${!annual ? styles.toggleActive : ""}`}
            onClick={() => setAnnual(false)}
            id="pricing-monthly"
          >
            Monthly
          </button>
          <button
            className={`${styles.toggleBtn} ${annual ? styles.toggleActive : ""}`}
            onClick={() => setAnnual(true)}
            id="pricing-annual"
          >
            Annual
            <span className={styles.saveBadge}>Save 33%</span>
          </button>
        </div>

        <div className={styles.cards}>
          {/* Free */}
          <div className={`${styles.pricingCard}`} style={{ "--delay": "0ms" } as React.CSSProperties}>
            <div className={styles.cardHeader}>
              <h3 className={styles.tierName}>Free</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>forever</span>
              </div>
              <p className={styles.tierDescription}>For casual group expenses and getting started.</p>
            </div>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Unlimited groups and members
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                All split types
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                10 receipt scans per month
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Smart settlement suggestions
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Basic spending reports
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                90-day CSV export
              </li>
            </ul>
            <a href="#" className={`btn btn-secondary ${styles.cardCta}`} id="pricing-free-cta">
              Get Started
            </a>
          </div>

          {/* Pro */}
          <div className={`${styles.pricingCard} ${styles.featured}`} style={{ "--delay": "60ms" } as React.CSSProperties}>
            <div className={styles.featuredBadge}>Most Popular</div>
            <div className={styles.cardHeader}>
              <h3 className={styles.tierName}>Pro</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>${annual ? "3.33" : "4.99"}</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
              <p className={styles.tierDescription}>For power users who want the full experience.</p>
            </div>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Everything in Free
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Unlimited receipt scanning
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                MintBot AI assistant
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Advanced analytics and trends
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Cross-group balance view
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Payment links and QR codes
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Trip timeline and event planner
              </li>
            </ul>
            <a href="#" className={`btn btn-primary ${styles.cardCta}`} id="pricing-pro-cta">
              Start 14-Day Free Trial
            </a>
          </div>

          {/* Teams */}
          <div className={`${styles.pricingCard}`} style={{ "--delay": "120ms" } as React.CSSProperties}>
            <div className={styles.cardHeader}>
              <h3 className={styles.tierName}>Teams</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>${annual ? "8.33" : "9.99"}</span>
                <span className={styles.pricePeriod}>/member/mo</span>
              </div>
              <p className={styles.tierDescription}>For companies and organizations with approval workflows.</p>
            </div>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Everything in Pro
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Expense approval workflows
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Category budget policies
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Admin dashboard
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Accounting exports (Xero, QuickBooks)
              </li>
              <li className={styles.featureItem}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                SSO and SLA support
              </li>
            </ul>
            <a href="#" className={`btn btn-secondary ${styles.cardCta}`} id="pricing-teams-cta">
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
