// End-to-end API, authorization and realtime tests for the Campus Rush platform.
//
//   cd server && npm test        (the API must be running on http://localhost:5001)
//
// Fixtures are isolated and clearly labelled: a "[TEST] Automation Canteen", plus disposable
// "[TEST]" staff/student/admin accounts per run (emails @campusrush.test). Existing students,
// canteens and orders are only read, never modified. Platform settings changed by a test are
// restored afterwards; test menu items are archived and disposable accounts suspended at the end.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');
const { RUN, Client, asAdmin, asStaff, asStudent, socket, wait, until, PNG, HASH, EMAIL } = require('./helpers');

const env = process.env;
const T = {}; // shared fixtures
const strongPw = () => `Tt${crypto.randomBytes(9).toString('base64url').replace(/[^A-Za-z0-9]/g, 'x')}9a`;
const sockets = [];

before(async () => {
  T.admin = await asAdmin();
  T.staffA = await asStaff(env.TEST_STAFF_EMAIL, env.TEST_STAFF_PASSWORD);
  T.staffB = await asStaff(env.TEST_STAFF2_EMAIL, env.TEST_STAFF2_PASSWORD);
  T.student = await asStudent(env.TEST_STUDENT_EMAIL, env.TEST_STUDENT_PASSWORD);
  T.nadhini = T.staffA.me.ownedCanteens[0]._id;
  T.canteenB = T.staffB.me.ownedCanteens[0]._id;
  T.settingsBefore = (await T.admin.get('/admin/settings')).json.data;

  // Reusable test canteen
  const found = (await T.admin.get('/admin/canteens?q=%5BTEST%5D%20Automation')).json.data[0];
  T.canteen = found ? found._id : (await T.admin.post('/admin/canteens', { name: '[TEST] Automation Canteen', location: 'Test block (automated tests)', category: 'Snacks' })).json.data._id;
  if (found && found.status !== 'active') await T.admin.put(`/admin/canteens/${T.canteen}/status`, { status: 'active' });
  await T.admin.put(`/admin/canteens/${T.canteen}`, { openStatus: true });

  // Disposable staff (created by admin, finishes setup through the one-time link)
  T.staffPw = strongPw();
  const created = await T.admin.post('/admin/staff', { name: `[TEST] Auto Staff ${RUN}`, email: `autotest.staff.${RUN}@campusrush.test`, role: 'manager', canteenIds: [T.canteen] });
  assert.equal(created.status, 201, 'admin can create staff');
  T.staffId = created.json.data._id;
  T.staffEmail = created.json.data.email;
  T.setupToken = new URL(created.json.setupUrl).searchParams.get('token');

  // Disposable student
  T.studentPw = strongPw();
  T.s2Email = `autotest.student.${RUN}@campusrush.test`;
  const reg = await new Client().post('/users/register', { name: `[TEST] Auto Student ${RUN}`, email: T.s2Email, password: T.studentPw });
  assert.equal(reg.status, 201, 'disposable student registers');
  T.student2 = await asStudent(T.s2Email, T.studentPw);

  // Test menu item
  T.item = (await T.admin.post(`/admin/canteens/${T.canteen}/menu`, { name: `[TEST] Auto Item ${RUN}`, price: 50, available: true })).json.data;
  assert.ok(T.item?._id, 'admin can add a menu item');
});

after(async () => {
  sockets.forEach((s) => s.close());
  // Restore settings changed by tests
  const s = T.settingsBefore;
  if (s) await T.admin.put('/admin/settings', { maintenance: s.maintenance, ordering: s.ordering, studentApp: { ...s.studentApp, featuredCanteens: (s.studentApp.featuredCanteens || []).map(String) } });
  // Archive this run's test items and neutralise disposable accounts (kept for audit history)
  const menu = (await T.admin.get(`/admin/canteens/${T.canteen}/menu`)).json?.data || [];
  for (const i of menu.filter((m) => m.name.includes(RUN))) await T.admin.del(`/admin/canteens/${T.canteen}/menu/${i._id}`);
  if (T.staffId) await T.admin.put(`/admin/staff/${T.staffId}/status`, { status: 'suspended', reason: 'Automated test account (end of run)' });
  if (T.student2?.me?._id) await T.admin.put(`/admin/students/${T.student2.me._id}/status`, { status: 'suspended', reason: 'Automated test account (end of run)' });
  if (T.opsAdminId) await T.admin.put(`/admin/admins/${T.opsAdminId}/status`, { status: 'suspended' });
  if (T.announcementIds) for (const id of T.announcementIds) await T.admin.put(`/admin/announcements/${id}`, { active: false });
  // Hide the test canteen from students between runs (the next run reactivates it).
  if (T.canteen) await T.admin.put(`/admin/canteens/${T.canteen}/status`, { status: 'suspended', reason: 'Automated test canteen — hidden between test runs' });
});

