"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./join.module.css";

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [group, setGroup] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "preview" | "joining" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("settlemint_session");
    if (session) setAuthToken(JSON.parse(session).token);

    // Preview the invite (public endpoint)
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/invite/${token}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error); });
        return res.json();
      })
      .then((data) => {
        setGroup(data.group);
        setStatus("preview");
      })
      .catch((err) => {
        setErrorMsg(err.message || "Invalid invite link");
        setStatus("error");
      });
  }, [token]);

  const handleJoin = async () => {
    if (!authToken) {
      // Not logged in — redirect to login with return URL
      router.push(`/login?redirect=/join/${token}`);
      return;
    }

    setStatus("joining");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://settlemint.onrender.com"}/api/invite/${token}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus("success");
      setTimeout(() => router.push(`/dashboard/groups/${data.groupId}`), 1800);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandLogo}>M</div>
          <span className={styles.brandName}>SettleMint</span>
        </div>

        {status === "loading" && (
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p className={styles.hint}>Verifying invite link…</p>
          </div>
        )}

        {status === "error" && (
          <div className={styles.center}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.title}>Invalid Invite</h2>
            <p className={styles.hint}>{errorMsg}</p>
            <Link href="/dashboard" className={`btn btn-secondary ${styles.btn}`}>Go to Dashboard</Link>
          </div>
        )}

        {(status === "preview" || status === "joining") && group && (
          <>
            <div className={styles.groupCard}>
              <div className={styles.groupEmoji} style={{ background: `${group.color || "#5B8DEF"}20` }}>
                {group.emoji || "📁"}
              </div>
              <div className={styles.groupInfo}>
                <h2 className={styles.groupName}>{group.name}</h2>
                <div className={styles.groupMeta}>
                  <span>{group.mode} group</span>
                  <span className={styles.dot} />
                  <span>{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</span>
                  <span className={styles.dot} />
                  <span>{group.baseCurrency}</span>
                </div>
              </div>
            </div>

            <p className={styles.inviteText}>
              You've been invited to join this group on SettleMint — the smarter way to split expenses.
            </p>

            <button
              className={`btn btn-primary ${styles.joinBtn}`}
              onClick={handleJoin}
              disabled={status === "joining"}
            >
              {status === "joining" ? (
                <><span className={styles.btnSpinner} /> Joining…</>
              ) : (
                authToken ? "Accept Invite & Join" : "Sign in to Join"
              )}
            </button>

            {!authToken && (
              <p className={styles.hint} style={{ marginTop: "1rem", textAlign: "center" }}>
                Don&apos;t have an account?{" "}
                <Link href={`/signup?redirect=/join/${token}`} style={{ color: "var(--mint-400)" }}>
                  Create one free →
                </Link>
              </p>
            )}

            {group.inviteExpiresAt && (
              <p className={styles.expiry}>
                Invite expires {new Date(group.inviteExpiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </>
        )}

        {status === "success" && (
          <div className={styles.center}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.title}>You&apos;re in!</h2>
            <p className={styles.hint}>Redirecting you to the group…</p>
          </div>
        )}
      </div>
    </div>
  );
}
