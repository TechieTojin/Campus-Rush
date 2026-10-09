const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

export const TZ = 'Asia/Kolkata';

export const money = (n) => inr.format(Number(n || 0));
export const moneyCompact = (n) => (Math.abs(n) >= 100000 ? inrCompact.format(n) : money(n));
export const number = (n) => Number(n || 0).toLocaleString('en-IN');

export const orderRef = (id = '') => `#${String(id).slice(-6).toUpperCase()}`;

export const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
export const dayKeyOffset = (key, days) => {
  const d = new Date(`${key}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
};

export const formatDateTime = (v) =>
  new Date(v).toLocaleString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const formatDate = (v) => new Date(v).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
export const formatTime = (v) => new Date(v).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
export const shortDay = (key) => new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' });
export const weekday = (key) => new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short' });

export const relativeTime = (v, now = Date.now()) => {
  const s = Math.round((now - new Date(v).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return formatDate(v);
};

export const minutesSince = (v, now = Date.now()) => Math.max(0, Math.floor((now - new Date(v).getTime()) / 60000));

export const to12h = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

export const summarizeLines = (lines = []) => lines.map((l) => `${l.quantity}× ${l.name}`).join(', ');

export const toCsv = (rows) =>
  rows
    .map((r) => r.map((c) => {
      const s = c == null ? '' : String(c);
      // Leading =,+,-,@ are neutralised so spreadsheets don't evaluate them as formulas.
      const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    }).join(','))
    .join('\n');

export const downloadCsv = (filename, rows) => {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