const placeOrder = (client, items, canteen = T.canteen) => client.post('/users/place-order', { canteen, items });

// ================================================================== authentication
describe('authentication', () => {
  test('admin login: unknown email gets a generic 401', async () => {
    const b = await new Client().post('/admin/auth/login', { email: `nobody.${RUN}@campusrush.test`, password: 'Wrong-password-123' }, { csrf: false });
    assert.equal(b.status, 401);
    T.unknownLoginMessage = b.json.message;
  });

  test('admin login is rate limited after repeated failures', async () => {
    const c = new Client();
    const email = `ratelimit.${RUN}@campusrush.test`;
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await c.post('/admin/auth/login', { email, password: 'Nope-nope-123' }, { csrf: false })).status);
    assert.deepEqual(codes.slice(0, 5), [401, 401, 401, 401, 401]);
    assert.equal(codes[6], 429);
  });

  test('admin session cookie is HttpOnly + SameSite=Strict and the CSRF cookie is separate', async () => {
    const c = new Client();
    const r = await c.post('/admin/auth/login', { email: env.ADMIN_BOOTSTRAP_EMAIL, password: env.ADMIN_BOOTSTRAP_PASSWORD }, { csrf: false });
    const cookies = r.headers.getSetCookie();
    const session = cookies.find((x) => x.startsWith('admin_token='));
    const csrf = cookies.find((x) => x.startsWith('admin_csrf='));
    assert.match(session, /HttpOnly/i);
    assert.match(session, /SameSite=Strict/i);
    assert.doesNotMatch(csrf, /HttpOnly/i);
    assert.ok(!HASH.test(r.text), 'no password hash in login response');
  });

  test('admin mutations without the CSRF header are refused', async () => {
    const r = await T.admin.post('/admin/announcements', { title: 'x', body: 'y', audience: 'students' }, { csrf: false });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'CSRF');
  });

  test('staff mutations without the CSRF header are refused', async () => {
    const r = await T.staffA.put(`/staff/canteens/${T.nadhini}/menu-availability`, { itemIds: [], available: true }, { csrf: false });
    assert.equal(r.status, 403);
  });

  test('there is no public admin registration', async () => {
    for (const [m, u] of [['POST', '/admin/auth/register'], ['POST', '/admin/admins'], ['POST', '/admin/register']]) {
      const r = await new Client().req(m, u, { name: 'x', email: 'x@example.com', password: 'Abcdefghijk1', role: 'super_admin' });
      assert.equal(r.status, 401, `${m} ${u}`);
    }
  });

  test('bootstrap is idempotent and refuses production', () => {
    const script = path.join(__dirname, '..', 'scripts', 'bootstrap-admin.js');
    const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    assert.match(out, /already exists/);
    assert.throws(() => execFileSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' }, stdio: 'pipe' }));
  });

  test('invited admin: no login before setup, one-time setup link, role limits', async () => {
    const invited = await T.admin.post('/admin/admins', { name: `[TEST] Ops ${RUN}`, email: `autotest.admin.${RUN}@campusrush.test`, role: 'operations' });
    assert.equal(invited.status, 201);
    T.opsAdminId = invited.json.data._id;
    T.opsEmail = invited.json.data.email;
    const token = new URL(invited.json.setupUrl).searchParams.get('token');
    T.opsPw = strongPw();
    assert.equal((await new Client().post('/admin/auth/login', { email: T.opsEmail, password: T.opsPw }, { csrf: false })).status, 401);
    const ops = new Client();
    assert.equal((await ops.post('/admin/auth/setup', { token, password: T.opsPw }, { csrf: false })).status, 200);
    assert.equal((await new Client().post('/admin/auth/setup', { token, password: T.opsPw }, { csrf: false })).status, 400, 'setup link works once');
    // Wrong password on a real (disposable) account gives exactly the same answer as an unknown email.
    const wrong = await new Client().post('/admin/auth/login', { email: T.opsEmail, password: 'Wrong-password-123' }, { csrf: false });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.json.message, T.unknownLoginMessage, 'no account enumeration');
    assert.equal((await ops.get('/admin/canteens')).status, 200);
    assert.equal((await ops.get('/admin/admins')).status, 403, 'operations cannot manage admins');
    assert.equal((await ops.put('/admin/settings', { platformName: 'Hacked' })).status, 403, 'operations cannot change platform settings');
    T.ops = ops;
  });

  test('changing a password signs out other sessions', async () => {
    const other = await asAdmin(T.opsEmail, T.opsPw);
    const newPw = strongPw();
    assert.equal((await T.ops.put('/admin/auth/password', { currentPassword: T.opsPw, newPassword: newPw })).status, 200);
    assert.equal((await other.get('/admin/auth/me')).status, 401, 'old session revoked');
    assert.equal((await T.ops.get('/admin/auth/me')).status, 200, 'current session continues');
  });

  test('admins cannot change their own role or suspend themselves', async () => {
    const me = (await T.admin.get('/admin/auth/me')).json.data;
    assert.equal((await T.admin.put(`/admin/admins/${me._id}/role`, { role: 'operations' })).status, 400);
    assert.equal((await T.admin.put(`/admin/admins/${me._id}/status`, { status: 'suspended' })).status, 400);
    assert.equal((await T.admin.put(`/admin/admins/${T.opsAdminId}/role`, { role: 'emperor' })).status, 400, 'unknown role rejected');
  });
});

