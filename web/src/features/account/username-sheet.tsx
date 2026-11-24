"use client";

import { ApiError } from "@settlemint/shared";
import { useState, type FormEvent } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useUpdateMe } from "@settlemint/client/data/queries";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/field";
import { Sheet } from "@/ui/sheet";

/** The handle friends can add me by. Optional; letters, numbers and underscores. */
export function UsernameSheet({ open, onOpenChange, current }: { open: boolean; onOpenChange: (o: boolean) => void; current: string | null }) {
  const t = useTranslations("friends");
  const tc = useTranslations("common");
  const update = useUpdateMe();
  const [value, setValue] = useState(current ?? "");
  const clean = value.trim().replace(/^@/, "").toLowerCase();
  const valid = /^[a-z0-9_]{3,20}$/.test(clean);

  const save = (username: string | null, done: string) =>
    update.mutate(
      { username },
      {
        onSuccess: () => {
          toast.success(done);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError && err.code === "CONFLICT" ? t("usernameTaken") : err instanceof ApiError && err.code === "VALIDATION_ERROR" ? t("usernameInvalid") : t("failed")),
      },
    );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) save(clean, t("usernameSaved"));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("usernameTitle")} description={t("usernameBody")} showDescription>
      <form onSubmit={submit} className="space-y-4 pb-2">
        <TextField
          aria-label={t("usernameRow")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("usernamePlaceholder")}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={21}
          leading={<span className="text-[15px]">@</span>}
          error={value.trim() && !valid ? t("usernameInvalid") : undefined}
        />
        <Button type="submit" block size="lg" loading={update.isPending} disabled={!valid || clean === current}>
          {tc("save")}
        </Button>
        {current && (
          <Button type="button" block variant="ghost" onClick={() => save(null, t("usernameSaved"))}>
            {t("usernameRemove")}
          </Button>
        )}
      </form>
    </Sheet>
  );
}
