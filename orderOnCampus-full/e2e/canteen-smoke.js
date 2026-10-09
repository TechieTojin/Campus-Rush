// Canteen website: real-browser smoke test (login, every page, orders, drawer, responsive, keyboard, logout)
// plus staff isolation between the two test staff accounts.
//   cd e2e && npm run canteen      (API on :5001, canteen site on :5173)
// Read-only apart from signing in and out.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { CANTEEN_URL } = require('./lib');

const WEB = CANTEEN_URL;
const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, 'screenshots', 'canteen');
fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const results = [];
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url()} :: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: pageerror ${e.message.slice(0, 200)}`));
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

  try {
    // Protected route without a session
    await page.goto(`${WEB}/orders`);
    await page.waitForURL('**/login', { timeout: 10000 });
    check('unauthenticated /orders redirects to /login', page.url().endsWith('/login'));
    await shot('01-login');

    // Client validation
    await page.getByRole('button', { name: 'Sign in' }).click();
    check('empty login shows inline validation', await page.getByText('Enter your staff email').isVisible());

    // Wrong password
    await page.locator('input[autocomplete="username"]').fill(process.env.TEST_STAFF_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill('wrong-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByText('Incorrect email or password').waitFor({ timeout: 10000 });
    check('wrong password shows server error inline', true);
    await page.getByRole('button', { name: 'Show password' }).click();
    check('password visibility toggle works', (await page.locator('input[autocomplete="current-password"]').getAttribute('type')) === 'text');
    await shot('02-login-error');

    // Correct login
    await page.locator('input[autocomplete="current-password"]').fill(process.env.TEST_STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/orders', { timeout: 15000 });
    check('login returns to the originally requested page (/orders)', page.url().endsWith('/orders'));
    await page.goto(`${WEB}/dashboard`);
    await page.getByText('Live queue').waitFor();
    await page.waitForLoadState('networkidle');
    const cookies = await context.cookies();
    const token = cookies.find((c) => c.name === 'token');
    check('session cookie is HttpOnly', !!token && token.httpOnly === true);
    const jsVisible = await page.evaluate(() => document.cookie.includes('token=') || Object.keys(localStorage).some((k) => /token|jwt/i.test(k)));
    check('no token readable from page scripts or localStorage', !jsVisible);
    await shot('03-dashboard');

    // Every page via sidebar navigation
    const navs = [
      ['Live orders', '/live', 'Live orders'], ['All orders', '/orders', 'All orders'], ['Notifications', '/notifications', 'Notifications'],
      ['Menu', '/menu', 'Menu'], ['Add menu item', '/menu/new', 'Add a new menu item'], ['Categories', '/categories', 'Categories'],
      ['Availability', '/availability', 'Availability'], ['Sales & analytics', '/analytics', 'Sales & analytics'], ['Customers', '/customers', 'Customers'],
      ['Canteen profile', '/profile', 'Canteen profile'], ['Settings', '/settings', 'Settings'], ['Help & support', '/help', 'Help & support'],
      ['Dashboard', '/dashboard', null],
    ];
    let i = 4;
    for (const [label, url, heading] of navs) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: new RegExp(`^${label.replace(/[&]/g, '\\&')}`) }).click();
      await page.waitForURL(`**${url}`, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      const h1 = heading ? await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: 8000 }).then(() => true, () => false) : true;
      const errorState = await page.getByText('Couldn\u2019t load this').count();
      check(`sidebar → ${label} renders`, h1 && errorState === 0, `${url}${errorState ? ' (error state shown)' : ''}`);
      await shot(`${String(i++).padStart(2, '0')}-${url.replace(/\//g, '_').replace(/^_/, '')}`);
    }

    // Orders page interactions
    await page.goto(`${WEB}/orders`);
    await page.waitForLoadState('networkidle');
    const rows = await page.locator('tbody tr').count();
    check('orders table lists orders', rows > 0, `${rows} rows`);
    await page.getByLabel('Filter by status').selectOption('Completed');
    await page.waitForURL(/status=Completed/, { waitUntil: 'commit' });
    await page.waitForFunction(() => {
      const cells = [...document.querySelectorAll('tbody tr td:nth-child(5)')];
      return cells.length > 0 && cells.every((c) => c.innerText.includes('Completed'));
    }, null, { timeout: 10000 }).catch(() => {});
    const statuses = await page.locator('tbody tr td:nth-child(5)').allInnerTexts();
    check('status filter shows only completed orders', statuses.length > 0 && statuses.every((s) => s.includes('Completed')), `${statuses.length} rows`);
    await page.locator('tbody tr').first().click();
    await page.getByRole('dialog').getByText('Total charged').waitFor({ timeout: 10000 });
    check('order details drawer opens with items table', await page.getByRole('dialog').getByText('Total charged').isVisible());
    check('drawer shows status history and payment sections', await page.getByRole('dialog').getByText('Status history').isVisible() && await page.getByRole('dialog').getByText('Pay at counter').isVisible());
    await shot('20-order-drawer');
    await page.keyboard.press('Escape');
    check('drawer closes with Escape', (await page.getByRole('dialog').count()) === 0);

    // Responsive checks
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of ['/dashboard', '/live', '/menu', '/orders', '/analytics', '/menu/new']) {
      await page.goto(`${WEB}${url}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`mobile 390px ${url}: no horizontal page overflow`, overflow <= 1, `overflow ${overflow}px`);
      await shot(`30-mobile${url.replace(/\//g, '_')}`);
    }
    await page.getByRole('button', { name: 'Open navigation' }).click();
    check('mobile navigation drawer opens', await page.getByRole('navigation', { name: 'Main' }).isVisible());
    await shot('31-mobile-nav');
    await page.getByRole('button', { name: 'Close navigation' }).click();

    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(`${WEB}/live`);
    await page.waitForLoadState('networkidle');
    await shot('32-tablet-live');
    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('tablet 820px live board: no horizontal overflow', tabletOverflow <= 1, `overflow ${tabletOverflow}px`);

    // Keyboard: skip link + focus visible
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
    check('first Tab focuses the skip-to-content link', firstFocus === 'Skip to content', firstFocus);


    // Staff isolation: Staff B sees only their own canteen in the browser.
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const pb = await ctxB.newPage();
    await pb.goto(`${WEB}/login`);
    await pb.locator('input[autocomplete="username"]').fill(process.env.TEST_STAFF2_EMAIL);
    await pb.locator('input[autocomplete="current-password"]').fill(process.env.TEST_STAFF2_PASSWORD);
    await pb.getByRole('button', { name: 'Sign in' }).click();
    await pb.waitForURL('**/dashboard', { timeout: 15000 });
    const sideB = await pb.locator('aside').first().innerText();
    check('staff B sees their own canteen, not Nadhini', !sideB.includes('Nadhini') && sideB.includes('Test Canteen B'));
    await pb.goto(`${WEB}/orders`);
    await pb.waitForLoadState('networkidle');
    check('staff B order list has none of Nadhini’s orders', !(await pb.locator('tbody').innerText().catch(() => '')).includes('Masala Dosa'));
    await pb.screenshot({ path: path.join(SHOTS, '50-staffB-orders.png'), fullPage: true });
    await ctxB.close();
    // Logout
    await page.getByRole('button', { name: /Test Staff|Staff/ }).first().click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
    check('sign out returns to login with confirmation', await page.getByText('You have been signed out.').isVisible());
    await page.goto(`${WEB}/menu`);
    await page.waitForURL('**/login', { timeout: 10000 });
    check('after sign-out, protected routes redirect to login', page.url().endsWith('/login'));
    const cookiesAfter = await context.cookies();
    check('session cookie cleared on sign-out', !cookiesAfter.find((c) => c.name === 'token'));
  } catch (e) {
    check('smoke run completed', false, e.message.split('\n')[0]);
    await shot('99-failure').catch(() => {});
  }

  const relevantErrors = consoleErrors.filter((e) => !/401 \(Unauthorized\)|status of 401/.test(e));
  check('no unexpected console errors', relevantErrors.length === 0, relevantErrors.slice(0, 5).join(' | '));
  console.log(results.join('\n'));
  console.log(`\n${results.length - failures} passed, ${failures} failed · screenshots: ${SHOTS}`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
