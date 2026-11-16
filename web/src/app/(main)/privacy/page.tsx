import Link from "next/link";

export const metadata = { title: "Privacy" };

// Placeholder until the full policy is written (launch-readiness phase).
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-16">
      <Link href="/" className="text-sm text-fg-muted hover:text-fg">
        ← SettleMint
      </Link>
      <h1 className="font-display text-3xl font-semibold">Privacy</h1>
      <p className="text-fg-muted">
        SettleMint stores what you enter (your name, email, groups, expenses and payments) only to run the app. We don&apos;t
        sell your data or show ads. The full privacy policy will be published here before public launch.
      </p>
      <p className="text-fg-muted">
        When you scan a receipt, the photo is sent to Google&apos;s Gemini AI to read it. SettleMint doesn&apos;t keep the
        photo. Google may use content sent through its free service to improve its products.
      </p>
      <p className="text-fg-muted">
        If you turn on notifications, your browser gives us an address at its push service (run by Google, Apple, Mozilla
        or Microsoft, depending on the browser). Notifications are encrypted so the push service can&apos;t read them. Turning
        notifications off or signing out removes the address.
      </p>
    </main>
  );
}
