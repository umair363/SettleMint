# SettleMint — Technical Requirements Document
> **Version 1.0 | June 2026**
> Architecture, data models, algorithms, APIs, security, and infrastructure.

---

## 0. Architecture Philosophy

Five non-negotiable decisions made before a single line of code is written:

| Decision | Rationale |
|----------|-----------|
| **Local-First** | The app must work fully offline. Sync is a feature, not a requirement for core operation. |
| **Event-Sourced Ledger** | Financial data is append-only. Every change is an immutable event. Balances are computed projections. |
| **AI at the Core** | OCR, NLP, categorization, and analytics are woven into the core data flow — not bolt-ons. |
| **API-First, Client-Agnostic** | Every feature is a clean API. iOS, Android, and Web are equally first-class. |
| **Security as a Constraint** | Auth, encryption, and audit logging are requirements in every service — not optional extras. |

---

## 1. System Architecture

### 1.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│   iOS (React Native)  │  Android (RN)  │  Web (Next.js)         │
│         └──────────────────┴───────────────┘                    │
│                   REST API + WebSocket                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                       API GATEWAY                                │
│       Auth Middleware · Rate Limiting · Routing · Observability  │
└──┬────────┬────────┬──────────┬──────────┬──────────────────────┘
   │        │        │          │          │
┌──▼──┐ ┌──▼──┐ ┌───▼──┐ ┌───▼────┐ ┌───▼──────┐ ┌───────────┐
│Auth │ │User │ │Group │ │Expense │ │Settlement│ │AI Worker  │
│Svc  │ │Svc  │ │Svc   │ │Svc     │ │Svc       │ │(Async)    │
└──┬──┘ └──┬──┘ └───┬──┘ └───┬────┘ └───┬──────┘ └───┬───────┘
   │        │        │          │          │            │
┌──▼────────▼────────▼──────────▼──────────▼────────────▼────────┐
│          PostgreSQL 16 (Primary)  +  Redis 7 (Cache/Queue)      │
│          S3/R2 (Files)  +  Typesense (Search)                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Responsibility Matrix

| Service | Core Responsibility | Key Data |
|---------|--------------------|---------:|
| **Auth** | Login, sessions, MFA, device management | users, sessions, refresh_tokens |
| **User** | Profile, preferences, contacts | users, user_preferences |
| **Group** | Groups, members, invites, roles | groups, group_members, invites |
| **Expense** | CRUD, split logic, categories, recurring | expenses, expense_splits, recurrence_rules |
| **Settlement** | Balance calc, netting, payment requests, history | settlements, balances_cache |
| **Receipt** | Upload, OCR queue, extraction, corrections | receipts, ocr_jobs |
| **Notification** | Push, email, in-app, digest, reminders | notification_jobs, preferences |
| **Analytics** | Aggregations, trends, insights, export | (read-only views over expense data) |
| **Search** | Full-text, filters, saved queries | Typesense index |
| **AI Worker** | OCR extraction, NLP parsing, categorization | Async via BullMQ |
| **File** | Signed upload URLs, CDN, lifecycle | S3/R2 buckets |
| **Sync** | CRDT merge, conflict resolution, offline queue | Yjs documents per group |

---

## 2. Technology Stack

### 2.1 Frontend

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Mobile | **React Native (Expo SDK 52)** | Single codebase iOS + Android; Expo handles native modules cleanly |
| Web | **Next.js 14 (App Router)** | SSR/SSG for landing pages; RSC for dashboard views |
| Cross-platform UI | **Tamagui** | Shared design tokens across RN + web; near-native perf |
| State (server) | **TanStack Query v5** | Server state first; cache invalidation on WebSocket events |
| State (client) | **Zustand** | Minimal, atomic, no boilerplate |
| Offline sync | **Yjs + y-websocket** | Industry-proven CRDT; powers Notion, Linear offline |
| Animation | **Reanimated 3** (mobile) · **Framer Motion** (web) | 60fps, UI thread isolated on mobile |
| Charts | **Victory Native XL** (mobile) · **Recharts** (web) | Accessible, animated, consistent |
| Camera/OCR | **Expo Camera** (capture) + server-side AI | Client captures; server processes — keeps bundle lean |

