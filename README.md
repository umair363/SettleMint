<div align="center">
  <img src="https://i.imgur.com/gK98hWq.png" alt="SettleMint Logo" width="120"/>
  <h1>SettleMint</h1>
  <p><strong>A Modern, Open-Source Bill Splitting & Expense Sharing Platform</strong></p>
  <p>Built for roommates, travelers, and friends who want a friction-free way to settle up without the corporate bloat.</p>

  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14-black" alt="Next.js"></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Fastify-4-black" alt="Fastify"></a>
  <a href="https://postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-blue" alt="Postgres"></a>
  <a href="https://orm.drizzle.team/"><img src="https://img.shields.io/badge/Drizzle_ORM-0.30-yellow" alt="Drizzle"></a>
</div>

<br/>

## 🌟 The Anti-Slop Approach
SettleMint isn't just another CRUD app. It's designed with an **"anti-slop" philosophy**—prioritizing extreme visual fidelity, zero layout shifts, dynamic interactions, and a dark-first "cyber-slate" aesthetic. It's built for power users who appreciate beautiful software.

## 🚀 Key Features

### 🏦 The Dashboard Core
- **Real-Time Dashboards:** Powered by TanStack React Query, your data instantly syncs without aggressive page reloads.
- **Group Management:** Create groups for trips, roommates, or events with tailored modes, emojis, and custom base currencies.
- **Granular Splitting:** Add expenses with detailed transaction states. Instantly calculates exact "per-person" splits under the hood.
- **Settle Up Engine:** A dedicated module for recording payments between members—whether it's cash, bank transfer, or a payment app.

### 🔒 Secure & High-Performance Backend
- **JWT-Guarded:** Every API route is fortified by HTTP Bearer tokens and strict route-level middleware.
- **PostgreSQL + Drizzle:** Fully typed relational database schema guaranteeing high integrity for monetary transactions.
- **Fastify Speed:** The backend runs on Fastify, ensuring blazing fast sub-millisecond route resolution.

---

## 🛠️ Architecture Stack

### Frontend (Data Cockpit)
- **Framework:** Next.js 14 (App Router)
- **State & Data Fetching:** TanStack React Query `v5`
- **Styling:** Pure CSS Modules (Zero Tailwind bloat) with CSS Variables for theming
- **Icons:** Inline SVG micro-components for maximum performance

### Backend (The Vault)
- **Runtime:** Node.js + TypeScript
- **Framework:** Fastify
- **Database:** PostgreSQL (Containerized via Docker)
- **ORM:** Drizzle ORM
- **Authentication:** `jsonwebtoken` + `bcrypt`

---

## 💻 Getting Started (Local Development)

SettleMint uses a decoupled monolithic architecture (Frontend and Backend run as separate services).

### 1. Start the Database
Ensure Docker Desktop is running.
```bash
cd api
docker-compose up -d
```

### 2. Configure Environment
Create an `.env` file in the `api/` directory:
```env
DATABASE_URL=postgres://settlemint:settlemint_secret@localhost:5433/settlemint
JWT_SECRET=super_secret_jwt_key_12345
```

### 3. Migrate and Start the Backend
```bash
cd api
npm install
npm run db:push    # Pushes the Drizzle schema to PostgreSQL
npm run dev        # Starts Fastify on http://localhost:8000
```

### 4. Start the Frontend
In a new terminal window:
```bash
cd app
npm install
npm run dev        # Starts Next.js on http://localhost:3000
```

Open `http://localhost:3000` to see the application running.

---

## 🎨 Design System Tokens

SettleMint relies on a strictly curated palette to achieve its premium look:
- **Backgrounds:** `#0A0E17` (App Base), `#111622` (Card Surface)
- **Primary Accent:** `#3DD68C` (Mint Green - for positive actions/balances)
- **Secondary Accents:** `#5B8DEF` (Tech Blue), `#B197FC` (Royal Purple), `#FFA94D` (Warning Orange)
- **Typography:** Next.js Inter (geist-sans equivalent) with strict letter-spacing rules.

## 📜 License
MIT License. Open-source and free to fork for personal projects.
