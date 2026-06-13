# SettleMint — Product Requirements Document
> **Version 1.0 | June 2026**
> The most beautiful, fastest, and most intelligent way to split, track, and settle shared money.

---

## 0. Executive Summary

SettleMint is an AI-first shared expense platform designed to replace Splitwise as the global default for group money management. Where Splitwise solved the math, SettleMint solves the entire experience — from the moment a receipt hits the table to the moment everyone is settled with zero awkwardness.

**Core proposition:** Beautiful, instant, relationship-aware expense coordination built for real human life — not accountants.

**Name:** SettleMint = Settlement + Freshness. Every expense logged cleanly. Every balance crystal clear. Every settlement fresh and final.

**Revenue model:** Freemium → Pro ($4.99/mo or $39.99/yr) → Teams ($9.99/member/mo)

**Primary markets:** Pakistan (JazzCash, EasyPaisa), South Asia, English-speaking global

---

## 1. Why Now

### Market Signals

- **Splitwise has ~50M users** but its core UX hasn't meaningfully evolved in 5+ years — the experience feels like a 2013 app.
- **Payment rails have matured globally** — JazzCash, EasyPaisa, Stripe, PayPal, UPI make in-app settlement viable in most markets.
- **Multimodal AI is production-ready** — LLM vision makes receipt parsing reliable enough to ship to consumers.
- **Gen Z expects more** — They grew up with Robinhood, Cash App, Revolut. They will not tolerate ugly UIs or clunky workflows.
- **Remote/hybrid work created new expense patterns** — Team lunches, shared subscriptions, coworking costs, distributed teams. Splitwise has no answer.
- **Group travel is surging** — The multi-currency, multi-person trip is the hardest use case Splitwise handles worst.

### Total Addressable Market

| Layer | Description | Estimate |
|-------|-------------|----------|
| TAM | People globally who manage shared expenses informally | 500M+ |
| SAM | English + South Asia + SEA with smartphone + digital payments | 150M |
| SOM (Year 1–3) | Premium-tier users in target markets | 5M |

At $5/month average revenue per paid user and 5% conversion: supports a **$1.5–3B ARR business at scale**.

---

## 2. Vision & Mission

**Vision:** A world where shared money never creates awkwardness.

**Mission:** Build the most beautiful and intelligent shared-expense platform — one that makes logging, understanding, and settling group money feel instant, obvious, and even delightful.

**Brand Essence:** Clean. Fresh. Done.

---

## 3. The Five Mints — Product Philosophy

Every product decision runs through five pillars:

| Pillar | Core Belief |
|--------|-------------|
| **Instant Capture** | No expense should take longer than 10 seconds to log |
| **Crystal Clarity** | Everyone always knows exactly where they stand |
| **Smart Settlement** | AI finds the shortest path to zero balance |
| **Relationship Intelligence** | Money tools must understand how humans actually relate |
| **Beautiful by Default** | Premium design is not decoration — it is trust |

---

## 4. Target Users — Jobs to Be Done

### Persona A: The Trip Organizer ("Sofia, 29")

| | |
|--|--|
| **Situation** | Planning a 10-day Southeast Asia trip with 8 friends |
| **Biggest pain** | She pays for everything and keeps forgetting to log it. End-of-trip math is a catastrophe. |
| **Job 1** | "When I pay for the group, I want to capture it in 5 seconds while the receipt is still in front of me" |
| **Job 2** | "When the trip ends, I want a clean, beautiful summary everyone can see — no more WhatsApp arguments" |
| **Job 3** | "When someone doesn't pay back, I want the app to nudge them — not me" |

---

### Persona B: The Roommate ("Hamza, 24")

| | |
|--|--|
| **Situation** | 3 roommates in Lahore sharing rent, groceries, WiFi, electricity |
| **Biggest pain** | Someone always forgets. Tracking who paid for groceries is a running argument. |
| **Job 1** | "When the electricity bill arrives, I want it split automatically — no discussion needed" |
| **Job 2** | "When it's end of month, I want a single number: who pays whom how much" |
| **Job 3** | "When I set up a recurring bill, I want to set it once and forget it forever" |