### 2.2 Backend

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | **Node.js 22 / TypeScript 5** | Async-first, strong typing, rich ecosystem |
| Framework | **Fastify** | 2× faster than Express; schema-first; plugin architecture |
| ORM | **Drizzle ORM** | Type-safe SQL, zero magic, excellent migrations |
| Database | **PostgreSQL 16** | ACID, JSONB, row-level security, excellent JSON operators |
| Cache | **Redis 7** | Sessions, rate limits, computed balance cache, queues |
| Job Queue | **BullMQ** | Redis-backed; priorities, retries, delays, concurrency limits |
| Search | **Typesense** | Fast, typo-tolerant, self-hostable, no licensing fees |
| File Storage | **Cloudflare R2** (primary) · **S3** (fallback) | R2 = zero egress fees; S3 as fallback if needed |
| Real-time | **Socket.io** | WebSocket + SSE fallback; rooms per group |
| Email | **Resend** | Developer-first, React Email templates, reliable |
| FX rates | **Open Exchange Rates API** | Accurate, historical rates available, affordable |

### 2.3 AI / ML Layer

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Receipt OCR | **Claude claude-sonnet-4-6 (Vision)** | Best multimodal parsing; structured JSON output |
| NLP expense entry | **Claude claude-sonnet-4-6 API** | "Dinner 4500 split 5 ways" → structured expense object |
| Categorization | **Embeddings classifier** (fine-tuned) | Lightweight; runs fast; learns from corrections |
| Insight generation | **Claude claude-sonnet-4-6** | Narrative analytics; plain language summaries |
| OCR fallback | **Tesseract.js (self-hosted)** | Free, always-on baseline if AI API is unavailable |
| Anomaly detection | **Z-score statistical model** | Simple, fast, explainable — no ML overhead |

### 2.4 Infrastructure

| Component | MVP (Month 0–6) | Scale (Month 7+) |
|-----------|-----------------|-----------------|
| Compute | **Railway** | **AWS ECS (Fargate)** |
| CDN | **Cloudflare** | **Cloudflare** (unchanged) |
| CI/CD | **GitHub Actions** | **GitHub Actions** (unchanged) |
| IaC | **docker-compose** (local) | **Terraform** |
| Monitoring | **Grafana Cloud (free)** | **Grafana + Prometheus (self-hosted)** |
| Logging | **Axiom** | **Axiom** |
| Error tracking | **Sentry** | **Sentry** |
| Feature flags | **Posthog** | **Posthog** |
| Product analytics | **Posthog** | **Posthog** |

---

## 3. Database Design

### 3.1 Schema Principles

- **UUIDs** for all primary keys (`gen_random_uuid()`) — no sequential integer IDs
- **`created_at` / `updated_at`** timestamps on every table
- **Soft deletes** via `deleted_at` — financial data is never hard-deleted
- **JSONB `metadata`** on mutable entities for flexible future fields without migrations
- **Row-Level Security (RLS)** on group data for multi-tenant isolation as defense-in-depth
- **Indexes** on all foreign keys and common filter columns

### 3.2 Core Schema

