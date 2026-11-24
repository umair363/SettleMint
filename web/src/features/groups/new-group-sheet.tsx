"use client";

import { X } from "@/ui/icons";
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
import { groupGlyph } from "@settlemint/client/design/glyphs";
import { Glyph } from "@/ui/icons";
import { FindFriend } from "@/features/people/find-friend";

const TYPES = ["trip", "home", "couple", "event", "other"] as const;
type GroupType = (typeof TYPES)[number] | "direct";

export function NewGroupSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("newGroup");
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("title")} tall>
      {open && <NewGroupForm onDone={() => onOpenChange(false)} />}
    </Sheet>
  );
}

/** Splitting with one person: just their name. They don't need the app. */
export function NewFriendSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const tf = useTranslations("friends");
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={tf("title")} description={tf("body")} showDescription tall>
      {open && (
        <div className="space-y-7 pb-2 pt-1">
          <FindFriend />
          <div className="space-y-3 border-t border-line pt-5">
            <p className="text-[15px] font-[600]">{tf("byName")}</p>
            <NewGroupForm friend onDone={() => onOpenChange(false)} />
          </div>
        </div>
      )}
    </Sheet>
  );
}

function NewGroupForm({ onDone, friend = false }: { onDone: () => void; friend?: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const me = useMe();
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>(friend ? "direct" : "trip");
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
        people: direct
          ? [{ displayName: name.trim() }]
          : [...people, ...(pending ? [pending] : [])].map((displayName) => ({ displayName })),
      },
      {
        onSuccess: (group) => {
          onDone();
          router.push(friend ? `/group?id=${group.id}` : `/group?id=${group.id}&invite=1`);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-5 pt-1">
      {!friend && (
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("kind")}>
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
              "flex min-w-0 flex-col items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-3 text-[13px] font-[560] transition-colors duration-[var(--dur-feedback)]",
              type === kind ? "bg-accent-soft text-fg shadow-[inset_0_0_0_1.5px_var(--positive)]" : "bg-surface-2 text-fg-muted hover:text-fg",
            )}
          >
            <Glyph name={groupGlyph(kind).web} className={cn("size-6", type === kind && "text-positive")} />
            {t(`type.${kind}`)}
          </motion.button>
        ))}
      </div>
      )}

      <TextField
        label={type === "direct" ? t("theirName") : t("name")}
        required
        // On phones the keyboard opening mid-animation drags the page under the sheet.
        autoFocus={matchMedia("(pointer: fine)").matches}
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
          {type === "direct" ? (friend ? t("friendTitle") : t("startSplitting")) : t("create")}
        </Button>
      </div>
      <CurrencyPicker open={pickerOpen} onOpenChange={setPickerOpen} value={currencyValue} onChange={setCurrency} />
    </form>
  );
}