// ================================================================== role-based access
describe('role-based access control', () => {
  test('students and staff cannot use admin APIs', async () => {
    assert.equal((await T.student.get('/admin/overview')).status, 401);
    assert.equal((await T.staffA.get('/admin/overview')).status, 401);
    const forged = new Client();
    forged.jar.admin_token = T.student.bearer; // student JWT smuggled into the admin cookie
    assert.equal((await forged.get('/admin/overview')).status, 401);
    const forged2 = new Client();
    forged2.jar.admin_token = T.staffA.jar.token; // staff JWT in the admin cookie
    assert.equal((await forged2.get('/admin/overview')).status, 401);
  });

  test('admin sessions cannot use staff or student APIs', async () => {
    const c = new Client();
    c.jar.token = T.admin.jar.admin_token;
    assert.equal((await c.get('/staff/auth')).status, 401);
    const s = new Client();
    s.bearer = T.admin.jar.admin_token;
    assert.equal((await s.get('/users/me/orders')).status, 401);
  });

  test('cross-canteen access is refused', async () => {
    assert.equal((await T.staffB.get(`/staff/canteens/${T.nadhini}/orders`)).status, 403);
    assert.equal((await T.staffB.post(`/staff/canteens/${T.nadhini}/menu`, { name: 'Intruder', price: 1 })).status, 403);
    assert.equal((await T.staffA.get(`/staff/canteens/${T.canteenB}/menu`)).status, 403);
  });

  test('uploads need an authorised session', async () => {
    assert.equal((await new Client().post('/staff/uploads', null, { raw: PNG, type: 'image/png' })).status, 401);
    assert.equal((await new Client().post('/admin/uploads', null, { raw: PNG, type: 'image/png' })).status, 401);
    const s = new Client(); s.bearer = T.student.bearer;
    assert.equal((await s.post('/staff/uploads', null, { raw: PNG, type: 'image/png' })).status, 401);
    const ok = await T.admin.post('/admin/uploads', null, { raw: PNG, type: 'image/png' });
    assert.equal(ok.status, 201);
    assert.equal((await T.admin.post('/admin/uploads', null, { raw: Buffer.from('<svg/>'), type: 'image/png' })).status, 415);
  });
});

