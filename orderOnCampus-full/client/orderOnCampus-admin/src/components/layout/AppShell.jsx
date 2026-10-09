import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiActivity, FiBarChart2, FiBookOpen, FiClipboard, FiFileText, FiGrid, FiHome, FiImage, FiLayers, FiLifeBuoy, FiLogOut, FiMenu,
  FiMonitor, FiMoon, FiRadio, FiSettings, FiShield, FiSliders, FiSmartphone, FiSun, FiUser, FiUsers, FiUserCheck, FiX, FiChevronDown, FiWifiOff,
} from 'react-icons/fi';
import { api } from '../../lib/api';
import { ADMIN_ROLES } from '../../lib/constants';
import { useOnline } from '../../lib/hooks';
import { useRealtime, useRealtimeStatus } from '../../lib/realtimeContext';
import { useSession } from '../../lib/sessionContext';
import { applyTheme, storedTheme } from '../../lib/theme';
import Button from '../ui/Button';
import { Avatar } from '../ui/Display';
import { Dialog } from '../ui/Overlay';
import GlobalSearch from './GlobalSearch';

const NAV = [
  { group: 'Operations', items: [
    { to: '/', label: 'Overview', icon: FiGrid, end: true },
    { to: '/live', label: 'Live monitor', icon: FiActivity },
    { to: '/orders', label: 'All orders', icon: FiClipboard },
    { to: '/analytics', label: 'Sales & analytics', icon: FiBarChart2 },
  ] },
  { group: 'Platform', items: [
    { to: '/canteens', label: 'Canteens', icon: FiHome, badge: 'pending' },
    { to: '/staff', label: 'Staff', icon: FiUserCheck },
    { to: '/students', label: 'Students', icon: FiUsers },
    { to: '/menu', label: 'Global menu', icon: FiBookOpen },
    { to: '/categories', label: 'Categories', icon: FiLayers },
  ] },
  { group: 'Engagement', items: [
    { to: '/announcements', label: 'Announcements', icon: FiRadio },
    { to: '/banners', label: 'App banners', icon: FiImage },
    { to: '/app-config', label: 'Student app config', icon: FiSmartphone },
    { to: '/support', label: 'Support', icon: FiLifeBuoy, badge: 'support' },
  ] },
  { group: 'Administration', items: [
    { to: '/settings', label: 'Platform settings', icon: FiSliders },
    { to: '/admins', label: 'Admins & roles', icon: FiShield, perm: 'manageAdmins' },
    { to: '/audit', label: 'Audit log', icon: FiFileText },
    { to: '/system', label: 'System health', icon: FiMonitor },
  ] },
];