```sql
-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  locale        TEXT DEFAULT 'en',
  timezone      TEXT DEFAULT 'Asia/Karachi',
  currency_pref TEXT DEFAULT 'PKR',
  mint_score    NUMERIC(3,1),          -- Settlement reliability score
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────────
CREATE TABLE groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  owner_id        UUID REFERENCES users(id) NOT NULL,
  mode            TEXT CHECK (mode IN ('trip','roommates','couple','family','event','team')),
  currency        TEXT NOT NULL DEFAULT 'PKR',
  timezone        TEXT NOT NULL DEFAULT 'Asia/Karachi',
  cover_image_url TEXT,
  emoji           TEXT,
  default_split   TEXT DEFAULT 'equal',
  visibility      TEXT DEFAULT 'private' CHECK (visibility IN ('private','invite_only','public')),
  archived_at     TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_groups_owner ON groups(owner_id);

-- ─────────────────────────────────────────────
-- GROUP MEMBERS
-- ─────────────────────────────────────────────
CREATE TABLE group_members (
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  role        TEXT CHECK (role IN ('owner','admin','member','viewer')) DEFAULT 'member',
  status      TEXT CHECK (status IN ('active','invited','removed')) DEFAULT 'invited',
  invited_by  UUID REFERENCES users(id),
  joined_at   TIMESTAMPTZ,
  removed_at  TIMESTAMPTZ,
  PRIMARY KEY (group_id, user_id)
);

-- ─────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id) NOT NULL,
  payer_id        UUID REFERENCES users(id) NOT NULL,
  total_amount    NUMERIC(14, 4) NOT NULL,
  currency        TEXT NOT NULL,
  base_amount     NUMERIC(14, 4),        -- Converted to group currency at capture time
  base_currency   TEXT,
  fx_rate         NUMERIC(14, 6),        -- FX rate captured and frozen at expense time
  fx_rate_at      TIMESTAMPTZ,
  category        TEXT,
  category_icon   TEXT,
  note            TEXT,
  expense_type    TEXT DEFAULT 'standard',
  split_type      TEXT NOT NULL CHECK (split_type IN ('equal','unequal','percentage','shares','fixed','items')),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','deleted','disputed')),
  visibility      TEXT DEFAULT 'all',
  location_name   TEXT,
  location_lat    NUMERIC(10, 7),
  location_lng    NUMERIC(10, 7),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_expenses_group ON expenses(group_id, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_payer ON expenses(payer_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- EXPENSE SPLITS
-- ─────────────────────────────────────────────
CREATE TABLE expense_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES users(id) NOT NULL,
  amount      NUMERIC(14, 4) NOT NULL,    -- Absolute amount this person owes/paid
  percentage  NUMERIC(5, 2),
  shares      INTEGER,
  is_payer    BOOLEAN DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}'
);

CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_splits_user ON expense_splits(user_id);

-- ─────────────────────────────────────────────
-- SETTLEMENTS
-- ─────────────────────────────────────────────
CREATE TABLE settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id) NOT NULL,
  from_user_id    UUID REFERENCES users(id) NOT NULL,
  to_user_id      UUID REFERENCES users(id) NOT NULL,
  amount          NUMERIC(14, 4) NOT NULL,
  currency        TEXT NOT NULL,
  method          TEXT CHECK (method IN ('cash','bank_transfer','app','other')),
  reference       TEXT,
  proof_url       TEXT,
  note            TEXT,
  status          TEXT CHECK (status IN ('pending','completed','disputed')) DEFAULT 'pending',
  is_partial      BOOLEAN DEFAULT FALSE,
  original_settlement_id UUID REFERENCES settlements(id),  -- for partial settlement chains
  requested_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settlements_group ON settlements(group_id, status);
CREATE INDEX idx_settlements_from ON settlements(from_user_id, status);

-- ─────────────────────────────────────────────
-- RECEIPTS
-- ─────────────────────────────────────────────
CREATE TABLE receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id      UUID REFERENCES expenses(id),
  group_id        UUID REFERENCES groups(id),   -- null until linked to expense
  user_id         UUID REFERENCES users(id),    -- uploader
  file_url        TEXT NOT NULL,
  file_type       TEXT,                          -- 'image/jpeg', 'application/pdf', etc.
  file_size       INTEGER,
  ocr_text        TEXT,                          -- raw extracted text
  extracted       JSONB,                         -- structured extraction result
  confidence      JSONB,                         -- per-field confidence scores
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  processed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,                   -- 30 days (free) or null (pro)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- RECURRENCE RULES
-- ─────────────────────────────────────────────
CREATE TABLE recurrence_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID REFERENCES groups(id) NOT NULL,
  template_expense_id   UUID REFERENCES expenses(id) NOT NULL,
  frequency             TEXT CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','yearly')),
  interval_value        INTEGER DEFAULT 1,
  day_of_month          INTEGER,
  day_of_week           INTEGER,
  next_run_at           TIMESTAMPTZ NOT NULL,
  end_date              DATE,
  run_count             INTEGER DEFAULT 0,
  max_runs              INTEGER,
  active                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- FX RATES (Historical — immutable)
-- ─────────────────────────────────────────────
CREATE TABLE fx_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  rate          NUMERIC(14, 6) NOT NULL,
  source        TEXT DEFAULT 'openexchangerates',
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fx_rates_pair_time ON fx_rates(from_currency, to_currency, captured_at DESC);

-- ─────────────────────────────────────────────
-- AUDIT EVENTS (Append-only. Never updated.)
-- ─────────────────────────────────────────────
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES users(id),
  entity_type   TEXT NOT NULL,   -- 'expense', 'settlement', 'group', etc.
  entity_id     UUID NOT NULL,
  action        TEXT NOT NULL,   -- 'created', 'updated', 'deleted', 'settled', etc.
  before_json   JSONB,
  after_json    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()   -- Never has updated_at — it's immutable
);

CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_events(actor_id, created_at DESC);
```