// ================================================================== staff lifecycle
describe('staff lifecycle', () => {
  test('invited staff cannot sign in until they use the setup link', async () => {
    assert.equal((await new Client().post('/staff/login', { email: T.staffEmail, password: T.staffPw }, { csrf: false })).status, 401);
    const c = new Client();
    assert.equal((await c.post('/staff/setup-password', { token: T.setupToken, password: T.staffPw }, { csrf: false })).status, 200);
    c.me = (await c.get('/staff/auth')).json.data;
    T.staffD = c;
    assert.equal(c.me.ownedCanteens[0]._id, T.canteen);
  });

  test('assigned staff can manage their canteen but no other', async () => {
    assert.equal((await T.staffD.get(`/staff/canteens/${T.canteen}`)).status, 200);
    assert.equal((await T.staffD.get(`/staff/canteens/${T.nadhini}`)).status, 403);
  });

  test('removing an assignment takes effect on the next request', async () => {
    assert.equal((await T.admin.put(`/admin/staff/${T.staffId}`, { canteenIds: [] })).status, 200);
    assert.equal((await T.staffD.get(`/staff/canteens/${T.canteen}`)).status, 403);
    assert.equal((await T.admin.put(`/admin/staff/${T.staffId}`, { canteenIds: [T.canteen] })).status, 200);
    assert.equal((await T.staffD.get(`/staff/canteens/${T.canteen}`)).status, 200);
  });

  test("the 'staff' role handles availability but not menu editing", async () => {
    await T.admin.put(`/admin/staff/${T.staffId}`, { role: 'staff' });
    assert.equal((await T.staffD.post(`/staff/canteens/${T.canteen}/menu`, { name: `[TEST] Role ${RUN}`, price: 5 })).status, 403);
    assert.equal((await T.staffD.put(`/staff/canteens/${T.canteen}/menu/${T.item._id}`, { price: 999 })).status, 403);
    assert.equal((await T.staffD.put(`/staff/canteens/${T.canteen}/menu/${T.item._id}`, { available: true })).status, 200);
    await T.admin.put(`/admin/staff/${T.staffId}`, { role: 'manager' });
  });

  test('suspension revokes existing sessions immediately; reactivation needs a fresh sign-in', async () => {
    assert.equal((await T.admin.put(`/admin/staff/${T.staffId}/status`, { status: 'suspended' })).status, 400, 'reason required');
    assert.equal((await T.admin.put(`/admin/staff/${T.staffId}/status`, { status: 'suspended', reason: 'Automated suspension test' })).status, 200);
    const r = await T.staffD.get('/staff/auth');
    assert.equal(r.status, 401);
    assert.equal(r.json.code, 'SUSPENDED');
    assert.equal((await T.staffD.put(`/staff/canteens/${T.canteen}/menu/${T.item._id}`, { available: true })).status, 401);
    assert.equal((await new Client().post('/staff/login', { email: T.staffEmail, password: T.staffPw }, { csrf: false })).status, 403);
    assert.equal((await T.admin.put(`/admin/staff/${T.staffId}/status`, { status: 'active' })).status, 200);
    assert.equal((await T.staffD.get('/staff/auth')).status, 401, 'old session stays revoked');
    T.staffD = await asStaff(T.staffEmail, T.staffPw);
    assert.equal((await T.staffD.get(`/staff/canteens/${T.canteen}`)).status, 200);
  });

  test('admin-created staff cannot register their own canteen', async () => {
    const r = await T.staffD.post('/canteens', { canteenName: 'Sneaky Canteen', location: 'Somewhere', category: 'Cafe' });
    assert.ok([403, 409].includes(r.status));
  });
});

// ================================================================== canteen lifecycle
describe('canteen lifecycle', () => {
  test('active canteen is discoverable; suspension hides it and blocks orders; history kept', async () => {
    const pub = new Client();
    assert.ok((await pub.get('/canteens/get-canteens')).json.data.some((c) => c._id === T.canteen));
    assert.equal((await T.admin.put(`/admin/canteens/${T.canteen}/status`, { status: 'suspended' })).status, 400, 'reason required');
    assert.equal((await T.admin.put(`/admin/canteens/${T.canteen}/status`, { status: 'suspended', reason: 'Automated suspension test' })).status, 200);
    assert.ok(!(await pub.get('/canteens/get-canteens')).json.data.some((c) => c._id === T.canteen), 'hidden from discovery');
    assert.equal((await pub.get(`/canteens/${T.canteen}/get-canteen`)).json.data.status, 'suspended');
    const order = await placeOrder(T.student, [T.item._id]);
    assert.equal(order.status, 400);
    assert.equal(order.json.code, 'CANTEEN_SUSPENDED');
    assert.equal((await T.staffD.put(`/staff/canteens/${T.canteen}`, { openStatus: true })).status, 403, 'staff cannot reopen a suspended canteen');
    assert.equal((await T.staffD.get(`/staff/canteens/${T.canteen}/orders`)).status, 200, 'staff keep access to existing orders');
    assert.equal((await T.admin.put(`/admin/canteens/${T.canteen}/status`, { status: 'active' })).status, 200);
    assert.ok((await pub.get('/canteens/get-canteens')).json.data.some((c) => c._id === T.canteen));
    assert.equal((await T.admin.put(`/admin/canteens/${T.canteen}`, { openStatus: true })).status, 200);
  });

  test('duplicate canteen names are rejected', async () => {
    assert.equal((await T.admin.post('/admin/canteens', { name: '[TEST] Automation Canteen', location: 'Anywhere', category: 'Cafe' })).status, 409);
  });
});

