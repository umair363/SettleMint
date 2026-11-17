"use client";

import { ApiError, type GroupDetailDto } from "@settlemint/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Pencil, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { keys, useMemberActions, useUpdateGroup } from "@settlemint/client/data/queries";
import { Avatar } from "@/ui/avatar";
import { Button, IconButton } from "@/ui/button";
import { Switch } from "@/ui/controls";
import { ConfirmDialog } from "@/ui/dialog";
import { TextField } from "@/ui/field";
import { Money } from "@/ui/money";
import { Sheet } from "@/ui/sheet";
import { SectionHeader } from "@/ui/surface";
import { useTranslations } from "use-intl";

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
  const t = useTranslations("groupSettings");
  const tc = useTranslations("common");

  const leave = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.groups.leave(group.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.replace("/groups");
      toast.success(t("left", { group: group.name }));
    },
  });
  const del = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.groups.remove(group.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.replace("/groups");
      toast(t("deleted", { group: group.name }), {
        action: { label: tc("undo"), onClick: () => api.groups.restore(group.id).then(() => qc.invalidateQueries({ queryKey: keys.groups })) },
      });
    },
  });

  const saveField = (changes: Parameters<typeof update.mutate>[0]) =>
    update.mutate(changes, {
      onError: (err) => {
        if (err instanceof ApiError && err.code === "VERSION_CONFLICT") toast.error(t("conflict"));
      },
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("title")} tall>
      <div className="space-y-7 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name.trim() !== group.name) saveField({ version: group.version, name: name.trim() });
          }}
        >
          <TextField
            label={t("name")}
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            trailing={
              name.trim() !== group.name && name.trim() ? (
                <Button type="submit" size="sm" loading={update.isPending}>
                  {tc("save")}
                </Button>
              ) : undefined
            }
          />
        </form>

        <div className="space-y-5">
          <Switch
            checked={group.simplifyDebts}
            onCheckedChange={(v) => saveField({ version: group.version, simplifyDebts: v })}
            label={t("simplify")}
            description={t("simplifyHelp")}
          />
          <Switch
            checked={group.archived}
            onCheckedChange={(v) => saveField({ version: group.version, archived: v })}
            label={t("archive")}
            description={t("archiveHelp")}
          />
        </div>

        <section>
          <SectionHeader title={t("people", { count: group.members.filter((m) => !m.left).length })} />
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
                        <TextField aria-label={t("newName")} autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} containerClassName="flex-1" maxLength={60} />
                        <Button type="submit" size="sm" className="mt-1.5" disabled={!editName.trim()} loading={rename.isPending}>
                          {tc("save")}
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {m.isMe ? tc("you") : m.displayName}
                            {m.role !== "member" && <span className="ms-1.5 text-xs text-fg-subtle">{t("role", { role: m.role })}</span>}
                          </span>
                          <span className="block text-xs text-fg-muted">
                            {!m.claimed ? t("notJoined") : balance === 0 ? t("settledUp") : <Money minor={balance} currency={group.currency} tone="auto" signed />}
                          </span>
                        </span>
                        {canEdit && (
                          <IconButton
                            label={t("rename", { name: m.displayName })}
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
                            label={t("remove", { name: m.displayName })}
                            size="sm"
                            disabled={balance !== 0}
                            title={balance !== 0 ? t("settleFirst") : undefined}
                            onClick={() => remove.mutate(m.id, { onSuccess: () => toast.success(t("removed", { name: m.displayName })) })}
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
            {t("leave")}
          </Button>
          {me?.role === "owner" && (
            <Button variant="danger" block leading={<Trash2 className="size-4" />} onClick={() => setConfirm("delete")}>
              {t("delete")}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "leave"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t("leaveTitle", { group: group.name })}
        body={(group.balances[me?.id ?? ""] ?? 0) !== 0 ? t("leaveBlocked") : t("leaveBody")}
        confirmLabel={t("leaveConfirm")}
        destructive
        loading={leave.isPending}
        onConfirm={() =>
          leave.mutate(undefined, {
            onError: () => {
              setConfirm(null);
              toast.error(t("leaveFailed"));
            },
          })
        }
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t("deleteTitle", { group: group.name })}
        body={t("deleteBody")}
        confirmLabel={t("delete")}
        destructive
        loading={del.isPending}
        onConfirm={() =>
          del.mutate(undefined, {
            onError: () => {
              setConfirm(null);
              toast.error(t("deleteFailed"));
            },
          })
        }
      />
    </Sheet>
  );
}
