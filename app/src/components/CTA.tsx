import styles from "./CTA.module.css";

export default function CTA() {
  return (
    <section className={styles.section} id="cta">
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.glow} />
          <div className={styles.content}>
            <h2 className={styles.heading}>
              Ready to stop doing money math in group chats?
            </h2>
            <p className={styles.subtext}>
              Join thousands of groups already tracking and settling expenses the
              smarter way. Completely free — no catches, no trials.
            </p>
            <div className={styles.actions}>
              <a href="/signup" className="btn btn-primary btn-lg" id="cta-primary">
                Create Free Account
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
              <a href="/login" className="btn btn-secondary btn-lg" id="cta-login">
                Log In
              </a>
            </div>
            <p className={styles.footnote}>No credit card required. Works on iOS, Android, and Web.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

