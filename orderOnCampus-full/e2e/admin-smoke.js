// Super Admin website: real-browser smoke + workflow test.
//   cd e2e && npm install && npm run admin     (API on :5001, admin site on :5174, canteen site on :5173)
// Creates clearly labelled "[TEST]" records (a canteen, a staff account, a menu item, an announcement,
// a banner); it does not modify existing canteens, students or orders.
const path = require('path');
const crypto = require('crypto');
const { ADMIN_URL, CANTEEN_URL, reporter, launch, watch, toastText, toastIs, overflow } = require('./lib');

const RUN = Date.now().toString(36);
const R = reporter('admin');
const shot = (page, name) => page.screenshot({ path: path.join(R.shotsDir, `${name}.png`), fullPage: true });
const record = { canteen: null, staffEmail: null, item: null };

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const problems = watch(page);
  const go = async (url) => { await page.goto(ADMIN_URL + url); await page.waitForLoadState('networkidle'); };
  const h1 = (name) => page.getByRole('heading', { level: 1, name }).waitFor({ timeout: 10000 }).then(() => true, () => false);

  try {
    // ---- authentication
    await page.goto(`${ADMIN_URL}/staff`);
    await page.waitForURL('**/login');
    R.check('protected route redirects to /login', page.url().endsWith('/login'));
    await page.getByRole('button', { name: 'Sign in' }).click();
    R.check('empty form shows validation', await page.getByText('Enter your admin email').isVisible());
    // Unknown account (gets the same message as a wrong password, so this doesn't use up the real account's failure budget)
    await page.locator('input[autocomplete="username"]').fill(`nobody.${RUN}@campusrush.test`);
    await page.locator('input[autocomplete="current-password"]').fill('Definitely-wrong-1');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByText('Incorrect email or password').waitFor({ timeout: 10000 });
    R.check('invalid login shows a clear error', true);
    await shot(page, '01-login-error');
    await page.locator('input[autocomplete="username"]').fill(process.env.ADMIN_BOOTSTRAP_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(process.env.ADMIN_BOOTSTRAP_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/staff', { timeout: 15000 });
    R.check('login returns to the requested page', page.url().endsWith('/staff'));
    const cookies = await ctx.cookies();
    R.check('admin session cookie is HttpOnly', cookies.find((c) => c.name === 'admin_token')?.httpOnly === true);
    R.check('session not readable by page scripts', !(await page.evaluate(() => document.cookie.includes('admin_token') || Object.keys(localStorage).some((k) => /token/i.test(k)))));

    // ---- every page
    const pages = [
      ['Overview', '/', /Welcome back/], ['Live monitor', '/live', 'Live monitor'], ['All orders', '/orders', 'All orders'], ['Sales & analytics', '/analytics', 'Sales & analytics'],
      ['Canteens', '/canteens', 'Canteens'], ['Staff', '/staff', 'Staff'], ['Students', '/students', 'Students'], ['Global menu', '/menu', 'Global menu'], ['Categories', '/categories', 'Categories'],
      ['Announcements', '/announcements', 'Announcements'], ['App banners', '/banners', 'App banners'], ['Student app config', '/app-config', 'Student app configuration'], ['Support', '/support', 'Support'],
      ['Platform settings', '/settings', 'Platform settings'], ['Admins & roles', '/admins', 'Admins & roles'], ['Audit log', '/audit', 'Audit log'], ['System health', '/system', 'System health'],
    ];
    let n = 2;
    for (const [label, url, heading] of pages) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: new RegExp(`^${label.replace(/[&]/g, '\\&')}`) }).click();
      await page.waitForURL(`**${url === '/' ? '/' : url}`, { timeout: 10000 });
      const ok = await h1(heading);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      const err = await page.getByText('Couldn’t load this').count();
      R.check(`page: ${label}`, ok && !err, err ? 'error state shown' : url);
      await shot(page, `${String(n++).padStart(2, '0')}-${label.replace(/[^a-z]+/gi, '-').toLowerCase()}`);
    }
    await go('/profile');
    R.check('page: Profile & security', await h1('Profile & security'));

    // ---- live data on overview
    await go('/');
    const card = page.locator('main a[href="/students"]').first();
    await page.waitForFunction(() => /Students\s+\d+/.test(document.querySelector('main a[href="/students"]')?.innerText || ''), null, { timeout: 10000 }).catch(() => {});
    const studentsCard = await card.innerText();
    R.check('overview shows database totals', /Students\s+\d+/.test(studentsCard), studentsCard.replace(/\s+/g, ' ').slice(0, 60));

    // ---- Scenario A: create a canteen
    await go('/canteens');
    await page.getByRole('button', { name: 'Create canteen' }).first().click();
    const name = `[TEST] Browser Canteen ${RUN}`;
    await page.getByLabel('Canteen name').fill(name);
    await page.getByLabel('Location on campus').fill('Browser test block');
    await page.getByLabel('Type').selectOption('Cafe');
    await page.getByRole('dialog').getByRole('button', { name: 'Create canteen' }).click();
    await page.waitForURL('**/canteens/*', { timeout: 10000 });
    record.canteen = page.url().split('/').pop();
    R.check('admin creates a canteen', await h1(name), await toastText(page));
    await page.getByRole('button', { name: 'Edit profile' }).click();
    await page.getByLabel('Description').fill('Created by the automated browser test.');
    await page.getByLabel('Pickup instructions').fill('Counter 1');
    await page.getByRole('button', { name: 'Save changes' }).click();
    R.check('admin edits canteen profile', await toastIs(page, /saved/));
    await page.getByRole('button', { name: 'Suspend' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Suspend canteen' }).click();
    R.check('suspension requires a reason', await page.getByText('Give a reason of at least 5 characters').isVisible());
    await page.getByLabel('Reason').fill('Browser test suspension');
    await page.getByRole('dialog').getByRole('button', { name: 'Suspend canteen' }).click();
    await page.getByText('Suspended — reason shown to staff').waitFor({ timeout: 10000 });
    R.check('canteen suspended with reason', true);
    await shot(page, '30-canteen-suspended');
    await page.getByRole('button', { name: 'Reactivate' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reactivate' }).click();
    await page.getByText('Accepting orders').or(page.getByText('Ordering paused')).first().waitFor({ timeout: 10000 });
    R.check('canteen reactivated', !(await page.getByText('Suspended — reason shown to staff').count()));

    // ---- Scenario A: create staff, assign, staff completes setup on the canteen website
    await go('/staff');
    await page.getByRole('button', { name: 'Create staff account' }).first().click();
    record.staffEmail = `browser.staff.${RUN}@campusrush.test`;
    await page.getByLabel('Full name').fill(`[TEST] Browser Staff ${RUN}`);
    await page.getByLabel('Work email').fill(record.staffEmail);
    await page.getByRole('dialog').getByRole('checkbox', { name }).check();
    await page.getByRole('button', { name: 'Create and get setup link' }).click();
    const link = await page.locator('[data-setup-link]').innerText({ timeout: 10000 });
    R.check('staff created; one-time setup link shown', /\/setup-password\?token=[a-f0-9]{64}$/.test(link));
    await shot(page, '31-setup-link');
    await page.getByRole('button', { name: 'Done' }).click();

    const staffCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const sp = await staffCtx.newPage();
    const staffProblems = watch(sp);
    await sp.goto(link.replace('http://localhost:5173', CANTEEN_URL));
    const staffPw = `Bt${crypto.randomBytes(6).toString('hex')}9`;
    await sp.getByLabel('New password').fill(staffPw);
    await sp.getByLabel('Confirm password').fill(staffPw);
    await sp.getByRole('button', { name: 'Set password and sign in' }).click();
    await sp.waitForURL('**/dashboard', { timeout: 15000 });
    R.check('assigned staff signs in to the canteen website for the new canteen', (await sp.locator('aside').first().innerText()).includes(name));
    await sp.screenshot({ path: path.join(R.shotsDir, '32-staff-canteen-dashboard.png'), fullPage: true });

    // ---- Global menu: add item with photo, edit price, availability
    const img = path.join(R.shotsDir, 'upload-test.jpg');
    const art = await browser.newPage();
    await art.setContent('<div id="a" style="width:640px;height:480px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0E6B6B,#F29E38);font:800 70px system-ui;color:white">TEST 🍜</div>');
    await art.locator('#a').screenshot({ path: img, type: 'jpeg', quality: 80 });
    await art.close();
    await go('/menu');
    await page.getByRole('button', { name: 'Add item' }).first().click();
    await page.getByRole('dialog').getByLabel('Canteen').selectOption({ label: name });
    record.item = `[TEST] Browser Noodles ${RUN}`;
    await page.getByRole('dialog').getByLabel(/^Item name/).fill(record.item);
    await page.getByRole('dialog').getByLabel(/^Price/).fill('70');
    await page.getByRole('dialog').locator('input[type=file]').setInputFiles(img);
    await page.getByText('Saved to server').waitFor({ timeout: 15000 });
    await page.getByRole('dialog').getByRole('button', { name: 'Add item' }).click();
    R.check('admin adds an item with an uploaded photo', await toastIs(page, /added/));
    const row = page.getByRole('row', { name: new RegExp(record.item.replace(/[[\]]/g, '\\$&')) });
    await row.waitFor({ timeout: 10000 });
    R.check('item photo renders in admin list', await row.locator('img').count() === 1);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').getByLabel(/^Price/).fill('75');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const priceOk = await toastIs(page, /updated/);
    await shot(page, '33a-after-price-edit');
    R.check('admin edits the price', priceOk);
    R.check('new price shown', await row.getByText('₹75').waitFor({ timeout: 8000 }).then(() => true, () => false));
    await row.getByRole('switch').click({ force: true });
    const availOk = await toastIs(page, /sold out/);
    R.check('admin toggles availability', availOk);
    await shot(page, '33-global-menu');

    // Staff website sees the admin's item, price and photo without reloading (realtime)
    await sp.goto(`${CANTEEN_URL}/menu`);
    const staffRow = sp.getByRole('row', { name: new RegExp(record.item.replace(/[[\]]/g, '\\$&')) });
    await staffRow.getByText('₹75').waitFor({ timeout: 10000 }).catch(() => {});
    R.check('canteen website shows the admin-added item, price and photo', (await staffRow.innerText()).includes('₹75') && (await staffRow.locator('img').count()) === 1);
    await row.getByRole('switch').click({ force: true });
    const t0 = Date.now();
    await staffRow.getByRole('switch').and(sp.locator(':checked')).waitFor({ timeout: 8000 }).catch(() => {});
    R.check('availability change reaches the open canteen website live', await staffRow.getByRole('switch').isChecked(), `${Date.now() - t0} ms`);

    // ---- Categories
    await go(`/categories?canteen=${record.canteen}`);
    await page.getByLabel(/New category for/).fill('Browser Specials');
    await page.getByRole('button', { name: 'Add category' }).click();
    R.check('admin adds a category for a canteen', await toastIs(page, /added/));

    // ---- Students & orders
    await go('/students');
    await page.locator('tbody tr').first().click();
    await page.getByRole('dialog').getByText('Order history').waitFor({ timeout: 10000 });
    R.check('student drawer shows profile and history', await page.getByRole('dialog').getByText('Suspend account').or(page.getByRole('dialog').getByText('Reactivate account')).first().isVisible());
    await shot(page, '34-student-drawer');
    await page.keyboard.press('Escape');
    await go('/orders');
    await page.locator('tbody tr').first().click();
    await page.getByRole('dialog').getByText('Total charged').waitFor({ timeout: 10000 });
    R.check('order drawer shows items, history and payment', await page.getByRole('dialog').getByText('Status history').isVisible());
    await page.keyboard.press('Escape');

    // ---- Announcements & banners
    await go('/announcements');
    await page.getByRole('button', { name: 'New announcement' }).first().click();
    await page.getByRole('dialog').getByLabel(/^Title/).fill(`[TEST] Browser announcement ${RUN}`);
    await page.getByLabel('Message').fill('Automated browser test — please ignore.');
    await page.getByLabel('Audience').selectOption('canteens');
    await page.getByLabel('Canteens').selectOption({ label: `Only ${name}` });
    await page.getByRole('button', { name: 'Publish' }).click();
    R.check('admin publishes a canteen announcement', await toastIs(page, /published/i));
    await sp.getByText(`Campus Rush: [TEST] Browser announcement ${RUN}`).waitFor({ timeout: 8000 }).then(() => R.check('announcement appears on the open canteen website live', true), () => R.check('announcement appears on the open canteen website live', false));
    await go('/banners');
    await page.getByRole('button', { name: 'New banner' }).first().click();
    await page.getByRole('dialog').getByLabel(/^Title/).fill(`[TEST] Banner ${RUN}`);
    await page.getByLabel('When tapped').selectOption('search');
    await page.getByLabel('Search text').fill('noodles');
    await page.getByRole('button', { name: 'Create banner' }).click();
    R.check('admin creates a student-app banner', await toastIs(page, /created/i));
    await shot(page, '35-banners');

    // ---- Audit, system, theme
    await go(`/audit?q=${record.canteen}`);
    await page.waitForTimeout(600);
    R.check('audit log records the canteen actions', (await page.locator('tbody tr').count()) >= 3);
    await shot(page, '36-audit');
    await go('/system');
    R.check('system health reports database and realtime', await page.getByText('All observed services are healthy.').isVisible() || await page.getByText('Warnings').isVisible());
    await go('/');
    // Cycle the theme switch until dark (system → light → dark), whatever the saved preference was.
    for (let i = 0; i < 3 && !(await page.getByRole('button', { name: /^Theme: dark/ }).count()); i++) { await page.getByRole('button', { name: /^Theme:/ }).click(); await page.waitForTimeout(250); }
    R.check('dark theme applies', await page.evaluate(() => document.documentElement.classList.contains('dark')));
    await shot(page, '37-overview-dark');
    await page.getByRole('button', { name: /^Theme:/ }).click(); // dark → system
    await page.waitForTimeout(250);

    // ---- Responsive
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of ['/', '/canteens', '/orders', '/live', '/menu', `/canteens/${record.canteen}`]) {
      await go(url);
      await page.waitForTimeout(500);
      const o = await overflow(page);
      R.check(`mobile 390px ${url}: no horizontal overflow`, o <= 1, `${o}px`);
      await shot(page, `40-mobile${url.replace(/[^a-z0-9]+/gi, '-')}`);
    }
    await page.getByRole('button', { name: 'Open navigation' }).click();
    R.check('mobile navigation opens', await page.getByRole('navigation', { name: 'Main' }).isVisible());
    await page.getByRole('button', { name: 'Close navigation' }).click();
    await page.setViewportSize({ width: 820, height: 1180 });
    await go('/live');
    R.check('tablet 820px live monitor: no horizontal overflow', (await overflow(page)) <= 1);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- Logout
    await go('/');
    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
    await page.goto(`${ADMIN_URL}/settings`);
    await page.waitForURL('**/login');
    R.check('after sign-out protected routes redirect to login', page.url().endsWith('/login'));
    R.check('no unexpected console/network errors (admin)', problems.length === 0, problems.slice(0, 4).join(' | '));
    R.check('no unexpected console/network errors (staff)', staffProblems.length === 0, staffProblems.slice(0, 4).join(' | '));
    await staffCtx.close();
  } catch (e) {
    R.check('run completed', false, e.message.split('\n')[0]);
    await shot(page, '99-failure').catch(() => {});
  }
  // Tidy up: hide this run's records from students (kept, not deleted, so the audit trail stays complete).
  try {
    const { asAdmin } = require('../server/tests/helpers');
    const api = await asAdmin();
    if (record.canteen) await api.put(`/admin/canteens/${record.canteen}/status`, { status: 'suspended', reason: 'Browser test canteen (hidden after test)' });
    const staff = (await api.get(`/admin/staff?q=${encodeURIComponent(record.staffEmail || 'none')}`)).json.data[0];
    if (staff) await api.put(`/admin/staff/${staff._id}/status`, { status: 'suspended', reason: 'Browser test account' });
    for (const b of (await api.get('/admin/banners')).json.data.filter((x) => x.title.includes(RUN))) await api.del(`/admin/banners/${b._id}`);
    for (const n of (await api.get('/admin/announcements')).json.data.filter((x) => x.title.includes(RUN))) await api.put(`/admin/announcements/${n._id}`, { active: false });
    console.log('cleanup: test canteen and staff suspended, banner deleted, announcement deactivated');
  } catch (e) { console.log(`cleanup failed: ${e.message}`); }
  console.log(`test records: ${JSON.stringify(record)}`);
  await browser.close();
  process.exit(R.done() ? 1 : 0);
})();
