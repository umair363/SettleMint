"use client";

import {
  ApiError,
  CATEGORIES,
  getCategoryMeta,
  isValidRate,
  parseMoneyInput,
  resolveExpense,
  type ExpenseDto,
  type GroupDetailDto,
  type MemberDto,
  type RecurrenceFrequency,
} from "@settlemint/shared";
import { Calendar, Camera, Check, ChevronDown, ChevronLeft, ListChecks, LoaderCircle, Repeat, Equal, Percent, Receipt, Scale, SlidersHorizontal, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocale } from "use-intl";
import { uuidv7 } from "uuidv7";
import { api } from "@/lib/api";
import { guessCategory } from "@/lib/category-guess";
import { prepareReceiptImage } from "@/lib/image";
import { dayLabel, todayIso } from "@/lib/dates";
import { useCreateExpense, useCreateRecurring, useGroup, useGroups, useUpdateExpense } from "@/lib/queries";
import { amountToExpr, AmountDisplay, AmountPad, evaluateAmount } from "@/ui/amount-pad";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Segmented, Switch } from "@/ui/controls";
import { CurrencyPicker } from "@/ui/currency-picker";
import { EmptyState, ErrorState, Spinner } from "@/ui/feedback";
import { TextField } from "@/ui/field";
import { Money } from "@/ui/money";
import { springSoft } from "@/ui/motion";
import { Sheet } from "@/ui/sheet";
import { useAddExpense } from "./add-expense-context";
import { ItemsEditor } from "./items-editor";
import {
  draftFromSpec,
  equalDraft,
  itemizedDraft,
  METHOD_LABEL,
  minorToInputText,
  previewSplit,
  specFromDraft,
  type EditableMethod,
  type SplitDraft,
} from "./split-model";

const LAST_GROUP_KEY = "sm-last-group";
const REPEAT_LABEL: Record<RecurrenceFrequency, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

function readLastGroup(): string | null {
  try {
    return localStorage.getItem(LAST_GROUP_KEY);
  } catch {
    return null;
  }
}

export function AddExpenseSheet() {
  const { open, options, session, close } = useAddExpense();
  const editing = Boolean(options.expense);
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? "Edit expense" : "Add expense"}
      tall
      className="sm:w-[min(34rem,calc(100vw-2rem))]"
    >
      {open && (
        <ExpenseForm key={session} initialGroupId={options.groupId} expense={options.expense} onDone={close} />
      )}
    </Sheet>
  );
}

type Panel = "main" | "group" | "paidBy" | "split" | "category";

