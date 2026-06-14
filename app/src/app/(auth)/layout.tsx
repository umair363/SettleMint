import styles from "./auth.module.css";

export const metadata = {
  title: "Sign In - SettleMint",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.authShell}>
      <div className={styles.authBrand}>
        <div className={styles.brandOrb} />
        <div className={styles.brandContent}>
          <a href="/" className={styles.logo}>
            <svg
              width="36"
              height="36"
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
            <span className={styles.logoText}>SettleMint</span>
          </a>
          <h1 className={styles.brandHeadline}>
            Split expenses,
            <br />
            not friendships.
          </h1>
          <p className={styles.brandSub}>
            The fastest, most beautiful way to track and settle shared money
            with the people you care about.
          </p>
          <div className={styles.brandStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>2,400+</span>
              <span className={styles.statLabel}>Active groups</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>$1.2M</span>
              <span className={styles.statLabel}>Settled this month</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>4.8</span>
              <span className={styles.statLabel}>App Store rating</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.authForm}>{children}</div>
    </div>
  );
}