---

### Persona C: The Couple ("Aisha & Bilal, 31/32")

| | |
|--|--|
| **Situation** | Shared household expenses but not 50/50 — different incomes, different roles |
| **Biggest pain** | Equal split feels unfair; Splitwise can't handle custom ratios elegantly |
| **Job 1** | "When we set our custom split ratio, I want it remembered forever — not re-entered every time" |
| **Job 2** | "When I look at our month, I want to see our spending story — not just numbers" |
| **Job 3** | "When either of us checks, personal expenses stay private; shared ones are visible to both" |

---

### Persona D: The Event Host ("Zara, 33")

| | |
|--|--|
| **Situation** | Organizing a bachelorette weekend for 12 people, different cost tiers |
| **Biggest pain** | Managing deposits, tiered contributions, tracking who's paid, chasing 12 people |
| **Job 1** | "When I set up the event, I want to define different cost tiers for different people" |
| **Job 2** | "When I send the settlement summary, I want everyone to see their exact amount with no confusion" |
| **Job 3** | "When someone pays, I want automatic confirmation and a clean paid/unpaid tracker" |

---

### Persona E: The Multi-Currency Traveler ("Daniyal, 27")

| | |
|--|--|
| **Situation** | Travels internationally 8–10x/year, always in mixed-currency groups |
| **Biggest pain** | Currency conversion math is a nightmare. Splitwise exchange rates are often stale or wrong. |
| **Job 1** | "When I pay in THB, I want the group currency conversion handled at today's rate automatically" |
| **Job 2** | "When I look at the trip, I want everything in one base currency with clear conversion notes" |
| **Job 3** | "When we settle, I want the settlement to account for the exchange rate we actually used" |

---

### Persona F: The Team Lead ("Omar, 36")

| | |
|--|--|
| **Situation** | 8-person team with shared lunches, office supplies, team outings |
| **Biggest pain** | Reimbursements need approval, categorization, and clean exports for accounting |
| **Job 1** | "When someone submits an expense, I want to approve or flag it before it's logged" |
| **Job 2** | "When month ends, I want one CSV I can hand to accounting with no editing required" |
| **Job 3** | "When I look at the team dashboard, I want to see spending by category and person at a glance" |

---

## 5. Product Scope

### MVP (Month 0–4): Prove the Core

The minimum version must demonstrate the value proposition in every session.

- User accounts (email, Google, Apple sign-in)
- Groups with name, cover image, currency, timezone, default split
- All split types: equal, unequal, percentage, shares, fixed, payer-excluded
- Expense creation: amount, paid by, split among, category, date, notes, receipt, currency
- Simplified balance calculation (debt minimization graph algorithm)
- Settlement recording (cash, bank transfer, screenshot proof)
- Receipt upload + AI extraction (merchant, date, total, tax, tip, line items)
- Multi-currency with live FX rates stored at time of expense
- Push + email notifications
- Recurring expenses
- CSV export
- Basic group dashboard

### V1 (Month 5–8): Make It Sticky

- Natural language expense entry ("Dinner 4500 split 5 ways I paid")
- Offline-first mode (CRDT sync)
- Default split templates per group
- Payment request links + QR codes
- Partial settlement tracking
- Expense search + smart filters
- Full audit history ("who changed what")
- Shared attachments
- Role-based permissions (Owner, Admin, Member, Viewer)
- Couple / Roommate / Trip / Event modes
- Group spending reports
- Email receipt forwarding (expenses@settlemint.app)

### V2 (Month 9–15): Build the Moat

