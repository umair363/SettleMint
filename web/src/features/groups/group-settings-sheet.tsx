"use client";

import { ApiError, type GroupDetailDto } from "@settlemint/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Pencil, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { keys, useMemberActions, useUpdateGroup } from "@/lib/queries";
import { Avatar } from "@/ui/avatar";
import { Button, IconButton } from "@/ui/button";
import { Switch } from "@/ui/controls";
import { ConfirmDialog } from "@/ui/dialog";
import { TextField } from "@/ui/field";
import { Money } from "@/ui/money";
import { Sheet } from "@/ui/sheet";
import { SectionHeader } from "@/ui/surface";

export function GroupSettingsSheet({
  group,
  open,
  onOpenChange,
}: {
  group: GroupDetailDto;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const update = useUpdateGroup(group.id);
  const { rename, remove } = useMemberActions(group.id);
  const [name, setName] = useState(group.name);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);
  const me = group.members.find((m) => m.isMe);
  const isAdmin = me?.role === "owner" || me?.role === "admin";

  const leave = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.groups.leave(group.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.replace("/groups");
      toast.success(`You left ${group.name}`);
    },
  });
  const del = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.groups.remove(group.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.replace("/groups");
      toast(`Deleted ${group.name}`, {
        action: { label: "Undo", onClick: () => api.groups.restore(group.id).then(() => qc.invalidateQueries({ queryKey: keys.groups })) },
      });
    },
  });

  const saveField = (changes: Parameters<typeof update.mutate>[0]) =>
    update.mutate(changes, {
      onError: (err) => {
        if (err instanceof ApiError && err.code === "VERSION_CONFLICT") toast.error("Someone else just changed this group. Try again.");
      },
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Group settings" tall>
      <div className="space-y-7 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name.trim() !== group.name) saveField({ version: group.version, name: name.trim() });
          }}
        >
          <TextField
            label="Name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            trailing={
              name.trim() !== group.name && name.trim() ? (
                <Button type="submit" size="sm" loading={update.isPending}>
                  Save
                </Button>
              ) : undefined
            }
          />
        </form>

        <div className="space-y-5">
          <Switch
            checked={group.simplifyDebts}
            onCheckedChange={(v) => saveField({ version: group.version, simplifyDebts: v })}
            label="Simplify debts"
            description="Settle up in as few payments as possible. Off: everyone pays back exactly who paid for them."
          />
          <Switch
            checked={group.archived}
            onCheckedChange={(v) => saveField({ version: group.version, archived: v })}
            label="Archive"
            description="Hide it from your lists. Nothing is deleted."
          />
        </div>

        <section>
          <SectionHeader title={`People (${group.members.filter((m) => !m.left).length})`} />
          <ul className="space-y-1">
            {group.members
              .filter((m) => !m.left)
              .map((m) => {
                const balance = group.balances[m.id] ?? 0;
                const canEdit = !m.claimed || m.isMe || isAdmin;
                const canRemove = !m.isMe && m.role !== "owner" && (isAdmin || !m.claimed);
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-[var(--radius-md)] px-1 py-1.5">
                    <Avatar id={m.id} name={m.displayName} image={m.image} size="sm" pending={!m.claimed} />
                    {editing === m.id ? (
                      <form
                        className="flex flex-1 gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          rename.mutate({ memberId: m.id, displayName: editName.trim() }, { onSuccess: () => setEditing(null) });
                        }}
                      >
                        <TextField aria-label="New name" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} containerClassName="flex-1" maxLength={60} />
                        <Button type="submit" size="sm" className="mt-1.5" disabled={!editName.trim()} loading={rename.isPending}>
                          Save
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {m.isMe ? "You" : m.displayName}
                            {m.role !== "member" && <span className="ms-1.5 text-xs text-fg-subtle">{m.role}</span>}
                          </span>
                          <span className="block text-xs text-fg-muted">
                            {!m.claimed ? "Hasn't joined yet" : balance === 0 ? "Settled up" : <Money minor={balance} currency={group.currency} tone="auto" signed />}
                          </span>
                        </span>
                        {canEdit && (
                          <IconButton
                            label={`Rename ${m.displayName}`}
                            size="sm"
                            onClick={() => {
                              setEditing(m.id);
                              setEditName(m.displayName);
                            }}
                          >
                            <Pencil className="size-4" />
                          </IconButton>
                        )}
                        {canRemove && (
                          <IconButton
                            label={`Remove ${m.displayName}`}
                            size="sm"
                            disabled={balance !== 0}
                            title={balance !== 0 ? "Settle up before removing" : undefined}
                            onClick={() => remove.mutate(m.id, { onSuccess: () => toast.success(`Removed ${m.displayName}`) })}
                          >
                            <UserMinus className="size-4" />
                          </IconButton>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>

        <div className="space-y-2 border-t border-line pt-5">
          <Button variant="secondary" block leading={<LogOut className="size-4" />} onClick={() => setConfirm("leave")}>
            Leave group
          </Button>
          {me?.role === "owner" && (
            <Button variant="danger" block leading={<Trash2 className="size-4" />} onClick={() => setConfirm("delete")}>
              Delete group
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "leave"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Leave ${group.name}?`}
        body={
          (group.balances[me?.id ?? ""] ?? 0) !== 0
            ? "You need to settle up first. Your balance in this group isn't zero."
            : "You won't see this group any more. Your past expenses stay for everyone else."
        }
        confirmLabel="Leave"
        destructive
        loading={leave.isPending}
        onConfirm={() =>
          leave.mutate(undefined, {
            onError: (err) => {
              setConfirm(null);
              toast.error(err instanceof ApiError ? err.message : "Couldn't leave the group");
            },
          })
        }
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${group.name}?`}
        body="Everyone loses access to the group and its history. You can undo right after."
        confirmLabel="Delete group"
        destructive
        loading={del.isPending}
        onConfirm={() =>
          del.mutate(undefined, {
            onError: (err) => {
              setConfirm(null);
              toast.error(err instanceof ApiError ? err.message : "Couldn't delete the group");
            },
          })
        }
      />
    </Sheet>
  );
}
