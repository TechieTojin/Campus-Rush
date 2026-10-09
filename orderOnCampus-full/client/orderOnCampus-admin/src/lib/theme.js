// Light / dark / follow-system theme. Saved on the admin profile and mirrored in localStorage
// so the right theme is applied before the first paint (see index.html).
const KEY = 'cr.admin.theme';
let current = 'system';
let media = null;

const paint = () => {
  const dark = current === 'dark' || (current === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
};

export function applyTheme(theme) {
  current = ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
  try { localStorage.setItem(KEY, current); } catch { /* storage unavailable */ }
  paint();
  if (!media) {
    media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => { if (current === 'system') paint(); });
  }
}

export const storedTheme = () => {
  try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; }
};

export const isDark = () => document.documentElement.classList.contains('dark');