---

## 4. Settlement Algorithm

### 4.1 Balance Calculation

```
For each group:

Step 1: Compute net position per member
  - For each expense:
    - payer's net += expense.total_amount         (they are owed)
    - each splittee's net -= expense_split.amount (they owe)

Step 2: Convert to base currency
  - Use stored fx_rate at expense time
  - Never recompute with current rates

Step 3: net_balance[user_id] = sum of all net impacts
  - Positive = user is owed money
  - Negative = user owes money
  - Zero = user is settled up

Caching: Store computed balance in Redis with key "group:{id}:balances"
Invalidation: On every write to expenses, expense_splits, or settlements in that group
TTL: 24 hours (fallback), always invalidate on mutation
```

### 4.2 Minimum Transfer (Debt Simplification)

Reduces N-member group to maximum N-1 transfers. Uses greedy creditor-debtor matching:

```
Input:  net_balance[] map of user_id → signed net amount
Output: settlements[] list of { from, to, amount }

Algorithm:
1. Split into creditors[] (positive) and debtors[] (negative)
2. Sort both descending by absolute value
3. While creditors and debtors are not empty:
   a. Take largest creditor C and largest debtor D
   b. transfer_amount = min(C.balance, abs(D.balance))
   c. Record: { from: D.user_id, to: C.user_id, amount: transfer_amount }
   d. C.balance -= transfer_amount
   e. D.balance += transfer_amount
   f. Remove C or D if balance reaches 0
4. Return settlements[]

Result: Always ≤ N-1 transfers (provably optimal for this class)
```

### 4.3 Cross-Group Netting (Pro Feature)

```
1. Collect net_balance across all groups for user U
2. Group by counterparty P:
   - Sum all group_X: U owes P → total U owes P
   - Sum all group_Y: P owes U → total P owes U
3. Net: final_balance = total_owed_to_U - total_owed_by_U
4. Single settlement suggestion per counterparty pair
```

### 4.4 Multi-Currency Handling Rules

| Rule | Detail |
|------|--------|
| FX rate stored at expense creation | Immutable — never recalculated retroactively |
| Balance computation | Uses stored base_amount (already converted) |
| Settlement suggestion | Shown in group base currency |
| User settlement choice | Can settle in any currency; app shows live rate |
| Historical accuracy | Because rates are frozen, past balances never "drift" |

---

## 5. Event Sourcing — Ledger Integrity

SettleMint uses append-only event sourcing for the financial ledger:

```
Event Types:
  ExpenseCreated    { expense_id, group_id, payer_id, amount, splits[] }
  ExpenseUpdated    { expense_id, before, after, diff }
  ExpenseDeleted    { expense_id, reason }
  SplitAdjusted     { expense_id, user_id, old_amount, new_amount }
  SettlementCreated { settlement_id, from, to, amount }
  SettlementReverted{ settlement_id, reason, reverted_by }
  MemberJoined      { group_id, user_id, role }
  MemberRemoved     { group_id, user_id, removed_by }

Rules:
  - Every mutation produces exactly one audit event
  - audit_events is insert-only — no updates, no deletes
  - Balance is a computed projection over the event stream
  - Disputes: "go back to the events" to resolve any ambiguity
```