function Sidebar({ counts, onNavigate }) {
  const { admin } = useSession();
  return (
    <div className="flex flex-col h-full">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-5 h-16 shrink-0">
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <span className="leading-tight">
          <span className="block text-white font-extrabold tracking-tight">Campus Rush</span>
          <span className="block text-accent text-[11px] font-bold uppercase tracking-[0.18em]">Super Admin</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto scroll-thin px-3 pb-4" aria-label="Main">
        {NAV.map((g) => {
          const items = g.items.filter((i) => !i.perm || admin?.permissions?.[i.perm]);
          if (!items.length) return null;
          return (
            <div key={g.group} className="mt-4 first:mt-1">
              <p className="px-3 mb-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-nav-text/50">{g.group}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const count = item.badge ? counts[item.badge] : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) => `flex items-center gap-3 h-9 px-3 rounded-lg text-[13.5px] font-semibold transition-colors ${isActive ? 'bg-white/[0.09] text-white shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'text-nav-text hover:bg-white/[0.05] hover:text-white'}`}
                      >
                        <item.icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {count ? <span className="min-w-[22px] h-[20px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular bg-accent text-nav-deep" aria-label={`${count} need attention`}>{count > 99 ? '99+' : count}</span> : null}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/[0.06] text-[11.5px] text-nav-text/60">Signed in as {ADMIN_ROLES[admin?.role] || 'admin'}</div>
    </div>
  );
}

function RealtimePill() {
  const { status, lastEventAt } = useRealtimeStatus();
  const meta = {
    live: { label: 'Live', dot: 'bg-success animate-pulse2', text: 'text-success' },
    connecting: { label: 'Connecting', dot: 'bg-warning', text: 'text-warning' },
    offline: { label: 'Reconnecting', dot: 'bg-danger', text: 'text-danger' },
    off: { label: 'Off', dot: 'bg-faint', text: 'text-muted' },
  }[status];
  return (
    <span className={`hidden md:inline-flex items-center gap-2 h-8 px-3 rounded-full border border-line text-[12.5px] font-semibold ${meta.text}`} role="status" title={lastEventAt ? `Last update ${new Date(lastEventAt).toLocaleTimeString()}` : 'Realtime updates'}>
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />{meta.label}
    </span>
  );
}

function ThemeSwitch() {
  const { setAdmin } = useSession();
  const [theme, setTheme] = useState(storedTheme);
  const next = { system: 'light', light: 'dark', dark: 'system' }[theme];
  const Icon = { system: FiMonitor, light: FiSun, dark: FiMoon }[theme];
  const change = async () => {
    setTheme(next);
    applyTheme(next);
    try { setAdmin(await api.updateProfile({ theme: next })); } catch { /* preference still applies locally */ }
  };
  return (
    <button type="button" onClick={change} className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-sunken text-body" aria-label={`Theme: ${theme}. Switch to ${next}.`} title={`Theme: ${theme}`}>
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function UserMenu() {
  const { admin, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-full hover:bg-sunken">
        <Avatar name={admin?.name} size="h-8 w-8 text-[12px]" />
        <span className="hidden lg:block text-[13.5px] font-semibold text-ink max-w-[140px] truncate">{admin?.name}</span>
        <FiChevronDown className="h-4 w-4 text-muted" aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-64 card p-1.5 shadow-raised animate-pop-in z-40">
          <div className="px-3 py-2 border-b border-divider mb-1">
            <p className="font-semibold text-ink truncate">{admin?.name}</p>
            <p className="text-[12.5px] text-muted truncate">{admin?.email}</p>
            <p className="text-[12px] text-accent font-semibold mt-0.5">{ADMIN_ROLES[admin?.role]}</p>
          </div>
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-sunken font-medium text-ink"><FiUser className="h-4 w-4" aria-hidden />Profile & security</Link>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-sunken font-medium text-ink"><FiSettings className="h-4 w-4" aria-hidden />Platform settings</Link>
          <button role="menuitem" type="button" onClick={async () => { await signOut(); navigate('/login', { replace: true, state: { signedOut: true } }); }} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-danger/10 text-danger font-semibold"><FiLogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
      ) : null}
    </div>
  );
}

function SessionExpiredDialog() {
  const { status, expiredReason } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const go = () => navigate('/login', { replace: true, state: { from: location.pathname + location.search } });
  return (
    <Dialog open={status === 'expired'} onClose={go} title="Your session has ended" size="sm" footer={<Button onClick={go} data-autofocus>Sign in again</Button>}>
      <p className="text-body">{expiredReason || 'Admin sessions end after 8 hours or when your password changes.'} Sign in again to continue — unsaved changes on this page may be lost.</p>
    </Dialog>
  );
}

export default function AppShell() {
  const [mobileNav, setMobileNav] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, support: 0 });
  const location = useLocation();
  const online = useOnline();

  useEffect(() => { setMobileNav(false); }, [location.pathname]);

  const refreshCounts = useCallback(async () => {
    const [c, s] = await Promise.allSettled([api.canteens({ status: 'pending' }), api.tickets({ status: 'unresolved' })]);
    setCounts({
      pending: c.status === 'fulfilled' ? c.value.data.length : 0,
      support: s.status === 'fulfilled' ? (s.value.counts.open || 0) + (s.value.counts.in_progress || 0) : 0,
    });
  }, []);
  useEffect(() => { refreshCounts(); }, [refreshCounts]);
  useRealtime(['canteen.updated', 'support.updated'], refreshCounts, { debounceMs: 600 });

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:bg-surface focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-raised">Skip to content</a>
      <div className="min-h-screen lg:pl-[260px]">
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-[260px] bg-nav z-30 border-r border-white/[0.04]">
          <Sidebar counts={counts} />
        </aside>
        {mobileNav ? (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/55 animate-fade-in" onClick={() => setMobileNav(false)} aria-hidden />
            <aside className="relative w-[280px] max-w-[85vw] h-full bg-nav animate-rise-in" aria-label="Navigation">
              <button type="button" onClick={() => setMobileNav(false)} aria-label="Close navigation" className="absolute top-4 right-3 h-8 w-8 rounded-lg text-white/80 hover:bg-white/10 flex items-center justify-center"><FiX className="h-5 w-5" /></button>
              <Sidebar counts={counts} onNavigate={() => setMobileNav(false)} />
            </aside>
          </div>
        ) : null}

        <header className="sticky top-0 z-20 h-16 bg-canvas/85 backdrop-blur border-b border-line/70 flex items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setMobileNav(true)} className="lg:hidden h-10 w-10 -ml-1 rounded-lg flex items-center justify-center hover:bg-sunken text-ink" aria-label="Open navigation">
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 flex"><GlobalSearch /></div>
          <RealtimePill />
          <ThemeSwitch />
          <UserMenu />
        </header>

        {!online ? (
          <div className="bg-ink text-canvas text-[13px] px-6 py-2 flex items-center gap-2" role="status"><FiWifiOff className="h-4 w-4" aria-hidden />You’re offline. Changes can’t be saved until the connection is back.</div>
        ) : null}

        <main id="main" tabIndex={-1} className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1500px] mx-auto outline-none">
          <Outlet />
        </main>
      </div>
      <SessionExpiredDialog />
    </>
  );
}
