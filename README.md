# Campus Rush

Campus Rush lets students order food from campus canteens. It has three apps that all talk to **one backend and one MongoDB database**:

| What | Folder | Who uses it | Runs on |
| --- | --- | --- | --- |
| **Super Admin website** | `orderOnCampus-full/client/orderOnCampus-admin` | Platform admins | http://localhost:5174 |
| **Canteen website** | `orderOnCampus-full/client/orderOnCampus-canteen` | Canteen managers and staff | http://localhost:5173 |
| **Student Android app** | `orderOnCampus-full/client/orderOnCampus-app` | Students (Expo / React Native) | Expo dev server, port 8082 |
| **Backend API** | `orderOnCampus-full/server` | All three apps (Express + Socket.IO + MongoDB) | http://localhost:5001 |

There is only one admin app: `client/orderOnCampus-admin`.

## Folder map

```
Campus rush/
├── README.md                     ← you are here
└── orderOnCampus-full/
    ├── server/                   Backend API (Express, MongoDB, Socket.IO realtime)
    │   ├── app.js                  Entry point (npm start)
    │   ├── routes/                 URL → controller wiring (admin.js = /admin/*)
    │   ├── controllers/            Request handlers (controllers/admin/ = Super Admin APIs)
    │   ├── model/                  MongoDB (Mongoose) models
    │   ├── middleware/auth.js      Login sessions, roles, CSRF
    │   ├── lib/                    Realtime, rate limiting, order rules
    │   ├── scripts/                migrate.js (database upgrade), bootstrap-admin.js (first admin)
    │   ├── tests/                  API tests (npm test)
    │   ├── uploads/                Uploaded images (not in Git)
    │   └── .env                    Local secrets (not in Git; copy from .env.example)
    ├── client/
    │   ├── orderOnCampus-admin/    Super Admin website (React + Vite)
    │   ├── orderOnCampus-canteen/  Canteen website (React + Vite)
    │   └── orderOnCampus-app/      Student Android app (Expo)
    ├── e2e/                      Real-browser tests for the two websites
    ├── docs/SUPER_ADMIN.md       Super Admin architecture, security and realtime details
    ├── screenshots/              Images used by orderOnCampus-full/README.md (original project README)
    └── README.md                 Original upstream project README
```

Each app has its own `package.json` and `node_modules`. Run `npm` commands inside the app's folder, never in the repository root.

## Starting everything

You need Node.js and a MongoDB connection string in `orderOnCampus-full/server/.env` (see `.env.example`).

```bash
# 1. Backend (start this first)
cd orderOnCampus-full/server
npm install
npm start                      # http://localhost:5001

# 2. Super Admin website
cd orderOnCampus-full/client/orderOnCampus-admin
npm install
npm run dev                    # http://localhost:5174

# 3. Canteen website
cd orderOnCampus-full/client/orderOnCampus-canteen
npm install
npm run dev                    # http://localhost:5173

# 4. Student Android app (Android emulator running)
cd orderOnCampus-full/client/orderOnCampus-app
npm install
npx expo start --port 8082     # press "a" to open on the emulator
```

The emulator reaches the backend at `10.0.2.2:5001`, which is set in `client/orderOnCampus-app/config/api.js`.

### First-time database setup

```bash
cd orderOnCampus-full/server
npm run migrate -- --dry                 # preview the changes
npm run migrate                          # add new fields and settings (safe to re-run)
npm run bootstrap:admin -- --write-env   # create the first Super Admin
```

`bootstrap:admin` writes the login email and a generated password to `server/.env` as `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`. If an admin already exists, it does nothing.

## Tests

```bash
cd orderOnCampus-full/server && npm test     # API tests (backend must be running)
cd orderOnCampus-full/e2e && npm install
npm run admin                                # Super Admin website in Chrome
npm run canteen                              # Canteen website in Chrome
```

## Folders you can ignore

These are generated locally and ignored by Git:
- `node_modules/` holds installed packages. Recreate it with `npm install`.
- `.expo/` holds Expo caches.
- `.idea/` holds editor settings.
- `dist/` holds website build output.
- `e2e/screenshots/` holds test screenshots.
