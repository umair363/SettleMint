import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  draftFromSpec,
  equalDraft,
  minorToInputText,
  previewSplit,
  specFromDraft,
  type EditableMethod,
  type SplitDraft,
} from "@settlemint/client/data/split-model";
import { useCreateExpense, useCreateRecurring, useGroup, useGroups, useUpdateExpense } from "@settlemint/client/data/queries";
import type { CategoryKey } from "@settlemint/client/i18n/messages/en";
import { apiErrorText } from "@settlemint/client/text/api-error-text";
import { guessCategory } from "@settlemint/client/text/category-guess";
import { dayLabel, todayIso } from "@settlemint/client/text/dates";
import {
  ApiError,
  CATEGORIES,
  currencySymbol,
  getCategoryMeta,
  isValidRate,
  parseMoneyInput,
  resolveExpense,
  type ExpenseDto,
  type GroupDetailDto,
} from "@settlemint/shared";
import { useQuery } from "@tanstack/react-query";
import { getCalendars } from "expo-localization";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { uuidv7 } from "uuidv7";
import { GroupIcon } from "@/features/rows";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Button, haptic, IconButton } from "@/ui/button";
import { CurrencyPicker } from "@/ui/currency-picker";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Chip, Empty, Loading, Money, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

const LAST_GROUP_KEY = "sm-last-group";
const METHODS: EditableMethod[] = ["equal", "exact", "percent", "shares", "adjustment"];
type Repeat = "never" | "weekly" | "monthly" | "yearly";