// ================================================================== menu & pricing
describe('menu, pricing and availability', () => {
  test('admin price changes reach staff and students and drive checkout totals', async () => {
    const first = await placeOrder(T.student, [T.item._id, T.item._id]);
    assert.equal(first.status, 201);
    assert.equal(first.json.totalPrice, 100);
    T.firstOrder = first.json._id;
    assert.equal((await T.admin.put(`/admin/canteens/${T.canteen}/menu/${T.item._id}`, { price: 65 })).status, 200);
    const staffView = (await T.staffD.get(`/staff/canteens/${T.canteen}/menu`)).json.data.find((i) => i._id === T.item._id);
    assert.equal(staffView.price, 65);
    const pubView = (await new Client().get(`/canteens/${T.canteen}/get-canteen`)).json.data.menu.find((i) => i._id === T.item._id);
    assert.equal(pubView.price, 65);
    const second = await placeOrder(T.student, [T.item._id]);
    assert.equal(second.json.totalPrice, 65, 'server charges the latest price');
    T.secondOrder = second.json._id;
    const old = (await T.admin.get(`/admin/orders/${T.firstOrder}`)).json.data;
    assert.equal(old.totalPrice, 100);
    assert.equal(old.lines[0].price, 50, 'historical price preserved');
  });

  test('items marked unavailable by staff show in admin and cannot be ordered', async () => {
    assert.equal((await T.staffD.put(`/staff/canteens/${T.canteen}/menu/${T.item._id}`, { available: false })).status, 200);
    const adminView = (await T.admin.get(`/admin/menu?canteen=${T.canteen}`)).json.data.find((i) => i._id === T.item._id);
    assert.equal(adminView.available, false);
    const r = await placeOrder(T.student, [T.item._id]);
    assert.equal(r.status, 400);
    assert.equal((await T.admin.put(`/admin/canteens/${T.canteen}/menu/${T.item._id}`, { available: true })).status, 200);
  });

  test('menu changes are written to the audit log with before/after details', async () => {
    const r = (await T.admin.get(`/admin/audit?action=menu.update&q=${T.item._id}`)).json;
    const entry = r.data.find((a) => a.details?.changes?.price === 65);
    assert.ok(entry, 'price change audited');
    assert.equal(entry.details.before.price, 50);
  });
});

