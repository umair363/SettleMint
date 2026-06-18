<div align="center">
  <img src="app/src/app/icon.png" alt="SettleMint Logo" width="120" height="120" style="border-radius: 20%;" />
  
  <h1 align="center">SettleMint</h1>

  <p align="center">
    <strong>Split expenses, not friendships.</strong>
    <br />
    A modern, high-fidelity expense management platform built for frictionless financial collaboration among friends, roommates, and travel groups.
  </p>

  <p align="center">
    <a href="https://settlemint.online"><strong>View Live App</strong></a> · 
    <a href="#-features">Features</a> · 
    <a href="#-tech-stack">Tech Stack</a> · 
    <a href="#-getting-started">Getting Started</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Fastify-202020?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle" />
  </p>
</div>

<br />

## 🌟 Overview

SettleMint redefines how people manage shared finances. Say goodbye to awkward money conversations and chaotic spreadsheets. Whether it's a weekend getaway, shared apartment bills, or splitting a dinner check, SettleMint provides intelligent, transparent, and aesthetically premium bill splitting.

---

## ✨ Key Features

- **👫 1-on-1 Splitting**: Easily split expenses with individual friends directly—no group required.
- **🏝️ Group Ledgers**: Seamlessly manage complex housemate bills, group vacations, and shared activities.
- **🔐 Secure Authentication**: Robust, stateless JWT authentication featuring custom OTP email verification powered by Resend.
- **✉️ Transactional Emails**: Beautifully formatted welcome emails, password resets, and automated expense alerts.
- **💱 Dynamic Currencies**: Intelligent currency handling and formatting mapped strictly to group preferences.
- **🎨 Premium Interface**: Built utilizing strict "Anti-Slop" design principles, custom easing curves, glassmorphism, and vanilla CSS modules for lightning-fast edge delivery.

---

## 🏗️ System Architecture

The project is structured as a scalable, decoupled monorepo, perfectly primed for modern edge deployments.

### 💻 Frontend (`/app`)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Pure Vanilla CSS Modules (Zero-bloat architecture)
- **State & Data Fetching:** React Query (TanStack)
- **Deployment:** Vercel (Edge Network)

### ⚙️ Backend (`/api`)
- **Framework:** Fastify (Node.js)
- **Database ORM:** Drizzle ORM
- **Database:** PostgreSQL (Neon.tech Serverless)
- **Security:** Bcrypt (Hashing) & JSON Web Tokens
- **Mail Service:** Resend (Amazon SES)
- **Deployment:** Render (Continuous Instances)

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- A running PostgreSQL database instance (local or cloud)
- A free [Resend](https://resend.com/) API Key for testing emails.

### 1. Backend Initialization

Navigate to the API directory and install dependencies:
```bash
cd api
npm install
```

Create a `.env` file inside the `/api` directory:
```env
DATABASE_URL=postgres://user:password@localhost:5432/settlemint
JWT_SECRET=your_super_secret_jwt_key
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM="SettleMint <onboarding@resend.dev>"
PORT=8000
```

Push the database schema and start the server:
```bash
npm run db:push
npm run dev
```

### 2. Frontend Initialization

In a new terminal window, navigate to the frontend directory:
```bash
cd app
npm install
```

Start the Next.js development server:
```bash
npm run dev
```
The application will be live at `http://localhost:3000`.

---

## 🔒 Security & Privacy Standard

- Passwords are cryptographically hashed using **Bcrypt** prior to persistence.
- REST endpoints are strictly guarded via Bearer Token JWT Middleware.
- Email verification safeguards against spoofed account creation and brute-force resets.

<br />

<div align="center">
  <sub>Built with ❤️ by Umair. <br /> Split expenses, not friendships.</sub>
</div>