---

## 6. AI / OCR Pipeline

### 6.1 Receipt Processing Flow

```
1. Client: User takes photo or uploads receipt
2. Client → API: GET /receipts/upload-url  (returns signed S3 PUT URL)
3. Client → S3: Direct upload to signed URL (no server in the middle)
4. Client → API: POST /receipts { file_url, expense_id?, group_id }
5. API: Create receipt row (status: 'pending'), return receipt_id
6. API → BullMQ: Enqueue job { receipt_id, priority: 'normal' }
7. Worker picks job:
   a. Fetch image from S3
   b. Send to Claude Vision with extraction prompt
   c. Parse JSON response
   d. Run confidence scorer (field-by-field)
   e. Update receipt: { extracted, confidence, status: 'completed' }
   f. Emit WebSocket: receipt.processed { receipt_id, extracted, confidence }
8. Client receives WebSocket event
9. Animated receipt card appears with highlighted fields
10. User reviews, corrects if needed, confirms
11. POST /expenses { ...expense_data, receipt_id }
```

### 6.2 Claude Vision Extraction Prompt

```
You are a receipt data extractor. Extract structured information from this receipt image.

Return ONLY valid JSON with exactly this schema. Use null for any field not found.
Do NOT guess or hallucinate values. If unsure, return null.

{
  "merchant_name": string | null,
  "merchant_address": string | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "total": number | null,
  "subtotal": number | null,
  "tax": number | null,
  "tip": number | null,
  "currency": "ISO 4217 code" | null,
  "payment_method": string | null,
  "line_items": [
    {
      "name": string,
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ] | null,
  "confidence": {
    "merchant_name": 0.0-1.0,
    "date": 0.0-1.0,
    "total": 0.0-1.0,
    "line_items": 0.0-1.0
  }
}
```

### 6.3 NLP Expense Entry

```
User input: "Dinner 4500 split 5 ways I paid"

Prompt template:
  "Parse this expense description and return a JSON object:
   Input: '{user_input}'
   Context: group currency is {currency}, current members: {member_list}
   
   Return:
   {
     description: string,
     amount: number | null,
     currency: string | null,
     paid_by: 'me' | 'someone_else' | null,
     split_type: 'equal' | 'percentage' | 'shares' | null,
     split_count: number | null,
     split_members: string[] | null,
     date: 'today' | 'yesterday' | 'YYYY-MM-DD' | null
   }"

Result pre-fills expense form → user sees preview → confirms or edits → saves
Never auto-saves without user confirmation
```

### 6.4 AI Expense Assistant (MintBot) — V2

```
System prompt (injected per group):
  "You are MintBot, the SettleMint expense assistant for group '{group_name}'.
   Group members: {member_list}
   Base currency: {currency}
   Current balances: {balances}
   Recent expenses: {last_10_expenses}
   
   You can:
   - Answer questions about balances and expenses
   - Create expense drafts (return structured JSON in <expense> tags)
   - Suggest optimal settlements
   - Summarize spending patterns
   
   Always be brief. Always be accurate. Never make up numbers."
```

---

## 7. Offline-First Architecture

### 7.1 CRDT Sync Strategy

```
Technology: Yjs documents per group
Storage: IndexedDB (web) / MMKV (React Native)
Server: y-websocket server bridging all group members

Flow:
1. App loads → connect to WebSocket for group
2. Server sends full Yjs document state
3. User makes changes → applied locally first (optimistic)
4. Change synced to server via Yjs protocol
5. Server broadcasts to all connected clients
6. On reconnect after offline: Yjs merges divergent states (CRDT guarantee)

Conflict types:
  - Auto-resolved: edits to different expenses, different fields
  - Requires UI: Both users mark same expense as settled differently
    → Shows "Conflict card" with both versions, user picks one
```