function shiftDate(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Add or edit an expense. Params: groupId (optional), expenseId (edit). */
export default function AddExpense() {
  const params = useLocalSearchParams<{ groupId?: string; expenseId?: string }>();
  const groups = useGroups();
  const t = useTranslations("expense");
  const tc = useTranslations("common");
  const expense = useQuery({
    queryKey: ["expense", params.expenseId ?? ""],
    queryFn: () => api.expenses.get(params.expenseId!),
    enabled: Boolean(params.expenseId),
  });
  const last = useQuery({ queryKey: ["last-group"], queryFn: () => AsyncStorage.getItem(LAST_GROUP_KEY), staleTime: Infinity, gcTime: 0 });
  const [chosen, setChosen] = useState<string | null>(null);

  const active = (groups.data ?? []).filter((g) => !g.archived);
  const groupId =
    expense.data?.groupId ?? chosen ?? params.groupId ?? active.find((g) => g.id === last.data)?.id ?? active[0]?.id ?? null;
  const group = useGroup(groupId);

  if (groups.isPending || last.isPending || (params.expenseId && expense.isPending) || (groupId && group.isPending)) return <Loading />;
  if (groupId && !group.data) {
    return (
      <Screen sheet title={t("addTitle")}>
        <Empty icon="cloud-offline" title={t("openOnline")} />
      </Screen>
    );
  }
  if (!groupId || !group.data) {
    return (
      <Screen sheet title={t("addTitle")}>
        <Empty
          icon="people"
          title={t("startTitle")}
          body={t("startBody")}
          action={t("createGroup")}
          onAction={() => router.replace("/new-group")}
        />
      </Screen>
    );
  }
  return (
    <Form
      key={`${group.data.id}-${expense.data?.id ?? "new"}`}
      group={group.data}
      groups={active}
      expense={expense.data}
      onPickGroup={setChosen}
      close={() => router.back()}
      title={expense.data ? t("editTitle") : t("addTitle")}
      closeLabel={tc("close")}
    />
  );
}

function Form({
  group,
  groups,
  expense,
  onPickGroup,
  close,
  title,
  closeLabel,
}: {
  group: GroupDetailDto;
  groups: { id: string; name: string; emoji: string | null; type: string }[];
  expense?: ExpenseDto;
  onPickGroup: (id: string) => void;
  close: () => void;
  title: string;
  closeLabel: string;
}) {
  const { c, radius } = useTheme();
  const locale = useLocale();
  const t = useTranslations("expense");
  const tc = useTranslations("common");
  const ts = useTranslations("split");
  const tcat = useTranslations("categories");
  const tst = useTranslations("settle");

  const members = useMemo(
    () => group.members.filter((m) => !m.left || expense?.lines.some((l) => l.memberId === m.id)),
    [group.members, expense],
  );
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const nameOf = (id: string) => (id === group.myMemberId ? tc("you") : (members.find((m) => m.id === id)?.displayName ?? tc("someone")));

  const [currency, setCurrency] = useState(expense?.currency ?? group.currency);
  const [amountText, setAmountText] = useState(expense ? minorToInputText(expense.amount, expense.currency, locale) : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [pickedCategory, setPickedCategory] = useState<string | null>(expense?.category ?? null);
  const [fxRate, setFxRate] = useState(expense && expense.currency !== group.currency ? expense.fxRate : "");
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [repeat, setRepeat] = useState<Repeat>("never");
  const expensePayers = expense?.lines.filter((l) => l.paid > 0) ?? [];
  const [multiPay, setMultiPay] = useState(expensePayers.length > 1);
  const [payerId, setPayerId] = useState(expensePayers[0]?.memberId ?? group.myMemberId);
  const [payValues, setPayValues] = useState<Record<string, string>>(
    Object.fromEntries(expensePayers.map((p) => [p.memberId, minorToInputText(p.paid, expense!.currency, locale)])),
  );
  const [draft, setDraft] = useState<SplitDraft>(() =>
    expense ? draftFromSpec(expense.split, expense.currency, locale) : equalDraft(memberIds),
  );
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const total = parseMoneyInput(amountText, currency, locale) ?? 0;
  const category = pickedCategory ?? guessCategory(description) ?? "other";
  const cat = getCategoryMeta(category);
  const spec = useMemo(() => specFromDraft(draft, memberIds, currency, locale), [draft, memberIds, currency, locale]);
  const preview = useMemo(() => previewSplit(total, spec), [total, spec]);
  const payers = multiPay
    ? memberIds
        .map((memberId) => ({ memberId, amount: parseMoneyInput(payValues[memberId] ?? "", currency, locale) ?? 0 }))
        .filter((p) => p.amount > 0)
    : [{ memberId: payerId, amount: total }];
  const paidSum = payers.reduce((s, p) => s + p.amount, 0);
  const needsRate = currency !== group.currency;

  const problem =
    total <= 0
      ? null
      : (preview.problem ?? (paidSum !== total ? "PAID_MISMATCH" : null) ?? (needsRate && !isValidRate(fxRate.replace(",", ".")) ? "RATE_NEEDED" : null));
  const problemText =
    problem === "PAID_MISMATCH"
      ? t("paidMismatch")
      : problem === "RATE_NEEDED"
        ? t("rateNeeded", { from: currency, to: group.currency })
        : problem
          ? ts(`problem.${problem}`)
          : null;
  const canSave = total > 0 && !problem;

  const create = useCreateExpense(group.id);
  const createRecurring = useCreateRecurring(group.id);
  const update = useUpdateExpense(group.id);

  const save = () => {
    if (!canSave) return;
    const body = {
      description: description.trim() || tcat(cat.id as CategoryKey),
      amount: total,
      currency,
      fxRate: needsRate ? fxRate.replace(",", ".") : undefined,
      date,
      category,
      payers,
      split: spec,
    };
    // Same engine as the server: never send something it would refuse.
    resolveExpense(body.amount, body.payers, body.split);
    void AsyncStorage.setItem(LAST_GROUP_KEY, group.id).catch(() => {});
    haptic("success");
    if (expense) {
      update.mutate(
        { id: expense.id, body: { ...body, version: expense.version } },
        {
          onSuccess: () => {
            toast.success(t("updated"));
            close();
          },
          onError: (err) =>
            err instanceof ApiError && err.code === "VERSION_CONFLICT"
              ? toast.error(t("conflict"), { description: t("conflictHelp") })
              : toast.error(err instanceof ApiError && !err.isNetwork ? apiErrorText(err) : t("saveFailed")),
        },
      );
      return;
    }
    if (repeat !== "never") {
      const { date: startDate, ...template } = body;
      createRecurring.mutate({
        template,
        frequency: repeat,
        startDate,
        timezone: getCalendars()[0]?.timeZone ?? "UTC",
      });
      toast.success(t("added", { item: body.description }), { description: `${t("repeats", { frequency: repeat })} · ${group.name}` });
    } else {
      // Optimistic: the row appears at once; offline it's queued and sent later.
      create.mutate({ id: uuidv7(), ...body });
      toast.success(t("added", { item: body.description }), { description: group.name });
    }
    close();
  };

  const setMethod = (method: EditableMethod) => {
    if (method === draft.method) return;
    setDraft({ method, included: method === "equal" || method === "adjustment" ? memberIds : draft.included, values: {} });
  };
  const toggle = (id: string) =>
    setDraft((d) => ({ ...d, included: d.included.includes(id) ? d.included.filter((x) => x !== id) : [...d.included, id] }));
  const shareOf = (id: string) => preview.shares?.find((s) => s.memberId === id)?.amount;
  const itemized = draft.method === "itemized";

  return (
    <Screen
      sheet
      title={title}
      headerRight={<IconButton icon="close" label={closeLabel} onPress={close} />}
      footer={
        <View style={{ gap: 8 }}>
          {problemText ? (
            <Text variant="sub" tone="negative" center accessibilityLiveRegion="polite">
              {problemText}
            </Text>
          ) : null}
          <Button size="lg" block disabled={!canSave} loading={update.isPending} onPress={save} testID="save-expense">
            {t.rich("saveAmount", {
              mode: expense ? "save" : "add",
              amount: () => (total > 0 ? <Money minor={total} currency={currency} tone="accentFg" variant="bodyStrong" /> : ""),
            })}
          </Button>
        </View>
      }
    >
      {/* Group */}
      {!expense && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setGroupOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", backgroundColor: c.surface2, borderRadius: radius.full, paddingVertical: 6, paddingStart: 6, paddingEnd: 12 }}
        >
          <GroupIcon type={group.type} emoji={group.emoji} size={28} />
          <Text variant="label">{group.name}</Text>
          <Ionicons name="chevron-down" size={16} color={c.fgSubtle} />
        </Pressable>
      )}

      {/* Amount */}
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "stretch" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={currency}
            onPress={() => setCurrencyOpen(true)}
            style={{ backgroundColor: c.surface2, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text variant="heading">{safeSymbol(currency, locale)}</Text>
          </Pressable>
          <TextInput
            testID="amount"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={c.fgSubtle}
            autoFocus={!expense}
            accessibilityLabel={tst("typeAmount")}
            style={{ flex: 1, maxWidth: 240, fontSize: 44, fontWeight: "700", color: c.fg, textAlign: "center", fontVariant: ["tabular-nums"] }}
          />
        </View>
        {needsRate && (
          <View style={{ width: "100%", maxWidth: 320 }}>
            <Field
              label={t("rateLabel", { from: currency, to: group.currency })}
              value={fxRate}
              onChangeText={setFxRate}
              keyboardType="decimal-pad"
              placeholder={t("ratePlaceholder")}
            />
          </View>
        )}
      </View>

      <Field
        label={t("description")}
        value={description}
        onChangeText={setDescription}
        placeholder={t("descriptionPlaceholder")}
        returnKeyType="done"
        maxLength={120}
        testID="description"
      />

      {/* Category */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {CATEGORIES.map((k) => (
          <Chip
            key={k.id}
            label={`${k.emoji} ${tcat(k.id as CategoryKey)}`}
            selected={category === k.id}
            onPress={() => setPickedCategory(k.id)}
          />
        ))}
      </ScrollView>

      {/* Paid by */}
      <View>
        <SectionHeader
          title={t("paidBy")}
          action={
            <Button variant="ghost" onPress={() => setMultiPay((v) => !v)}>
              {multiPay ? t("whoPaid") : t("severalPaid")}
            </Button>
          }
        />
        {multiPay ? (
          <View style={{ gap: 8 }}>
            {members.map((m) => (
              <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ flex: 1 }}>{nameOf(m.id)}</Text>
                <View style={{ width: 130 }}>
                  <Field
                    value={payValues[m.id] ?? ""}
                    onChangeText={(v) => setPayValues((p) => ({ ...p, [m.id]: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    accessibilityLabel={t("amountPaidBy", { name: nameOf(m.id) })}
                    style={{ textAlign: "right" }}
                  />
                </View>
              </View>
            ))}
            <Text variant="caption" tone={paidSum === total ? "positive" : "muted"}>
              {paidSum === total
                ? t("addsUp")
                : t.rich("remaining", {
                    state: total - paidSum > 0 ? "left" : "over",
                    amount: () => <Money minor={Math.abs(total - paidSum)} currency={currency} variant="caption" />,
                  })}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {members.map((m) => (
              <Chip key={m.id} label={nameOf(m.id)} selected={payerId === m.id} onPress={() => setPayerId(m.id)} />
            ))}
          </View>
        )}
      </View>

      {/* Split */}
      <View style={{ gap: 10 }}>
        <SectionHeader title={ts("howToSplit")} />
        {itemized ? (
          <Text variant="sub" tone="muted">
            {ts("method.itemized")} · {ts("help.itemized")}
          </Text>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityLabel={ts("methodLabel")}>
              {METHODS.map((m) => (
                <Chip key={m} label={ts(`method.${m}`)} selected={draft.method === m} onPress={() => setMethod(m)} />
              ))}
            </ScrollView>
            <Text variant="caption" tone="subtle">
              {ts(`help.${draft.method as Exclude<EditableMethod, "itemized">}`)}
            </Text>
            {members.map((m) => {
              const share = shareOf(m.id);
              const on = draft.included.includes(m.id);
              const usesValue = draft.method !== "equal";
              return (
                <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }}>
                  {(draft.method === "equal" || draft.method === "adjustment") && (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={nameOf(m.id)}
                      onPress={() => toggle(m.id)}
                      hitSlop={8}
                    >
                      <Ionicons name={on ? "checkbox" : "square-outline"} size={24} color={on ? c.positive : c.fgSubtle} />
                    </Pressable>
                  )}
                  <Text style={{ flex: 1 }} tone={draft.method === "equal" && !on ? "subtle" : "fg"}>
                    {nameOf(m.id)}
                  </Text>
                  {usesValue && (draft.method !== "adjustment" || on) && (
                    <View style={{ width: 110 }}>
                      <Field
                        value={draft.values[m.id] ?? ""}
                        onChangeText={(v) => setDraft((d) => ({ ...d, values: { ...d.values, [m.id]: v } }))}
                        keyboardType={draft.method === "shares" || draft.method === "percent" ? "decimal-pad" : "numbers-and-punctuation"}
                        placeholder={draft.method === "percent" ? "%" : draft.method === "shares" ? "1" : "0"}
                        accessibilityLabel={ts("valueFor", { method: ts(`method.${draft.method}`), name: nameOf(m.id) })}
                        style={{ textAlign: "right", minHeight: 42 }}
                      />
                    </View>
                  )}
                  <View style={{ width: 84, alignItems: "flex-end" }}>
                    {share !== undefined ? <Money minor={share} currency={currency} variant="sub" tone="muted" /> : null}
                  </View>
                </View>
              );
            })}
            {draft.method === "exact" && preview.remaining !== undefined && preview.remaining !== 0 && total > 0 && (
              <Text variant="caption" tone="warning">
                {ts.rich("remaining", {
                  state: preview.remaining > 0 ? "left" : "over",
                  amount: () => <Money minor={Math.abs(preview.remaining!)} currency={currency} variant="caption" />,
                })}
              </Text>
            )}
            {draft.method === "percent" && preview.percentTotal !== undefined && (
              <Text variant="caption" tone={preview.percentTotal === 100 ? "positive" : "warning"}>
                {ts("percentTotal", { total: preview.percentTotal })}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Date and repeat */}
      <View style={{ gap: 10 }}>
        <SectionHeader title={t("date")} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <IconButton icon="chevron-back" label="-1" onPress={() => setDate((d) => shiftDate(d, -1))} />
          <Text variant="bodyStrong" style={{ flex: 1 }} center>
            {dayLabel(date, locale)}
          </Text>
          <IconButton icon="chevron-forward" label="+1" onPress={() => setDate((d) => shiftDate(d, 1))} />
        </View>
        {!expense && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityLabel={t("repeat")}>
            {(["never", "weekly", "monthly", "yearly"] as const).map((r) => (
              <Chip key={r} label={t("repeatOption", { frequency: r })} selected={repeat === r} onPress={() => setRepeat(r)} />
            ))}
          </ScrollView>
        )}
      </View>

      <CurrencyPicker
        open={currencyOpen}
        value={currency}
        onClose={() => setCurrencyOpen(false)}
        onPick={(code) => {
          setCurrency(code);
          setCurrencyOpen(false);
        }}
      />
      <Modal visible={groupOpen} transparent animationType="fade" onRequestClose={() => setGroupOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" }} onPress={() => setGroupOpen(false)}>
          <View style={{ backgroundColor: c.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 8, paddingBottom: 32, maxHeight: "70%" }}>
            <ScrollView>
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: g.id === group.id }}
                  onPress={() => {
                    onPickGroup(g.id);
                    setGroupOpen(false);
                  }}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: pressed ? c.surface2 : "transparent" })}
                >
                  <GroupIcon type={g.type} emoji={g.emoji} size={36} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {g.name}
                  </Text>
                  {g.id === group.id && <Ionicons name="checkmark" size={20} color={c.positive} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function safeSymbol(code: string, locale: string) {
  try {
    return currencySymbol(code, locale);
  } catch {
    return code;
  }
}
