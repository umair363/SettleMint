"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import { guessCurrency } from "@settlemint/client/text/currency-guess";
import { useCreateGroup, useMe } from "@settlemint/client/data/queries";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { CurrencyPicker } from "@/ui/currency-picker";
import { TextField } from "@/ui/field";
import { springSnappy } from "@/ui/motion";
import { Sheet } from "@/ui/sheet";
import { GROUP_TYPE_STYLE } from "./group-row";

const TYPES = ["direct", "trip", "home", "couple", "event", "other"] as const;
type GroupType = (typeof TYPES)[number];

export function NewGroupSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("newGroup");
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("title")} tall>
      {open && <NewGroupForm onDone={() => onOpenChange(false)} />}
    </Sheet>
  );
}

function NewGroupForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const locale = useLocale();
  const me = useMe();
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("trip");
  const [currency, setCurrency] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [person, setPerson] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const t = useTranslations("newGroup");
  const tc = useTranslations("common");

  const currencyValue = currency ?? me.data?.defaultCurrency ?? guessCurrency(locale);

  const addPerson = () => {
    const n = person.trim();
    if (!n) return;
    if (!people.some((p) => p.toLowerCase() === n.toLowerCase())) setPeople((ps) => [...ps, n]);
    setPerson("");
  };

  const onPersonKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPerson();
    } else if (e.key === "Backspace" && !person && people.length) {
      setPeople((ps) => ps.slice(0, -1));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pending = person.trim();
    const direct = type === "direct";
    create.mutate(
      {
        // Splitting with one friend: a two-person group named after them.
        name: name.trim(),
        type,
        currency: currencyValue,
        emoji: GROUP_TYPE_STYLE[type].emoji,
        people: direct
          ? [{ displayName: name.trim() }]
          : [...people, ...(pending ? [pending] : [])].map((displayName) => ({ displayName })),
      },
      {
        onSuccess: (group) => {
          onDone();
          router.push(`/group?id=${group.id}&invite=1`);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-5 pt-1">
      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="radiogroup" aria-label={t("kind")}>
        {TYPES.map((kind) => (
          <motion.button
            key={kind}
            type="button"
            role="radio"
            aria-checked={type === kind}
            onClick={() => setType(kind)}
            whileTap={{ scale: 0.94 }}
            transition={springSnappy}
            className={cn(
              "flex min-w-16 flex-1 flex-col items-center gap-1 rounded-[var(--radius-md)] border px-2 py-2.5 text-xs font-medium transition-colors",
              type === kind ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface-2 text-fg-muted",
            )}
          >
            <span className="text-2xl" aria-hidden>
              {GROUP_TYPE_STYLE[kind].emoji}
            </span>
            {t(`type.${kind}`)}
          </motion.button>
        ))}
      </div>

      <TextField
        label={type === "direct" ? t("theirName") : t("name")}
        required
        autoFocus
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t(`placeholder.${type}`)}
      />

      <div className="space-y-1.5">
        <span className="text-[13px] font-medium text-fg-muted">{t("currency")}</span>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 text-start hover:border-line-strong"
        >
          <span className="font-medium">{currencyValue}</span>
          <span className="text-sm text-positive">{tc("change")}</span>
        </button>
      </div>

      {type !== "direct" && (
      <div className="space-y-1.5">
        <label htmlFor="add-person" className="text-[13px] font-medium text-fg-muted">
          {t("whoIn")} <span className="text-fg-subtle">{t("optional")}</span>
        </label>
        <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border border-line bg-surface-2 p-1.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
          <AnimatePresence initial={false}>
            {people.map((p) => (
              <motion.span
                key={p}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springSnappy}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface pe-1 ps-1 text-sm"
              >
                <Avatar id={p} name={p} size="xs" />
                {p}
                <button
                  type="button"
                  aria-label={t("remove", { name: p })}
                  onClick={() => setPeople((ps) => ps.filter((x) => x !== p))}
                  className="flex size-6 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-3 hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <input
            id="add-person"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            onKeyDown={onPersonKey}
            onBlur={addPerson}
            placeholder={people.length ? t("addAnother") : t("typeName")}
            className="h-9 min-w-32 flex-1 bg-transparent px-2 text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
            enterKeyHint="enter"
          />
        </div>
        <p className="text-[13px] text-fg-subtle">{t("noAppNeeded")}</p>
      </div>
      )}

      <div className="mt-auto pb-2">
        <Button type="submit" block size="lg" loading={create.isPending} disabled={!name.trim()}>
          {type === "direct" ? t("startSplitting") : t("create")}
        </Button>
      </div>
      <CurrencyPicker open={pickerOpen} onOpenChange={setPickerOpen} value={currencyValue} onChange={setCurrency} />
    </form>
  );
}
