import styles from "./Footer.module.css";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <a href="#" className={styles.logo}>
              <svg
                width="24"
                height="24"
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
            <p className={styles.tagline}>
              Split expenses, not friendships. The shared money app that
              actually respects your relationships.
            </p>
          </div>

          <div className={styles.linkGroups}>
            <div className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>Product</h4>
              <a href="#features" className={styles.footerLink}>Features</a>
              <a href="#modes" className={styles.footerLink}>Modes</a>
              <a href="/login" className={styles.footerLink}>Log In</a>
              <a href="/signup" className={styles.footerLink}>Sign Up</a>
            </div>
            <div className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>Company</h4>
              <a href="#" className={styles.footerLink}>About</a>
              <a href="#" className={styles.footerLink}>Blog</a>
              <a href="#" className={styles.footerLink}>Careers</a>
              <a href="#" className={styles.footerLink}>Press</a>
            </div>
            <div className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>Legal</h4>
              <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
              <Link href="/terms" className={styles.footerLink}>Terms</Link>
              <a href="#" className={styles.footerLink}>Security</a>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            2026 SettleMint. Built with care in Pakistan.
          </p>
          <div className={styles.socials}>
            <a href="#" aria-label="Twitter" className={styles.socialLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 4.01C21 4.5 20.02 4.69 19 5C17.89 3.85 16.14 3.65 14.84 4.57C13.54 5.49 12.92 7.14 13.32 8.72C9.76 8.54 6.49 6.82 4.33 4C3.31 5.8 3.84 8.1 5.45 9.3C4.65 9.28 3.88 9.05 3.2 8.64C3.2 8.65 3.2 8.67 3.2 8.68C3.2 10.56 4.54 12.14 6.36 12.57C5.62 12.78 4.85 12.8 4.09 12.63C4.63 14.24 6.06 15.35 7.72 15.38C6.33 16.5 4.61 17.1 2.84 17.09C2.56 17.09 2.28 17.07 2 17.04C3.84 18.22 5.97 18.85 8.15 18.85C15.77 18.85 19.96 12.82 19.96 7.54C19.96 7.37 19.96 7.19 19.95 7.02C20.89 6.35 21.69 5.5 22 4.01Z" fill="currentColor"/>
              </svg>
            </a>
            <a href="#" aria-label="GitHub" className={styles.socialLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 16.42 4.87 20.17 8.84 21.5C9.34 21.58 9.5 21.27 9.5 21V19.31C6.73 19.91 6.14 17.97 6.14 17.97C5.68 16.81 5.03 16.5 5.03 16.5C4.12 15.88 5.1 15.9 5.1 15.9C6.1 15.97 6.63 16.93 6.63 16.93C7.5 18.45 8.97 18 9.54 17.76C9.63 17.11 9.89 16.67 10.17 16.42C7.95 16.17 5.62 15.31 5.62 11.5C5.62 10.39 6 9.5 6.65 8.79C6.55 8.54 6.2 7.5 6.75 6.15C6.75 6.15 7.59 5.88 9.5 7.17C10.29 6.95 11.15 6.84 12 6.84C12.85 6.84 13.71 6.95 14.5 7.17C16.41 5.88 17.25 6.15 17.25 6.15C17.8 7.5 17.45 8.54 17.35 8.79C18 9.5 18.38 10.39 18.38 11.5C18.38 15.32 16.04 16.16 13.81 16.41C14.17 16.72 14.5 17.33 14.5 18.26V21C14.5 21.27 14.66 21.59 15.17 21.5C19.14 20.16 22 16.42 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn" className={styles.socialLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 3C19.55 3 20.05 3.22 20.41 3.59C20.78 3.95 21 4.45 21 5V19C21 19.55 20.78 20.05 20.41 20.41C20.05 20.78 19.55 21 19 21H5C4.45 21 3.95 20.78 3.59 20.41C3.22 20.05 3 19.55 3 19V5C3 4.45 3.22 3.95 3.59 3.59C3.95 3.22 4.45 3 5 3H19ZM8.5 18V10H6.5V18H8.5ZM7.5 9C7.8 9 8.08 8.88 8.29 8.68C8.5 8.47 8.63 8.19 8.63 7.88C8.63 7.25 8.13 6.75 7.5 6.75C6.87 6.75 6.38 7.25 6.38 7.88C6.38 8.5 6.87 9 7.5 9ZM18 18V13.5C18 12.47 17.66 11.72 17.1 11.18C16.53 10.65 15.79 10.38 15 10.38C14.04 10.38 13.27 10.92 12.9 11.63V10.38H10.88V18H12.9V13.75C12.9 13.06 13.4 12.5 14.08 12.5C14.76 12.5 15.13 13.06 15.13 13.75V18H18Z" fill="currentColor"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
