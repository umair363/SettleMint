import Link from "next/link";

// Temporary home while the app is being built. The real landing page comes in Phase 7.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-4xl font-semibold tracking-tight">SettleMint</h1>
      <p className="text-fg-muted">Split bills with anyone, in any currency. Fair to the cent.</p>
      <div className="flex gap-3">
        <Link href="/design" className="rounded-full bg-accent px-5 py-2.5 font-semibold text-accent-fg">
          Design system
        </Link>
      </div>
    </main>
  );
}