### 7.2 Offline Queue (Non-CRDT Actions)

```
Actions that must queue when offline:
  - Expense creation
  - Settlement recording
  - Receipt upload trigger

Queue implementation:
  - Web: IndexedDB queue
  - Mobile: MMKV + AsyncStorage fallback
  - On reconnect: process queue in order, with idempotency keys
  - Failed items: surface to user as "Sync failed — tap to retry"
```

---

## 8. API Design

### 8.1 Response Envelope

All API responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO8601",
    "pagination": {
      "next_cursor": "...",
      "has_more": true
    }
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "EXPENSE_SPLIT_INVALID",
    "message": "Split amounts must total the expense amount",
    "details": { "expected": 4500, "got": 4200 }
  }
}
```

### 8.2 REST Endpoints

```
# Authentication
POST   /v1/auth/signup                  Create account
POST   /v1/auth/login                   Login (email/social)
POST   /v1/auth/refresh                 Refresh access token
POST   /v1/auth/logout                  Invalidate session
POST   /v1/auth/mfa/setup               Enable TOTP MFA
DELETE /v1/auth/account                 Request account deletion

# Users
GET    /v1/users/me                     Own profile
PATCH  /v1/users/me                     Update profile/preferences
GET    /v1/users/:id                    Public profile (name, avatar, mint_score)

# Groups
POST   /v1/groups                       Create group
GET    /v1/groups                       List user's groups
GET    /v1/groups/:id                   Get group detail
PATCH  /v1/groups/:id                   Update group settings
DELETE /v1/groups/:id                   Archive group
POST   /v1/groups/:id/invite            Create invite link / send invite
POST   /v1/groups/:id/join              Join via invite code
PATCH  /v1/groups/:id/members/:userId   Update member role
DELETE /v1/groups/:id/members/:userId   Remove member
GET    /v1/groups/:id/balances          Current balances (cached)
GET    /v1/groups/:id/settlement-plan   Optimized settlement suggestion

# Expenses
POST   /v1/groups/:id/expenses          Create expense
GET    /v1/groups/:id/expenses          List expenses (paginated)
GET    /v1/expenses/:id                 Get expense detail
PATCH  /v1/expenses/:id                 Update expense (creates audit event)
DELETE /v1/expenses/:id                 Soft-delete expense

# Settlements
POST   /v1/groups/:id/settlements       Record settlement
GET    /v1/groups/:id/settlements       List settlement history
PATCH  /v1/settlements/:id             Update status (complete/dispute)
GET    /v1/settlements/:id/request-link Generate payment request link

# Receipts
GET    /v1/receipts/upload-url          Get signed S3 upload URL
POST   /v1/receipts                     Create receipt record + trigger OCR
GET    /v1/receipts/:id                 Get receipt with extraction result
PATCH  /v1/receipts/:id                 Update extracted fields (user correction)
POST   /v1/receipts/:id/link/:expenseId Link receipt to expense

# Search
GET    /v1/search?q=&group_id=&filters= Full-text expense search

# Reports
GET    /v1/groups/:id/reports/summary   Summary (free)
GET    /v1/groups/:id/reports/monthly   Monthly breakdown (Pro)
GET    /v1/groups/:id/reports/trip      Trip summary card (Pro)
GET    /v1/groups/:id/reports/export    Export CSV/PDF (Pro)

# AI
POST   /v1/ai/parse-expense             NLP → structured expense object
POST   /v1/ai/insights/:groupId         Generate group insight narrative
POST   /v1/ai/chat                      MintBot conversation (V2)
```

### 8.3 API Standards

| Standard | Implementation |
|----------|---------------|
| Versioning | `/v1/` prefix; breaking changes get new version |
| Idempotency | `Idempotency-Key` header required on all POST expense/settlement endpoints |
| Pagination | Cursor-based: `?after=cursor&limit=20` |
| Auth | JWT access token (15min TTL) + httpOnly refresh cookie (30 days) |
| Rate limits | Returned in headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Validation | Zod schemas on all inputs; error returns field-level detail |
| N+1 prevention | Dataloader pattern for all relational queries |

### 8.4 WebSocket Events

```
Room: group:{groupId}     (user joins on group screen open)
Room: user:{userId}       (personal notifications)

