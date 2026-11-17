import { keys, useGroup, useMemberActions, useUpdateGroup } from "@settlemint/client/data/queries";
import { ApiError, type GroupDetailDto, type UpdateGroupBody } from "@settlemint/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Switch, View } from "react-native";
import { useTranslations } from "use-intl";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Avatar, Card, Divider, Loading, Money, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

/** Ask before something destructive (the native dialog on phones, confirm() in the web preview). */
function confirmThen(title: string, body: string, action: string, cancel: string, run: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${body}`)) run();
    return;
  }
  Alert.alert(title, body, [
    { text: cancel, style: "cancel" },
    { text: action, style: "destructive", onPress: run },
  ]);
}

export default function GroupSettings() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useGroup(groupId ?? null);
  if (!group.data) return <Loading />;
  return <SettingsForm key={group.data.id} group={group.data} />;
}

function ToggleRow({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="sub" tone="muted">
          {body}
        </Text>
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.surface3 }} thumbColor="#ffffff" />
    </View>
  );
}

function SettingsForm({ group }: { group: GroupDetailDto }) {
  const qc = useQueryClient();
  const t = useTranslations("groupSettings");
  const tc = useTranslations("common");
  const update = useUpdateGroup(group.id);
  const { rename, remove } = useMemberActions(group.id);
  const [name, setName] = useState(group.name);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const me = group.members.find((m) => m.isMe);
  const isAdmin = me?.role === "owner" || me?.role === "admin";
  const myBalance = group.balances[me?.id ?? ""] ?? 0;

  const save = (changes: Omit<UpdateGroupBody, "version">) =>
    update.mutate(
      { version: group.version, ...changes },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.code === "VERSION_CONFLICT") toast.error(t("conflict"));
        },
      },
    );

  const leave = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.groups.leave(group.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.dismissAll();
      router.replace("/groups");
      toast.success(t("left", { group: group.name }));
    },
    onError: () => toast.error(t("leaveFailed")),
  });

  const del = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.groups.remove(group.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.dismissAll();
      router.replace("/groups");
      toast.info(t("deleted", { group: group.name }), {
        action: {
          label: tc("undo"),
          onPress: () => void api.groups.restore(group.id).then(() => qc.invalidateQueries({ queryKey: keys.groups })),
        },
      });
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const active = group.members.filter((m) => !m.left);

  return (
    <Screen sheet title={t("title")} headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}>
      <View style={{ gap: 8 }}>
        <Field label={t("name")} value={name} onChangeText={setName} maxLength={100} />
        {name.trim() && name.trim() !== group.name ? (
          <Button loading={update.isPending} onPress={() => save({ name: name.trim() })}>
            {tc("save")}
          </Button>
        ) : null}
      </View>

      <Card style={{ gap: 18 }}>
        <ToggleRow title={t("simplify")} body={t("simplifyHelp")} value={group.simplifyDebts} onChange={(v) => save({ simplifyDebts: v })} />
        <ToggleRow title={t("archive")} body={t("archiveHelp")} value={group.archived} onChange={(v) => save({ archived: v })} />
      </Card>

      <View>
        <SectionHeader title={t("people", { count: active.length })} />
        <Card padded={false}>
          {active.map((m, i) => {
            const balance = group.balances[m.id] ?? 0;
            const canEdit = !m.claimed || m.isMe || isAdmin;
            const canRemove = !m.isMe && m.role !== "owner" && (isAdmin || !m.claimed);
            return (
              <View key={m.id}>
                {i > 0 && <Divider inset={64} />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
                  <Avatar name={m.displayName} size={36} />
                  {editing === m.id ? (
                    <View style={{ flex: 1, flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Field value={editName} onChangeText={setEditName} accessibilityLabel={t("newName")} autoFocus maxLength={60} />
                      </View>
                      <Button
                        disabled={!editName.trim()}
                        loading={rename.isPending}
                        onPress={() => rename.mutate({ memberId: m.id, displayName: editName.trim() }, { onSuccess: () => setEditing(null) })}
                      >
                        {tc("save")}
                      </Button>
                    </View>
                  ) : (
                    <>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {m.isMe ? tc("you") : m.displayName}
                          {m.role !== "member" ? <Text variant="caption" tone="subtle">{`  ${t("role", { role: m.role })}`}</Text> : null}
                        </Text>
                        {!m.claimed ? (
                          <Text variant="caption" tone="muted">
                            {t("notJoined")}
                          </Text>
                        ) : balance === 0 ? (
                          <Text variant="caption" tone="muted">
                            {t("settledUp")}
                          </Text>
                        ) : (
                          <Money minor={balance} currency={group.currency} tone="auto" signed variant="caption" />
                        )}
                      </View>
                      {canEdit && (
                        <IconButton
                          icon="pencil"
                          size={36}
                          label={t("rename", { name: m.displayName })}
                          onPress={() => {
                            setEditing(m.id);
                            setEditName(m.displayName);
                          }}
                        />
                      )}
                      {canRemove && (
                        <IconButton
                          icon="person-remove-outline"
                          size={36}
                          label={balance !== 0 ? t("settleFirst") : t("remove", { name: m.displayName })}
                          onPress={() => {
                            if (balance !== 0) return toast.info(t("settleFirst"));
                            remove.mutate(m.id, { onSuccess: () => toast.success(t("removed", { name: m.displayName })) });
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <Button
          variant="secondary"
          icon="log-out-outline"
          loading={leave.isPending}
          onPress={() =>
            myBalance !== 0
              ? toast.info(t("leaveTitle", { group: group.name }), { description: t("leaveBlocked") })
              : confirmThen(t("leaveTitle", { group: group.name }), t("leaveBody"), t("leaveConfirm"), tc("cancel"), () => leave.mutate())
          }
        >
          {t("leave")}
        </Button>
        {me?.role === "owner" && (
          <Button
            variant="danger"
            icon="trash-outline"
            loading={del.isPending}
            onPress={() => confirmThen(t("deleteTitle", { group: group.name }), t("deleteBody"), t("delete"), tc("cancel"), () => del.mutate())}
          >
            {t("delete")}
          </Button>
        )}
      </View>
    </Screen>
  );
}
