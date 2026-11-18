# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

The web app (an installable PWA) and the phone app (Expo, iOS and Android) share one product and one design system. On iPhone the phone app adopts native iOS conventions (the system tab bar, Liquid Glass on iOS 26); on Android it follows Material conventions where the platform expects them.

## Users

Friends, couples, flatmates and travellers who share costs, anywhere in the world. The app ships in English, Spanish, Portuguese, French, German, Hindi, Urdu and Arabic (Urdu and Arabic right to left).

They mostly use it on a phone, one-handed, at the moment money changes hands: at a restaurant table, at a till, in a taxi, or on a sofa settling up at the end of a trip. Phone use comes first; desktop is a roomier version of the same experience.

## Product Purpose

Keep track of who paid what and who owes whom, in any currency, exact to the cent, so that money never strains a friendship.

Success is two numbers: a person knows where they stand within 2 seconds of opening the app, and adds a bill within 5.

## Positioning

What SettleMint offers that the incumbent (Splitwise) does not:

- Free without limits: no daily expense caps, no ads. Only receipt scans have a monthly allowance, because each costs money.
- Friends join from a link and pick their name, with no account needed; they can save an account later.
- Every way to split (equally, exact amounts, percentages, shares, adjustments, item by item from a scanned receipt), with several payers, always adding up to the cent.
- Real multi-currency: any ISO currency, the rate locked in when the expense is added.
- Settle-up that gets you paid: the fewest payments, with one-tap links into the payee's payment app (UPI, PayPal, Venmo, Revolut, Wise and others). SettleMint never moves money itself.
- Works offline and updates live on everyone's screen.
- Splitwise import, so switching takes a minute.

## Operating Context

- Adding an expense happens in a hurry and often with poor signal; writes are queued offline and sent later.
- Groups are trips, homes, couples, events, or just two friends.
- Balances are read most often; settling up happens at the end of a trip or month.
- The public landing page is the first impression for people arriving from an invite or a search.

## Capabilities and Constraints

- Web: Next.js static export (no server rendering), so it can be hosted for free. Public pages ship no framework JavaScript.
- Phone: Expo SDK 57.
- Budget is zero: only free and openly licensed fonts, icons and libraries.
- Money is stored in integer minor units; amounts must always display in the viewer's locale and never drift.
- Terminology: "group", "expense", "payment" (a settlement), "settle up", "owed to you", "you owe".

## Brand Commitments

- Name: SettleMint. Mint is the brand colour.
- Voice: calm, exact, a little warm. Plain words; controls name their action.
- Visual direction chosen by the owner: Liquid Glass (Apple iOS 26 feel), light by default with an equally finished dark mode.

## Evidence on Hand

No customers, testimonials, press or usage numbers exist yet. Nothing of that kind may be invented. Product claims must match what the app actually does.

## Product Principles

1. Where you stand comes first: balances are the hero of every screen that has one.
2. Fast at the table: the common path (add a bill split equally) takes the fewest taps.
3. Fair and exact: the preview always equals what is saved, to the cent.
4. Calm about money: debts are stated clearly and kindly, never alarmingly.
5. Nobody is left out: works offline, in their language, without an account, with assistive technology.

## Accessibility & Inclusion

WCAG 2.2 AA. Full right-to-left layout for Arabic and Urdu. Colour is never the only signal for owed and owe. Reduced motion and reduced transparency are honoured. Touch targets at least 44 px.