- AI Expense Assistant (MintBot): chat, voice, suggestions
- Bank SMS / notification parsing (Pakistan-first)
- Payment rail integrations: JazzCash, EasyPaisa, Stripe, PayPal
- Cross-group debt netting
- "MintScore" settlement reliability rating
- Trip timeline with map view
- Event budget planner
- Family mode with shared budget pools
- WhatsApp bot integration
- Advanced analytics with narrative insights
- Teams tier: approvals, policies, audit export, accounting formats
- API + webhook access

---

## 6. Core Feature Requirements

### 6.1 Onboarding

**Requirements:**
- Sign up via email, Google, Apple. Phone optional (SMS features only).
- Mode selection on first run: Trip / Roommates / Couple / Event / Team
- App auto-configures: default split, categories, UI density, notification style based on mode
- Quick-start demo group available (pre-seeded with realistic expenses)
- Guest mode: begin adding expenses with no account; convert later to retain all data

**Acceptance criteria:**
- User creates first group within 90 seconds of app open on cold start
- First expense logged within 5 minutes of account creation
- No mandatory phone number at signup
- Guest-to-account conversion preserves 100% of data

---

### 6.2 Groups

**Requirements:**
- Create group with: name, emoji/cover image, base currency, timezone, mode, default split style
- Invite via: shareable deep link, QR code, contact picker, email, SettleMint username
- Member roles with explicit permissions:

| Role | Create Expenses | Edit Others' Expenses | Manage Members | View Balances | Export |
|------|:-:|:-:|:-:|:-:|:-:|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Member | ✓ | Own only | ✗ | ✓ | ✗ |
| Viewer | ✗ | ✗ | ✗ | ✓ | ✗ |

- Group modes with UI/defaults adapted per mode: Trip, Roommates, Couple, Family, Event, Team
- Archive group: preserves full history, disables new activity
- Group notifications per-member configurable (not global toggle only)

**Acceptance criteria:**
- Invite link works for non-users — they can join and add expenses before creating an account
- Group creation completes in under 30 seconds
- Role change takes effect on next API call, no re-login required

---

### 6.3 Expense Creation

**Split types supported:**

| Type | Description |
|------|-------------|
| Equal | Divide total equally among selected participants |
| Unequal | Specify exact amount per person (must total 100%) |
| Percentage | Assign % to each person (must total 100%) |
| Shares | Relative weight — e.g. 2:1:1 |
| Fixed + remainder | Some people pay fixed amounts; rest split evenly |
| Payer excluded | Payer is not included in the split |
| Tax/tip layer | Add on top of base split logic |
| Item-level | Each person assigned specific line items from receipt |

**Expense fields:**

| Field | Required | Notes |
|-------|:--------:|-------|
| Amount | ✓ | Supports any currency |
| Currency | ✓ | Defaults to group base currency |
| Paid by | ✓ | One or multiple payers with amounts |
| Split among | ✓ | Subset of group members |
| Split type | ✓ | See above |
| Category | ✗ | Auto-detected, user can override |
| Date/time | ✓ | Defaults to now |
| Notes | ✗ | Free text |
| Receipt(s) | ✗ | Triggers OCR pipeline |
| Tags | ✗ | User-defined labels |
| Location | ✗ | GPS auto-suggested |
| Visibility | ✗ | All / Selected members / Private |
| Recurring flag | ✗ | Triggers recurrence rule creation |

**Expense types:**

- Standard one-time expense
- Recurring expense (with rule)
- Reimbursement (one person claims money back)
- Shared purchase (one person buys for group)
- Borrowed money (simple IOU)

**Acceptance criteria:**
- Standard equal-split expense created in under 8 taps from dashboard
- Receipt-to-confirmed-expense flow in under 30 seconds on a clear receipt
- NL entry: "Dinner 4500 split 5 ways I paid" creates correct expense in under 3 seconds
- Expense with 8 participants and percentage split validates that percentages total 100% before saving

---

### 6.4 Receipt & Document Processing

**Upload methods:**
- Camera (in-app, optimized for receipts)
- Photo library
- PDF upload
- Email forward to expenses@settlemint.app

**AI extraction targets:**

