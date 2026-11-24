"use client";

import { ApiError } from "@settlemint/shared";
import { UserPlus, X } from "@/ui/icons";
import { useState, type FormEvent } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useAddFriend, useCancelFriendRequest, useFriendRequests } from "@settlemint/client/data/queries";
import { Button, IconButton } from "@/ui/button";
import { TextField } from "@/ui/field";

/**
 * Add a friend by exactly their email or @username. It never says whether an
 * email has an account: they get a request to accept, or an invitation.
 */
export function FindFriend({ onSent }: { onSent?: () => void }) {
  const t = useTranslations("friends");
  const [to, setTo] = useState("");
  const add = useAddFriend();
  const requests = useFriendRequests();
  const cancel = useCancelFriendRequest();
  const outgoing = requests.data?.outgoing ?? [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const typed = to.trim();
    if (!typed) return;
    add.mutate(typed, {
      onSuccess: () => {
        toast.success(t("sent"), { description: t("sentDesc", { to: typed }) });
        setTo("");
        onSent?.();
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : "";
        toast.error(
          !(err instanceof ApiError)
            ? t("failed")
            : err.code === "NOT_FOUND"
              ? t("notFound")
              : err.code === "RATE_LIMITED"
                ? t("tooMany")
                : err.code === "FORBIDDEN"
                  ? t("guest")
                  : err.code === "VALIDATION_ERROR"
                    ? message.includes("you") ? t("self") : t("badInput")
                    : t("failed"),
        );
      },
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit}>
        <TextField
          aria-label={t("placeholder")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder={t("placeholder")}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          autoComplete="off"
          maxLength={254}
          trailing={
            <Button type="submit" size="sm" variant="ghost" disabled={!to.trim()} loading={add.isPending} leading={<UserPlus className="size-4" />}>
              {t("send")}
            </Button>
          }
        />
      </form>

      {outgoing.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-fg-muted">{t("waiting")}</p>
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface-2">
            {outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-1 pe-1.5 ps-3.5">
                <span className="min-w-0 flex-1 truncate text-[15px]">{r.label}</span>
                <IconButton label={t("cancelLabel", { to: r.label })} size="sm" onClick={() => cancel.mutate(r.id)}>
                  <X className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
