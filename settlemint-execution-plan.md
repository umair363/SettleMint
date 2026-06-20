# SettleMint — Execution Plan
> **Version 1.0 | June 2026**
> 18-Month Roadmap from Zero to $500K ARR

---

## 0. North Star Destination

> By Month 18, SettleMint is the default shared expense app for 100,000 active users,
> generating $40,000+ MRR, rated 4.7+ on both stores, and recognized as
> **"the beautiful alternative to Splitwise."**

| Month 18 Target | Goal |
|-----------------|------|
| Registered users | 100,000 |
| Monthly active users | 40,000 |
| Monthly active groups | 15,000 |
| Paying Pro subscribers | 2,000 |
| Teams accounts | 100 |
| MRR | $40,000 |
| ARR run rate | $480,000 |
| App Store rating | 4.7+ |
| Play Store rating | 4.6+ |
| Monthly expenses logged | 1,000,000+ |

---

## 1. Phases at a Glance

| Phase | Duration | Headline Goal |
|-------|----------|---------------|
| **0: Foundation** | Month 0–1 | Architecture, design system, working auth |
| **1: Build** | Month 2–4 | Shippable MVP: groups, expenses, AI OCR, settlements |
| **2: Launch** | Month 5–6 | 1,000 real users — public, Product Hunt, community |
| **3: Growth** | Month 7–10 | Pro tier, 10,000 users, retention > 30% |
| **4: Scale** | Month 11–18 | Payment rails, 100K users, Teams tier, $40K MRR |

---

## 2. Team Composition

### Phase 1 Team (Month 0–6): 4–5 People

Build lean. Every person must ship independently.

| Role | Scope |
|------|-------|
| **Founder / PM** | Vision, strategy, user research, growth, investor relations |
| **Full-Stack Backend Lead** | API architecture, expense service, settlement algo, DevOps |
| **Mobile/Frontend Developer** | React Native (iOS + Android) + Next.js web |
| **Product Designer** | Figma design system, UX flows, brand identity, motion |
| **AI/ML Engineer** | OCR pipeline, Claude integration, NLP, prompt engineering *(part-time OK)* |

> **Rule:** No hiring anyone you wouldn't trust to own their entire domain solo.

### Phase 2 Team (Month 7–12): 8–10 People

Add precision, not headcount.

| New Role | When | Why |
|----------|------|-----|
| Second Mobile Dev | Month 7 | Android polish + V1 features |
| Backend Dev #2 | Month 8 | Settlement + analytics services |
| DevOps / Platform | Month 8 | Infra reliability, CI/CD maturity |
| Growth / Marketing | Month 7 | Content, ASO, influencers, referrals |
| Customer Success | Month 8 | Support, onboarding, churn prevention |
| QA Engineer | Month 9 | Pre-Teams launch testing depth |

### Phase 3 Team (Month 13–18): 12–15 People

Add Teams-tier capability and Pakistan market depth.

| New Role | When |
|----------|------|
| Sales (B2B / Teams) | Month 13 |
| Pakistan Partnerships Lead | Month 11 |
| Second Designer | Month 12 |
| Data Analyst | Month 14 |

---

## 3. Phase 0: Foundation (Month 0–1)

**Goal:** Everything scaffolded. Nothing half-built.

### Week 1–2: Environment & Auth

- [ ] Monorepo setup with Turborepo (`apps/api`, `apps/mobile`, `apps/web`, `packages/db`, `packages/types`)
- [ ] PostgreSQL + Redis in docker-compose
- [ ] Auth service: email/password, Google OAuth, Apple Sign In
- [ ] JWT + refresh token flow working end-to-end
- [ ] Railway deployment: dev + staging environments live
- [ ] GitHub Actions: lint → test → deploy pipeline

### Week 3–4: Design System & API Skeleton

- [ ] Figma design system v1: color tokens (Mint green primary), typography (Inter), spacing, border radius
- [ ] Component library: Button, Input, Card, BottomSheet, Avatar, Badge
- [ ] App icon + wordmark final
- [ ] API skeleton: Fastify server, error handling, rate limiting middleware
- [ ] Database: initial schema (users, groups, group_members)
- [ ] Sentry + basic monitoring live

### Phase 0 Go/No-Go Criteria

> A developer can: sign up, create a group, invite another user via API, and all three steps show up correctly in the DB — within **Week 2**.

---

## 4. Phase 1: Build (Month 2–4)

**Goal:** A working, beautiful expense tracker. No shortcuts on design.

### Month 2: Core Ledger

