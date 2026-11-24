"use client";

import type { GroupDetailDto } from "@settlemint/shared";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, Share2, UserPlus } from "@/ui/icons";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMemberActions } from "@settlemint/client/data/queries";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Spinner } from "@/ui/feedback";
import { TextField } from "@/ui/field";
import { Sheet } from "@/ui/sheet";

export function InviteSheet({
  group,
  open,
  onOpenChange,
}: {
  group: GroupDetailDto;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const link = useMutation({
    mutationFn: (rotate: boolean) => api.groups.inviteLink(group.id, rotate),
  });
  const { add } = useMemberActions(group.id);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const emailOk = !email.trim() || /^\S+@\S+\.\S+$/.test(email.trim());
  const canRotate = group.members.find((m) => m.isMe)?.role !== "member";
  const t = useTranslations("invite");
  const tc = useTranslations("common");

  const { mutate, data, isIdle } = link;
  useEffect(() => {
    if (open && isIdle) mutate(false);
  }, [open, isIdle, mutate]);

  const url = data?.url;
  const message = t("shareText", { group: group.name, url: url ?? "" });

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const share = async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: group.name, text: message, url });
      } catch {
        // cancelled
      }
    } else {
      await copy();
    }
  };

  const addByName = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || !emailOk) return;
    const em = email.trim();
    add.mutate(em ? { displayName: n, email: em } : { displayName: n }, {
      onSuccess: () => {
        toast.success(t("added", { name: n }));
        setName("");
        setEmail("");
      },
    });
  };

  const unclaimed = group.members.filter((m) => !m.claimed && !m.left);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("title")} description={t("description")} showDescription>
      <div className="space-y-6 py-2">
        <div className="space-y-3">
          <div className="flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5">
            {url ? (
              <span className="tabular min-w-0 flex-1 truncate text-sm text-fg-muted" title={url}>
                {url.replace(/^https?:\/\//, "")}
              </span>
            ) : (
              <span className="flex-1">
                <Spinner />
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!url} onClick={copy} leading={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
              {copied ? tc("copied") : t("copyLink")}
            </Button>
            <Button disabled={!url} onClick={share} leading={<Share2 className="size-4" />}>
              {tc("share")}
            </Button>
          </div>
          <p className="text-[13px] text-fg-subtle">
            {t("anyone")}
            {unclaimed.length > 0 &&
              ` ${t("pickName", { names: new Intl.ListFormat(document.documentElement.lang || "en", { type: "conjunction" }).format(unclaimed.map((m) => m.displayName)) })}`}
          </p>
          {canRotate && url && (
            <button
              type="button"
              onClick={() => link.mutate(true, { onSuccess: () => toast.success(t("resetDone")) })}
              className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"
            >
              <RefreshCw className="size-3.5" /> {t("reset")}
            </button>
          )}
        </div>

        <form onSubmit={addByName} className="space-y-2">
          <TextField
            label={t("addByName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={60}
            trailing={
              <Button type="submit" size="sm" variant="ghost" disabled={!name.trim() || !emailOk} loading={add.isPending} leading={<UserPlus className="size-4" />}>
                {t("add")}
              </Button>
            }
          />
          <TextField
            type="email"
            inputMode="email"
            autoComplete="off"
            aria-label={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            maxLength={254}
            aria-invalid={emailOk ? undefined : true}
          />
          <p className="text-[13px] text-fg-subtle">{t("addNote")} {t("emailNote")}</p>
        </form>

        <div className="flex flex-wrap gap-2">
          {group.members
            .filter((m) => !m.left)
            .map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pe-3 ps-1 text-sm">
                <Avatar id={m.id} name={m.displayName} image={m.image} size="xs" pending={!m.claimed} />
                {m.isMe ? tc("you") : m.displayName}
              </span>
            ))}
        </div>
      </div>
    </Sheet>
  );
}
