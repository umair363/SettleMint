"use client";

import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <nav className={styles.nav}>
        <a href="#" className={styles.logo} id="nav-logo">
          <svg
            width="28"
            height="28"
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

        <div className={styles.links}>
          <a href="#features" className={styles.link} id="nav-features">
            Features
          </a>
          <a href="#how-it-works" className={styles.link} id="nav-how">
            How it Works
          </a>
          <a href="#pricing" className={styles.link} id="nav-pricing">
            Pricing
          </a>
          <a href="#modes" className={styles.link} id="nav-modes">
            Modes
          </a>
        </div>

        <div className={styles.actions}>
          <a href="/login" className={styles.loginBtn} id="nav-login">
            Log In
          </a>
          <a href="/signup" className="btn btn-primary" id="nav-cta">
            Get Started Free
          </a>
        </div>

        <button
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          id="nav-mobile-toggle"
        >
          <span
            className={`${styles.hamburger} ${mobileOpen ? styles.open : ""}`}
          />
        </button>
      </nav>

      {mobileOpen && (
        <div className={styles.mobileMenu} id="nav-mobile-menu">
          <a
            href="#features"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            How it Works
          </a>
          <a
            href="#pricing"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </a>
          <a
            href="#modes"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            Modes
          </a>
          <div className={styles.mobileCta}>
            <a href="/signup" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
              Get Started Free
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