| Field | Target Accuracy |
|-------|:-:|
| Merchant name | >85% |
| Date | >90% |
| Total amount | >95% |
| Tax | >80% |
| Tip | >80% |
| Currency | >95% |
| Line items (when itemized) | >80% |

**Interaction design:**
- Confidence indicator on each extracted field (green/amber/red)
- Inline editing with tap-to-correct flow
- User can accept all and create, or correct individual fields
- Multiple receipts per expense supported
- "Split by item" mode: drag line items to assign per person

**Pro tier:** Receipts stored indefinitely
**Free tier:** Receipts stored 30 days

**Acceptance criteria:**
- OCR processing returns initial result in under 10 seconds
- WebSocket event triggers receipt card animation the moment processing completes
- Zero fields pre-filled if confidence < 40% (better to show blank than wrong)
- Correction flow saves in under 1 second

---

### 6.5 Settlements

**Core requirements:**
- Compute per-group net balance per member
- Debt minimization: minimum transfer graph algorithm (max N-1 transfers for N members)
- Optional: "do not simplify" flag preserves original debt pairs
- Cross-group settlement view (Pro): see all outstanding balances across all groups

**Settlement recording methods:**

| Method | Fields Required |
|--------|----------------|
| Cash | Amount, optionally mark from whom |
| Bank transfer | Amount, reference number optional |
| Screenshot proof | Upload payment screenshot |
| Request link | Generate link to send to debtor |
| QR code | In-person, instant |

- Partial settlement: records portion, reduces outstanding balance proportionally
- Settlement history: immutable and auditable (no deletes, only reversals with audit trail)
- Overdue detection: flag if not settled within configurable days
- Reminder: automated push/email at configurable intervals

**Acceptance criteria:**
- Balance computation < 500ms for groups up to 50 members
- Minimum settlement algorithm always produces ≤ N-1 transfers
- Payment request link works without recipient having a SettleMint account
- Partial settlement immediately and correctly reduces outstanding balance

---

### 6.6 Notifications

| Event | Default | Configurable |
|-------|:-------:|:------------:|
| New expense added to group | ✓ | Per group |
| Expense edited (with diff) | ✓ | Per group |
| Settlement requested | ✓ | Yes |
| Settlement completed | ✓ | Yes |
| Recurring expense triggered | ✓ | Yes |
| Monthly Mint Report | ✓ | Yes |
| "You haven't settled in X days" nudge | Off | Yes |
| Suspicious edit alert | ✓ | Yes |
| Group invite | ✓ | No |

All notifications respect:
- Quiet hours (user-configured time window)
- Smart batching: no more than 3 group activity notifications per hour
- Action buttons in notification (e.g., "Approve" / "View")
- Cross-platform: push (iOS, Android), email, in-app badge

---

### 6.7 Reporting & Analytics

**Free tier:**

- Group balance overview (current state)
- Per-member contribution summary
- Category breakdown: pie chart
- Trip/month summary card (shareable PNG)

**Pro tier:**

- Monthly spending trends over time
- Category trends: 6-month chart
- Per-person spending over time
- Narrative insights: "You spent 23% more on food this month than last. Dining dominated at 34% of total."
- Settlement efficiency score: "This group needed 12 transfers; optimal was 4."
- Export: CSV (all time) or PDF with charts and full line-item detail

**Teams tier:**

- Approval audit trail report
- Policy compliance dashboard
- Budget vs. actual by category
- Department/person breakdown
- Accounting-ready export (Xero, QuickBooks compatible format)

---

### 6.8 Search & Filters

- Full-text search: merchant, notes, category, person, tag
- Amount range filter
- Date range filter
- Filters: unpaid, settled, pending review, recurring, receipt missing, flagged
- Smart fuzzy search (typo-tolerant via Typesense)
- Results grouped by: relevance, date, group, or person
- Saved searches / filter presets

---

### 6.9 Privacy & Permissions

