"use client";

import type { GroupDetailDto } from "@settlemint/shared";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, Share2, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMemberActions } from "@/lib/queries";
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
  const canRotate = group.members.find((m) => m.isMe)?.role !== "member";

  const { mutate, data, isIdle } = link;
  useEffect(() => {
    if (open && isIdle) mutate(false);
  }, [open, isIdle, mutate]);

  const url = data?.url;
  const message = `Join "${group.name}" on SettleMint to split costs: ${url}`;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
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
    if (!n) return;
    add.mutate(n, {
      onSuccess: () => {
        toast.success(`Added ${n}`);
        setName("");
      },
    });
  };

  const unclaimed = group.members.filter((m) => !m.claimed && !m.left);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Invite people" description="Share a link or add people by name." showDescription>
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
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button disabled={!url} onClick={share} leading={<Share2 className="size-4" />}>
              Share
            </Button>
          </div>
          <p className="text-[13px] text-fg-subtle">
            Anyone with the link can join, even without an account.
            {unclaimed.length > 0 && ` They can pick their name: ${unclaimed.map((m) => m.displayName).join(", ")}.`}
          </p>
          {canRotate && url && (
            <button
              type="button"
              onClick={() => link.mutate(true, { onSuccess: () => toast.success("Old link no longer works") })}
              className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"
            >
              <RefreshCw className="size-3.5" /> Reset link
            </button>
          )}
        </div>

        <form onSubmit={addByName} className="space-y-2">
          <TextField
            label="Or add someone by name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam"
            maxLength={60}
            trailing={
              <Button type="submit" size="sm" variant="ghost" disabled={!name.trim()} loading={add.isPending} leading={<UserPlus className="size-4" />}>
                Add
              </Button>
            }
          />
          <p className="text-[13px] text-fg-subtle">You can split with them right away; they can join later.</p>
        </form>

        <div className="flex flex-wrap gap-2">
          {group.members
            .filter((m) => !m.left)
            .map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pe-3 ps-1 text-sm">
                <Avatar id={m.id} name={m.displayName} image={m.image} size="xs" pending={!m.claimed} />
                {m.isMe ? "You" : m.displayName}
              </span>
            ))}
        </div>
      </div>
    </Sheet>
  );
}
