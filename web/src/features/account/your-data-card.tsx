"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { persister } from "@/lib/persist";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/field";
import { Sheet } from "@/ui/sheet";
import { Card } from "@/ui/surface";

/** Export everything, or delete the account (privacy-law and store requirements). */
export function YourDataCard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await api.me.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settlemint-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export right now. Try again in a moment.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.me.delete();
      await authClient.signOut().catch(() => {});
      qc.clear();
      await persister.removeClient();
      router.replace("/");
    } catch {
      setDeleting(false);
      toast.error("Couldn't delete the account. Try again.");
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="font-semibold">Your data</p>
        <p className="text-sm text-fg-muted">Download everything SettleMint has about you, or delete your account.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" leading={<Download className="size-4" />} loading={exporting} onClick={exportData}>
          Export my data
        </Button>
        <Button variant="danger" size="sm" leading={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>

      <Sheet
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setTyped("");
        }}
        title="Delete your account?"
        description="This can't be undone."
        showDescription
      >
        <div className="space-y-4 pb-2">
          <ul className="list-disc space-y-1.5 ps-5 text-[15px] text-fg-muted">
            <li>You&apos;ll be signed out everywhere and your sign-in methods removed.</li>
            <li>
              Expenses you were part of stay in your groups under your name, so your friends&apos; balances stay correct, but
              they&apos;re no longer linked to you.
            </li>
            <li>Groups you own pass to the longest-standing member.</li>
          </ul>
          <TextField label='Type "DELETE" to confirm' value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
          <Button variant="danger" block size="lg" disabled={typed !== "DELETE"} loading={deleting} onClick={deleteAccount}>
            Delete my account
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