**Backend (Weeks 5–8):**
- [ ] Expense service: full CRUD with all split types
- [ ] Balance calculation engine (greedy debt minimization)
- [ ] FX rate integration (Open Exchange Rates API)
- [ ] Settlement recording (cash, bank transfer)
- [ ] 20 default expense categories + custom
- [ ] Recurring expense engine with BullMQ scheduler
- [ ] Basic audit event logging on every mutation

**Mobile (Weeks 5–8):**
- [ ] Navigation architecture (React Navigation 7)
- [ ] Group dashboard screen
- [ ] Expense creation flow (bottom sheet, progressive)
- [ ] Balance view + settlement suggestion card
- [ ] Dark mode support from day one

**Month 2 Exit Criteria:**
- 3 beta testers split a real dinner expense in under 90 seconds from cold start
- Balance correctly reflects after 10 mixed expense types

---

### Month 3: AI OCR + Notifications

**Backend (Weeks 9–12):**
- [ ] Signed S3/R2 upload URL endpoint
- [ ] Receipt service: create, trigger OCR, store extraction
- [ ] BullMQ worker: Claude Vision integration with structured prompt
- [ ] Confidence scoring per field
- [ ] Notification service: Expo Push Notifications + Resend email
- [ ] Core notification triggers (expense added, settlement requested)
- [ ] WebSocket events: expense.created, receipt.processed

**Mobile (Weeks 9–12):**
- [ ] Receipt capture: camera flow + library picker
- [ ] Animated receipt card with confidence field highlighting
- [ ] Inline field editing + correction flow
- [ ] Notification permission request + preferences screen

**Month 3 Exit Criteria:**
- Receipt-to-confirmed expense in under 30 seconds on a clear photo
- OCR success >85% on 20-receipt test set
- Push notification delivered within 10 seconds of trigger

---

### Month 4: Web App + Invite Flow + Polish

**Backend (Weeks 13–16):**
- [ ] Invite link generation + guest join (no account needed)
- [ ] Email invite delivery via Resend
- [ ] Activity feed per group
- [ ] Typesense integration: index expenses, enable search
- [ ] CSV export (last 90 days)
- [ ] NLP expense entry endpoint (Claude API)

**Frontend (Weeks 13–16):**
- [ ] Next.js web app: feature parity with mobile
- [ ] Onboarding flow (polished, with mode selection)
- [ ] Invite acceptance flow (deep link + web)
- [ ] Activity feed component
- [ ] Search bar with filters
- [ ] Landing page + marketing site live

**Phase 1 Exit Criteria:**
- 10 beta users have active groups with real expenses (minimum 5 each)
- NPS from beta users: ≥ 50
- Zero balance calculation errors in beta period
- App Store and Play Store submissions prepared

---

## 5. Phase 2: Polish & Launch (Month 5–6)

**Goal:** 1,000 real users by end of Month 6. Public product.

### Month 5: Beta Hardening

**Engineering priorities:**
- [ ] Triage all feedback from 10 beta users — fix every bug before adding any feature
- [ ] Performance: all API endpoints within budget (p95 < 300ms on expense create)
- [ ] Performance: app cold start < 2s on iPhone 12 / Samsung S21
- [ ] Redis caching for balance computation (eliminate DB recalculation on every load)
- [ ] OCR quality pass: prompt tuning on edge cases found in beta
- [ ] Offline queue working: expenses added offline sync correctly on reconnect

**App Store prep:**
- [ ] App Store Connect: screenshots (all required sizes, light + dark mode)
- [ ] Google Play Console: screenshots + feature graphic
- [ ] App Store description: primary keywords "split bills", "group expenses", "settle up"
- [ ] TestFlight + Play Store Internal Track: share with 50 beta users
- [ ] Privacy policy + terms of service published at settlemint.app/legal

**Month 5 Exit Criteria:**
- Zero critical bugs open
- TestFlight users rate experience 8/10+
- App Store submission approved

---

### Month 6: Public Launch

**Launch strategy:** Time this during peak travel season. Lead with the **trip use case**. The product-market fit signal is strongest there, and it has natural virality (one user brings 5–10).

**Week 1: Soft Launch**
- [ ] App Store + Play Store live (unrestricted)
- [ ] Web app live at settlemint.app
- [ ] Landing page A/B test: hero copy variants
- [ ] Support inbox (Intercom or Crisp) live + staffed by founder

**Week 2: Product Hunt**

