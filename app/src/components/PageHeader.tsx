import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  /** Small uppercase label above the title, e.g. "PERSONAL FINANCE". */
  eyebrow?: string;
  /** Renders a "← Back" link above the title instead of the eyebrow label. */
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: ReactNode;
  /** Trailing action(s), e.g. buttons/links, rendered inline with the title on desktop. */
  action?: ReactNode;
}

// Single source of truth for the dashboard's page-header pattern. Every
// /dashboard/* page previously hand-rolled its own .page/.header/.title
// rules with drifting font sizes (1.75rem vs 2rem), weights (600 vs 700),
// and max-widths (680px vs 1200px vs none) — the inconsistency was the
// actual cause of the app feeling like a stack of unrelated pages rather
// than one product. This is the one place that rhythm is defined now.
export default function PageHeader({
  eyebrow,
  backHref,
  backLabel,
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        {backHref && (
          <Link href={backHref} className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {backLabel}
          </Link>
        )}
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  );
}
