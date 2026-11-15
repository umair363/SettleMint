import Link from "next/link";

export const metadata = { title: "Terms" };

// Placeholder until the full terms are written (launch-readiness phase).
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-16">
      <Link href="/" className="text-sm text-fg-muted hover:text-fg">
        ← SettleMint
      </Link>
      <h1 className="font-display text-3xl font-semibold">Terms</h1>
      <p className="text-fg-muted">
        SettleMint records who paid what and who owes whom. It doesn&apos;t move money. The full terms of service will be
        published here before public launch.
      </p>
    </main>
  );
}
