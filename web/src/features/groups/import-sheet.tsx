"use client";

import { ApiError, parseSplitwiseExport, type SplitwiseExport } from "@settlemint/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { plural } from "@/lib/plural";
import { keys } from "@/lib/queries";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { TextField } from "@/ui/field";
import { Sheet } from "@/ui/sheet";

const MAX_BYTES = 850_000;

/** Bring a group over from Splitwise: pick the export, say which person is you, done. */
export function ImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Import from Splitwise" tall>
      {open && <ImportForm onDone={() => onOpenChange(false)} />}
    </Sheet>
  );
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [csv, setCsv] = useState<string | null>(null);
  const [parsed, setParsed] = useState<SplitwiseExport | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [me, setMe] = useState<number | null>(null);
  const [name, setName] = useState("");

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) return setFileError("That file is too big. Export one group at a time.");
    const text = await file.text();
    const result = parseSplitwiseExport(text);
    if (result.people.length === 0) return setFileError(result.problems[0]?.reason ?? "No people found in this file.");
    setCsv(text);
    setParsed(result);
    setMe(null);
    const base = file.name.replace(/\.csv$/i, "").replace(/[_-]+/g, " ").replace(/\d{4} \d{2} \d{2}.*$/, "").trim();
    setName(base ? base.charAt(0).toLocaleUpperCase() + base.slice(1) : "Imported group");
  };

  const run = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.importSplitwise({ csv: csv!, groupName: name.trim(), meIndex: me! }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      onDone();
      toast.success(`Imported ${plural(res.expenses, "expense")} and ${plural(res.payments, "payment")}`, {
        description: res.skipped.length ? `${plural(res.skipped.length, "row")} couldn't be imported.` : "Balances match Splitwise.",
      });
      router.push(`/group?id=${res.groupId}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Import failed. Nothing was changed."),
  });

  const expenses = parsed?.rows.filter((r) => !r.isPayment).length ?? 0;
  const payments = parsed?.rows.filter((r) => r.isPayment).length ?? 0;

  return (
    <div className="flex h-full flex-col gap-5 pt-1">
      <ol className="list-decimal space-y-1 ps-5 text-sm text-fg-muted">
        <li>In Splitwise, open the group, then Settings › Export as spreadsheet.</li>
        <li>Choose that file below.</li>
      </ol>

      <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-line-strong bg-surface-2 px-4 py-4 hover:bg-surface-3">
        <FileUp className="size-6 text-positive" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{parsed ? "Choose a different file" : "Choose the export (.csv)"}</span>
          {parsed && (
            <span className="block text-sm text-fg-muted">
              {plural(expenses, "expense")} · {plural(payments, "payment")} · {plural(parsed.people.length, "person", "people")}
              {parsed.problems.length > 0 && ` · ${plural(parsed.problems.length, "unreadable row")}`}
            </span>
          )}
        </span>
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="sr-only" aria-label="Splitwise export file" />
      </label>
      {fileError && (
        <p role="alert" className="text-sm text-negative">
          {fileError}
        </p>
      )}

      {parsed && (
        <>
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-fg-muted">Which one is you?</p>
            <ul className="space-y-1.5" role="radiogroup" aria-label="Which person is you">
              {parsed.people.map((p, i) => (
                <li key={p}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={me === i}
                    onClick={() => setMe(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-start transition-colors",
                      me === i ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2",
                    )}
                  >
                    <Avatar id={p} name={p} size="sm" />
                    <span className="flex-1 font-medium">{p}</span>
                    {me === i && <Check className="size-4 text-positive" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-fg-subtle">Everyone else is added by name; they can claim their spot from an invite link.</p>
          </div>
          <TextField label="Group name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        </>
      )}

      <div className="mt-auto space-y-2 pb-2">
        <p className="text-[12px] text-fg-subtle">
          Balances come over exactly. Splitwise exports don&apos;t say who paid what inside each expense, so each one shows
          a rebuilt split that adds up to the same balances.
        </p>
        <Button block size="lg" disabled={!parsed || me === null || !name.trim()} loading={run.isPending} onClick={() => run.mutate()}>
          Import
        </Button>
      </div>
    </div>
  );
}