// ================================================================== orders
describe('order workflow', () => {
  test('a new order reaches staff, admin and the student’s history', async () => {
    const o = T.secondOrder;
    assert.ok((await T.staffD.get(`/staff/canteens/${T.canteen}/orders?limit=50`)).json.data.some((x) => x._id === o));
    assert.ok((await T.admin.get(`/admin/orders?canteen=${T.canteen}&limit=50`)).json.data.some((x) => x._id === o));
    assert.ok((await T.admin.get('/admin/orders/live')).json.data.some((x) => x._id === o));
    assert.ok((await T.student.get('/users/me/orders')).json.data.some((x) => x._id === o));
  });

  test('staff status changes are visible to admin and student', async () => {
    for (const s of ['Processing', 'Ready', 'Completed']) {
      assert.equal((await T.staffD.put(`/orders/${T.secondOrder}/status`, { status: s })).status, 200, s);
      assert.equal((await T.admin.get(`/admin/orders/${T.secondOrder}`)).json.data.status, s);
      assert.equal((await T.student.get('/users/me/orders')).json.data.find((x) => x._id === T.secondOrder).status, s);
    }
  });

  test('invalid transitions are rejected for staff and admins alike', async () => {
    assert.equal((await T.staffD.put(`/orders/${T.secondOrder}/status`, { status: 'Processing' })).status, 400);
    assert.equal((await T.admin.put(`/admin/orders/${T.secondOrder}/status`, { status: 'Processing', reason: 'Trying to reopen' })).status, 400);
  });

  test('admin overrides need a reason and are audited', async () => {
    assert.equal((await T.admin.put(`/admin/orders/${T.firstOrder}/status`, { status: 'Cancelled' })).status, 400);
    assert.equal((await T.admin.put(`/admin/orders/${T.firstOrder}/status`, { status: 'Cancelled', reason: 'Automated test: duplicate order' })).status, 200);
    const audit = (await T.admin.get(`/admin/audit?action=order.status.override&q=${T.firstOrder}`)).json.data;
    assert.ok(audit.some((a) => a.result === 'success'));
  });

  test('payments recorded by staff appear in admin reporting; cancelled value is separate', async () => {
    const o = await placeOrder(T.student, [T.item._id]);
    await T.staffD.put(`/orders/${o.json._id}/status`, { status: 'Processing' });
    assert.equal((await T.staffD.put(`/staff/canteens/${T.canteen}/orders/${o.json._id}/payment`, { paid: true })).status, 200);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const a = (await T.admin.get(`/admin/analytics?from=${today}&to=${today}&canteen=${T.canteen}`)).json.data;
    const all = (await T.admin.get(`/admin/orders?canteen=${T.canteen}&from=${today}&to=${today}&limit=100`)).json.data;
    const paid = all.filter((x) => x.status !== 'Cancelled' && x.paymentStatus === 'paid').reduce((s, x) => s + x.totalPrice, 0);
    const cancelled = all.filter((x) => x.status === 'Cancelled').reduce((s, x) => s + x.totalPrice, 0);
    assert.equal(a.summary.collectedRevenue, paid);
    assert.equal(a.summary.cancelledValue, cancelled);
    assert.equal(a.summary.orders, all.length);
  });
});

// ================================================================== student suspension
describe('student suspension', () => {
  test('suspended students keep their history but cannot order; reactivation restores ordering', async () => {
    const first = await placeOrder(T.student2, [T.item._id]);
    assert.equal(first.status, 201);
    assert.equal((await T.admin.put(`/admin/students/${T.student2.me._id}/status`, { status: 'suspended', reason: 'Automated suspension test' })).status, 200);
    const blocked = await placeOrder(T.student2, [T.item._id]);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.code, 'SUSPENDED');
    assert.ok((await T.student2.get('/users/me/orders')).json.data.some((o) => o._id === first.json._id), 'history preserved');
    assert.equal((await T.admin.put(`/admin/students/${T.student2.me._id}/status`, { status: 'active' })).status, 200);
    assert.equal((await placeOrder(T.student2, [T.item._id])).status, 201);
  });
});