| Task | Owner |
|------|-------|
| PH listing with GIF demo, video, screenshots | Designer |
| Hunter identified (500+ followers in tech/tools space) | Founder |
| 50 personal emails to beta users asking for upvotes | Founder |
| Team on PH all day responding to every comment | All |
| "Story of why we built SettleMint" on X/LinkedIn | Founder |

**Week 3–4: Community Seeding**

| Channel | Content |
|---------|---------|
| r/solotravel | "I built the expense app I always wanted for group trips" |
| r/personalfinance | "Why we settled the wrong way for years" |
| r/digitalnomad | Multi-currency expense flow walkthrough |
| Twitter/X | Side-by-side: SettleMint vs Splitwise — same expense, fewer taps |
| LinkedIn Pakistan | Founder story + product journey |
| Local tech Slack/Discord | Share, ask for feedback, thank early adopters |

**Month 6 / Launch Targets:**
- 1,000 registered users
- 500 groups created
- 100 users with recurring expenses set up (retention signal)
- App Store rating ≥ 4.5

---

## 6. Phase 3: Growth (Month 7–10)

**Goal:** 10,000 users, Pro tier live, 30% 30-day retention.

### Month 7: Pro Tier Launch

**Features required for Pro launch:**
- [ ] Unlimited receipt scanning (enforce 10/month limit on free)
- [ ] Advanced charts: category trends, monthly spending, per-person view
- [ ] Trip Timeline view (date-ordered, location-tagged, exportable PNG)
- [ ] Default split templates per group
- [ ] Payment request links + QR code generator
- [ ] Cross-group balance overview
- [ ] 14-day free trial on sign-up (no card required)

**Stripe integration:**
- [ ] Stripe Billing: monthly + annual plans
- [ ] Upgrade flow in-app (frictionless, 2 taps to upgrade)
- [ ] Proration handled correctly for mid-cycle upgrades
- [ ] Receipt/invoice emailed on charge
- [ ] Churn-prevention: "pause subscription" option

**Month 7 Targets:**
- 2,500 users
- 50 paying Pro subscribers
- Pro trial-to-paid conversion: >30%

---

### Month 8: Retention Features

**Feature set:**
- [ ] Natural language expense entry ("Dinner 4500 split 5 ways I paid")
- [ ] Email receipt forwarding (expenses@settlemint.app → auto-attach to group)
- [ ] Monthly Mint Report: shareable card with month's narrative summary
- [ ] Expense comments + emoji reactions
- [ ] Partial settlement tracking (full chain visualization)
- [ ] Activity feed improvements: diff view on edits

**Growth levers:**
- Referral program: "Invite 3 friends → 1 month Pro free" (tracked via branch.io)
- SEO blog content: 10 articles targeting "split travel expenses", "roommate expense tracker", etc.
- 5 travel/lifestyle influencer partnerships (PKR-denominated deals; affiliate links)

**Month 8 Targets:**
- 5,000 users
- 150 Pro subscribers
- $750 MRR
- 7-day retention: >40%

---

### Month 9–10: Relationship Modes

These modes are the features that make SettleMint feel designed for your life, not just your math.

**Couple Mode:**
- [ ] Custom ratio splits (e.g., 60/40) stored and auto-applied
- [ ] Private expenses visible only to the person who added them
- [ ] Shared budget view with combined category breakdown
- [ ] "This month we spent X together" summary card

**Trip Mode:**
- [ ] Day-by-day timeline with date headers
- [ ] Location auto-grouping by city/venue
- [ ] Trip summary card: shareable PNG with total, per-person, days, highlights
- [ ] "Best trip highlight" (highest expense category, most active day)
- [ ] Pre-trip budget planner

**Roommate Mode:**
- [ ] Monthly bill management dashboard
- [ ] Utility split tracker (electricity, water, gas, internet)
- [ ] "Month at a glance" summary with pending vs settled
- [ ] Rent payment tracking with history

**Event Mode:**
- [ ] Tiered cost groups (VIP / Standard / Budget)
- [ ] RSVP tracker (who's in / who's out)
- [ ] Budget planner vs actual tracker
- [ ] Payment collection status (paid / pending / overdue)

**Month 10 Targets:**
- 10,000 users
- 500 Pro subscribers
- $2,500 MRR
- 30-day retention: ≥ 30%
- 30% of active groups using a named mode (Trip/Couple/Roommate)

---

## 7. Phase 4: Scale (Month 11–18)

**Goal:** Category leadership. $40K MRR. 100K users.

### Month 11–12: Payment Rails (Pakistan First)

