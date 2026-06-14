import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 2rem", color: "var(--text-primary)" }}>
      <Link href="/" style={{ color: "var(--brand-mint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem", fontWeight: "500" }}>
        ← Back to home
      </Link>
      
      <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "1rem" }}>Privacy Policy</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Last Updated: June 14, 2026</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>1. Information We Collect</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          We collect information you provide directly to us when you create an account, create groups, log transactions, or communicate with us. This includes your name, email address, password, and transaction data.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>2. How We Use Your Information</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          We use the information we collect to operate, maintain, and provide the features of the SettleMint bill-splitting service. We do not sell your personal data to third parties.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>3. Data Security</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          We take reasonable measures to protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>4. Contact Us</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          If you have any questions about this Privacy Policy, please contact us at support@settlemint.com.
        </p>
      </section>
    </div>
  );
}
