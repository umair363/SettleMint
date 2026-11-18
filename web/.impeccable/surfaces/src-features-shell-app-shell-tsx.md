---
version: 1
slug: "src-features-shell-app-shell-tsx"
primary_target: "src/features/shell/app-shell.tsx"
related_targets: ["src/app/(main)/(client)/(app)"]
---

Scope: the signed-in web app (home, groups, group, add expense, settle up, activity, account, sheets). Mode: Operate. Phone first.

Audience and job: friends sharing costs; know where they stand in 2 seconds, add a bill in 5, settle in a tap.

## Direction contract

THESIS: Where you stand is a sentence set in type on the canvas, not a dashboard. The screen refuses the fintech default: a tinted hero-metric card above a stack of identical cards and a grid of icon tiles.

OWN-WORLD: Cool paper-white canvas tinted toward mint (#f7faf8; dark: near-black #0a0e0c). Ink #131c18 with two quieter inks. One mint fill (#4fdaa3) for the single primary action. Owed in deep teal, owe in ember, always with words. Mona Sans: expanded width for titles and every amount, normal width for text. iOS inset grouped lists with hairline dividers; no nested boxes. Glass only on the floating layer: the capsule tab bar, the "+", toasts, the compact header. Phosphor glyphs in neutral 12px tiles; flat low-chroma monograms for people and groups.

STORY: open, read one sentence that says where you stand, tap a group, see who owes whom, add a bill on the keypad, settle with one tap.

FIRST VIEWPORT: phone home. Top row: "Hi, Ana" at 17px with search and avatar at the far end. Then the statement: "You're owed" in ink-2, the amount at 48px expanded in teal with rolling digits, one context line ("across 3 groups"). Then "Groups" as a 20px title over an inset list of rows (mark, name, people and time, amount with words). Floating glass capsule tab bar 12px from the bottom; a separate mint glass "+" at the trailing end.

FORM: the iOS grouped-inset system app (Wallet and Settings lineage), with Liquid Glass chrome. Signature interaction: digits roll when a balance changes, and the settle-up ring closes to zero. seed: none (pinned) "Liquid Glass (Recommended): Apple iOS 26 feel: bright, airy canvas, translucent floating nav and controls that refract what's behind them (real native Liquid Glass on iPhone), big confident numbers, mint as the one accent."

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: number width (112 vs 118) and ember shade, settled at the review gate.