Events emitted to group room:
  expense.created     { expense_id, payer, amount, category }
  expense.updated     { expense_id, changed_fields, updated_by }
  expense.deleted     { expense_id, deleted_by }
  settlement.created  { settlement_id, from, to, amount }
  settlement.completed{ settlement_id }
  receipt.processed   { receipt_id, extracted, confidence }
  member.joined       { user_id, display_name }
  member.removed      { user_id }
  balance.updated     { balances: { user_id: number }[] }   # debounced 500ms

Events emitted to user room:
  notification.new    { type, title, body, action_url }
  invite.received     { group_id, group_name, invited_by }
```

---

## 9. Security Architecture

### 9.1 Authentication

| Layer | Implementation |
|-------|---------------|
| Password hashing | Argon2id (not bcrypt — stronger against GPU attacks) |
| JWT signing | RS256 (asymmetric keys, rotated quarterly) |
| Access token TTL | 15 minutes |
| Refresh token | httpOnly cookie (web), Secure Keychain (mobile); 30 days |
| MFA | TOTP via standard authenticator apps (optional) |
| Biometric | Expo LocalAuthentication for mobile app unlock |
| Social login | Google OAuth 2.0, Apple Sign In |

### 9.2 Authorization

```
Middleware chain:
  1. Extract + verify JWT
  2. Load user from cache (Redis) or DB
  3. Load group membership + role for the requested group
  4. Check permission against role matrix
  5. Reject with 403 if unauthorized

Role matrix (enforced in middleware, not application code):
  - Read expense:     Member, Admin, Owner
  - Create expense:   Member, Admin, Owner
  - Edit own expense: Member, Admin, Owner
  - Edit any expense: Admin, Owner
  - Delete expense:   Admin, Owner (soft delete only)
  - View balances:    Viewer, Member, Admin, Owner
  - Record settlement:Member, Admin, Owner
  - Manage members:   Admin, Owner
  - Delete group:     Owner only
```

### 9.3 Data Security

| Concern | Implementation |
|---------|---------------|
| Transport | TLS 1.3 enforced; HSTS headers |
| Sensitive fields | Email + phone encrypted at rest (AES-256-GCM) |
| Receipt files | Time-limited signed URLs (1-hour expiry); never public |
| Audit trail | Every write logs to `audit_events` — immutable |
| SQL injection | Drizzle ORM parameterized queries; no raw string interpolation |
| XSS | Content-Security-Policy headers; React escaping |

### 9.4 Rate Limiting

| Endpoint Class | Limit | Window |
|---------------|-------|--------|
| Auth endpoints | 5 req/IP | 1 minute |
| OCR processing | 10 req/user | 1 minute |
| General API | 120 req/user | 1 minute |
| Search | 30 req/user | 1 minute |
| Export | 5 req/user | 1 hour |

Implemented via Redis sliding window counter. Limit exceeded → 429 with `Retry-After` header.

---

## 10. Infrastructure & DevOps

### 10.1 Environments

| Env | Purpose | Deployment trigger |
|-----|---------|-------------------|
| Local | Development | Manual (docker-compose up) |
| Dev | PR previews | Auto on PR open |
| Staging | Full production mirror | Auto on merge to `main` |
| Production | Live users | Manual tag release |

### 10.2 Local Development

```yaml
# docker-compose.yml (simplified)
services:
  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/settlemint
      REDIS_URL: redis://redis:6379
    ports: ["3001:3001"]
    depends_on: [db, redis]

  worker:
    build: ./apps/api
    command: node dist/worker.js
    depends_on: [db, redis]

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: settlemint
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  typesense:
    image: typesense/typesense:0.25.1
    command: --data-dir /data --api-key localkey
