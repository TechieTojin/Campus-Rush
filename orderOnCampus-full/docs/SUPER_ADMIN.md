# Campus Rush — Super Admin platform

The Super Admin website (`client/orderOnCampus-admin`) manages canteens, staff, students, orders, menus, content and platform settings. It shares one Express backend and one MongoDB with the Canteen website and the Student app. MongoDB is the only source of truth: realtime events are hints to refetch, never data.

## Running locally

| Service | Command (from `orderOnCampus-full/`) | URL |
| --- | --- | --- |
| Backend API + Socket.IO | `cd server && npm start` | http://localhost:5001 |
| Super Admin website | `cd client/orderOnCampus-admin && npm install && npm run dev` | http://localhost:5174 |
| Canteen website | `cd client/orderOnCampus-canteen && npm run dev` | http://localhost:5173 |
| Student app (Expo) | `cd client/orderOnCampus-app && npx expo start --port 8082` | Android emulator reaches the API at `10.0.2.2:5001` |

### One-time setup

```bash
cd server
npm run migrate -- --dry          # preview the changes: adds status fields, settings doc, indexes (idempotent)
npm run migrate
npm run bootstrap:admin -- --write-env
```

`bootstrap:admin` creates the first Super Admin only if no admin exists yet. It refuses to run when `NODE_ENV=production`. With `--write-env` it appends `ADMIN_BOOTSTRAP_EMAIL` and a generated `ADMIN_BOOTSTRAP_PASSWORD` to `server/.env`, which is gitignored. The password is never printed. There is no public admin registration: other admins are invited from **Admins & Roles**.

## Security model

- **Admin session.** An HttpOnly `admin_token` cookie (8 h, `SameSite=Strict`) holds a JWT of `{ typ: 'admin', tv }`. Every mutation needs the `X-CSRF-Token` header to match the `admin_csrf` cookie.
- **Staff session.** The same scheme with `staff_csrf`. Student tokens are Bearer JWTs with `typ: 'student'`; a token of one type is rejected by the other APIs.
- **Revocation.** `tokenVersion` (`tv`) and `status` are checked on every request and on socket connect. Suspending an account, "log out everywhere" and password changes end sessions immediately.
- **Roles.**
  - Admin: `super_admin` and `operations`. The permission map is in `middleware/auth.js`.
  - Staff: `manager` and `staff`. Only managers can edit the menu, categories or profile, or open the canteen.
- **Invites.** Staff and admins get one-time setup links (hashed tokens; 72 h for staff, 48 h for admins). Admins never see or set staff passwords.
- **Audit log.** Every admin mutation is recorded with success or failure and sanitised details. The `AuditLog` model is append-only: updates and deletes throw.
- **Rate limits.** Failed logins are rate-limited per IP and per email. The limiter is in-memory, so it resets on restart.
- **Maintenance mode** and order limits from **Platform Settings** are enforced by the API, not just shown in the UI.

## Realtime

`server/lib/realtime.js` places each socket in rooms chosen by the server from its authenticated identity:

| Room | Who joins |
| --- | --- |
| `admin` | Every admin |
| `admin:<id>` | One admin's own sessions |
| `staff:<id>` | One staff account's sessions |
| `canteen:<id>` | Staff of that canteen, plus anyone viewing it |
| `canteens` | All canteen viewers |
| `user:<id>` | One student's sessions |
| `students` | All students |

Events carry ids only, for example `order.updated`, `menu.changed`, `canteen.changed`, `account.updated` and `content.changed`. Clients dedupe events and refetch from the API. They also resync on reconnect, tab focus or app foreground, and keep a slow poll as a fallback. Realtime only works while a client is open; there is no push-notification service.

## Tests

```bash
cd server && npm test                       # 41 API/integration tests (backend must be running)
cd e2e && npm install
ADMIN_URL=http://localhost:5174 npm run admin      # real-Chrome Super Admin smoke
CANTEEN_URL=http://localhost:5173 TEST_STAFF_EMAIL=... TEST_STAFF_PASSWORD=... npm run canteen
```

- The e2e scripts read the admin credentials from `server/.env`.
- `CHROME_PATH`, `HEADED=1` and `SHOTS_DIR` are optional.
- Screenshots default to `e2e/screenshots/`, which is gitignored.
- Test records are named `[TEST]` or `@campusrush.test`. Each run suspends or deactivates its records afterwards rather than deleting them, so order history and the audit trail stay intact.

## Known limitations

- There are no push notifications. Students see changes only while the app is open; on the next foreground the app resyncs.
- The rate limiter is in-memory, per process. A multi-instance deploy would need a shared store such as Redis.
- Replaced or removed images stay in `server/uploads/`. There is no orphan cleanup.
- Categories are per canteen. There are no platform-wide categories.
