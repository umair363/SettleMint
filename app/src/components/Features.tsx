"use client";

import { useEffect, useRef } from "react";
import styles from "./Features.module.css";

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 9H22" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 9V21" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    title: "Every split type, covered",
    description:
      "Equal, unequal, percentage, shares, item-level, or payer-excluded. SettleMint handles the math you never want to do again.",
    color: "#3DD68C",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    title: "AI receipt scanning",
    description:
      "Point your camera, snap the receipt, and watch the magic. Merchant, total, date, line items, all extracted in seconds.",
    color: "#5B8DEF",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Recurring bills on autopilot",
    description:
      "Rent, WiFi, Netflix. Set it once, forget it forever. SettleMint logs and splits recurring expenses automatically.",
    color: "#FFA94D",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Minimum transfers",
    description:
      "Our algorithm finds the fewest transfers to settle everyone up. 8 people, 3 transfers. Done.",
    color: "#E05D9E",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Relationship modes",
    description:
      "Trip, Couple, Roommate, Event, or Team. SettleMint adapts its interface, defaults, and insights to how you actually live.",
    color: "#B197FC",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Multi-currency, frozen rates",
    description:
      "Pay in Thai Baht, see in US Dollars. Exchange rates locked at the moment of expense, never retroactively changed.",
    color: "#20C997",
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);

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
      { threshold: 0.15, rootMargin: "-60px" }
    );

    const cards = sectionRef.current?.querySelectorAll(`.${styles.card}`);
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.section} id="features">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Everything you need.
            <br />
            <span className={styles.headingAccent}>Nothing you don't.</span>
          </h2>
          <p className={styles.subtext}>
            Built from the ground up for how people actually share expenses. No
            bloat. No compromise.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, i) => (
            <div
              key={i}
              className={styles.card}
              style={{ "--delay": `${i * 60}ms`, "--accent": feature.color } as React.CSSProperties}
            >
              <div className={styles.cardIcon} style={{ color: feature.color }}>
                {feature.icon}
              </div>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