// ================================================================== realtime
describe('realtime event scoping', () => {
  const open = async (opts) => {
    const r = await socket(opts);
    sockets.push(r.s);
    return r;
  };

  test('unauthenticated or forged sockets are rejected', async () => {
    assert.equal((await open({})).ok, false);
    assert.equal((await open({ auth: { token: 'not-a-jwt' } })).ok, false);
    assert.equal((await open({ auth: { role: 'admin' }, extraHeaders: { Cookie: 'admin_token=forged' } })).ok, false);
  });

  test('order events reach only the right student, canteen staff and admins', async () => {
    const stu = await open({ auth: { token: T.student.bearer } });
    const stu2 = await open({ auth: { token: T.student2.bearer } });
    const staffD = await open({ auth: { role: 'staff' }, extraHeaders: { Cookie: T.staffD.cookieHeader() } });
    const staffB = await open({ auth: { role: 'staff' }, extraHeaders: { Cookie: T.staffB.cookieHeader() } });
    const adm = await open({ auth: { role: 'admin' }, extraHeaders: { Cookie: T.admin.cookieHeader() } });
    assert.ok([stu, stu2, staffD, staffB, adm].every((x) => x.ok), 'all authenticated sockets connect');
    await wait(200);
    const t0 = Date.now();
    const o = await placeOrder(T.student, [T.item._id]);
    const id = o.json._id;
    const got = (s) => s.s.events.some((e) => e.type === 'order.created' && e.orderId === id);
    const ms = await until(() => got(stu) && got(staffD) && got(adm));
    assert.ok(ms >= 0, 'student, canteen staff and admin received order.created');
    T.realtimeLatency = Date.now() - t0;
    await wait(300);
    assert.equal(got(stu2), false, 'another student does not receive it');
    assert.equal(got(staffB), false, "another canteen's staff do not receive it");
    // Event payloads carry ids only — never order contents or personal data
    const ev = stu.s.events.find((e) => e.orderId === id);
    assert.deepEqual(Object.keys(ev).sort(), ['at', 'canteenId', 'id', 'orderId', 'status', 'type'].sort());

    await T.staffD.put(`/orders/${id}/status`, { status: 'Processing' });
    assert.ok((await until(() => stu.s.events.some((e) => e.type === 'order.updated' && e.orderId === id && e.status === 'Processing'))) >= 0, 'student sees status change');
    await wait(200);
    assert.equal(stu2.s.events.some((e) => e.orderId === id), false);

    await T.admin.put(`/admin/canteens/${T.canteen}/menu/${T.item._id}`, { price: 66 });
    assert.ok((await until(() => stu2.s.events.some((e) => e.type === 'menu.updated' && e.canteenId === T.canteen))) >= 0, 'public menu change reaches students');
    assert.ok((await until(() => staffD.s.events.some((e) => e.type === 'menu.updated'))) >= 0, 'and the canteen’s staff');
    await wait(200);
    assert.equal(staffB.s.events.some((e) => e.type === 'menu.updated' && e.canteenId === T.canteen), false, 'not other canteens’ staff');

    // Suspending the staff account disconnects their socket
    await T.admin.put(`/admin/staff/${T.staffId}/status`, { status: 'suspended', reason: 'Automated realtime test' });
    assert.ok((await until(() => !staffD.s.connected)) >= 0, 'suspended staff socket disconnected');
    await T.admin.put(`/admin/staff/${T.staffId}/status`, { status: 'active' });
    T.staffD = await asStaff(T.staffEmail, T.staffPw);
  });
});