Pakistan is the home market and a meaningful early adopter base. Ship local payment rails before global.

**Pakistan (Month 11):**
- [ ] JazzCash: API integration for payment request generation + status tracking
- [ ] EasyPaisa: same pattern
- [ ] HBL/Bank transfer: structured reference number tracker
- [ ] IBFT proof upload: bank transfer screenshot verification
- [ ] Compliance review: consult local fintech legal counsel before live money movement

**Global (Month 12):**
- [ ] Stripe payment links embedded in settlement requests
- [ ] PayPal.me link generation
- [ ] Wise integration for cross-currency settlement suggestion
- [ ] "Pay via bank" structured flow for manual transfers with tracking

**Month 12 Targets:**
- 25,000 users
- First 10 in-app settlements completed
- 1,000 Pro subscribers
- $5,000 MRR

---

### Month 13–14: MintBot (AI Assistant)

**MintBot capabilities:**
- Chat inside any group: ask questions, get answers
- Create expense drafts via chat ("Lunch 2400 split equally among me, Hamza, Sara")
- Settlement advice: "Best way to settle this group is 3 transfers — want me to send requests?"
- Spending pattern recognition: "You've spent on food 4 times this week"
- Voice expense entry (on-device STT → NLP → expense draft)

**Technical:**
- [ ] Claude claude-sonnet-4-6 API integration with group context injection
- [ ] Conversation history maintained per user per group (last 20 turns)
- [ ] Structured output: expense drafts returned as JSON in `<expense>` tags, parsed by client
- [ ] Voice: Expo Speech + Whisper transcription fallback

**Month 14 Targets:**
- 40,000 users
- MintBot used by 20%+ of Pro users weekly
- 1,500 Pro subscribers
- $7,500 MRR

---

### Month 15–16: Teams Tier

**Feature set:**
- [ ] Expense approval workflow: submit → manager review → approve/reject → logged
- [ ] Category budget policies: flag or block expenses over limit
- [ ] Admin dashboard: all expenses by member, category, date with filters
- [ ] Audit trail export: tamper-evident CSV with event hashes
- [ ] Accounting export: Xero CSV format, QuickBooks IIF format
- [ ] SSO: Google Workspace SAML integration
- [ ] Dedicated onboarding call for accounts > 10 members

**Sales motion:**
- Target: small tech companies, agencies, design studios, startup teams (10–50 people)
- Outreach: LinkedIn + founder's direct network + Pakistani startup ecosystem
- Pricing: $9.99/member/month, minimum 3 members = $29.97/month floor

**Month 16 Targets:**
- 60,000 users
- 50 Teams accounts (avg. 8 members = 400 seats)
- $4,000 MRR from Teams alone
- 2,000 Pro subscribers
- Total MRR: $14,000

---

### Month 17–18: Bank SMS & WhatsApp Bot

**Bank SMS Parsing (Pakistan):**
- [ ] Parse JazzCash / EasyPaisa / bank debit SMS messages
- [ ] Detect amount, merchant, date from SMS text
- [ ] Surface as expense draft in SettleMint: "Saw a PKR 4,500 debit from Carrefour — add to a group?"
- [ ] User confirms → expense created
- [ ] Permission model: explicit opt-in, local parsing only (SMS text never sent to server)

**WhatsApp Bot:**
- [ ] WhatsApp Business API integration
- [ ] Add bot to a WhatsApp group → `@settlemint dinner 4500 split 5 ways`
- [ ] Or: forward a receipt photo → expense auto-created in linked SettleMint group
- [ ] Monthly summary: bot posts monthly group summary to WhatsApp group
- [ ] High-value for Pakistan market where WhatsApp is the primary communication layer

**Month 18 Final State:**

| Metric | Target |
|--------|--------|
| Registered users | 100,000 |
| Monthly active users | 40,000 |
| Pro subscribers | 2,000 × $4.99 = $9,980 MRR |
| Annual Pro subscribers | 500 × $3.33/mo = $1,665 MRR |
| Teams seats | 1,000 × $9.99 = $9,990 MRR |
| Teams annual | 300 × $8.33/mo = $2,499 MRR |
| **Total MRR** | **~$40,000** |
| App Store rating | 4.7+ |
| Play Store rating | 4.6+ |

---

## 8. Key Technical Milestones

