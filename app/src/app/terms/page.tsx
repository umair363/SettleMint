import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 2rem", color: "var(--text-primary)" }}>
      <Link href="/" style={{ color: "var(--brand-mint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem", fontWeight: "500" }}>
        ← Back to home
      </Link>
      
      <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "1rem" }}>Terms of Service</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Last Updated: June 14, 2026</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>1. Acceptance of Terms</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          By accessing or using SettleMint, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>2. Description of Service</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          SettleMint is a platform for tracking shared expenses, calculating debts, and managing bill-splitting groups. The service is provided "as is" and we make no guarantees about its availability or absolute correctness of calculations.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>3. User Conduct</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          You agree not to use the service for any illegal purposes, or to upload offensive, false, or misleading transaction details.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>4. Termination</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          We reserve the right to suspend or terminate your account at any time for violating these terms or for any other reason at our sole discretion.
        </p>
      </section>
    </div>
  );
}
