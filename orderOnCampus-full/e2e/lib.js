// Shared browser-test helpers. Credentials come from server/.env and are never printed.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:5174';
const CANTEEN_URL = process.env.CANTEEN_URL || 'http://localhost:5173';

function reporter(name) {
  const results = [];
  let failures = 0;
  const shotsDir = process.env.SHOTS_DIR || path.join(__dirname, 'screenshots', name);
  fs.mkdirSync(shotsDir, { recursive: true });
  return {
    shotsDir,
    check(label, ok, detail = '') {
      if (!ok) failures++;
      results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
      console.log(results[results.length - 1]);
    },
    done() {
      console.log(`\n${results.length - failures} passed, ${failures} failed · screenshots: ${shotsDir}`);
      return failures;
    },
  };
}

async function launch() {
  return chromium.launch({ executablePath: CHROME, headless: process.env.HEADED ? false : true });
}

// Collects console errors and failed API responses for a page.
function watch(page) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 40[13]|401 \(Unauthorized\)|ERR_CONNECTION_REFUSED/.test(m.text())) problems.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 160)}`));
  page.on('response', (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url().replace(/\?.*/, '')}`); });
  return problems;
}

const toastText = async (page) => (await page.locator('[data-toast]').last().innerText({ timeout: 10000 })).replace(/\s+/g, ' ');
// Waits for a toast whose text matches `re` (toasts from earlier actions may still be on screen).
const toastIs = (page, re) => page.locator('[data-toast]', { hasText: re }).last().waitFor({ timeout: 10000 }).then(() => true, () => false);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

module.exports = { ADMIN_URL, CANTEEN_URL, reporter, launch, watch, toastText, toastIs, overflow };
