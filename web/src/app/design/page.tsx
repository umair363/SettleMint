"use client";

import {
  ArrowRightLeft,
  Equal,
  Inbox,
  Monitor,
  Moon,
  Percent,
  Plus,
  Receipt,
  ScanLine,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { evaluateAmount, AmountDisplay, AmountPad } from "@/ui/amount-pad";
import { Avatar, AvatarStack } from "@/ui/avatar";
import { Button, IconButton } from "@/ui/button";
import { Chip, Segmented, Switch } from "@/ui/controls";
import { CurrencyPicker } from "@/ui/currency-picker";
import { ConfirmDialog } from "@/ui/dialog";
import { EmptyState, ErrorState, SkeletonRows, Spinner } from "@/ui/feedback";
import { TextArea, TextField } from "@/ui/field";
import { Money } from "@/ui/money";
import { Sheet } from "@/ui/sheet";
import { Badge, Card, List, ListRow, SectionHeader } from "@/ui/surface";
import { useTheme, type ThemePreference } from "@/ui/theme";

const PEOPLE = [
  { id: "a1", name: "Ana Souza" },
  { id: "b2", name: "Bilal Khan" },
  { id: "c3", name: "Chen Wei" },
  { id: "d4", name: "Dana Ortiz" },
  { id: "e5", name: "Emeka Obi" },
  { id: "f6", name: "Freya Lund" },
];

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {note && <p className="mt-1 text-sm text-fg-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const SWATCHES = [
  ["bg", "Background"],
  ["surface", "Surface"],
  ["surface-2", "Surface 2"],
  ["surface-3", "Surface 3"],
  ["accent", "Mint"],
  ["positive", "Owed to you"],
  ["negative", "You owe"],
  ["warning", "Warning"],
  ["info", "Info"],
] as const;

export default function DesignGallery() {
  const { preference, setPreference } = useTheme();
  const [expr, setExpr] = useState("42.5");
  const [currency, setCurrency] = useState("USD");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [split, setSplit] = useState<"equal" | "exact" | "percent">("equal");
  const [simplify, setSimplify] = useState(true);
  const [picked, setPicked] = useState<string[]>(["a1", "b2", "c3"]);
  const [balance, setBalance] = useState(12850);

  return (
    <main className="mx-auto max-w-3xl space-y-14 px-4 py-10 sm:px-6">
      <header className="space-y-4">
        <Badge tone="accent">
          <Sparkles className="size-3" /> Design system
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Liquid Mint</h1>
        <p className="max-w-xl text-fg-muted">
          Every building block of the app, in one place. Switch themes, press things, drag the sheet. Screens are built only
          from these pieces, so the whole app looks and moves the same way.
        </p>
        <Segmented<ThemePreference>
          label="Theme"
          value={preference}
          onChange={setPreference}
          className="max-w-sm"
          options={[
            { value: "light", label: "Light", icon: <Sun /> },
            { value: "dark", label: "Dark", icon: <Moon /> },
            { value: "system", label: "System", icon: <Monitor /> },
          ]}
        />
      </header>

      <Section title="Colour" note="Mint means you're owed, coral means you owe, always with a sign or words too, never colour alone.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {SWATCHES.map(([token, name]) => (
            <div key={token} className="space-y-1.5">
              <div className="h-14 rounded-[var(--radius-md)] border border-line" style={{ background: `var(--${token})` }} />
              <p className="text-xs font-medium">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type" note="Outfit for headings and amounts, Inter for reading, tabular figures so money lines up.">
        <Card className="space-y-3 p-5">
          <p className="font-display text-5xl font-semibold tracking-tight">
            <Money minor={128450} currency="USD" />
          </p>
          <p className="font-display text-2xl font-semibold">Lisbon trip</p>
          <p className="text-[15px]">Dinner at Time Out Market, split four ways.</p>
          <p className="text-sm text-fg-muted">Paid by Ana · 14 Nov</p>
          <div className="tabular w-28 space-y-0.5 text-end text-sm text-fg-muted">
            <p>1,111.11</p>
            <p>88.80</p>
          </div>
        </Card>
      </Section>

      <Section title="Money" note="Locale-aware, any currency, smooth when a balance changes.">
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-lg">
            <Money minor={1999} currency="USD" />
            <Money minor={150000} currency="JPY" />
            <Money minor={12345} currency="KWD" />
            <Money minor={2785000} currency="PKR" />
            <Money minor={4250} currency="EUR" />
          </div>
          <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-surface-2 p-4">
            <div>
              <p className="text-sm text-fg-muted">{balance >= 0 ? "You are owed" : "You owe"}</p>
              <p className="font-display text-3xl font-semibold">
                <Money minor={balance} currency="USD" tone="auto" absolute animated />
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setBalance((b) => b - 4000)}>
                −40
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setBalance((b) => b + 2500)}>
                +25
              </Button>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button leading={<Plus className="size-4" />}>Add expense</Button>
          <Button variant="secondary">Settle up</Button>
          <Button variant="outline">Invite</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" leading={<Trash2 className="size-4" />}>
            Delete
          </Button>
          <Button loading>Saving</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <IconButton label="Scan receipt" variant="solid">
            <ScanLine className="size-5" />
          </IconButton>
          <IconButton label="Add" variant="accent" size="lg" className="shadow-lift">
            <Plus className="size-6" />
          </IconButton>
        </div>
      </Section>

      <Section title="Amount entry" note="Thumb-sized keys, quick sums (try 12+8.5), currency-aware decimals, keyboard works on desktop.">
        <Card className="mx-auto max-w-sm space-y-6 p-5">
          <AmountDisplay expr={expr} currency={currency} onCurrencyClick={() => setPickerOpen(true)} />
          <AmountPad expr={expr} onChange={setExpr} currency={currency} captureKeyboard={false} />
          <p className="tabular text-center text-xs text-fg-subtle">
            Stored as {evaluateAmount(expr, currency) ?? "invalid"} minor units of {currency}
          </p>
        </Card>
      </Section>

      <Section title="Fields">
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <TextField label="What was it for?" placeholder="Dinner, taxi, rent…" />
          <TextField label="Email" type="email" placeholder="you@example.com" hint="We'll send you a 6-digit code." />
          <TextField label="Group name" defaultValue="Lisbon" error="That name is already used by another of your groups." />
          <TextArea label="Notes" placeholder="Optional" />
        </Card>
      </Section>

      <Section title="Choosing" note="Highlights slide between options. Arrow keys work.">
        <Card className="space-y-5 p-5">
          <Segmented
            label="Split method"
            value={split}
            onChange={setSplit}
            options={[
              { value: "equal", label: "Equally", icon: <Equal /> },
              { value: "exact", label: "Amounts", icon: <Receipt /> },
              { value: "percent", label: "Percent", icon: <Percent /> },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {PEOPLE.slice(0, 5).map((p) => (
              <Chip
                key={p.id}
                selected={picked.includes(p.id)}
                onToggle={() => setPicked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                leading={<Avatar id={p.id} name={p.name} size="sm" />}
              >
                {p.name.split(" ")[0]}
              </Chip>
            ))}
          </div>
          <Switch
            checked={simplify}
            onCheckedChange={setSimplify}
            label="Simplify debts"
            description="Fewer payments: settle up in as few transfers as possible."
          />
        </Card>
      </Section>

      <Section title="People">
        <Card className="flex flex-wrap items-center gap-4 p-5">
          {PEOPLE.slice(0, 4).map((p, i) => (
            <Avatar key={p.id} id={p.id} name={p.name} size={(["sm", "md", "lg", "xl"] as const)[i]} />
          ))}
          <Avatar id="g7" name="Guest Person" pending />
          <AvatarStack people={PEOPLE} max={4} />
        </Card>
      </Section>

      <Section title="Lists">
        <div>
          <SectionHeader title="Groups" action={<Button size="sm" variant="ghost">See all</Button>} />
          <List>
            <ListRow
              href="#"
              chevron
              leading={<span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-info-soft text-xl">✈️</span>}
              title="Lisbon trip"
              subtitle="4 people · active today"
              trailing={
                <span className="text-sm">
                  <span className="block text-xs text-fg-muted">you are owed</span>
                  <Money minor={12850} currency="EUR" tone="positive" />
                </span>
              }
            />
            <ListRow
              href="#"
              chevron
              leading={<span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-warning-soft text-xl">🏠</span>}
              title="Flat 4B"
              subtitle="3 people · rent due Friday"
              trailing={
                <span className="text-sm">
                  <span className="block text-xs text-fg-muted">you owe</span>
                  <Money minor={-42000} currency="GBP" tone="negative" absolute />
                </span>
              }
            />
            <ListRow
              leading={<Avatar id="c3" name="Chen Wei" />}
              title="Chen paid you"
              subtitle="Bank transfer · 2 days ago"
              trailing={<Badge tone="positive">settled</Badge>}
            />
          </List>
        </div>
      </Section>

      <Section title="Sheets and dialogs" note="Drag the sheet down to close it on a phone; on desktop it floats.">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
          <Button variant="secondary" onClick={() => setPickerOpen(true)}>
            Currency picker
          </Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast("Expense deleted", {
                description: "Dinner · $84.20",
                action: { label: "Undo", onClick: () => toast.success("Restored") },
              })
            }
          >
            Toast with undo
          </Button>
        </div>
      </Section>

      <Section title="States" note="Every screen has designed loading, empty, error and offline states.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <SkeletonRows count={3} />
          </Card>
          <Card className="flex items-center justify-center gap-3 p-5 text-sm text-fg-muted">
            <Spinner /> Waking the server…
          </Card>
          <Card>
            <EmptyState
              icon={<Inbox />}
              title="No expenses yet"
              body="Add the first one; it takes about three seconds."
              action={<Button leading={<Plus className="size-4" />}>Add expense</Button>}
            />
          </Card>
          <Card>
            <ErrorState offline />
          </Card>
          <Card className="sm:col-span-2">
            <ErrorState body="The server took too long to answer." onRetry={() => toast("Retrying…")} />
          </Card>
        </div>
      </Section>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Settle up with Bilal"
        description="Record a payment between you and Bilal."
        showDescription
        footer={
          <Button block size="lg" leading={<ArrowRightLeft className="size-4" />} onClick={() => setSheetOpen(false)}>
            Record payment
          </Button>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-center gap-4 py-4">
            <Avatar id="a1" name="Ana Souza" size="lg" />
            <ArrowRightLeft className="size-5 text-fg-subtle" />
            <Avatar id="b2" name="Bilal Khan" size="lg" />
          </div>
          <p className="text-center font-display text-4xl font-semibold">
            <Money minor={4250} currency="USD" />
          </p>
          <TextField label="Note" placeholder="Optional" />
        </div>
      </Sheet>

      <CurrencyPicker open={pickerOpen} onOpenChange={setPickerOpen} value={currency} onChange={setCurrency} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Lisbon trip?"
        body="Everyone in the group loses access. You can restore it from Account for 30 days."
        confirmLabel="Delete group"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          toast("Group deleted");
        }}
      />
    </main>
  );
}