```

### 10.3 CI/CD Pipeline

```
On PR open:
  → ESLint + Prettier check
  → TypeScript compile check
  → Unit tests (vitest)
  → Integration tests (PostgreSQL in Docker)
  → Deploy to ephemeral preview environment

On merge to main:
  → All above
  → Deploy to staging
  → Run smoke tests

On release tag (vX.Y.Z):
  → Deploy to production (blue-green)
  → Run production smoke tests
  → Notify #deployments Slack channel
```

### 10.4 Database Operations

| Operation | Tool/Approach |
|-----------|--------------|
| Migrations | Drizzle Kit (version-controlled, reviewed in PR) |
| Backups | Automated daily via Railway/AWS RDS; point-in-time recovery |
| Connection pooling | PgBouncer (transaction mode) |
| Read replica | Added at Month 8 for analytics queries |
| Monitoring | pg_stat_statements for slow query detection |

---

## 11. Performance Budgets

| Operation | Target p50 | Target p95 | Notes |
|-----------|:----------:|:----------:|-------|
| JWT verification | <5ms | <15ms | Redis cache |
| Expense create | <80ms | <250ms | Excludes OCR |
| Balance compute (≤20 members) | <30ms | <100ms | Redis cache hit |
| Balance compute (cache miss) | <200ms | <500ms | DB computation |
| Search results | <80ms | <300ms | Typesense indexed |
| OCR result (async) | <5s | <15s | BullMQ job |
| File upload URL | <30ms | <100ms | Signed URL generation |
| WebSocket event delivery | <50ms | <200ms | Socket.io room broadcast |
| App cold start (iOS) | <2s | <3s | Hermes JS engine |
| App cold start (Android) | <2.5s | <4s | Hermes JS engine |

---

## 12. Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|:-:|
| Unit (split math, settlement algo) | Vitest | 95% |
| Unit (NLP parsing, confidence scoring) | Vitest | 90% |
| Integration (API endpoints) | Supertest + test DB | 80% |
| Contract (OpenAPI spec) | Zod + OpenAPI validator | 100% |
| E2E (critical flows) | Playwright (web) + Detox (mobile) | Core flows |
| Load testing | k6 (1000 concurrent users) | Pre-launch |
| OCR regression | Custom test suite (200 receipts) | >90% pass |
| Security | OWASP ZAP + quarterly pen test | — |
| Accessibility | Axe + VoiceOver/TalkBack | WCAG 2.1 AA |

### Critical Unit Test Cases

```
Split math:
  ✓ Equal split of 4500 among 5 = 900 each
  ✓ Equal split with remainder: 1000 among 3 = 333.33 + 333.33 + 333.34
  ✓ Percentage split must total 100%
  ✓ Shares split 2:1:1 of 1000 = 500, 250, 250
  ✓ Payer excluded from split
  ✓ Settlement algo: 3 debtors, 2 creditors = ≤ 4 settlements
  ✓ Multi-currency: stored rate used, not current rate
  ✓ Partial settlement reduces outstanding correctly
  ✓ Rounding never loses money (sum of splits == total)
```

---

## 13. Non-Functional Requirements

### Reliability

| Target | Standard |
|--------|---------|
| API uptime | 99.9% (8.7 hrs downtime/year max) |
| Database uptime | 99.95% with read replica fallback |
| OCR service | Degrades gracefully — manual entry always available |
| Payment rails | Isolated failures — core ledger continues if payment service is down |

### Scalability

| Scale Point | Action |
|-------------|--------|
| 10K users | Add Redis cluster, read replica |
| 100K users | Extract analytics service to separate pod |
| 1M users | Consider sharding by group_id; CDN for all static assets |

### Observability

| Signal | Tool | Alert on |
|--------|------|---------|
| API error rate | Grafana | >1% of requests |
| OCR failure rate | Grafana | >10% of jobs |
| p95 latency | Grafana | >500ms on expense create |
| Queue depth | Grafana | >1000 jobs pending |
| DB connections | Grafana | >80% pool utilization |
| Errors | Sentry | Any new unhandled exception |