| Feature | Detail |
|---------|--------|
| Expense visibility | All members / selected members / private |
| Private notes | Only author can see — never exposed in export |
| Amount hiding | Viewer-role members can be blocked from seeing amounts |
| Member removal | Configure what happens to their expenses (keep as-is / re-assign) |
| Data export | Full personal data JSON or CSV within 24 hours |
| Account deletion | Soft-delete with 30-day recovery window, then hard delete |
| Data sales | Financial data is never sold to third parties — legally binding |
| GDPR / local law | Compliant from day one |

---

## 7. UX Direction

### Visual Language

| Element | Direction |
|---------|-----------|
| Primary color | Mint green (#3DD68C) — fresh, money-adjacent, distinctive |
| Neutrals | Deep slate (#1A1F2E) and warm white (#F9FAFB) |
| Typography | Inter (geometric sans) — clean, universal, highly legible |
| Border radius | Generous — 16px on cards, 24px on sheets |
| Motion | Purposeful only — confirmation states, transitions; never decorative loops |
| Density | Low — white space is a feature, not wasted space |
| Dark mode | First-class citizen, tested equally with light mode |

### Interaction Principles

- **One thumb, one hand** — all critical actions reachable in the lower 60% of screen
- **No modal hell** — bottom sheets for contextual actions, not full-screen modals
- **Progressive disclosure** — simple by default, complexity revealed on demand ("More options")
- **Every screen answers three questions:** "What do I owe?" / "What do I get back?" / "What changed?"
- **Never trap the user** — every destructive action has a clear undo or grace period

### Signature Moments

**"The Mint"** — Settlement completion animation: a burst of mint-colored coins that dissolve and reform into a clean zero balance. 0.8 seconds. Satisfying. Branded. Memorable.

**Receipt Card** — When a receipt is uploaded, a gorgeous animated card slides up showing extracted fields highlighted in mint green. Each field has a confidence glow (strong green / amber / soft red). Tap any field to correct inline.

**Balance Graph** — A living, zoomable node graph showing who owes whom. Debt arrows are mint-colored, thicker for larger amounts. Settling a debt shows the arrow shrinking and dissolving.

**Trip Timeline** — Expenses arranged on a vertical timeline with location pins, day headers, and category icons. Collapses to a beautiful summary card you can share as a PNG.

**Monthly Mint Report** — A swipeable, shareable summary card narrating the month's spending in one sentence per category. "Food: PKR 48,000 across 23 expenses. You paid more than average."

---

## 8. Monetization

### Free Tier

| Feature | Limit |
|---------|-------|
| Groups | Unlimited |
| Members per group | Unlimited |
| Expenses | Unlimited |
| Split types | All |
| Settlements | Full |
| Receipt scans | 10/month |
| Reporting | Basic (current month only) |
| Export | CSV (last 90 days) |
| Ads | Optional, minimal, tasteful |

### Pro — $4.99/month or $39.99/year (33% discount)

Everything free, plus:

- Unlimited receipt scanning
- AI Expense Assistant (MintBot)
- Advanced analytics + 12-month history
- Cross-group balance view
- Default split templates
- Offline-first mode
- Payment request links + QR settlement
- Unlimited export history (all time)
- Trip timeline + event budget planner
- No ads
- Priority support (48h response)

### Teams — $9.99/member/month (minimum 3 members)

Everything Pro, plus:

- Expense approval workflows (submit → approve → log)
- Policy enforcement (category limits, amount caps)
- Admin dashboard
- Full audit trail with export
- Accounting export (Xero, QuickBooks format)
- SSO (Google Workspace, Microsoft)
- Dedicated onboarding
- SLA support (24h response)

### Revenue Projections

| Period | MRR Target |
|--------|-----------|
| Month 6 (launch) | $0 — free |
| Month 7 (Pro launch) | $250 |
| Month 10 | $2,500 |
| Month 12 | $8,000 |
| Month 18 | $40,000 |

---

## 9. Success Metrics

### Activation

| Metric | Target |
|--------|--------|
| New users who create group + first expense within 10 min | >70% |
| First expense logged within session | >65% |
| Invite acceptance rate | >55% |
| Receipt-to-confirmed expense | >85% success |
| Onboarding completion rate | >75% |

### Engagement

| Metric | Target |
|--------|--------|
| Expenses per active group per week | >3 |
| Groups still active at 30 days | >45% |
| Settlement completion rate | >60% |
| Users enabling recurring expenses | >25% |
| Pro feature usage rate (paid users) | >70% |

### Retention

| Metric | Target |
|--------|--------|
| 7-day retention | >45% |
| 30-day retention | >30% |
| 90-day retention | >20% |
| Monthly active groups growth | >15% MoM |

### Revenue

| Metric | Target |
|--------|--------|
| Free → Pro conversion | >5% |
| Annual plan share of Pro subscriptions | >50% |
| Monthly Pro churn | <3% |
| Teams logo retention (annual) | >85% |

### Quality

| Metric | Target |
|--------|--------|
| Expense creation time (p95) | <8 seconds |
| OCR success rate (clear receipts) | >90% |
| API p95 latency | <300ms |
| App crash-free sessions | >99.9% |
| Balance calculation errors reported | 0 per 10K expenses |

---

## 10. Competitive Moat Analysis

| Dimension | Splitwise Today | SettleMint |
|-----------|----------------|-----------|
| Design | 2013-era, utilitarian | Mint-branded premium, dark mode first-class |
| Receipt OCR | Basic, unreliable | Multimodal AI — line item extraction |
| Offline mode | None | Local-first CRDT |
| Natural language entry | None | Full NLP ("Dinner 4500 split 5 ways") |
| Settlement | Manual record only | Optimized paths, payment links, QR codes |
| Analytics | Basic charts | Narrative insights, efficiency scores |
| Payment rails | Very limited | JazzCash, EasyPaisa, Stripe, PayPal |
| Real-time sync | Polling | WebSocket — everyone sees changes live |
| Relationship modes | None | Trip, Couple, Roommate, Event, Team |
| WhatsApp integration | None | Bot: forward bill → auto-create expense |
| Cross-group netting | None | Pro feature — settle all groups at once |
| AI assistant | None | MintBot — chat, voice, smart suggestions |
| Teams/enterprise | None | Full tier with approvals, audit, accounting |

### The Moat Flywheel

```
More groups → More members join → Network effect → Data improves AI
     ↑                                                      ↓
Better insights → Higher retention → More groups created
```

SettleMint's real moat is **relationship data over time** — the longer a couple, friend group, or team uses SettleMint, the more the AI understands their patterns. Switching to a competitor means losing that history and intelligence.

---

## 11. Key Risks

| Risk | Severity | Mitigation |
|------|:--------:|-----------|
| OCR errors destroy user trust | 🔴 High | Manual correction always available; never auto-save OCR without review |
| Balance calculation bugs | 🔴 Critical | Extensive unit tests; dual-implementation cross-check; public bug bounty |
| Privacy breach of financial data | 🔴 Critical | Security audit pre-launch; minimal data retention; E2E encryption |
| Splitwise copies key features | 🟡 Medium | Speed and design moat; community network effect takes years to copy |
| Payment rail compliance complexity | 🟡 Medium | Start with "record only" — no live money movement until legal cleared |
| Multi-currency edge cases | 🟡 Medium | Store FX rate at time of expense; never retroactively recompute |
| Low Pro conversion rate | 🟡 Medium | 14-day trial; revisit pricing; improve Pro feature visibility |

---

## 12. Positioning Statement

> **"The shared expense app that actually respects your relationships."**

Long form: SettleMint is the fastest, most beautiful, most intelligent way to track and settle shared expenses — built for real human relationships, not spreadsheets. It handles the math, the receipts, the awkward reminders, and the final settlement so you don't have to.

Short form: **Splitwise, but premium. Faster. Smarter. And actually pleasant to use.**
