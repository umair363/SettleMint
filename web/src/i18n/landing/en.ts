/**
 * Public landing page, English source. Rendered at build time only (never
 * shipped as JavaScript). Every claim here must be true of the product.
 */
const en = {
  meta: {
    title: "SettleMint · Split bills with anyone, in any currency",
    description:
      "Share costs on trips, at home and between friends. Every kind of split, 150+ currencies, pay links, offline. Free, no ads, and friends don't need an account.",
  },
  nav: {
    features: "Features",
    how: "How it works",
    faq: "FAQ",
    open: "Open the app",
    skip: "Skip to content",
  },
  hero: {
    title: "Split bills. Keep friends.",
    lead: "The fair, fast way to share costs on trips, at home and between friends. Any currency, exact to the cent, and your friends don't even need an account.",
    cta: "Start splitting, free",
    secondary: "See how it works",
    note: "Runs in your browser. Install it like an app.",
  },
  mock: {
    label: "A group in SettleMint",
    group: "Lisbon trip",
    meta: "4 people · EUR",
    owed: "You are owed",
    add: "Add expense",
    settle: "Settle up",
    today: "Today",
    dinner: "Dinner at Time Out",
    youPaid: "You paid",
    taxi: "Taxi from the airport",
    bilalPaid: "Bilal paid",
    lent: "you lent",
    borrowed: "you borrowed",
  },
  spotlight: {
    splitTitle: "Every way to split, done right",
    splitBody:
      "Equally, exact amounts, percentages, shares, adjustments, or item by item from a scanned receipt, with tax and tip shared fairly. Several people can pay one bill. Shares always add up to the cent.",
    equal: "Equally",
    shares: "Shares",
    items: "Items",
    currencyTitle: "Any currency, no drift",
    currencyBody:
      "Add costs in any of 150+ currencies. The exchange rate is locked in when you add it, so a trip's balances never change behind your back.",
    eachPays: "Each person pays",
    tipShared: "Tip, shared by what each ordered",
    rateLocked: "Rate locked when added",
    payWith: "Pay {name} with",
    filled: "amount filled in",
    payTitle: "Get paid, not just reminded",
    payBody:
      "Add how you like to be paid and friends settle in one tap: their payment app opens with your details and the amount filled in. SettleMint never touches the money.",
  },
  features: {
    title: "Everything a shared budget needs",
    join: "Friends join from a link",
    joinBody: "No sign-up needed. They pick their name from the list and they're in.",
    fewest: "Fewest payments",
    fewestBody: "SettleMint works out the smallest number of payments that settles everyone.",
    live: "Live and offline",
    liveBody: "Changes appear on everyone's phone as they happen. No signal? Add it anyway; it syncs later.",
    repeat: "Repeating bills",
    repeatBody: "Rent and subscriptions add themselves every week, month or year.",
    notify: "Notifications",
    notifyBody: "Know when friends add an expense or pay you, on any device you choose.",
    trust: "Nothing hidden",
    trustBody: "Full history on every expense, undo for deletes, and edits that never silently overwrite someone else's.",
  },
  free: {
    title: "Free, without the catch",
    body: "No daily limits and no paywall on the basics. Receipt scans have a monthly allowance, because each one costs us money.",
    ads: "No ads",
    limits: "No daily limits",
    data: "We never sell your data",
    export: "Export or delete everything, any time",
  },
  switch: {
    title: "Moving from Splitwise?",
    body: "Import a group's export and your balances come over to the cent.",
    cta: "Import your groups",
  },
  faq: {
    title: "Questions",
    q1: "Is SettleMint really free?",
    a1: "Yes. Groups, every kind of split, currencies and settling up are free with no limits. Receipt scanning is free up to a monthly allowance.",
    q2: "Do my friends need to install anything?",
    a2: "Not to be in your bills: add them by name and everything works. To open the group themselves they follow your link in any browser and sign up free, which takes a minute. Nothing to install.",
    q3: "Does SettleMint move money?",
    a3: "No. It keeps track of who owes whom and opens your payment app with the amount filled in. The money goes directly between you.",
    q4: "Which currencies and languages are supported?",
    a4: "Over 150 currencies, with the rate locked when you add an expense, and eight languages: English, Español, Português, Français, Deutsch, हिन्दी, اردو and العربية.",
    q5: "Does it work offline?",
    a5: "Yes. Install it from your browser and it opens even without a connection. Anything you add offline syncs when you're back.",
    q6: "What happens to my data?",
    a6: "We store only what the app needs, never show ads or sell data, and you can export or delete your account at any time.",
  },
  final: {
    title: "Ready to settle up?",
    body: "Start a group in under a minute.",
    cta: "Start splitting, free",
  },
  footer: {
    privacy: "Privacy",
    terms: "Terms",
    language: "Language",
    made: "Made for fair friendships.",
  },
  /** Shown on the English page to people whose browser prefers this language. */
  suggest: "This page is available in English.",
  suggestCta: "Switch",
  suggestDismiss: "Dismiss",
};

export default en;
export type LandingMessages = typeof en;
