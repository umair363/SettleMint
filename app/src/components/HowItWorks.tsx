"use client";

import { useEffect, useRef } from "react";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    title: "Create a group",
    description:
      "Name it, pick a mode (Trip, Roommate, Couple, or Event), invite your people with a link.",
    visual: (
      <div className={styles.stepVisual}>
        <div className={styles.mockGroup}>
          <div className={styles.mockGroupIcon} style={{ background: "var(--mint-400)" }}>B</div>
          <div>
            <div className={styles.mockGroupName}>Bali Trip 2026</div>
            <div className={styles.mockGroupMode}>Trip Mode</div>
          </div>
        </div>
        <div className={styles.mockMembers}>
          {["Ar", "Hm", "Zr", "Bl", "+4"].map((m, i) => (
            <div
              key={i}
              className={styles.mockMember}
              style={{
                background: i === 4 ? "var(--slate-700)" : `hsl(${140 + i * 40}, 55%, 50%)`,
                zIndex: 5 - i,
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Log expenses instantly",
    description:
      "Type it, speak it, or snap a receipt. AI extracts every field. Confirm and move on.",
    visual: (
      <div className={styles.stepVisual}>
        <div className={styles.mockReceipt}>
          <div className={styles.receiptHeader}>
            <div className={styles.receiptDot} style={{ background: "var(--mint-400)" }} />
            <span>Receipt scanned</span>
          </div>
          <div className={styles.receiptField}>
            <span className={styles.fieldLabel}>Merchant</span>
            <span className={styles.fieldValue}>La Dolce Vita</span>
          </div>
          <div className={styles.receiptField}>
            <span className={styles.fieldLabel}>Total</span>
            <span className={styles.fieldValue} style={{ color: "var(--mint-400)" }}>$127.50</span>
          </div>
          <div className={styles.receiptField}>
            <span className={styles.fieldLabel}>Date</span>
            <span className={styles.fieldValue}>Jun 14, 2026</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Settle up in one tap",
    description:
      "SettleMint finds the minimum transfers. Send a payment link, scan a QR, or mark it done.",
    visual: (
      <div className={styles.stepVisual}>
        <div className={styles.mockSettlement}>
          <div className={styles.settlementRow}>
            <div className={styles.settlementAvatar} style={{ background: "#5B8DEF" }}>A</div>
            <div className={styles.settlementArrow}>
              <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                <path d="M0 6H36M36 6L30 1M36 6L30 11" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={styles.settlementAmount}>$45.00</span>
            </div>
            <div className={styles.settlementAvatar} style={{ background: "#E05D9E" }}>H</div>
          </div>
          <div className={styles.settlementRow}>
            <div className={styles.settlementAvatar} style={{ background: "#FFA94D" }}>Z</div>
            <div className={styles.settlementArrow}>
              <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                <path d="M0 6H36M36 6L30 1M36 6L30 11" stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={styles.settlementAmount}>$82.00</span>
            </div>
            <div className={styles.settlementAvatar} style={{ background: "#E05D9E" }}>H</div>
          </div>
          <div className={styles.settlementLabel}>2 transfers instead of 6</div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);

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
      { threshold: 0.2 }
    );

    const items = ref.current?.querySelectorAll(`.${styles.step}`);
    items?.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={styles.section} id="how-it-works">
      <div className={styles.container}>
        <h2 className={styles.heading}>
          Three steps to <span className={styles.headingAccent}>zero awkwardness</span>
        </h2>

        <div className={styles.steps}>
          {steps.map((step, i) => (
            <div
              key={i}
              className={styles.step}
              style={{ "--delay": `${i * 100}ms` } as React.CSSProperties}
            >
              <div className={styles.stepContent}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
              {step.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
