"use client";

import { ApiError } from "@settlemint/shared";
import { Activity, House, Plus, UserRound, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AddExpenseProvider, useAddExpense } from "@/features/expenses/add-expense-context";
import { AddExpenseSheet } from "@/features/expenses/add-expense-sheet";
import { useMe } from "@/lib/queries";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { ErrorState, Spinner } from "@/ui/feedback";
import { haptic, springSnappy } from "@/ui/motion";

const NAV = [
  { href: "/home", label: "Home", icon: House, match: (p: string) => p === "/home" },
  { href: "/groups", label: "Groups", icon: Users, match: (p: string) => p === "/groups" || p === "/group" },
  { href: "/activity", label: "Activity", icon: Activity, match: (p: string) => p === "/activity" },
  { href: "/account", label: "Account", icon: UserRound, match: (p: string) => p === "/account" },
] as const;

function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-accent text-accent-fg shadow-glow">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M5 12.5 10 17 19 7.5" />
        </svg>
      </span>
      SettleMint
    </span>
  );
}

function AddButton({ className }: { className?: string }) {
  const { openAddExpense } = useAddExpense();
  return (
    <motion.button
      type="button"
      aria-label="Add expense"
      onClick={() => {
        haptic(10);
        openAddExpense();
      }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      transition={springSnappy}
      className={cn(
        "flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-glow",
        className,
      )}
    >
      <Plus className="size-7" strokeWidth={2.4} />
    </motion.button>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const left = NAV.slice(0, 2);
  const right = NAV.slice(2);
  const item = (n: (typeof NAV)[number]) => {
    const active = n.match(pathname);
    const Icon = n.icon;
    return (
      <Link
        key={n.href}
        href={n.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
          active ? "text-fg" : "text-fg-subtle",
        )}
      >
        {active && (
          <motion.span layoutId="bottom-nav-dot" transition={springSnappy} className="absolute top-1 h-1 w-6 rounded-full bg-accent" />
        )}
        <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden />
        {n.label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Main"
      className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-t-[var(--radius-xl)] border-b-0 px-2 pt-1 lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center">
        {left.map(item)}
        <div className="flex w-20 justify-center">
          <AddButton className="-mt-7" />
        </div>
        {right.map(item)}
      </div>
    </nav>
  );
}

function Sidebar({ pathname, name, userId, image }: { pathname: string; name: string; userId: string; image: string | null }) {
  const { openAddExpense } = useAddExpense();
  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-line bg-bg-elevated px-4 py-6 lg:flex">
      <Link href="/home" className="px-2">
        <Logo />
      </Link>
      <Button className="mt-8" leading={<Plus className="size-4" />} onClick={() => openAddExpense()}>
        Add expense
      </Button>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {NAV.map((n) => {
          const active = n.match(pathname);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[15px] font-medium transition-colors",
                active ? "text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {active && (
                <motion.span layoutId="side-nav-bg" transition={springSnappy} className="absolute inset-0 rounded-[inherit] bg-surface-2" />
              )}
              <Icon className="relative size-5" aria-hidden />
              <span className="relative">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link href="/account" className="mt-auto flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-surface-2">
        <Avatar id={userId} name={name} image={image} size="sm" />
        <span className="truncate text-sm font-medium">{name}</span>
      </Link>
    </aside>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const unauthorized = me.error instanceof ApiError && me.error.status === 401;
  const needsName = me.data && !me.data.name.trim() && pathname !== "/welcome";

  useEffect(() => {
    if (unauthorized) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/sign-in?next=${encodeURIComponent(next)}`);
    } else if (needsName) {
      router.replace("/welcome");
    }
  }, [unauthorized, needsName, router]);

  if (me.data && !needsName) {
    return (
      <>
        <Sidebar pathname={pathname} name={me.data.name} userId={me.data.id} image={me.data.image} />
        <div className="min-h-dvh pb-28 lg:ps-64 lg:pb-10">{children}</div>
        <BottomNav pathname={pathname} />
        <AddExpenseSheet />
      </>
    );
  }
  if (me.error && !unauthorized) {
    const offline = me.error instanceof ApiError && me.error.isNetwork;
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <ErrorState
          offline={offline}
          title="Can't reach SettleMint"
          body="The server may be waking up. This usually takes a few seconds."
          onRetry={() => me.refetch()}
        />
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy>
      <Logo />
      <Spinner label="Loading your account" />
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

export { Logo };
