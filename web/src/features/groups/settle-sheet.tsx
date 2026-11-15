"use client";

import type { GroupDetailDto } from "@settlemint/shared";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { uuidv7 } from "uuidv7";
import { todayIso } from "@/lib/dates";
import { useCreateSettlement } from "@/lib/queries";
import { amountToExpr, AmountDisplay, AmountPad, evaluateAmount } from "@/ui/amount-pad";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Segmented } from "@/ui/controls";
import { TextField } from "@/ui/field";
import { Money } from "@/ui/money";
import { Sheet } from "@/ui/sheet";
import { PayWith } from "./pay-with";

export interface SettleTarget {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

type Method = "cash" | "bank" | "app" | "other";

export function SettleSheet({
  group,
  target,
  onClose,
  onSettledMe,
}: {
  group: GroupDetailDto;
  target: SettleTarget | null;
  onClose: () => void;
  /** Called when this payment brings the viewer's balance in the group to zero. */
  onSettledMe?: () => void;
}) {
  return (
    <Sheet open={Boolean(target)} onOpenChange={(o) => !o && onClose()} title="Record a payment" tall>
      {target && (
        <SettleForm
          key={`${target.fromMemberId}-${target.toMemberId}`}
          group={group}
          target={target}
          onDone={onClose}
          onSettledMe={onSettledMe}
        />
      )}
    </Sheet>
  );
}

function PersonPicker({
  group,
  value,
  onChange,
  label,
  exclude,
}: {
  group: GroupDetailDto;
  value: string;
  onChange: (id: string) => void;
  label: string;
  exclude: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{label}</span>
      {(() => {
        const m = group.members.find((x) => x.id === value);
        return m ? <Avatar id={m.id} name={m.displayName} image={m.image} size="lg" /> : null;
      })()}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-full truncate rounded-full border border-line bg-surface-2 px-3 py-1.5 text-center text-sm font-medium text-fg focus:border-accent focus:outline-none"
      >
        {group.members
          .filter((m) => !m.left && m.id !== exclude)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.isMe ? "You" : m.displayName}
            </option>
          ))}
      </select>
    </label>
  );
}

function SettleForm({
  group,
  target,
  onDone,
  onSettledMe,
}: {
  group: GroupDetailDto;
  target: SettleTarget;
  onDone: () => void;
  onSettledMe?: () => void;
}) {
  const [from, setFrom] = useState(target.fromMemberId);
  const [to, setTo] = useState(target.toMemberId);
  const [expr, setExpr] = useState(amountToExpr(target.amount, group.currency));
  const [method, setMethod] = useState<Method>("cash");
  const [note, setNote] = useState("");
  const create = useCreateSettlement(group.id);
  const amount = evaluateAmount(expr, group.currency) ?? 0;
  const fromName = group.members.find((m) => m.id === from);
  const toName = group.members.find((m) => m.id === to);
  const owed = group.transfers.find((t) => t.fromMemberId === from && t.toMemberId === to)?.amount ?? 0;

  const save = () => {
    create.mutate({
      id: uuidv7(),
      fromMemberId: from,
      toMemberId: to,
      amount,
      currency: group.currency,
      method,
      note: note.trim() || null,
      date: todayIso(),
    });
    const me = group.myMemberId;
    const before = group.balances[me] ?? 0;
    const after = before + (from === me ? amount : 0) - (to === me ? amount : 0);
    if (before !== 0 && after === 0) onSettledMe?.();
    toast.success("Payment recorded", {
      description: `${fromName?.isMe ? "You" : fromName?.displayName} paid ${toName?.isMe ? "you" : toName?.displayName}`,
    });
    onDone();
  };

  return (
    <div className="flex h-full flex-col gap-4 pt-1">
      <div className="flex items-start gap-2">
        <PersonPicker group={group} value={from} onChange={setFrom} label="Paid" exclude={to} />
        <button
          type="button"
          aria-label="Swap who paid and who received"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="mt-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-muted hover:text-fg"
        >
          <ArrowRight className="size-5 rtl:rotate-180" />
        </button>
        <PersonPicker group={group} value={to} onChange={setTo} label="To" exclude={from} />
      </div>

      <AmountDisplay expr={expr} currency={group.currency} />
      {owed > 0 && amount !== owed && (
        <button
          type="button"
          onClick={() => setExpr(amountToExpr(owed, group.currency))}
          className="-mt-2 self-center text-sm font-medium text-positive"
        >
          Full amount: <Money minor={owed} currency={group.currency} />
        </button>
      )}

      {/* You're paying someone who has said how they like to be paid. */}
      {from === group.myMemberId && toName && amount > 0 && (
        <PayWith
          payee={toName}
          amount={amount}
          currency={group.currency}
          note={`SettleMint · ${group.name}`}
          onUsed={() => setMethod("app")}
        />
      )}

      <Segmented<Method>
        label="How was it paid?"
        size="sm"
        value={method}
        onChange={setMethod}
        options={[
          { value: "cash", label: "Cash" },
          { value: "bank", label: "Bank" },
          { value: "app", label: "App" },
          { value: "other", label: "Other" },
        ]}
      />
      <TextField aria-label="Note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} />

      <div className={cn("mt-auto space-y-3 pb-2")}>
        {/* Desktop: the pad still listens to the physical keyboard, so the buttons are phone-only. */}
        <AmountPad expr={expr} onChange={setExpr} currency={group.currency} withMath={false} className="sm:hidden" />
        <p className="hidden text-center text-[13px] text-fg-subtle sm:block">Type to change the amount</p>
        <Button block size="lg" disabled={amount <= 0 || from === to} onClick={save} leading={<ArrowRightLeft className="size-4" />}>
          Record <Money minor={amount} currency={group.currency} />
        </Button>
      </div>
    </div>
  );
}
