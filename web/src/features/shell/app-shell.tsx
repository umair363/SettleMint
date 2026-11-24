"use client";

import { ApiError } from "@settlemint/shared";
import { Activity, House, Plus, UserRound, Users } from "@/ui/icons";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Logo } from "./logo";
import { PageTransition, PullToRefresh } from "./native-feel";
import { useLiveUpdates } from "@/features/pwa/live-updates";
import { AddExpenseProvider, useAddExpense } from "@/features/expenses/add-expense-context";
import { AddExpenseSheet } from "@/features/expenses/add-expense-sheet";
import { SearchPalette } from "@/features/search/search-palette";
import { useMe } from "@settlemint/client/data/queries";
import { useHydrated } from "@/lib/use-hydrated";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { ErrorState, Spinner } from "@/ui/feedback";
import { haptic, springSnappy } from "@/ui/motion";

const NAV = [
  { href: "/home", label: "home", icon: House, match: (p: string) => p === "/home" },
  { href: "/groups", label: "groups", icon: Users, match: (p: string) => p === "/groups" || p === "/group" },
  { href: "/activity", label: "activity", icon: Activity, match: (p: string) => p === "/activity" },
  { href: "/account", label: "account", icon: UserRound, match: (p: string) => p === "/account" },
] as const;


/** On a group's page, adding an expense defaults to that group. */
function currentGroupId(): string | undefined {
  if (window.location.pathname !== "/group") return undefined;
  return new URLSearchParams(window.location.search).get("id") ?? undefined;
}

function AddButton({ className }: { className?: string }) {
  const { openAddExpense } = useAddExpense();
  const t = useTranslations("nav");
  return (
    <button
      type="button"
      aria-label={t("addExpense")}
      onClick={() => {
        haptic(10);
        openAddExpense({ groupId: currentGroupId() });
      }}
      className={cn(
        "glass-tint flex size-16 shrink-0 items-center justify-center rounded-full text-accent-fg",
        "transition-transform duration-[var(--dur-press)] ease-[var(--ease-standard)] active:scale-[0.94]",
        className,
      )}
    >
      <Plus className="size-7" weight="bold" />
    </button>
  );
}

/**
 * Phones: a floating glass capsule holding the four sections, and, apart from
 * it, the one mint action. Content scrolls under both. The add button comes
 * last in reading order.
 */
function BottomNav({ pathname }: { pathname: string }) {
  const t = useTranslations("nav");
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden">
      {/* Page content fades out before it reaches the bar, instead of running into it. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[calc(7rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-bg from-30% to-transparent" />
      <div className="mx-auto flex max-w-md items-center gap-2.5">
        <nav aria-label={t("main")} className="glass-bar pointer-events-auto flex h-16 flex-1 items-center rounded-full p-1.5">
          {NAV.map((n) => {
            const active = n.match(pathname);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-[560] transition-colors duration-[var(--dur-feedback)]",
                  active ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    transition={springSnappy}
                    className="absolute inset-0 rounded-full bg-[color-mix(in_oklch,var(--fg)_8%,transparent)]"
                  />
                )}
                <Icon className="relative size-[22px]" weight={active ? "fill" : "regular"} />
                <span className="relative">{t(n.label)}</span>
              </Link>
            );
          })}
        </nav>
        <AddButton className="pointer-events-auto" />
      </div>
    </div>
  );
}

/** Desktop: an inset panel beside the content, with the one mint action at the top. */
function Sidebar({ pathname, name, userId, image }: { pathname: string; name: string; userId: string; image: string | null }) {
  const { openAddExpense } = useAddExpense();
  const t = useTranslations("nav");
  return (
    <aside className="fixed inset-y-3 start-3 z-30 hidden w-[248px] flex-col rounded-[var(--radius-xl)] bg-surface p-4 shadow-[0_0_0_1px_var(--line)] lg:flex">
      <Link href="/home" className="rounded-[var(--radius-md)] px-2 py-1.5">
        <Logo />
      </Link>
      <Button className="mt-6" block leading={<Plus className="size-[18px]" />} onClick={() => openAddExpense({ groupId: currentGroupId() })}>
        {t("addExpense")}
      </Button>
      <nav aria-label={t("main")} className="mt-5 flex flex-col gap-0.5">
        {NAV.map((n) => {
          const active = n.match(pathname);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[15px] font-[540] transition-colors duration-[var(--dur-feedback)]",
                active ? "text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {active && (
                <motion.span layoutId="side-nav-bg" transition={springSnappy} className="absolute inset-0 rounded-[inherit] bg-surface-2" />
              )}
              <Icon className="relative size-5" weight={active ? "fill" : "regular"} />
              <span className="relative">{t(n.label)}</span>
            </Link>
          );
        })}
      </nav>
      <Link href="/account" className="mt-auto flex items-center gap-3 rounded-[var(--radius-md)] p-2 hover:bg-surface-2">
        <Avatar id={userId} name={name} image={image} size="sm" />
        <span className="truncate text-[15px] font-[540]">{name}</span>
      </Link>
    </aside>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const me = useMe();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const { openAddExpense } = useAddExpense();
  const t = useTranslations("shell");

  // Home-screen shortcut "Add expense" opens /home?add=1.
  const signedIn = Boolean(me.data);
  useLiveUpdates(signedIn);
  useEffect(() => {
    if (!signedIn) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("add") === "1") {
      url.searchParams.delete("add");
      window.history.replaceState(null, "", url.pathname + url.search);
      openAddExpense();
    }
  }, [signedIn, openAddExpense]);
  const unauthorized = me.error instanceof ApiError && me.error.status === 401;
  // Onboarding until we know their name and home currency (password sign-ups skip it otherwise).
  // Decided on fresh data only: the copy saved on the device can predate the
  // onboarding the person just finished.
  const needsName =
    me.data && me.isFetchedAfterMount && (!me.data.name.trim() || !me.data.defaultCurrency) && pathname !== "/welcome";

  useEffect(() => {
    if (unauthorized) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/sign-in?next=${encodeURIComponent(next)}`);
    } else if (needsName) {
      router.replace(`/welcome?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [unauthorized, needsName, router]);

  if (hydrated && me.data && !needsName) {
    return (
      <>
        <Sidebar pathname={pathname} name={me.data.name} userId={me.data.id} image={me.data.image} />
        <div className="min-h-dvh pb-32 lg:ps-[272px] lg:pb-12">
          <PageTransition>{children}</PageTransition>
        </div>
        <PullToRefresh />
        <BottomNav pathname={pathname} />
        <AddExpenseSheet />
        <SearchPalette />
      </>
    );
  }
  if (hydrated && me.error && !unauthorized) {
    const offline = me.error instanceof ApiError && me.error.isNetwork;
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <ErrorState
          offline={offline}
          title={t("cantReach")}
          body={t("wakingUp")}
          onRetry={() => me.refetch()}
        />
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy>
      <Logo />
      <Spinner label={t("loadingAccount")} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AddExpenseProvider>
      <Gate>{children}</Gate>
    </AddExpenseProvider>
  );
}