function ExpenseForm({
  initialGroupId,
  expense,
  onDone,
}: {
  initialGroupId?: string;
  expense?: ExpenseDto;
  onDone: () => void;
}) {
  const groups = useGroups();
  const router = useRouter();
  const [chosenGroupId, setChosenGroupId] = useState<string | null>(
    expense?.groupId ?? initialGroupId ?? null,
  );
  const fallbackGroupId = useMemo(() => {
    const list = groups.data?.filter((g) => !g.archived) ?? [];
    const last = readLastGroup();
    return list.find((g) => g.id === last)?.id ?? list[0]?.id ?? null;
  }, [groups.data]);
  const groupId = chosenGroupId ?? fallbackGroupId;
  const group = useGroup(groupId);

  if (groups.isPending || (groupId && group.isPending)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if ((groupId && !group.data) || (!groupId && groups.error)) {
    // Couldn't load (offline with nothing saved yet): don't pretend there are no groups.
    return (
      <ErrorState
        offline={!navigator.onLine}
        body="Open the group once while online, then you can add expenses to it offline."
        onRetry={() => (groupId ? group.refetch() : groups.refetch())}
      />
    );
  }
  if (!groupId || !group.data) {
    return (
      <EmptyState
        icon={<Users />}
        title="Start with a group"
        body="Expenses live in groups: a trip, your home, or just you and a friend."
        action={
          <Button
            onClick={() => {
              onDone();
              router.push("/groups?new=1");
            }}
          >
            Create a group
          </Button>
        }
      />
    );
  }
  return (
    <FormBody
      key={group.data.id}
      group={group.data}
      groups={groups.data ?? []}
      expense={expense}
      onPickGroup={setChosenGroupId}
      onDone={onDone}
    />
  );
}

function FormBody({
  group,
  groups,
  expense,
  onPickGroup,
  onDone,
}: {
  group: GroupDetailDto;
  groups: { id: string; name: string; emoji: string | null; currency: string; archived: boolean }[];
  expense?: ExpenseDto;
  onPickGroup: (id: string) => void;
  onDone: () => void;
}) {
  const locale = useLocale();
  const members = useMemo(() => group.members.filter((m) => !m.left || expense?.lines.some((l) => l.memberId === m.id)), [group.members, expense]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const [panel, setPanel] = useState<Panel>("main");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [currency, setCurrency] = useState(expense?.currency ?? group.currency);
  const [expr, setExpr] = useState(expense ? amountToExpr(expense.amount, expense.currency) : "");
  const [fxRate, setFxRate] = useState(expense && expense.currency !== group.currency ? expense.fxRate : "");
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [repeat, setRepeat] = useState<"never" | RecurrenceFrequency>("never");
  // null = not picked yet: guess from the description ("Dinner" -> food).
  const [pickedCategory, setCategory] = useState<string | null>(expense?.category ?? null);
  const category = pickedCategory ?? guessCategory(description) ?? "other";
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const initialPayers = expense?.lines.filter((l) => l.paid > 0) ?? [];
  const [multiPay, setMultiPay] = useState(initialPayers.length > 1);
  const [payerId, setPayerId] = useState(initialPayers[0]?.memberId ?? group.myMemberId);
  const [payValues, setPayValues] = useState<Record<string, string>>(
    Object.fromEntries(initialPayers.map((l) => [l.memberId, minorToInputText(l.paid, expense!.currency, locale)])),
  );
  const [draft, setDraft] = useState<SplitDraft>(() =>
    expense ? draftFromSpec(expense.split, expense.currency, locale) : equalDraft(memberIds.filter((id) => !byId.get(id)?.left)),
  );

  const [scanning, setScanning] = useState(false);
  const scanReceipt = async (file: File) => {
    setScanning(true);
    try {
      const image = await prepareReceiptImage(file);
      const r = await api.scanReceipt({ image: image.data, mimeType: image.mimeType, currency });
      if (r.merchant) setDescription(r.merchant);
      setCurrency(r.currency);
      setExpr(amountToExpr(r.total, r.currency));
      if (r.date) setDate(r.date);
      if (r.items.length) {
        setDraft(itemizedDraft(r.items, r.extras, memberIds.filter((id) => !byId.get(id)?.left)));
        setPanel("split");
      }
      toast.success(r.items.length ? `Read ${r.items.length} items` : "Read the total", {
        description: `${r.scansLeft} scans left this month`,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't read that photo", {
        description: err instanceof ApiError && err.code === "AI_UNAVAILABLE" ? undefined : "You can still enter it by hand.",
      });
    } finally {
      setScanning(false);
    }
  };

  const total = evaluateAmount(expr, currency) ?? 0;
  const spec = useMemo(() => specFromDraft(draft, memberIds, currency, locale), [draft, memberIds, currency, locale]);
  const preview = useMemo(() => previewSplit(total, spec), [total, spec]);
  const payers = multiPay
    ? memberIds
        .map((memberId) => ({ memberId, amount: parseMoneyInput(payValues[memberId] ?? "", currency, locale) ?? 0 }))
        .filter((p) => p.amount > 0)
    : [{ memberId: payerId, amount: total }];
  const paidSum = payers.reduce((s, p) => s + p.amount, 0);
  const needsRate = currency !== group.currency;
  const cat = getCategoryMeta(category);

  const problem =
    total <= 0
      ? null
      : preview.problem ??
        (paidSum !== total ? "What people paid has to add up to the total" : null) ??
        (needsRate && !isValidRate(fxRate.replace(",", ".")) ? `Enter the ${currency} to ${group.currency} rate` : null);
  const canSave = total > 0 && !problem;

  const create = useCreateExpense(group.id);
  const createRecurring = useCreateRecurring(group.id);
  const update = useUpdateExpense(group.id);
  const saving = create.isPending || update.isPending;

  const save = () => {
    if (!canSave) return;
    const body = {
      description: description.trim() || cat.label,
      amount: total,
      currency,
      fxRate: needsRate ? fxRate.replace(",", ".") : undefined,
      date,
      category,
      payers,
      split: spec,
    };
    // Validate once more with the engine before sending (same code as the server).
    resolveExpense(body.amount, body.payers, body.split);
    try {
      localStorage.setItem(LAST_GROUP_KEY, group.id);
    } catch {
      // ignore
    }
    const onError = (err: Error) => {
      if (err instanceof ApiError && err.code === "VERSION_CONFLICT") {
        toast.error("Someone changed this expense while you were editing", { description: "Close and open it again to see their version." });
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't save the expense");
      }
    };
    if (expense) {
      update.mutate({ id: expense.id, body: { ...body, version: expense.version } }, {
        onSuccess: () => {
          toast.success("Expense updated");
          onDone();
        },
        onError,
      });
    } else {
      // Optimistic: the row appears at once and the sheet closes. If saving
      // fails, the row is rolled back and the global handler shows the error.
      if (repeat !== "never") {
        // A repeating bill: the server adds this one now (if due) and each next one.
        const { date: startDate, ...template } = body;
        createRecurring.mutate({
          template,
          frequency: repeat,
          startDate,
          // "Today" for this bill means today where the person is.
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        toast.success(`Added ${body.description}`, { description: `Repeats ${repeat} · ${group.name}` });
        onDone();
        return;
      }
      create.mutate({ id: uuidv7(), ...body });
      toast.success(`Added ${body.description}`, { description: group.name });
      onDone();
    }
  };

  const splitSummary =
    draft.method === "equal"
      ? draft.included.length === memberIds.length
        ? `Equally · everyone`
        : `Equally · ${draft.included.length} ${draft.included.length === 1 ? "person" : "people"}`
      : METHOD_LABEL[draft.method];
  const payerSummary = multiPay
    ? `${payers.length} people`
    : payerId === group.myMemberId
      ? "You"
      : byId.get(payerId)?.displayName ?? "Someone";

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        {panel === "main" ? (
          <motion.div
            key="main"
            initial={{ x: "-30%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-30%", opacity: 0 }}
            transition={springSoft}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center gap-2 pb-3">
              <button
                type="button"
                onClick={() => setPanel("group")}
                disabled={Boolean(expense)}
                className="inline-flex max-w-[60%] items-center gap-1.5 rounded-full bg-surface-2 py-1.5 ps-2.5 pe-2 text-sm font-medium enabled:hover:bg-surface-3"
              >
                <span aria-hidden>{group.emoji ?? "👥"}</span>
                <span className="truncate">{group.name}</span>
                {!expense && <ChevronDown className="size-4 text-fg-subtle" aria-hidden />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPanel("category")}
                aria-label={`Category: ${cat.label}. Change category`}
                className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-2xl hover:bg-surface-3"
              >
                {cat.emoji}
              </button>
              <TextField
                aria-label="Description"
                placeholder="What was it for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={140}
                containerClassName="flex-1"
                enterKeyHint="done"
              />
              <label
                className={cn(
                  "flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg",
                  scanning && "pointer-events-none",
                )}
                title="Scan a receipt"
              >
                {scanning ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Camera className="size-5" aria-hidden />}
                <span className="sr-only">{scanning ? "Reading receipt…" : "Scan a receipt"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={scanning}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void scanReceipt(file);
                  }}
                />
              </label>
            </div>

            <div className="flex flex-1 flex-col justify-center">
            <AmountDisplay
              expr={expr}
              currency={currency}
              onCurrencyClick={() => setCurrencyOpen(true)}
              className="py-5"
            />

            {needsRate && (
              <div className="mb-3 flex items-center justify-center gap-2 text-sm text-fg-muted">
                <span>1 {currency} =</span>
                <input
                  value={fxRate}
                  onChange={(e) => setFxRate(e.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  aria-label={`Exchange rate from ${currency} to ${group.currency}`}
                  placeholder="rate"
                  className="tabular h-9 w-28 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 text-center text-fg focus:border-accent focus:outline-none"
                />
                <span>{group.currency}</span>
              </div>
            )}

            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3">
              <Pill onClick={() => setPanel("paidBy")} label="Paid by" value={payerSummary} />
              <Pill onClick={() => setPanel("split")} label="Split" value={splitSummary} />
              <label className="relative inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3.5 text-sm hover:bg-surface-3">
                <Calendar className="size-4 text-fg-subtle" aria-hidden />
                <span className="font-medium">{dayLabel(date, locale)}</span>
                <input
                  type="date"
                  value={date}
                  max={todayIso()}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  aria-label="Date"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              {!expense && (
                <label className="relative inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3.5 text-sm hover:bg-surface-3">
                  <Repeat className={cn("size-4", repeat === "never" ? "text-fg-subtle" : "text-positive")} aria-hidden />
                  <span className="font-medium">{repeat === "never" ? "Once" : REPEAT_LABEL[repeat]}</span>
                  <select
                    aria-label="Repeat"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as typeof repeat)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    <option value="never">Doesn&apos;t repeat</option>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                    <option value="yearly">Every year</option>
                  </select>
                </label>
              )}
            </div>
            </div>

            <div className="space-y-3 pb-2">
              <AmountPad expr={expr} onChange={setExpr} currency={currency} />
              <AnimatePresence>
                {problem && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    role="alert"
                    className="text-center text-sm text-warning"
                  >
                    {problem}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button block size="lg" disabled={!canSave} loading={saving} onClick={save}>
                {total > 0 ? (
                  <>
                    {expense ? "Save" : "Add"} <Money minor={total} currency={currency} />
                  </>
                ) : expense ? (
                  "Save"
                ) : (
                  "Add expense"
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={panel}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={springSoft}
            className="flex min-h-0 flex-1 flex-col"
          >
            <button
              type="button"
              onClick={() => setPanel("main")}
              className="-ms-1.5 mb-3 inline-flex items-center gap-0.5 self-start rounded-full py-1 pe-2 text-sm font-medium text-fg-muted hover:text-fg"
            >
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> Back
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              {panel === "group" && (
                <ul className="space-y-1">
                  {groups
                    .filter((g) => !g.archived)
                    .map((g) => (
                      <li key={g.id}>
                        <button
                          type="button"
                          onClick={() => onPickGroup(g.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-start hover:bg-surface-2",
                            g.id === group.id && "bg-accent-soft",
                          )}
                        >
                          <span className="text-2xl" aria-hidden>
                            {g.emoji ?? "👥"}
                          </span>
                          <span className="flex-1 font-medium">{g.name}</span>
                          <span className="text-xs text-fg-subtle">{g.currency}</span>
                          {g.id === group.id && <Check className="size-4 text-positive" aria-label="Selected" />}
                        </button>
                      </li>
                    ))}
                </ul>
              )}

              {panel === "category" && (
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={c.id === category}
                      onClick={() => {
                        setCategory(c.id);
                        setPanel("main");
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-3 text-center text-xs font-medium",
                        c.id === category ? "border-accent bg-accent-soft" : "border-line bg-surface-2 hover:bg-surface-3",
                      )}
                    >
                      <span className="text-2xl" aria-hidden>
                        {c.emoji}
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {panel === "paidBy" && (
                <PaidByPanel
                  members={members}
                  myMemberId={group.myMemberId}
                  currency={currency}
                  total={total}
                  multi={multiPay}
                  onMulti={setMultiPay}
                  payerId={payerId}
                  onPayer={(id) => {
                    setPayerId(id);
                    setPanel("main");
                  }}
                  values={payValues}
                  onValues={setPayValues}
                  paidSum={paidSum}
                />
              )}

              {panel === "split" && (
                <SplitPanel
                  members={members}
                  myMemberId={group.myMemberId}
                  currency={currency}
                  total={total}
                  draft={draft}
                  onDraft={setDraft}
                  preview={preview}
                />
              )}
            </div>
            {(panel === "split" || (panel === "paidBy" && multiPay)) && (
              <Button block size="lg" onClick={() => setPanel("main")} className="mb-2">
                Done
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CurrencyPicker
        open={currencyOpen}
        onOpenChange={setCurrencyOpen}
        value={currency}
        recent={[group.currency]}
        onChange={(c) => {
          setCurrency(c);
          setExpr((e) => (evaluateAmount(e, c) === null ? "" : e));
        }}
      />
    </div>
  );
}

function Pill({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3.5 text-sm hover:bg-surface-3"
    >
      <span className="text-fg-subtle">{label}</span>
      <span className="font-medium">{value}</span>
      <ChevronDown className="size-4 text-fg-subtle" aria-hidden />
    </button>
  );
}

function memberName(m: MemberDto, myMemberId: string) {
  return m.id === myMemberId ? "You" : m.displayName;
}

function PaidByPanel({
  members,
  myMemberId,
  currency,
  total,
  multi,
  onMulti,
  payerId,
  onPayer,
  values,
  onValues,
  paidSum,
}: {
  members: MemberDto[];
  myMemberId: string;
  currency: string;
  total: number;
  multi: boolean;
  onMulti: (v: boolean) => void;
  payerId: string;
  onPayer: (id: string) => void;
  values: Record<string, string>;
  onValues: (v: Record<string, string>) => void;
  paidSum: number;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold">Who paid?</h3>
      <Switch checked={multi} onCheckedChange={onMulti} label="Several people paid" description="Split the bill between payers." />
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id}>
            {multi ? (
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2">
                <Avatar id={m.id} name={m.displayName} image={m.image} size="sm" pending={!m.claimed} />
                <span className="flex-1 truncate font-medium">{memberName(m, myMemberId)}</span>
                <input
                  inputMode="decimal"
                  aria-label={`Amount paid by ${m.displayName}`}
                  value={values[m.id] ?? ""}
                  onChange={(e) => onValues({ ...values, [m.id]: e.target.value })}
                  placeholder="0"
                  className="tabular h-10 w-28 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 text-end focus:border-accent focus:outline-none"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onPayer(m.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-start hover:bg-surface-2",
                  m.id === payerId && "bg-accent-soft",
                )}
              >
                <Avatar id={m.id} name={m.displayName} image={m.image} size="sm" pending={!m.claimed} />
                <span className="flex-1 truncate font-medium">{memberName(m, myMemberId)}</span>
                {m.id === payerId && <Check className="size-4 text-positive" aria-label="Selected" />}
              </button>
            )}
          </li>
        ))}
      </ul>
      {multi && (
        <p className={cn("text-center text-sm", paidSum === total ? "text-positive" : "text-warning")}>
          {paidSum === total ? (
            "Adds up to the total"
          ) : (
            <>
              <Money minor={Math.abs(total - paidSum)} currency={currency} /> {paidSum < total ? "left to assign" : "too much"}
            </>
          )}
        </p>
      )}
    </div>
  );
}

const METHOD_ICONS: Record<EditableMethod, ReactNode> = {
  equal: <Equal />,
  exact: <Receipt />,
  percent: <Percent />,
  shares: <Scale />,
  adjustment: <SlidersHorizontal />,
  itemized: <ListChecks />,
};

function SplitPanel({
  members,
  myMemberId,
  currency,
  total,
  draft,
  onDraft,
  preview,
}: {
  members: MemberDto[];
  myMemberId: string;
  currency: string;
  total: number;
  draft: SplitDraft;
  onDraft: (d: SplitDraft) => void;
  preview: ReturnType<typeof previewSplit>;
}) {
  const shareOf = (id: string) => preview.shares?.find((s) => s.memberId === id)?.amount;
  const toggle = (id: string) =>
    onDraft({
      ...draft,
      included: draft.included.includes(id) ? draft.included.filter((x) => x !== id) : [...draft.included, id],
    });
  const setValue = (id: string, v: string) => onDraft({ ...draft, values: { ...draft.values, [id]: v } });
  const usesToggle = draft.method === "equal" || draft.method === "adjustment";
  const allIncluded = draft.included.length === members.length;

  const methodPicker = (
    <Segmented<EditableMethod>
      label="Split method"
      size="sm"
      value={draft.method}
      onChange={(method) => onDraft({ ...draft, method, included: draft.included.length ? draft.included : members.map((m) => m.id) })}
      options={(Object.keys(METHOD_LABEL) as EditableMethod[])
        // "Items" appears once a receipt has supplied them.
        .filter((m) => m !== "itemized" || Boolean(draft.items?.length))
        .map((m) => ({
          value: m,
          label: <span className="sr-only min-[400px]:not-sr-only">{METHOD_LABEL[m]}</span>,
          icon: METHOD_ICONS[m],
        }))}
    />
  );

  if (draft.method === "itemized") {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold">Who had what</h3>
        {methodPicker}
        <ItemsEditor members={members} myMemberId={myMemberId} currency={currency} draft={draft} onDraft={onDraft} preview={preview} />
        {preview.problem && (
          <p role="alert" className="text-center text-sm text-warning">
            {preview.problem}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold">How to split</h3>
      {methodPicker}
      <p className="text-sm text-fg-muted">
        {draft.method === "equal" && "Everyone ticked pays the same."}
        {draft.method === "exact" && "Type what each person owes."}
        {draft.method === "percent" && "Give each person a percentage."}
        {draft.method === "shares" && "E.g. a couple counts as 2 shares."}
        {draft.method === "adjustment" && "Split equally, then add extra for someone (e.g. their drinks)."}
      </p>
      {usesToggle && (
        <button
          type="button"
          onClick={() => onDraft({ ...draft, included: allIncluded ? [] : members.map((m) => m.id) })}
          className="text-sm font-medium text-positive"
        >
          {allIncluded ? "Clear all" : "Select everyone"}
        </button>
      )}
      <ul className="space-y-1">
        {members.map((m) => {
          const included = draft.included.includes(m.id);
          const share = shareOf(m.id);
          return (
            <li key={m.id} className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-1.5">
              {usesToggle ? (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={included}
                  onClick={() => toggle(m.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-start"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                      included ? "border-accent bg-accent text-accent-fg" : "border-line-strong",
                    )}
                  >
                    {included && <Check className="size-4" strokeWidth={3} aria-hidden />}
                  </span>
                  <Avatar id={m.id} name={m.displayName} image={m.image} size="sm" pending={!m.claimed} />
                  <span className="truncate font-medium">{memberName(m, myMemberId)}</span>
                </button>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar id={m.id} name={m.displayName} image={m.image} size="sm" pending={!m.claimed} />
                  <span className="truncate font-medium">{memberName(m, myMemberId)}</span>
                </span>
              )}
              {draft.method !== "equal" && (draft.method !== "adjustment" || included) && (
                <span className="relative">
                  <input
                    inputMode="decimal"
                    aria-label={`${METHOD_LABEL[draft.method]} for ${m.displayName}`}
                    value={draft.values[m.id] ?? ""}
                    onChange={(e) => setValue(m.id, e.target.value)}
                    placeholder={draft.method === "adjustment" ? "+0" : "0"}
                    className="tabular h-10 w-24 rounded-[var(--radius-sm)] border border-line bg-surface-2 pe-7 ps-2 text-end focus:border-accent focus:outline-none"
                  />
                  <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-xs text-fg-subtle">
                    {draft.method === "percent" ? "%" : draft.method === "shares" ? "×" : ""}
                  </span>
                </span>
              )}
              <span className="w-20 text-end text-sm text-fg-muted">
                {share !== undefined && total > 0 ? <Money minor={share} currency={currency} /> : "–"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-center text-sm">
        {preview.problem ? (
          <span className="text-warning">
            {draft.method === "exact" && preview.remaining !== undefined ? (
              <>
                <Money minor={Math.abs(preview.remaining)} currency={currency} />{" "}
                {preview.remaining > 0 ? "left to assign" : "more than the total"}
              </>
            ) : draft.method === "percent" && preview.percentTotal !== undefined ? (
              `Adds up to ${preview.percentTotal}% of 100%`
            ) : (
              preview.problem
            )}
          </span>
        ) : total > 0 ? (
          <span className="text-positive">Adds up exactly to <Money minor={total} currency={currency} /></span>
        ) : (
          <span className="text-fg-muted">Enter an amount to see each share</span>
        )}
      </div>
    </div>
  );
}
