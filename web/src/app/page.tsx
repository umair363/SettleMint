"use client";

import { ArrowRight, Globe, Receipt, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/features/shell/app-shell";
import { useMe } from "@/lib/queries";

// Signed-in people go straight to the app. The full landing page comes in Phase 7.
export default function Home() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me.data) router.replace("/home");
  }, [me.data, router]);

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 overflow-hidden px-6 py-16">
      <Logo className="relative" />
      <div className="relative space-y-4">
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">
          Split bills.
          <br />
          Keep friends.
        </h1>
        <p className="max-w-md text-lg text-fg-muted">
          Shared costs for trips, homes and couples. Any currency, fair to the cent, free with no daily limits.
        </p>
      </div>
      <ul className="relative space-y-3 text-[15px]">
        <li className="flex items-center gap-3">
          <Users className="size-5 text-positive" /> Friends join from a link, no account needed
        </li>
        <li className="flex items-center gap-3">
          <Globe className="size-5 text-positive" /> 150+ currencies, rate locked when you add it
        </li>
        <li className="flex items-center gap-3">
          <Receipt className="size-5 text-positive" /> Split equally, by amount, percent, shares or item
        </li>
      </ul>
      <Link
        href="/sign-in"
        className="relative inline-flex h-14 items-center justify-center gap-2 self-start rounded-[var(--radius-lg)] bg-accent px-7 text-base font-semibold text-accent-fg shadow-lift"
      >
        Get started <ArrowRight className="size-4 rtl:rotate-180" />
      </Link>
    </main>
  );
}
