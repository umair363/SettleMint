import { formatMoney } from "@settlemint/shared";
import { ArrowRight, Check, ChevronDown, ExternalLink, Receipt, Route } from "@/ui/icons";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { createTranslator } from "use-intl";
import { Logo } from "@/features/shell/logo";
import { LANGUAGES, type Language } from "@settlemint/client/i18n/languages";
import type { LandingMessages } from "@/i18n/landing/en";
import { cn } from "@/ui/cn";
import { landingMotionScript } from "./motion-loader";

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

      <header className="safe-top sticky top-0 z-40 px-3">
        <div className="glass mx-auto mt-3 flex h-14 max-w-5xl items-center gap-6 rounded-full pe-2 ps-5">
          <Link href={home} aria-label="SettleMint">
            <Logo />
          </Link>
          <nav aria-label={t("nav.features")} className="ms-auto hidden items-center gap-7 text-[15px] font-[520] text-fg-muted md:flex">
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
            className="ms-auto inline-flex h-10 items-center rounded-full bg-accent px-4 text-[15px] font-[600] text-accent-fg transition-colors hover:bg-accent-hover md:ms-0"
          >
            {t("nav.open")}
          </Link>
        </div>
      </header>

      <main id="main">
        {/* ─── Hero: one sentence, one action, and a real balance under live glass ── */}
        <section className="relative isolate -mt-[4.25rem] overflow-hidden pt-[4.25rem]">
          <div aria-hidden className="hero-aurora" />
          <div className="mx-auto max-w-5xl px-5 pt-14 text-center sm:pt-20 lg:pt-24">
            <h1
              style={{ "--d": "0ms" } as CSSProperties}
              className="rise font-wider text-[clamp(3.1rem,8.4vw,6.25rem)] font-[650] leading-[0.95] tracking-[-0.04em] text-balance"
            >
              {t("hero.title")}
            </h1>
            <p
              style={{ "--d": "90ms" } as CSSProperties}
              className="rise mx-auto mt-7 max-w-[36rem] text-[clamp(1.05rem,2.1vw,1.3rem)] leading-relaxed text-fg-muted text-pretty"
            >
              {t("hero.lead")}
            </p>
            <div style={{ "--d": "170ms" } as CSSProperties} className="rise mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link
                {...appLink}
                className="inline-flex h-14 items-center gap-2 rounded-full bg-accent px-8 text-[17px] font-[600] text-accent-fg shadow-[var(--shadow-lift)] transition-colors hover:bg-accent-hover"
              >
                {t("hero.cta")} <ArrowRight className="size-[18px] rtl:rotate-180" aria-hidden />
              </Link>
              <a href="#how" className="text-[17px] font-[560] text-fg underline decoration-line-strong underline-offset-[6px] hover:decoration-fg">
                {t("hero.secondary")}
              </a>
            </div>
            <p style={{ "--d": "230ms" } as CSSProperties} className="rise mt-6 text-[14px] text-fg-subtle">
              {t("hero.note")}
            </p>
          </div>
          <div style={{ "--d": "320ms" } as CSSProperties} className="rise mx-auto mt-12 max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28 lg:mt-14">
            <HeroPanel t={t} money={money} />
          </div>
        </section>
        <script dangerouslySetInnerHTML={{ __html: landingMotionScript() }} />

        {/* ─── The product, three scenes that stack as you scroll ───────── */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6 lg:pb-36">
          <div className="space-y-6 lg:space-y-10">
            <Scene index={0} title={t("spotlight.splitTitle")} body={t("spotlight.splitBody")}>
              <SplitDemo t={t} money={money} />
            </Scene>
            <Scene index={1} title={t("spotlight.currencyTitle")} body={t("spotlight.currencyBody")}>
              <CurrencyDemo t={t} money={money} />
            </Scene>
            <Scene index={2} title={t("spotlight.payTitle")} body={t("spotlight.payBody")}>
              <PayDemo t={t} money={money} />
            </Scene>
          </div>
        </section>

        {/* ─── Everything else, as a plain specification ────────────────── */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24 sm:px-6 lg:pb-36">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <h2 className="font-wider text-[clamp(2rem,4.4vw,3.25rem)] font-[630] leading-[1.02] tracking-[-0.03em] text-balance lg:col-span-5">
              {t("features.title")}
            </h2>
            <dl className="divide-y divide-line border-y border-line lg:col-span-7">
              {(
                [
                  ["join", "joinBody"],
                  ["fewest", "fewestBody"],
                  ["live", "liveBody"],
                  ["repeat", "repeatBody"],
                  ["notify", "notifyBody"],
                  ["trust", "trustBody"],
                ] as const
              ).map(([title, body]) => (
                <div key={title} className="grid gap-1.5 py-6 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-10">
                  <dt className="text-[17px] font-[600]">{t(`features.${title}`)}</dt>
                  <dd className="leading-relaxed text-fg-muted">{t(`features.${body}`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── Free, and switching ──────────────────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 lg:py-32">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">
              <div className="lg:col-span-7">
                <h2 className="font-wider text-[clamp(2.25rem,5.4vw,4.25rem)] font-[640] leading-[0.98] tracking-[-0.035em] text-balance">
                  {t("free.title")}
                </h2>
                <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-fg-muted text-pretty">{t("free.body")}</p>
              </div>
              <ul className="grid gap-4 lg:col-span-5">
                {(["ads", "limits", "data", "export"] as const).map((k) => (
                  <li key={k} className="flex items-center gap-3.5 text-[17px] font-[540]">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
                      <Check className="size-4" aria-hidden />
                    </span>
                    {t(`free.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-[620]">{t("switch.title")}</h3>
                <p className="mt-1 text-fg-muted">{t("switch.body")}</p>
              </div>
              <Link {...appLink} className="inline-flex items-center gap-1.5 self-start font-[600] text-positive hover:underline sm:self-auto">
                {t("switch.cta")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24 sm:px-6 lg:py-32">
          <h2 className="font-wider text-[clamp(2rem,4.4vw,3.25rem)] font-[630] leading-[1.02] tracking-[-0.03em]">{t("faq.title")}</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {(["1", "2", "3", "4", "5", "6"] as const).map((n) => (
              <details key={n} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-[600] [&::-webkit-details-marker]:hidden">
                  {t(`faq.q${n}`)}
                  <ChevronDown className="size-5 shrink-0 text-fg-subtle transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 leading-relaxed text-fg-muted">{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ─── Final call ───────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden border-t border-line">
          <div aria-hidden className="hero-aurora hero-aurora-end" />
          <div className="mx-auto max-w-4xl px-5 py-28 text-center sm:px-6 lg:py-40">
            <h2 className="font-wider text-[clamp(2.5rem,7vw,5rem)] font-[650] leading-[0.97] tracking-[-0.04em] text-balance">{t("final.title")}</h2>
            <p className="mt-5 text-[19px] text-fg-muted">{t("final.body")}</p>
            <Link
              {...appLink}
              className="mt-10 inline-flex h-14 items-center gap-2 rounded-full bg-accent px-8 text-[17px] font-[600] text-accent-fg shadow-[var(--shadow-lift)] transition-colors hover:bg-accent-hover"
            >
              {t("final.cta")} <ArrowRight className="size-[18px] rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
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

/**
 * One scene of the product story: the claim on one side, the real interface
 * on the other. On wide screens the scenes pile up as you scroll, each
 * settling a little lower than the last.
 */
function Scene({ index, title, body, children }: { index: number; title: string; body: string; children: ReactNode }) {
  return (
    <article
      style={{ "--i": index } as CSSProperties}
      className="scene grid items-center gap-10 rounded-[2.25rem] bg-surface p-6 shadow-[0_0_0_1px_var(--line),0_40px_90px_-60px_oklch(21.5%_0.014_170/0.4)] sm:p-10 lg:min-h-[28rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:p-14"
    >
      <div>
        <h2 className="font-wider text-[clamp(1.9rem,3.6vw,2.85rem)] font-[630] leading-[1.03] tracking-[-0.03em] text-balance">{title}</h2>
        <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-fg-muted text-pretty">{body}</p>
      </div>
      <div className="flex min-h-[18rem] items-center justify-center rounded-[1.5rem] bg-surface-2 p-5 sm:p-8">{children}</div>
    </article>
  );
}

function Initial({ name, tone }: { name: string; tone: string }) {
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", tone)} aria-hidden>
      {name[0]}
    </span>
  );
}

/**
 * The hero's product panel. On the left a real, localized balance set huge
 * under a capsule of glass the shape of the app's tab bar (plain CSS first;
 * the lens script, when the device can take it, swaps in a live, refracting
 * one that drifts and follows the pointer). On the right, the group's latest
 * expenses, as the app lists them.
 */
function HeroPanel({ t, money }: { t: T; money: Money }) {
  return (
    <div className="grid overflow-hidden rounded-[2.25rem] bg-surface text-start shadow-[0_0_0_1px_var(--line),0_60px_120px_-50px_oklch(21.5%_0.014_170/0.5)] lg:grid-cols-[1.1fr_1fr]">
      <div
        data-lens-stage
        className="@container relative isolate min-h-[19rem] bg-surface sm:min-h-[22rem] lg:min-h-[27rem]"
      >
        <div className="absolute inset-0 flex flex-col justify-center px-[8%]">
          <p data-lens-text className="text-[clamp(1rem,3.2cqw,1.35rem)] leading-[1.5] text-fg-muted">
            {t("mock.owed")}
          </p>
          <p className="mt-1">
            <span className="relative inline-block">
              <span
                data-lens-text
                data-lens-anchor
                className="tabular inline-block font-wide text-[clamp(3.1rem,17cqw,8.5rem)] font-[640] leading-[1.1] tracking-[-0.035em] text-positive"
              >
                {money(11150, "EUR")}
              </span>
              <span
                data-lens-fallback
                aria-hidden
                className="lens-fallback pointer-events-none absolute start-1/2 top-[52%] aspect-[1/0.36] w-[min(62cqw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-500 rtl:translate-x-1/2"
              />
            </span>
          </p>
          <p data-lens-text className="mt-5 text-[clamp(0.95rem,2.8cqw,1.15rem)] leading-[1.5] text-fg-muted">
            {t("mock.group")} · {t("mock.meta")}
          </p>
        </div>
        <div aria-hidden className="absolute inset-x-[8%] bottom-[8%] flex items-center justify-between">
          <span className="flex -space-x-2 rtl:space-x-reverse">
            {(["Bilal", "Chen", "Dara"] as const).map((n, i) => (
              <span
                key={n}
                className="identity flex size-9 items-center justify-center rounded-full font-wide text-[14px] font-[640] ring-2 ring-surface"
                style={{ "--id-h": [75, 205, 320][i] } as CSSProperties}
              >
                {n[0]}
              </span>
            ))}
          </span>
          <span className="inline-flex h-10 items-center rounded-full bg-surface-2 px-4 text-[15px] font-[590] text-fg">{t("mock.settle")}</span>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-1 border-t border-line bg-surface-2 p-6 sm:p-8 lg:border-s lg:border-t-0">
        <p className="mb-3 text-[15px] font-[600] text-fg-muted">{t("mock.today")}</p>
        <ul className="space-y-1">
          <ExpenseRow icon={<Receipt />} title={t("mock.dinner")} paid={`${t("mock.youPaid")} ${money(8400, "EUR")}`} share={`${t("mock.lent")} ${money(6300, "EUR")}`} lent />
          <ExpenseRow icon={<Route />} title={t("mock.taxi")} paid={`${t("mock.bilalPaid")} ${money(3600, "EUR")}`} share={`${t("mock.borrowed")} ${money(900, "EUR")}`} />
        </ul>
        <span aria-hidden className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-surface px-5 text-[15px] font-[590] text-fg shadow-[0_0_0_1px_var(--line)]">
          {t("mock.add")}
        </span>
      </div>
    </div>
  );
}

function ExpenseRow({ icon, title, paid, share, lent }: { icon: ReactNode; title: string; paid: string; share: string; lent?: boolean }) {
  return (
    <li className="flex items-center gap-4 rounded-[1.25rem] bg-surface p-3.5 pe-4">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-surface-2 text-fg [&_svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-[590] leading-tight">{title}</span>
        <span className="tabular block truncate text-[14px] text-fg-muted">{paid}</span>
      </span>
      <span className={cn("tabular shrink-0 text-end text-[14px] font-[590]", lent ? "text-positive" : "text-negative")}>{share}</span>
    </li>
  );
}

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
    <div className="w-full max-w-md rounded-[1.25rem] bg-surface p-5 shadow-[0_0_0_1px_var(--line)]">
      <div className="flex rounded-full bg-surface-2 p-1 text-sm font-medium" aria-hidden>
        <span className="flex-1 rounded-full py-1.5 text-center text-fg-muted">{t("spotlight.equal")}</span>
        <span className="flex-1 rounded-full py-1.5 text-center text-fg-muted">{t("spotlight.shares")}</span>
        <span className="flex-1 rounded-full bg-surface py-1.5 text-center shadow-[0_0_0_1px_var(--line)]">{t("spotlight.items")}</span>
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
      <div className="mt-4 rounded-[0.9rem] bg-surface-2 p-3">
        <p className="text-sm font-[600] text-fg-muted">{t("spotlight.eachPays")}</p>
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
    <div className="w-full max-w-md">
      <ul className="flex flex-wrap justify-center gap-2.5">
        {samples.map(([minor, code]) => (
          <li key={code} className="flex items-baseline gap-2 rounded-full bg-surface px-4 py-2.5 shadow-[0_0_0_1px_var(--line)]">
            <span className="tabular text-lg font-semibold">{money(minor, code)}</span>
            <span className="text-xs font-medium text-fg-subtle">{code}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
        <Check className="size-4 text-positive" aria-hidden /> {t("spotlight.rateLocked")}
      </p>
    </div>
  );
}

function PayDemo({ t, money }: { t: T; money: Money }) {
  const methods = ["UPI", "PayPal", "Venmo", "Revolut", "Wise", "Monzo", "Cash App", "IBAN", "Raast", "JazzCash", "Easypaisa", "SadaPay", "NayaPay"];
  return (
    <div className="w-full max-w-md space-y-5">
      <div className="rounded-[1.25rem] bg-surface p-5 shadow-[0_0_0_1px_var(--line)]">
        <p className="text-sm font-medium text-fg-muted">{t("spotlight.payWith", { name: "Ana" })}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["PayPal", "Revolut"].map((m) => (
            <span key={m} className="flex min-h-12 items-center gap-2 rounded-[0.9rem] bg-surface-2 px-3 py-2">
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
      <ul className="flex flex-wrap justify-center gap-2" aria-label={t("spotlight.payTitle")}>
        {methods.map((m) => (
          <li key={m} className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-fg-muted shadow-[0_0_0_1px_var(--line)]">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
