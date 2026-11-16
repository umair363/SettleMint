import { formatMoney } from "@settlemint/shared";
import {
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Check,
  ChevronDown,
  CloudOff,
  ExternalLink,
  History,
  Link2,
  Plus,
  Repeat,
  Route,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { createTranslator } from "use-intl";
import { Logo } from "@/features/shell/logo";
import { LANGUAGES, type Language } from "@/i18n/languages";
import type { LandingMessages } from "@/i18n/landing/en";
import { BalanceCard } from "@/ui/balance-card";
import { cn } from "@/ui/cn";

/**
 * The public landing page, rendered at build time for each language. Plain
 * HTML and CSS: no app JavaScript, so it is fast on any phone. The product
 * pictures are drawn with the app's own design tokens and money formatting,
 * so they stay crisp, themed and right-to-left where needed.
 */
export function Landing({ lang, messages }: { lang: Language; messages: LandingMessages }) {
  const t = createTranslator({ locale: lang, messages });
  const money = (minor: number, currency: string) => formatMoney(minor, currency, { locale: lang });
  const home = lang === "en" ? "/" : `/${lang}`;
  // Visiting a translated page is a clear signal: the app opens in that language.
  const appLink = { href: "/sign-in", ...(lang === "en" ? {} : { "data-set-lang": lang }) };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
      >
        {t("nav.skip")}
      </a>

      <header className="glass safe-top sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href={home} aria-label="SettleMint">
            <Logo />
          </Link>
          <nav aria-label={t("nav.features")} className="ms-auto hidden items-center gap-6 text-[15px] text-fg-muted md:flex">
            <a href="#features" className="hover:text-fg">
              {t("nav.features")}
            </a>
            <a href="#how" className="hover:text-fg">
              {t("nav.how")}
            </a>
            <a href="#faq" className="hover:text-fg">
              {t("nav.faq")}
            </a>
          </nav>
          <Link
            {...appLink}
            className="ms-auto inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover md:ms-0"
          >
            {t("nav.open")}
          </Link>
        </div>
      </header>

      <main id="main">
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="space-y-7">
            <p className="text-sm font-semibold tracking-wide text-positive">{t("hero.eyebrow")}</p>
            <h1 className="font-display text-[clamp(2.6rem,7vw,4.6rem)] font-semibold leading-[1.02] tracking-tight">
              {t("hero.title")}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-fg-muted sm:text-xl">{t("hero.lead")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                {...appLink}
                className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-lg)] bg-accent px-7 text-base font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
              >
                {t("hero.cta")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
              </Link>
              <a
                href="#how"
                className="inline-flex h-14 items-center rounded-[var(--radius-lg)] border border-line px-6 text-base font-medium text-fg hover:bg-surface-2"
              >
                {t("hero.secondary")}
              </a>
            </div>
            <p className="text-sm text-fg-subtle">{t("hero.note")}</p>
          </div>
          <PhoneMock t={t} money={money} />
        </section>

        {/* ─── Facts ────────────────────────────────────────────────────── */}
        <section aria-label={t("facts.label")} className="border-y border-line bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4">
            <Fact value="150+" label={t("facts.currencies")} />
            <Fact value="6" label={t("facts.splits")} />
            <Fact value="8" label={t("facts.languages")} />
            <Fact value={<CloudOff className="mx-auto size-7 text-positive" aria-hidden />} label={t("facts.offline")} />
          </dl>
        </section>

        {/* ─── Spotlights ───────────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 space-y-20 px-4 py-20 sm:px-6 lg:space-y-28 lg:py-28">
          <Spotlight title={t("spotlight.splitTitle")} body={t("spotlight.splitBody")}>
            <SplitDemo t={t} money={money} />
          </Spotlight>
          <Spotlight title={t("spotlight.currencyTitle")} body={t("spotlight.currencyBody")} flip>
            <CurrencyDemo t={t} money={money} />
          </Spotlight>
          <Spotlight title={t("spotlight.payTitle")} body={t("spotlight.payBody")}>
            <PayDemo t={t} money={money} />
          </Spotlight>
        </section>

        {/* ─── Everything else ──────────────────────────────────────────── */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("features.title")}</h2>
            <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon={<Link2 />} title={t("features.join")} body={t("features.joinBody")} />
              <Feature icon={<Route />} title={t("features.fewest")} body={t("features.fewestBody")} />
              <Feature icon={<CloudOff />} title={t("features.live")} body={t("features.liveBody")} />
              <Feature icon={<Repeat />} title={t("features.repeat")} body={t("features.repeatBody")} />
              <Feature icon={<Bell />} title={t("features.notify")} body={t("features.notifyBody")} />
              <Feature icon={<History />} title={t("features.trust")} body={t("features.trustBody")} />
            </ul>
          </div>
        </section>

        {/* ─── How it works ─────────────────────────────────────────────── */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("how.title")}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {(["1", "2", "3"] as const).map((n) => (
              <li key={n} className="relative border-t-2 border-accent pt-6">
                <span className="tabular font-display text-5xl font-semibold text-fg-subtle" aria-hidden>
                  {Number(n).toLocaleString(lang)}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{t(`how.step${n}`)}</h3>
                <p className="mt-2 text-fg-muted">{t(`how.step${n}Body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ─── Free, and switching ──────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:pb-28">
          <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-8 sm:p-10">
            <h2 className="font-display text-3xl font-semibold tracking-tight">{t("free.title")}</h2>
            <p className="mt-3 max-w-xl text-fg-muted">{t("free.body")}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {(["ads", "limits", "data", "export"] as const).map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="font-medium">{t(`free.${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-between rounded-[var(--radius-xl)] border border-line bg-surface p-8 sm:p-10">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{t("switch.title")}</h2>
              <p className="mt-3 text-fg-muted">{t("switch.body")}</p>
            </div>
            <Link {...appLink} className="mt-8 inline-flex items-center gap-1.5 self-start font-semibold text-positive hover:underline">
              {t("switch.cta")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────────────────────── */}
        <section id="faq" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("faq.title")}</h2>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {(["1", "2", "3", "4", "5", "6"] as const).map((n) => (
                <details key={n} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {t(`faq.q${n}`)}
                    <ChevronDown className="size-5 shrink-0 text-fg-subtle transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 leading-relaxed text-fg-muted">{t(`faq.a${n}`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Final call ───────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t("final.title")}</h2>
          <p className="mt-4 text-lg text-fg-muted">{t("final.body")}</p>
          <Link
            {...appLink}
            className="mt-8 inline-flex h-14 items-center gap-2 rounded-[var(--radius-lg)] bg-accent px-8 text-base font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
          >
            {t("final.cta")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Logo />
            <p className="text-sm text-fg-subtle">{t("footer.made")}</p>
            <p className="flex gap-4 pt-2 text-sm text-fg-muted">
              <Link href="/privacy" className="hover:text-fg">
                {t("footer.privacy")}
              </Link>
              <Link href="/terms" className="hover:text-fg">
                {t("footer.terms")}
              </Link>
            </p>
          </div>
          <nav aria-label={t("footer.language")}>
            <p className="mb-3 text-sm font-semibold text-fg-subtle">{t("footer.language")}</p>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              {LANGUAGES.map((l) => (
                <li key={l.code}>
                  <a
                    href={l.code === "en" ? "/" : `/${l.code}`}
                    lang={l.code}
                    hrefLang={l.code}
                    aria-current={l.code === lang ? "page" : undefined}
                    className={cn("hover:text-fg", l.code === lang ? "font-semibold text-fg" : "text-fg-muted")}
                  >
                    {l.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}

type T = ReturnType<typeof createTranslator<LandingMessages>>;
type Money = (minor: number, currency: string) => string;

function Fact({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="px-2 py-8 text-center">
      <dt className="sr-only">{label}</dt>
      <dd className="tabular font-display text-4xl font-semibold tracking-tight">{value}</dd>
      <dd className="mt-1 text-sm text-fg-muted">{label}</dd>
    </div>
  );
}

function Spotlight({ title, body, flip, children }: { title: string; body: string; flip?: boolean; children: ReactNode }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn("space-y-4", flip && "lg:order-2")}>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        <p className="max-w-lg text-lg leading-relaxed text-fg-muted">{body}</p>
      </div>
      <div className={cn(flip && "lg:order-1")}>{children}</div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-positive [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-[15px] leading-relaxed text-fg-muted">{body}</p>
      </div>
    </li>
  );
}

function Initial({ name, tone }: { name: string; tone: string }) {
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", tone)} aria-hidden>
      {name[0]}
    </span>
  );
}

/** A group screen, drawn from the app's own pieces. */
function PhoneMock({ t, money }: { t: T; money: Money }) {
  return (
    <figure aria-label={t("mock.label")} className="mx-auto w-full max-w-[22rem]">
      <div className="rounded-[2.75rem] border border-line-strong bg-bg-elevated p-2.5 shadow-float">
        <div className="overflow-hidden rounded-[2.25rem] border border-line bg-bg">
          <div className="space-y-4 px-4 pb-5 pt-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-info-soft text-xl" aria-hidden>
                ✈️
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-semibold">{t("mock.group")}</p>
                <p className="text-xs text-fg-muted">{t("mock.meta")}</p>
              </div>
            </div>
            <BalanceCard balance={1} className="p-5 shadow-none">
              <p className="text-sm text-fg-muted">{t("mock.owed")}</p>
              <p className="tabular mt-0.5 font-display text-4xl font-semibold tracking-tight text-positive">{money(11150, "EUR")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
                <span className="flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-accent text-accent-fg">
                  <Plus className="size-4" aria-hidden /> {t("mock.add")}
                </span>
                <span className="flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-line bg-surface-2">
                  <ArrowRightLeft className="size-4" aria-hidden /> {t("mock.settle")}
                </span>
              </div>
            </BalanceCard>
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t("mock.today")}</p>
            <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              <MockRow emoji="🍽️" title={t("mock.dinner")} who={t("mock.youPaid")} total={money(16000, "EUR")} label={t("mock.lent")} amount={money(12000, "EUR")} tone="text-positive" />
              <MockRow emoji="🚕" title={t("mock.taxi")} who={t("mock.bilalPaid")} total={money(3400, "EUR")} label={t("mock.borrowed")} amount={money(850, "EUR")} tone="text-negative" />
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function MockRow(p: { emoji: string; title: string; who: string; total: string; label: string; amount: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-lg" aria-hidden>
        {p.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{p.title}</span>
        <span className="block truncate text-xs text-fg-muted">
          {p.who} <span className="tabular">{p.total}</span>
        </span>
      </span>
      <span className="shrink-0 text-end leading-tight">
        <span className="block text-[11px] text-fg-muted">{p.label}</span>
        <span className={cn("tabular text-sm font-semibold", p.tone)}>{p.amount}</span>
      </span>
    </div>
  );
}

/** A receipt split item by item, tip shared by what each person ordered. */
function SplitDemo({ t, money }: { t: T; money: Money }) {
  const people = { A: "bg-[oklch(0.62_0.14_160)]", B: "bg-[oklch(0.6_0.15_250)]", C: "bg-[oklch(0.62_0.16_30)]" };
  const items = [
    { label: "Pizza", amount: 1800, who: ["A", "B"] },
    { label: "Vinho verde", amount: 2400, who: ["A", "C"] },
    { label: "Salada", amount: 1200, who: ["C"] },
  ] as const;
  const shares = [
    { name: "Ana", key: "A", amount: 2310 },
    { name: "Bilal", key: "B", amount: 990 },
    { name: "Chen", key: "C", amount: 2640 },
  ] as const;
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-xl)] border border-line bg-surface p-5">
      <div className="flex rounded-full bg-surface-2 p-1 text-sm font-medium" aria-hidden>
        <span className="flex-1 rounded-full py-1.5 text-center text-fg-muted">{t("spotlight.equal")}</span>
        <span className="flex-1 rounded-full py-1.5 text-center text-fg-muted">{t("spotlight.shares")}</span>
        <span className="flex-1 rounded-full bg-surface py-1.5 text-center">{t("spotlight.items")}</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-3">
            <span className="flex-1 font-medium">{it.label}</span>
            <span className="flex -space-x-1.5 rtl:space-x-reverse">
              {it.who.map((k) => (
                <Initial key={k} name={shares.find((s) => s.key === k)!.name} tone={people[k]} />
              ))}
            </span>
            <span className="tabular w-20 text-end text-fg-muted">{money(it.amount, "EUR")}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 text-sm text-fg-muted">
          <span className="flex-1">{t("spotlight.tipShared")}</span>
          <span className="tabular w-20 text-end">{money(540, "EUR")}</span>
        </li>
      </ul>
      <div className="mt-4 rounded-[var(--radius-md)] bg-surface-2 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t("spotlight.eachPays")}</p>
        <ul className="mt-2 space-y-1.5">
          {shares.map((s) => (
            <li key={s.key} className="flex items-center gap-2.5">
              <Initial name={s.name} tone={people[s.key]} />
              <span className="flex-1 font-medium">{s.name}</span>
              <span className="tabular font-semibold">{money(s.amount, "EUR")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CurrencyDemo({ t, money }: { t: T; money: Money }) {
  const samples: [number, string][] = [
    [4250, "EUR"],
    [240000, "INR"],
    [3500, "JPY"],
    [12900, "BRL"],
    [850000, "PKR"],
    [6400, "GBP"],
    [18500, "AED"],
    [9999, "USD"],
  ];
  return (
    <div className="mx-auto max-w-md">
      <ul className="flex flex-wrap gap-2.5">
        {samples.map(([minor, code]) => (
          <li key={code} className="flex items-baseline gap-2 rounded-full border border-line bg-surface px-4 py-2.5">
            <span className="tabular text-lg font-semibold">{money(minor, code)}</span>
            <span className="text-xs font-medium text-fg-subtle">{code}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-center gap-2 text-sm text-fg-muted">
        <Check className="size-4 text-positive" aria-hidden /> {t("spotlight.rateLocked")}
      </p>
    </div>
  );
}

function PayDemo({ t, money }: { t: T; money: Money }) {
  const methods = ["UPI", "PayPal", "Venmo", "Revolut", "Wise", "Monzo", "Cash App", "IBAN", "Raast", "JazzCash", "Easypaisa"];
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-5">
        <p className="text-sm font-medium text-fg-muted">{t("spotlight.payWith", { name: "Ana" })}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["PayPal", "Revolut"].map((m) => (
            <span key={m} className="flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{m}</span>
                <span className="block truncate text-xs text-fg-muted">
                  {t("spotlight.filled")} · <span className="tabular">{money(4200, "EUR")}</span>
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            </span>
          ))}
        </div>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={t("spotlight.payTitle")}>
        {methods.map((m) => (
          <li key={m} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-muted">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
