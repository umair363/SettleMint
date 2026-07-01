"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard.module.css";
import { offlineSync } from "../../utils/offlineSync";

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    const validateSession = async () => {
      const sessionStr = localStorage.getItem("settlemint_session");
      if (!sessionStr) {
        router.push("/login");
        return;
      }
      
      try {
        const parsed = JSON.parse(sessionStr);
        if (parsed.expiresAt < Date.now() || !parsed.token) {
          localStorage.removeItem("settlemint_session");
          router.push("/login");
          return;
        }

        // Verify token with backend
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}`/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${parsed.token}`
          }
        });

        if (!res.ok) {
          throw new Error("Invalid token");
        }

        const data = await res.json();
        // user name on backend is fullName, map to name for frontend display
        setUser({
          ...data.user,
          name: data.user.fullName
        });
      } catch (err) {
        localStorage.removeItem("settlemint_session");
        router.push("/login");
      }
    };

    validateSession();

    const handleUpdate = () => {
      const sessionStr = localStorage.getItem("settlemint_session");
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        setUser({
          ...parsed.user,
          name: parsed.user.fullName || parsed.user.name
        });
      }
    };

    window.addEventListener("user-profile-updated", handleUpdate);
    
    // Offline sync
    const handleOnline = () => {
      const sessionStr = localStorage.getItem("settlemint_session");
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed.token) {
          offlineSync.syncAll(parsed.token);
        }
      }
    };

    const handleOfflineQueueUpdate = () => {
      setOfflineCount(offlineSync.getQueueCount());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline-queue-updated", handleOfflineQueueUpdate);
    
    // Check initial queue count
    handleOfflineQueueUpdate();

    return () => {
      window.removeEventListener("user-profile-updated", handleUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline-queue-updated", handleOfflineQueueUpdate);
    };
  }, [router]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("settlemint_session");
    router.push("/login");
  }, [router]);

  if (!mounted || !user) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Home",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/groups",
      label: "Groups",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M2 21V18C2 15.79 3.79 14 6 14H12C14.21 14 16 15.79 16 18V21"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16 14H18C20.21 14 22 15.79 22 18V21"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/expenses",
      label: "Expenses",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M2 10H22" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M6 15H10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/friends",
      label: "Friends",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15 8A4 4 0 1111 8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
          <path d="M1 20C1 16.5 4.5 14 9 14C11.5 14 13.5 14.8 15 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M23 20C23 17 20 15 17 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
        </svg>
      ),
    },
    {
      href: "/dashboard/activity",
      label: "Activity",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <polyline
            points="22 12 18 12 15 21 9 3 6 12 2 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.sidebarLogo}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
            >
              <rect width="32" height="32" rx="8" fill="#3DD68C" />
              <path
                d="M10 16.5C10 13.46 12.46 11 15.5 11H17V14H15.5C14.12 14 13 15.12 13 16.5C13 17.88 14.12 19 15.5 19H17.5C18.33 19 19 18.33 19 17.5V17H22V17.5C22 19.99 19.99 22 17.5 22H15.5C12.46 22 10 19.54 10 16.5Z"
                fill="#0f1219"
              />
            </svg>
            <span className={styles.sidebarLogoText}>SettleMint</span>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
            <button
              className={styles.logoutBtn}
              onClick={handleLogout}
              aria-label="Sign out"
              id="dashboard-logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21H5C3.89 21 3 20.1 3 19V5C3 3.89 3.89 3 5 3H9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M16 17L21 12L16 7M21 12H9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6H21M3 12H21M3 18H21"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className={styles.topbarRight}>
            {offlineCount > 0 && (
              <div className={styles.offlineBadge} title={`${offlineCount} expenses waiting to sync`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19.38 10A8.99 8.99 0 0012 2a9 9 0 00-7.38 8M12 2v8m0 4v8m7.38-4A8.99 8.99 0 0012 22a9 9 0 00-7.38-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className={styles.offlineText}>{offlineCount} Offline</span>
              </div>
            )}

            <Link href="/dashboard/notifications" className={styles.iconBtn} aria-label="Notifications" id="topbar-notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 8A6 6 0 006 8C6 15 3 17 3 17H21S18 15 18 8Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.73 21A2 2 0 0110.27 21"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className={styles.notifDot} />
            </Link>

            <Link href="/dashboard/new-expense" className={`btn btn-primary ${styles.addBtn}`} id="topbar-add-expense">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className={styles.addBtnText}>Add Expense</span>
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