| Milestone | Month | What it Unlocks |
|-----------|:-----:|----------------|
| Auth + Groups API stable | 1 | Start building expense service |
| MVP feature-complete | 4 | Beta testing begins |
| App Store approved | 5 | Prepare launch assets |
| Public launch | 6 | Growth begins |
| Pro tier live | 7 | First revenue |
| CRDT offline stable | 7 | Key Pro differentiator |
| Typesense search live | 4 | Engagement + retention |
| Payment rails (PKR) | 11 | Settlement completion rates jump |
| MintBot in production | 13 | AI moat established |
| Teams tier GA | 15 | B2B revenue stream opens |
| WhatsApp bot | 17 | Pakistan DAU spike |

---

## 9. Risk Register

| Risk | Prob | Impact | Mitigation |
|------|:----:|:------:|-----------|
| OCR errors destroy early trust | High | High | Never auto-save — always require user confirmation. Manual correction is always available. Tune prompts weekly in first month. |
| Balance calculation bugs | Med | Critical | 95%+ unit test coverage on split math. Cross-verify with a second implementation. Public bug bounty from launch. |
| Privacy/security breach | Low | Critical | Security audit before launch. Bug bounty. Encryption at rest. No financial data in logs. |
| Low Pro conversion | Med | Med | 14-day trial, no card required. Redesign paywall if conversion <3% after 60 days. Consider lower entry price ($2.99). |
| Splitwise copies key features | Med | Med | Speed advantage. Community and data moat takes 2+ years to copy. Design quality is ours alone. |
| Payment rail compliance (Pakistan) | High | High | Start with "record only" settlement. No live money movement until legal review complete. Consult fintech lawyer Month 10. |
| Multi-currency edge cases | Med | High | Frozen FX rate at expense time. Comprehensive unit tests for conversion. Never retroactively recompute. |
| App Store rejection | Low | Med | Review guidelines before submission. Web app is always the fallback — no single point of distribution failure. |
| Key engineer departure | Med | High | Document everything. No person owns a whole service alone. Knowledge transfer sessions monthly. |
| OCR API cost overrun | Med | Med | Per-user limit on free tier. Cache results. Monitor spend weekly. Set hard budget alerts. |

---

## 10. Go-to-Market Playbook

### Beachhead: Group Travelers (Pakistan + Global)

**Why start with travelers:**

- Willingness to pay is highest (trip expenses are high-stakes)
- Virality is inherent: one user recruits 5–10 friends per trip
- Pain is clearest and sharpest: multi-currency, time pressure, messy receipts
- Short intense usage cycle makes PMF signals fast to read

### Distribution Channels

| Priority | Channel | Monthly Effort | Expected Impact |
|:--------:|---------|:--------------:|:--------------:|
| 1 | App Store / Play Store (ASO) | Ongoing | Compound |
| 2 | ProductHunt Launch | Week 2, Month 6 | 500–2,000 signups |
| 3 | Reddit organic | 4 hrs/week | 100–500/month |
| 4 | Twitter/X founder content | 5 hrs/week | 50–200/month |
| 5 | Pakistan LinkedIn + events | 3 hrs/week | 100–300/month |
| 6 | Travel influencers (5–10 micro) | Month 8+ | 200–1,000/month |
| 7 | SEO blog content | 8 hrs/week | 500–5,000/month by Month 12 |
| 8 | Referral program | Engineering 1 week | 30–50% of growth |

### Referral Program Design

```
Mechanic:
  Invite 3 friends who create groups → 1 month Pro free (for inviter)
  Invitee gets 14-day trial instead of 7-day

Tracking:
  Unique referral link per user
  Dashboard shows: invited / joined / converted

Payouts:
  Credits applied automatically — no manual redemption
  Cap: maximum 6 free months per user via referrals (then cash discounts)
```

### ASO Strategy (App Store Optimization)

**Primary keywords to target:**

```
Category: Finance
Keywords: split bills, group expenses, settle up, shared expenses,
          expense tracker, splitwise alternative, bill splitter,
          travel expenses, roommate expenses, shared costs
```

**Screenshot strategy:**
- Screenshot 1: Balance overview — "Know exactly what you owe"
- Screenshot 2: Expense creation — "Log in 10 seconds"
- Screenshot 3: Receipt scan — "Snap. Extract. Done."
- Screenshot 4: Settlement — "Settle up. No awkwardness."
- Screenshot 5: Trip timeline — "Your trip, beautifully organized"

All screenshots: light + dark variants. Pakistani rupee amounts shown alongside USD.

---

## 11. Messaging Framework

### Core Positioning

**For someone leaving Splitwise:**
> "SettleMint is everything Splitwise should have built by now. Faster, smarter, and actually beautiful."