// ================================================================== privacy
describe('privacy', () => {
  test('public endpoints expose no emails or password hashes', async () => {
    const pub = new Client();
    for (const u of ['/canteens/get-canteens', `/canteens/${T.nadhini}/get-canteen`, `/most-ordered-item/${T.nadhini}`, '/app/config', '/app/banners']) {
      const r = await pub.get(u);
      assert.equal(r.status, 200, u);
      assert.ok(!HASH.test(r.text), `${u} has no hashes`);
      assert.ok(!EMAIL.test(r.text.replace(/"contactEmail":"[^"]*"|"email":"[^"]*@[^"]*"(?=,"phone")/g, '')), `${u} has no personal emails`);
    }
  });

  test('student lookups by id are not public', async () => {
    const id = T.student.me._id;
    assert.equal((await new Client().get(`/users/${id}/get-user`)).status, 404);
    assert.equal((await new Client().get(`/users/${id}`)).status, 404);
  });

  test('staff see customer names only; admin APIs never return hashes or tokens', async () => {
    const staffOrders = await T.staffA.get(`/staff/canteens/${T.nadhini}/orders?limit=100`);
    assert.ok(!EMAIL.test(staffOrders.text));
    for (const u of ['/admin/staff', '/admin/students', `/admin/students/${T.student.me._id}`, '/admin/admins', '/admin/audit?limit=100']) {
      const r = await T.admin.get(u);
      assert.ok(!HASH.test(r.text), `${u} has no password hashes`);
      assert.ok(!/setupTokenHash|tokenVersion/.test(r.text), `${u} has no token fields`);
    }
  });

  test('audit log never contains passwords that were set during tests', async () => {
    const dump = (await T.admin.get('/admin/audit?limit=100')).text;
    for (const pw of [T.staffPw, T.studentPw, T.opsPw]) assert.ok(!dump.includes(pw));
  });
});

// ================================================================== content, config & support
describe('announcements, banners, settings and support', () => {
  test('announcements reach only their audience', async () => {
    const forStudents = await T.admin.post('/admin/announcements', { title: `[TEST] Students ${RUN}`, body: 'Automated test announcement', audience: 'students' });
    const forCanteen = await T.admin.post('/admin/announcements', { title: `[TEST] Canteen ${RUN}`, body: 'Automated test announcement', audience: 'canteens', canteen: T.canteen });
    T.announcementIds = [forStudents.json.data._id, forCanteen.json.data._id];
    assert.ok((await T.student.get('/users/announcements')).json.data.some((a) => a._id === T.announcementIds[0]));
    assert.ok((await T.staffD.get(`/staff/canteens/${T.canteen}/announcements`)).json.data.some((a) => a._id === T.announcementIds[1]));
    assert.ok(!(await T.staffB.get(`/staff/canteens/${T.canteenB}/announcements`)).json.data.some((a) => a._id === T.announcementIds[1]), 'other canteens don’t see a targeted announcement');
    assert.ok(!(await T.student.get('/users/announcements')).json.data.some((a) => a._id === T.announcementIds[1]), 'students don’t see canteen announcements');
    await T.admin.put(`/admin/announcements/${T.announcementIds[0]}`, { active: false });
    assert.ok(!(await T.student.get('/users/announcements')).json.data.some((a) => a._id === T.announcementIds[0]), 'deactivated announcement disappears');
  });

  test('banners only accept in-app destinations', async () => {
    assert.equal((await T.admin.post('/admin/banners', { title: 'Bad', target: { type: 'url', url: 'https://evil.example.com' } })).status, 400);
    assert.equal((await T.admin.post('/admin/banners', { title: 'Bad', target: { type: 'search', query: '<script>' } })).status, 400);
    const ok = await T.admin.post('/admin/banners', { title: `[TEST] Banner ${RUN}`, target: { type: 'search', query: 'dosa' }, active: true });
    assert.equal(ok.status, 201);
    assert.ok((await new Client().get('/app/banners')).json.data.some((b) => b._id === ok.json.data._id));
    assert.equal((await T.admin.del(`/admin/banners/${ok.json.data._id}`)).status, 200);
  });

  test('maintenance mode and ordering limits are enforced by the server', async () => {
    assert.equal((await T.admin.put('/admin/settings', { maintenance: { enabled: true, message: 'Automated test' } })).status, 200);
    const blocked = await placeOrder(T.student, [T.item._id]);
    assert.equal(blocked.status, 503);
    assert.equal((await new Client().get('/app/config')).json.data.maintenance.enabled, true);
    await T.admin.put('/admin/settings', { maintenance: { enabled: false } });
    await T.admin.put('/admin/settings', { ordering: { maxQuantityPerItem: 2 } });
    assert.equal((await placeOrder(T.student, [T.item._id, T.item._id, T.item._id])).status, 400);
    assert.equal((await T.admin.put('/admin/settings', { ordering: { maxItemsPerOrder: 0 } })).status, 400, 'invalid values rejected');
    assert.equal((await T.admin.put('/admin/settings', { studentApp: { featuredCanteens: ['000000000000000000000000'] } })).status, 400);
    await T.admin.put('/admin/settings', { ordering: T.settingsBefore.ordering });
  });

  test('support: requesters see replies but never internal notes or other people’s tickets', async () => {
    const t = await T.student.post('/users/support', { category: 'order', subject: `[TEST] Help ${RUN}`, message: 'Automated support test message' });
    assert.equal(t.status, 201);
    const id = t.json.data._id;
    assert.ok((await T.admin.get('/admin/support')).json.data.some((x) => x._id === id));
    await T.admin.post(`/admin/support/${id}/notes`, { text: 'INTERNAL-ONLY-NOTE', visibility: 'internal' });
    await T.admin.post(`/admin/support/${id}/notes`, { text: 'Reply to student', visibility: 'reply' });
    const mine = (await T.student.get('/users/support')).text;
    assert.ok(mine.includes('Reply to student'));
    assert.ok(!mine.includes('INTERNAL-ONLY-NOTE'));
    assert.ok(!(await T.student2.get('/users/support')).text.includes(id), 'other students cannot see it');
    assert.ok(!(await T.staffB.get(`/staff/canteens/${T.canteenB}/support`)).text.includes(id));
    await T.admin.put(`/admin/support/${id}`, { status: 'closed' });
  });
});

after(() => {
  if (T.realtimeLatency != null) console.log(`# realtime: order.created delivered to student, staff and admin within ${T.realtimeLatency} ms`);
});
