"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./Modes.module.css";

const modes = [
  {
    id: "trip",
    name: "Trip",
    emoji: "✈️",
    color: "#5B8DEF",
    headline: "Built for group travel",
    description:
      "Day-by-day timeline, multi-currency auto-conversion, shareable trip summary cards, and location tagging. From the airport to the final settle-up.",
    features: ["Day-by-day timeline", "Multi-currency", "Location tagging", "Shareable summary"],
  },
  {
    id: "couple",
    name: "Couple",
    emoji: "💜",
    color: "#B197FC",
    headline: "Custom ratios, shared budgets",
    description:
      "60/40 split? 70/30? Set your custom ratio once, and every expense respects it automatically. Private expenses stay private.",
    features: ["Custom split ratios", "Private expenses", "Combined budget view", "Monthly summary"],
  },
  {
    id: "roommate",
    name: "Roommate",
    emoji: "🏠",
    color: "#20C997",
    headline: "Monthly bills, handled",
    description:
      "Rent, utilities, groceries, WiFi. Track every recurring bill, see a month-at-a-glance dashboard, and know exactly who owes what.",
    features: ["Recurring bill tracker", "Utility splits", "Month-at-a-glance", "Rent history"],
  },
  {
    id: "event",
    name: "Event",
    emoji: "🎉",
    color: "#FFA94D",
    headline: "Plan it, fund it, settle it",
    description:
      "Tiered cost groups, RSVP tracking, budget vs. actual, and a payment status board. Perfect for weddings, trips, and parties.",
    features: ["Tiered cost groups", "RSVP tracking", "Budget planner", "Payment board"],
  },
];

export default function Modes() {
  const [active, setActive] = useState(0);
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
      { threshold: 0.15 }
    );

    const el = ref.current?.querySelector(`.${styles.content}`);
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const mode = modes[active];

  return (
    <section ref={ref} className={styles.section} id="modes">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            One app, <span style={{ color: mode.color }}>four modes</span>
          </h2>
          <p className={styles.subtext}>
            SettleMint adapts its interface, defaults, and insights to how you
            actually use it.
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.tabs}>
            {modes.map((m, i) => (
              <button
                key={m.id}
                className={`${styles.tab} ${i === active ? styles.tabActive : ""}`}
                onClick={() => setActive(i)}
                style={{ "--tab-color": m.color } as React.CSSProperties}
                id={`mode-tab-${m.id}`}
              >
                <span className={styles.tabEmoji}>{m.emoji}</span>
                <span className={styles.tabName}>{m.name}</span>
              </button>
            ))}
          </div>

          <div className={styles.detail} style={{ "--mode-color": mode.color } as React.CSSProperties}>
            <div className={styles.detailText}>
              <h3 className={styles.detailHeadline}>{mode.headline}</h3>
              <p className={styles.detailDescription}>{mode.description}</p>
              <div className={styles.featurePills}>
                {mode.features.map((f, i) => (
                  <span key={i} className={styles.pill}>{f}</span>
                ))}
              </div>
            </div>

            <div className={styles.detailVisual}>
              <div
                className={styles.modePreview}
                style={{ borderColor: `${mode.color}30` }}
              >
                <div className={styles.previewHeader} style={{ background: `${mode.color}10` }}>
                  <span style={{ color: mode.color, fontWeight: 600, fontSize: "0.875rem" }}>
                    {mode.emoji} {mode.name} Mode
                  </span>
                </div>
                <div className={styles.previewBody}>
                  {mode.features.map((f, i) => (
                    <div key={i} className={styles.previewRow}>
                      <div
                        className={styles.previewDot}
                        style={{ background: mode.color }}
                      />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