**For someone new to group expense apps:**
> "The easiest way to track and settle shared expenses with anyone — friends, roommates, or your trip group."

**For couples/families:**
> "Stop doing money math in your head. SettleMint handles splits, settlements, and summaries — automatically."

### Pricing Anchors

| Frame | Line |
|-------|------|
| Annual cost | "Less than one cup of coffee — for the whole year" |
| Monthly cost | "PKR 1,400/month — the cost of forgetting who paid for what" |
| Value | "Stop losing track of money with friends. It costs you more than Pro does." |

---

## 12. Monthly Milestone Summary

| Month | Key Milestone | Users | MRR |
|:-----:|---------------|:-----:|:---:|
| 1 | Foundation: auth, infra, design system | — | — |
| 2 | Core ledger: expenses, splits, balances | Beta (10) | — |
| 3 | OCR pipeline + notifications live | Beta (10) | — |
| 4 | Web app + invite flow + search | Beta (50) | — |
| 5 | App Store submitted, beta hardened | Beta (100) | — |
| 6 | 🚀 Public launch | 1,000 | — |
| 7 | Pro tier live | 2,500 | $250 |
| 8 | Referral program + retention features | 5,000 | $750 |
| 9 | Couple + Roommate modes | 7,000 | $1,500 |
| 10 | Trip + Event modes | 10,000 | $2,500 |
| 11 | 🇵🇰 JazzCash + EasyPaisa live | 15,000 | $4,000 |
| 12 | Stripe payment links global | 25,000 | $7,000 |
| 13 | MintBot (AI assistant) launch | 35,000 | $10,000 |
| 14 | Voice expense entry | 45,000 | $14,000 |
| 15 | Teams tier beta | 55,000 | $18,000 |
| 16 | Teams tier GA | 65,000 | $24,000 |
| 17 | WhatsApp bot + bank SMS | 80,000 | $32,000 |
| 18 | 🏆 $40K MRR milestone | 100,000 | $40,000 |

---

## 13. Budget Estimates

### Year 1 Operating Costs (Month 1–12)

| Category | Monthly (avg) | Annual |
|----------|:-------------:|:------:|
| Team (4 people, market rate) | $15,000 | $180,000 |
| Infrastructure (Railway → AWS) | $300 → $2,000 | $12,000 |
| Claude API (OCR + NLP) | $200 → $3,000 | $18,000 |
| Tools (Sentry, Posthog, Resend, etc.) | $300 | $3,600 |
| Marketing (influencers, content) | $500 → $2,000 | $15,000 |
| Legal (privacy, fintech, app store) | $500 | $6,000 |
| Design assets + brand | $2,000 (one-time) | $2,000 |
| **Total Year 1** | | **~$237,000** |

### AI Cost Management

| Volume | Estimated Claude API cost |
|--------|--------------------------|
| 1,000 OCR scans/month | ~$30 |
| 10,000 OCR scans/month | ~$300 |
| 100,000 OCR scans/month | ~$3,000 |

**Cost mitigation:**
- Free tier limited to 10 scans/month → AI cost is a Pro feature cost, covered by revenue
- Cache OCR results — never re-process the same receipt
- Tesseract fallback for simple text-only receipts (zero AI cost)
- Set hard budget alerts on Anthropic dashboard: alert at 80% of monthly cap

---

## 14. Definition of Done — Per Phase

### Phase 1 (MVP) is Done When:
- [ ] 10 beta users have active groups with 5+ real expenses each
- [ ] NPS ≥ 50 from beta cohort
- [ ] Zero open balance calculation bugs
- [ ] App Store approved, Play Store approved
- [ ] All API endpoints within performance budget (p95 < 300ms)
- [ ] OCR success rate ≥ 85% on test set

### Launch (Month 6) is Done When:
- [ ] 1,000 registered users
- [ ] 500 groups with at least 1 expense
- [ ] App Store rating ≥ 4.5 from 20+ reviews
- [ ] 0 data loss incidents

### Growth (Month 10) is Done When:
- [ ] 10,000 registered users
- [ ] 30-day retention ≥ 30%
- [ ] $2,500 MRR
- [ ] 500 paying Pro subscribers
- [ ] Pro trial-to-paid conversion ≥ 25%
- [ ] 30% of active groups using a named mode

### Scale (Month 18) is Done When:
- [ ] 100,000 registered users
- [ ] $40,000 MRR
- [ ] Teams tier at 100+ accounts
- [ ] App Store 4.7+
- [ ] Payment rails live in Pakistan
- [ ] MintBot in production for all Pro users
