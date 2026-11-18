"use client";

import { getCategoryMeta, type ExpenseDto, type GroupDetailDto } from "@settlemint/shared";
import { History, Pencil, Trash2 } from "@/ui/icons";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";
import { useAddExpense } from "@/features/expenses/add-expense-context";
import type { CategoryKey } from "@settlemint/client/i18n/messages/en";
import { describeActivity } from "@settlemint/client/text/activity-text";
import { dayLabel, timeAgo } from "@settlemint/client/text/dates";
import { useEntityHistory, useMe, useSetExpenseDeleted } from "@settlemint/client/data/queries";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Spinner } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { Sheet } from "@/ui/sheet";
import { Badge } from "@/ui/surface";

export function ExpenseDetailSheet({
  group,
  expense,
  onClose,
}: {
  group: GroupDetailDto;
  expense: ExpenseDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("expenseDetail");
  return (
    <Sheet open={Boolean(expense)} onOpenChange={(o) => !o && onClose()} title={expense?.description ?? t("expense")} tall>
      {expense && <Detail group={group} expense={expense} onClose={onClose} />}
    </Sheet>
  );
}

function Detail({ group, expense, onClose }: { group: GroupDetailDto; expense: ExpenseDto; onClose: () => void }) {
  const locale = useLocale();
  const me = useMe();
  const { openAddExpense } = useAddExpense();
  const setDeleted = useSetExpenseDeleted(group.id);
  const history = useEntityHistory(group.id, expense.id);
  const cat = getCategoryMeta(expense.category);
  const member = (id: string) => group.members.find((m) => m.id === id);
  const foreign = expense.currency !== group.currency;
  const payers = expense.lines.filter((l) => l.paid > 0);
  const owers = expense.lines.filter((l) => l.owed > 0);
  const t = useTranslations("expenseDetail");
  const tc = useTranslations("common");
  const ta = useTranslations("activity");
  const tcat = useTranslations("categories");
  const tm = useTranslations("split");

  const remove = () => {
    setDeleted.mutate({ id: expense.id, deleted: true });
    onClose();
    toast(t("deleted"), {
      description: expense.description,
      action: {
        label: tc("undo"),
        onClick: () => setDeleted.mutate({ id: expense.id, deleted: false }, { onSuccess: () => toast.success(t("restored")) }),
      },
    });
  };

  return (
    <div className="space-y-6 pb-4 pt-1">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-3xl" aria-hidden>
          {cat.emoji}
        </span>
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight">
            <Money minor={expense.amount} currency={expense.currency} />
          </p>
          <p className="text-sm text-fg-muted">
            {tcat(cat.id as CategoryKey)} · {dayLabel(expense.date, locale)}
          </p>
        </div>
      </div>

      {foreign && (
        <p className="rounded-[var(--radius-md)] bg-info-soft px-4 py-3 text-sm text-info">
          {t.rich("fx", {
            amount: () => <Money minor={expense.groupAmount} currency={group.currency} />,
            from: expense.currency,
            rate: Number(expense.fxRate).toLocaleString(locale, { maximumFractionDigits: 6 }),
            to: group.currency,
          })}
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-fg-subtle">{t("paidBy")}</h3>
        {payers.map((l) => {
          const m = member(l.memberId);
          return (
            <div key={l.memberId} className="flex items-center gap-3">
              <Avatar id={l.memberId} name={m?.displayName ?? "?"} image={m?.image} size="sm" />
              <span className="flex-1 font-medium">{m?.isMe ? tc("you") : m?.displayName}</span>
              <Money minor={l.paid} currency={expense.currency} />
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center justify-between text-[13px] font-semibold uppercase tracking-wider text-fg-subtle">
          {t("split")} {expense.split.method !== "itemized" && <Badge>{tm(`method.${expense.split.method}`)}</Badge>}
        </h3>
        {owers.map((l) => {
          const m = member(l.memberId);
          return (
            <div key={l.memberId} className="flex items-center gap-3">
              <Avatar id={l.memberId} name={m?.displayName ?? "?"} image={m?.image} size="sm" pending={!m?.claimed} />
              <span className="flex-1 font-medium">
                {m?.isMe ? tc("you") : m?.displayName}
                {m?.left && <span className="ms-1 text-xs text-fg-subtle">{t("left")}</span>}
              </span>
              <Money minor={l.owed} currency={expense.currency} tone="muted" />
            </div>
          );
        })}
      </section>

      {expense.notes && <p className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-sm">{expense.notes}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          leading={<Pencil className="size-4" />}
          onClick={() => {
            onClose();
            openAddExpense({ expense });
          }}
        >
          {tc("edit")}
        </Button>
        <Button variant="danger" leading={<Trash2 className="size-4" />} onClick={remove}>
          {tc("delete")}
        </Button>
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-fg-subtle">
          <History className="size-3.5" /> {t("history")}
        </h3>
        {history.isPending ? (
          <Spinner />
        ) : (
          <ol className="space-y-2 border-s border-line ps-4">
            {(history.data?.items ?? []).map((h) => (
              <li key={h.id} className="text-sm">
                <span className="text-fg">{describeActivity(h, me.data?.id, ta).text}</span>
                <span className="block text-xs text-fg-subtle">{timeAgo(h.createdAt, locale)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
