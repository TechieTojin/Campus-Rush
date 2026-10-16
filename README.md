<div align="center">

# Campus Rush

**A full-stack campus food-ordering platform with smart pickup: a student mobile app, a canteen management portal and a super admin dashboard, kept in sync in real time by one backend.**

![React Native](https://img.shields.io/badge/React_Native-0.72-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK_49-000020?logo=expo&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_4-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)

[Overview](#overview) · [Features](#key-features) · [V4 highlights](#v4--smart-ordering--secure-pickup) · [Architecture](#architecture) · [Tech stack](#tech-stack) · [Screenshots](#screenshots) · [Getting started](#getting-started-windows) · [Testing](#testing-and-builds) · [Roadmap](#future-improvements)

</div>

---

## Overview

Campus Rush replaces the lunch-hour queue at campus canteens. Students browse menus, customise dishes with add-ons, place pickup orders from their phone and collect with a secure QR code. Canteen staff run the counter from a live order board with estimated pickup times, and platform administrators oversee every canteen, account and order from one dashboard.

All three interfaces share **one Express API and one MongoDB database**. The database is the single source of truth. Socket.IO pushes small "something changed" events, and each client refetches from the API. A price change, a new order, or a suspended account shows up across the platforms within seconds, without a page reload.

| Interface | Who uses it | Built with |
| --- | --- | --- |
| **Student Mobile App** | Students | Expo SDK 49 · React Native 0.72 · Redux Toolkit |
| **Canteen Management Portal** | Canteen managers and staff | React 18 · Vite 5 · Tailwind CSS |
| **Super Admin Dashboard** | Platform administrators | React 18 · Vite 5 · Tailwind CSS · Chart.js |
| **Backend API** | All three clients | Node.js · Express 4 · Mongoose 8 · Socket.IO 4 |

> **Status:** source code only. This repository is not deployed to a public environment. Run it locally with the steps below.

---

## Key features

### Student Mobile App

**Premium V3 design** with the Evergreen & Marigold palette, Plus Jakarta Sans typography and a component-driven UI kit (cards, sheets, toasts, skeleton loaders, brand artwork).

- One-time welcome onboarding, email sign-up and sign-in, profile editor and password change.
- Home screen with admin-managed banners and announcements, featured canteens, "Popular right now" dishes, cravings, "Order again" and recently viewed items.
- Full-text search across canteens and dishes with filters (Veg, Available, Open) and sort (Relevance, Price, Quickest).
- Canteen pages with category filters, preparation time ranges and pickup instructions.
- **Food customisation:** per-dish option groups (single-select, multi-select) with add-on pricing, plus a kitchen note field (up to 200 characters). Two configurations of the same dish become separate cart lines.
- Single-canteen cart with quantity limits, undo on remove, sold-out detection and persistent storage.
- **Pay-at-counter checkout** with server-side price recomputation and validation.
- **Estimated pickup time** shown after ordering, with live updates as staff adjust the estimate.
- **Secure QR pickup:** request a short-lived QR credential for a Ready order, show it to staff for scanning.
- Live order tracking (Received → Preparing → Ready → Collected) with realtime updates and a 30-second polling safety net.
- Active and past order history, reorder, and saved (favourite) canteens.
- Help centre with FAQ and support tickets (create and view admin replies).
- Live notices for maintenance mode, closed or suspended canteens, and suspended accounts.
- A "Reconnecting" indicator when the live connection drops, with automatic resync on foreground.

### Canteen Management Portal

- Dashboard with today's orders, revenue, average order value, a 7-day chart, best sellers and quick actions.
- **Live kitchen board** (New → Preparing → Ready → Collected), with counter payment recording.
- **Food customisation editor:** define option groups per dish with names, price deltas, min/max selections and availability toggles.
- **Default preparation time** per canteen, used in the pickup estimate formula. Staff can override the estimate per order with explicit minutes or +5/+10/+15 delay buttons.
- **QR scanner** for pickup verification: scan the student's QR, verify the credential, confirm payment status and complete the order in one flow. A manual order-reference fallback is available.
- Order history with filters and order detail views showing customisation selections and kitchen notes.
- Menu management: create and edit items with photo upload, categories, dietary tags, prep time and one-click availability toggles.
- Sales analytics, customer view, notifications and platform announcements.
- Canteen profile, open/closed control, settings and help with support tickets.
- **Manager and staff roles.** Staff can update availability and run orders; only managers can edit the menu, categories or profile.
- Staff join through a one-time password-setup link created by an admin.

### Super Admin Dashboard

- Platform overview with KPIs, sales trends, popular items, top canteens and recent activity; a live order monitor; and an all-orders view with admin status overrides (a reason is required).
- Sales analytics with date-range filters.
- **Canteen lifecycle:** create, edit, approve, suspend and reactivate (a reason is required), with a detail view per canteen.
- Staff management with invites, roles and suspension; student management with order history and suspension.
- A global menu view across all canteens, and per-canteen categories.
- Student-app content: announcements, home banners (in-app destinations only), and remote app configuration such as maintenance mode, home sections, featured canteens and support contact.
- Support ticket inbox, platform settings (order limits, onboarding rules), and admin accounts with **role-based permissions** (`super_admin`, `operations`).
- An **append-only audit log** of every admin action, plus a system health page covering the API, database and realtime connections.
- Global search (Ctrl+K), dark mode and responsive layouts.

### Backend and platform

- REST API for students, staff and admins, grouped into separate routers. Mongoose models cover canteens, menu items, orders, students, staff, admins, announcements, banners, settings, support tickets, activity and the audit log.
- **Realtime sync:** the server assigns Socket.IO rooms from the authenticated identity (per user, per canteen, admins). Events carry IDs only, and clients refetch from the API.
- **Server-enforced business rules:**
  - Order status transitions follow a fixed path, and invalid jumps are rejected for staff and admins alike.
  - Prices, line items and customisation selections are snapshotted into each order, so later menu changes don't alter history.
  - Food customisation is validated and re-priced from the stored menu on every order — client prices are never accepted.
  - Maintenance mode, order limits and canteen status are enforced at checkout.
  - Per-dish quantity limits are aggregated across customisation variants of the same dish.
- **Security:**
  - Web sessions use HttpOnly cookies with double-submit CSRF tokens; the mobile app uses Bearer JWTs.
  - Pickup QR credentials use 256-bit secrets, stored as SHA-256 hashes, compared with constant-time equality and consumed atomically on collection — the QR never contains the order ID or student identity.
  - Suspending a staff or admin account, or changing its password, ends its existing sessions. Suspended students keep read-only access but can't place orders.
  - Failed logins are rate-limited, uploaded images are validated by their file signature, and there is no public admin registration.
- Idempotent database migration and a one-time **super admin bootstrap** script.

---

## V4 — Smart ordering & secure pickup

Three end-to-end features added across all layers (student app, canteen portal, backend, database):

### Food customisation and add-ons
Canteens define option groups per dish (e.g. Size: Regular/Large, Toppings: pick up to 2). Each option carries a price delta. Students pick their options on the food detail screen, and the server validates every selection and re-prices from the stored menu — client-side prices are advisory only. `server/lib/customisation.js` is the trust boundary. The order API accepts both the legacy flat-item format and the new structured `lines` format for backward compatibility.

### Estimated pickup time
A transparent formula: the slowest dish's prep time + a batch factor + a queue factor, clamped to 3–120 minutes. Staff can override per order. Estimated and actual ready times are separate database fields and are never conflated. Updates ride the existing realtime channel.

### Secure QR pickup verification
The human-readable order reference (`#A1B2C3`) remains a convenience code. The QR carries a real credential: a 256-bit random secret paired with a lookup ID, wire format `CRP1.<tokenId>.<secret>`. Only the SHA-256 hash is stored. Tokens are short-lived (5 minutes), re-issuable while the order is Ready, and consumed in the same atomic database update that completes the order — two simultaneous scans cannot both succeed. **Payment gate:** an unpaid order cannot be collected through the QR flow; it stays Ready until payment is recorded.

---

## Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        direction LR
        APP["Student Mobile App<br/>Expo · React Native"]
        CAN["Canteen Portal<br/>React · Vite"]
        ADM["Super Admin Dashboard<br/>React · Vite"]
    end

    subgraph Backend["Backend · Node.js + Express"]
        direction LR
        API["REST API<br/>auth · RBAC · CSRF · rate limits"]
        RT["Socket.IO<br/>server-assigned rooms"]
        UP["Image uploads<br/>/uploads"]
    end

    DB[("MongoDB<br/>single source of truth")]

    APP -->|"REST · Bearer JWT"| API
    CAN -->|"REST · HttpOnly cookie + CSRF"| API
    ADM -->|"REST · HttpOnly cookie + CSRF"| API
    API <-->|"Mongoose"| DB
    API -->|"change events (IDs only)"| RT
    API --- UP
    RT -.->|"invalidate → refetch"| Clients
```

**What happens when an order is placed:** the student app calls the API with the cart (dish IDs, quantities, customisation selections). The server validates every selection, re-prices from the stored menu, computes a pickup estimate, saves the order with an immutable line-item snapshot and emits `order.created` to the canteen's room and to the admins. The canteen's live board and the admin monitor refetch and show it. Status changes, estimate adjustments and QR pickup events flow back to the student the same way.

More detail on the security model, realtime rooms and admin roles is in [`orderOnCampus-full/docs/SUPER_ADMIN.md`](orderOnCampus-full/docs/SUPER_ADMIN.md).

---

## Tech stack

| Layer | Technologies |
| --- | --- |
| **Student app** | Expo SDK 49, React Native 0.72, React Navigation 6 (native stack + bottom tabs), Redux Toolkit, Axios, Socket.IO client, AsyncStorage, Plus Jakarta Sans (bundled) |
| **Canteen portal** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Chart.js (react-chartjs-2), Axios, Socket.IO client, jsQR (QR scanning) |
| **Super admin** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Chart.js (react-chartjs-2), React Icons, Axios, Socket.IO client |
| **Backend** | Node.js, Express 4, Mongoose 8 (MongoDB), Socket.IO 4, jsonwebtoken, bcryptjs, cookie-parser, CORS, dotenv, built-in QR encoder (ISO 18004, no dependencies) |
| **Testing** | Node's built-in test runner (API and realtime integration tests), Playwright-core browser tests in real Chrome, ESLint |

---

## Screenshots

> Captured from a local development build with test data.

<table>
  <tr>
    <th>Student app: home</th>
    <th>Student app: canteen menu</th>
    <th>Student app: checkout</th>
  </tr>
  <tr>
    <td><img src="orderOnCampus-full/docs/screenshots/student-app-home.png" alt="Student app home screen" width="250"></td>
    <td><img src="orderOnCampus-full/docs/screenshots/student-app-canteen-menu.png" alt="Student app canteen menu" width="250"></td>
    <td><img src="orderOnCampus-full/docs/screenshots/student-app-checkout.png" alt="Student app checkout" width="250"></td>
  </tr>
</table>

| Canteen portal: sign in | Canteen portal: menu management |
| --- | --- |
| <img src="orderOnCampus-full/docs/screenshots/canteen-portal-login.png" alt="Canteen portal sign-in page"> | <img src="orderOnCampus-full/docs/screenshots/canteen-portal-menu.png" alt="Canteen portal menu management"> |

| Super admin: student app configuration |
| --- |
| <img src="orderOnCampus-full/docs/screenshots/super-admin-app-config.png" alt="Super admin student app configuration"> |

---

## Project structure

```
Campus Rush/
├── README.md
└── orderOnCampus-full/
    ├── server/                      # Backend API (Express + Socket.IO + MongoDB)
    │   ├── app.js                   #   Entry point (npm start)
    │   ├── routes/                  #   admin.js (/admin/*), routes.js (staff & students & public)
    │   ├── controllers/             #   Request handlers (controllers/admin/ = Super Admin APIs)
    │   │   └── pickupController.js  #   QR verify and collect endpoints
    │   ├── model/                   #   Mongoose models
    │   ├── middleware/auth.js       #   Sessions, roles, CSRF, audit logging
    │   ├── lib/                     #   Order rules, realtime, customisation, pickup estimates,
    │   │                            #     pickup tokens, QR encoder, rate limiting
    │   ├── scripts/                 #   migrate.js, bootstrap-admin.js
    │   ├── tests/                   #   platform.test.js (41), v4.test.js (52)
    │   └── .env.example             #   Environment template
    ├── client/
    │   ├── orderOnCampus-app/       # Student mobile app (Expo)
    │   ├── orderOnCampus-canteen/   # Canteen management portal (Vite)
    │   └── orderOnCampus-admin/     # Super admin dashboard (Vite)
    ├── e2e/                         # Real-browser tests for both web portals
    └── docs/                        # Architecture notes and screenshots
```

---

## Getting started (Windows)

### Prerequisites
- **Node.js** with npm. This project was developed and tested on Node.js 24.
- A **MongoDB** connection string, either a local MongoDB or a MongoDB Atlas cluster.
- **Android Studio** with an Android emulator, plus the **Expo Go** app on that emulator, to run the student app.
- **Google Chrome**, only for the browser tests.

### 1. Configure the backend

```powershell
cd "orderOnCampus-full\server"
Copy-Item .env.example .env      # then edit .env with your own values
npm install
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random string used to sign session tokens |
| `PORT` | | API port (default `5001`) |
| `ALLOWED_ORIGINS` | | Comma-separated web origins allowed by CORS (defaults to the local portal ports 5173, 5174 and 3000) |
| `CANTEEN_APP_URL` / `ADMIN_APP_URL` | | Base URLs used in staff and admin setup links (defaults `http://localhost:5173` / `http://localhost:5174`) |
| `STAFF_SIGNUP_CODE` | | Optional invite code required for canteen self sign-up |
| `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | | First super admin login (written for you by the bootstrap script) |
| `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` | | Not needed. Reserved for planned features (see [Future improvements](#future-improvements)) |

Use placeholders in `.env.example` only. Never commit your `.env`; it's already in `.gitignore`.

### 2. Prepare the database and create the first admin

```powershell
npm run migrate -- --dry                 # preview changes
npm run migrate                          # safe to re-run
npm run bootstrap:admin -- --write-env   # creates the first super admin once
```

The bootstrap script writes `ADMIN_BOOTSTRAP_EMAIL` and a generated `ADMIN_BOOTSTRAP_PASSWORD` into your local `.env`. It never prints the password, refuses to run in production, and does nothing if an admin already exists. There is no public admin registration; other admins are invited from **Admins & roles**.

### 3. Run everything

Use one terminal per app, from the repository root:

```powershell
# Backend API → http://localhost:5001
cd "orderOnCampus-full\server";                 npm start

# Super Admin Dashboard → http://localhost:5174
cd "orderOnCampus-full\client\orderOnCampus-admin";   npm install; npm run dev

# Canteen Management Portal → http://localhost:5173
cd "orderOnCampus-full\client\orderOnCampus-canteen"; npm install; npm run dev

# Student Mobile App (start the Android emulator first, then press "a")
cd "orderOnCampus-full\client\orderOnCampus-app";     npm install; npx expo start --port 8082
```

The web portals read `VITE_API_URL` (default `http://localhost:5001`). The app reads `EXPO_PUBLIC_API_URL`; without it, the Android emulator uses `http://10.0.2.2:5001` to reach the backend on your machine.

---

## Testing and builds

```powershell
# Lint and production builds (each web portal)
cd "orderOnCampus-full\client\orderOnCampus-admin";   npm run lint; npm run build
cd "orderOnCampus-full\client\orderOnCampus-canteen"; npm run lint; npm run build

# Backend API + realtime integration tests (41 tests; the backend must be running)
cd "orderOnCampus-full\server"; npm test

# V4 feature tests — customisation, estimates, QR pickup (52 tests; backend must be running)
cd "orderOnCampus-full\server"; node --test tests/v4.test.js

# Real-browser tests in Chrome (backend and both portals must be running)
cd "orderOnCampus-full\e2e"; npm install
npm run admin      # Super Admin workflow test (59 checks)
npm run canteen    # Canteen portal workflow test (40 checks)

# Student app production bundle check
cd "orderOnCampus-full\client\orderOnCampus-app"; npx expo export --platform android
```

- **API tests** run against your local backend and database. They need the bootstrap admin and existing test accounts set in `server/.env`: `TEST_STAFF_EMAIL`/`TEST_STAFF_PASSWORD`, `TEST_STAFF2_EMAIL`/`TEST_STAFF2_PASSWORD` and `TEST_STUDENT_EMAIL`/`TEST_STUDENT_PASSWORD`. The tests create clearly labelled `[TEST]` records and suspend or deactivate them afterwards; they never delete orders.
- **Browser tests** read the same `server/.env` (the admin login, and for the canteen test the `TEST_STAFF_*` accounts). They use your installed Chrome. Set `CHROME_PATH` if it isn't in the default location. `HEADED=1` shows the browser, and `SHOTS_DIR` changes where screenshots are saved.
- The login rate limiter is deliberately strict. If you run the API suite many times in a row, restart the backend to reset it.

---

## Security notes

- **Payments are pay-at-counter only.** Staff record payment manually. The QR collection flow enforces a payment gate: unpaid orders cannot be collected and stay in Ready status until payment is recorded.
- **QR credentials** are 256-bit random secrets, SHA-256 hashed in the database, compared with `timingSafeEqual` and consumed atomically. A leaked QR (e.g. a screenshot) is valid only for the remaining TTL (5 minutes).
- **No server-side idempotency key** for order placement. The client has a double-submit guard and a post-network-error duplicate check, but a manual rapid resubmit could create two orders.
- **Student JWTs cannot be revoked** before expiry. Staff and admin sessions are revocable.
- The in-memory rate limiter resets when the server restarts and does not share state across processes.

---

## Future improvements

These are **not implemented yet**:

- **Online payments.** Checkout currently supports pay-at-counter only, and staff record payments manually. Stripe and UPI packages are in the project but no online payment flow is wired into the app.
- **AI ordering assistant.** A guarded `/ai` endpoint exists on the backend but no client screen uses it.
- **Push notifications.** Live updates currently reach the app only while it's open.
- **Production deployment.** This includes a shared rate-limit store such as Redis for multiple server instances, and cleanup of unused uploaded images.
- Self-service password reset for staff and students.
- Student order cancellation (before acceptance).
- iOS testing and standalone APK/AAB builds.
- Dark mode for the student app.
- Offline caching of catalogue and orders.

---

<div align="center">

Built with React Native, React and Node.js

</div>
