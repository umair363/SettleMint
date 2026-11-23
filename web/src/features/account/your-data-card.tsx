"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download, LoaderCircle, Trash2 } from "@/ui/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { persister } from "@/lib/persist";
import { disablePush } from "@/lib/push";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/field";
import { Sheet } from "@/ui/sheet";
import { IconTile } from "@/ui/glyph-tile";
import { ListRow } from "@/ui/surface";
import { useTranslations } from "use-intl";

/** Export everything, or delete the account (privacy-law and store requirements). */
export function YourDataRows() {
  const router = useRouter();
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("yourData");

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
      toast.error(t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.me.delete();
      await disablePush(); // the server already forgot it; drop the browser's side too
      await authClient.signOut().catch(() => {});
      qc.clear();
      await persister.removeClient();
      router.replace("/");
    } catch {
      setDeleting(false);
      toast.error(t("deleteFailed"));
    }
  };

  return (
    <>
      <ListRow
        onClick={exporting ? undefined : exportData}
        leading={<IconTile>{exporting ? <LoaderCircle className="animate-spin" /> : <Download />}</IconTile>}
        title={t("export")}
      />
      <ListRow
        onClick={() => setDeleteOpen(true)}
        leading={
          <IconTile tone="danger">
            <Trash2 />
          </IconTile>
        }
        title={<span className="text-negative">{t("delete")}</span>}
      />

      <Sheet
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setTyped("");
        }}
        title={t("confirmTitle")}
        description={t("cantUndo")}
        showDescription
      >
        <div className="space-y-4 pb-2">
          <ul className="list-disc space-y-1.5 ps-5 text-[15px] text-fg-muted">
            <li>{t("point1")}</li>
            <li>{t("point2")}</li>
            <li>{t("point3")}</li>
          </ul>
          <TextField label={t("typeToConfirm", { word: t("confirmWord") })} value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
          <Button variant="danger" block size="lg" disabled={typed.trim().toLocaleUpperCase() !== t("confirmWord").toLocaleUpperCase()} loading={deleting} onClick={deleteAccount}>
            {t("deleteMine")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
