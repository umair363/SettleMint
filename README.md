# SettleMint 🍃

SettleMint is a modern, high-fidelity expense splitting and management application built for frictionless financial collaboration among friends and groups. Say goodbye to awkward money conversations and hello to smart, transparent bill splitting.

![SettleMint Architecture](https://img.shields.io/badge/Architecture-Monorepo-3DD68C?style=flat-square)
![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat-square&logo=next.js)
![Fastify](https://img.shields.io/badge/Backend-Fastify-202020?style=flat-square&logo=fastify)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-316192?style=flat-square&logo=postgresql)

## 🌟 Features

*   **1-on-1 Splitting**: Easily split expenses with individual friends directly, no group required.
*   **Group Ledgers**: Manage complex housemate bills, vacation expenses, and group activities seamlessly.
*   **Dynamic Currency**: Intelligent currency handling and formatting depending on group settings.
*   **OTP Email Verification**: Robust and secure user authentication via Resend-powered one-time passwords.
*   **Minimalist UI**: Built using premium "Anti-Slop" design principles, leveraging CSS modules, custom easing curves, and a monochromatic aesthetic with vibrant accents.
*   **Responsive**: Flawlessly optimized across Desktop and Mobile devices.

## 🏗 System Architecture

The project is structured as a Turborepo-style monorepo, decoupled into two primary domains to ensure scalable deployments:

1.  **/app (Frontend)**
    *   **Framework**: Next.js (App Router)
    *   **Styling**: Pure Vanilla CSS Modules (No Tailwind dependencies)
    *   **State Management**: React Query (TanStack)
    *   **Deployment**: Optimized for Vercel edge delivery.

2.  **/api (Backend)**
    *   **Framework**: Fastify (Node.js)
    *   **ORM**: Drizzle ORM
    *   **Database**: PostgreSQL (Neon.tech)
    *   **Authentication**: JWT & Bcrypt
    *   **Deployment**: Optimized for Render / Railway continuous instances.

## 🚀 Getting Started

### Prerequisites
*   Node.js v20+
*   PostgreSQL database (Local or Cloud)
*   Resend API Key (for email services)

### 1. Backend Setup (`/api`)
Navigate to the `api` directory to initialize the database and backend server.
```bash
cd api
npm install
```
Create a `.env` file in the `api` folder:
```env
DATABASE_URL=postgres://user:pass@host:port/dbname
JWT_SECRET=your_super_secret_key
RESEND_API_KEY=re_your_api_key
EMAIL_FROM="SettleMint <onboarding@resend.dev>"
PORT=8000
```
Run database migrations and start the server:
```bash
npm run db:push
npm run dev
```

### 2. Frontend Setup (`/app`)
In a new terminal window, navigate to the `app` directory.
```bash
cd app
npm install
```
Start the Next.js development server:
```bash
npm run dev
```
The frontend will be live at [http://localhost:3000](http://localhost:3000).

## 🔒 Security & Privacy

*   All passwords are cryptographically hashed using `bcrypt` before storage.
*   API Routes are strictly guarded via Bearer Token JWT Middleware.
*   All routes are stateless, ensuring secure cross-origin scaling.

## 📜 License

This project is proprietary and confidential. Unauthorized copying of this file, via any medium, is strictly prohibited.
