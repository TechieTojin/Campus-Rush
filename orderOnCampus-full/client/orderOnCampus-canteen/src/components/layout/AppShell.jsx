import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiActivity, FiBarChart2, FiBell, FiBookOpen, FiChevronDown, FiClipboard, FiGrid, FiHelpCircle, FiLayers,
  FiLogOut, FiMenu, FiPlusCircle, FiSettings, FiShoppingBag, FiToggleRight, FiUsers, FiWifiOff, FiX, FiHome,
} from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { usePolling, useOnline } from '../../lib/hooks';
import { useSession } from '../../lib/sessionContext';
import Button from '../ui/Button';
import { Avatar, Thumb } from '../ui/Display';
import { useToast } from '../ui/useToast';
import { ShellContext } from './useShell';
import { ConfirmDialog, Dialog } from '../ui/Overlay';

const NAV = [
  { group: 'Operations', items: [
    { to: '/dashboard', label: 'Dashboard', icon: FiGrid },
    { to: '/live', label: 'Live orders', icon: FiActivity, badge: 'waiting' },
    { to: '/orders', label: 'All orders', icon: FiClipboard },
    { to: '/notifications', label: 'Notifications', icon: FiBell, badge: 'unread' },
  ] },
  { group: 'Menu', items: [
    { to: '/menu', label: 'Menu', icon: FiBookOpen, end: true },
    { to: '/menu/new', label: 'Add menu item', icon: FiPlusCircle },
    { to: '/categories', label: 'Categories', icon: FiLayers },
    { to: '/availability', label: 'Availability', icon: FiToggleRight },
  ] },
  { group: 'Business', items: [
    { to: '/analytics', label: 'Sales & analytics', icon: FiBarChart2 },
    { to: '/customers', label: 'Customers', icon: FiUsers },
  ] },
  { group: 'Canteen', items: [
    { to: '/profile', label: 'Canteen profile', icon: FiHome },
    { to: '/settings', label: 'Settings', icon: FiSettings },
    { to: '/help', label: 'Help & support', icon: FiHelpCircle },
  ] },
];

// Short two-tone chime via Web Audio (no audio files needed).
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t);
      o.stop(t + 0.32);
    });
    setTimeout(() => ctx.close(), 900);
  } catch { /* audio blocked until the user interacts with the page */ }
}

function Sidebar({ counts, onNavigate }) {
  const { canteen } = useSession();
  return (
    <div className="flex flex-col h-full">
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <span className="leading-tight">
          <span className="block text-white font-extrabold tracking-tight">Campus Rush</span>
          <span className="block text-brand-200 text-[11.5px] font-semibold uppercase tracking-[0.14em]">Canteen portal</span>
        </span>
      </Link>
      {canteen ? (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-white/[0.07] flex items-center gap-3">
          <Thumb src={canteen.logo} name={canteen.name} className="h-9 w-9" rounded="rounded-lg" />
          <div className="min-w-0">
            <p className="text-white font-semibold truncate text-[13.5px]">{canteen.name}</p>
            <p className={`text-[12px] font-semibold flex items-center gap-1.5 ${canteen.openStatus ? 'text-emerald-300' : 'text-saffron-200'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${canteen.openStatus ? 'bg-emerald-400' : 'bg-saffron-400'}`} />
              {canteen.openStatus ? 'Accepting orders' : 'Not accepting orders'}
            </p>
          </div>
        </div>
      ) : null}
      <nav className="flex-1 overflow-y-auto scroll-thin px-3 pb-4" aria-label="Main">
        {NAV.map((g) => (
          <div key={g.group} className="mt-3 first:mt-0">
            <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-200/60">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const count = item.badge ? counts[item.badge] : 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) => `group flex items-center gap-3 h-10 px-3 rounded-lg text-[14px] font-semibold transition-colors ${isActive ? 'bg-white text-brand-800 shadow-sm' : 'text-brand-50/80 hover:bg-white/[0.08] hover:text-white'}`}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count ? (
                        <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11.5px] font-bold flex items-center justify-center tabular ${item.badge === 'waiting' ? 'bg-saffron-500 text-ink' : 'bg-white/20 text-white group-[.active]:bg-brand-100'}`} aria-label={`${count} ${item.badge === 'waiting' ? 'new orders waiting' : 'unread'}`}>
                          {count > 99 ? '99+' : count}
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function OpenStatusSwitch() {
  const { canteen, updateCanteenSummary } = useSession();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!canteen) return null;
  const set = async (open) => {
    setBusy(true);
    try {
      const updated = await api.updateCanteen(canteen._id, { openStatus: open });
      updateCanteenSummary({ _id: canteen._id, openStatus: updated.openStatus });
      toast.success(open ? 'Students can place orders again.' : 'Students can no longer place new orders.', { title: open ? 'Canteen open' : 'Canteen paused' });
      setConfirm(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={() => (canteen.openStatus ? setConfirm(true) : set(true))}
        disabled={busy}
        className={`hidden sm:inline-flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full border text-[13px] font-semibold transition-colors ${canteen.openStatus ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-saffron-200 bg-saffron-50 text-saffron-700 hover:bg-saffron-100'}`}
        aria-label={canteen.openStatus ? 'Accepting orders. Click to pause ordering.' : 'Not accepting orders. Click to open for orders.'}
      >
        <span className={`h-2 w-2 rounded-full ${canteen.openStatus ? 'bg-emerald-500 animate-pulse2' : 'bg-saffron-500'}`} />
        {canteen.openStatus ? 'Open for orders' : 'Ordering paused'}
      </button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => set(false)}
        loading={busy}
        tone="primary"
        title="Pause ordering?"
        confirmLabel="Pause ordering"
        message="Students will see the canteen as closed and won't be able to place new orders. Orders already in the queue are not affected."
      />
    </>
  );
}

function UserMenu() {
  const { staff, signOut } = useSession();
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
  const logout = async () => { await signOut(); navigate('/login', { replace: true, state: { signedOut: true } }); };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-full hover:bg-sunken">
        <Avatar name={staff?.username} size="h-8 w-8 text-[12px]" />
        <span className="hidden md:block text-[13.5px] font-semibold text-ink max-w-[140px] truncate">{staff?.username}</span>
        <FiChevronDown className="h-4 w-4 text-muted" aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-60 card p-1.5 shadow-raised animate-pop-in z-40">
          <div className="px-3 py-2 border-b border-divider mb-1">
            <p className="font-semibold text-ink truncate">{staff?.username}</p>
            <p className="text-[12.5px] text-muted truncate">{staff?.email}</p>
          </div>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-sunken font-medium"><FiSettings className="h-4 w-4" aria-hidden />Account settings</Link>
          <Link role="menuitem" to="/help" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-sunken font-medium"><FiHelpCircle className="h-4 w-4" aria-hidden />Help & support</Link>
          <button role="menuitem" type="button" onClick={logout} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-red-50 text-red-700 font-semibold"><FiLogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
      ) : null}
    </div>
  );
}

export default function AppShell() {
  const { canteen, staff, status } = useSession();
  const [mobileNav, setMobileNav] = useState(false);
  const [counts, setCounts] = useState({ unread: 0, waiting: 0 });
  const lastSeenOrder = useRef(null);
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const cid = canteen?._id;

  useEffect(() => { setMobileNav(false); }, [location.pathname]);

  const refreshCounts = useCallback(async () => {
    if (!cid) return;
    try {
      const res = await api.activity(cid, { limit: 1, type: 'placed' });
      setCounts({ unread: res.unread, waiting: res.waiting });
      const latestId = res.data[0]?._id || '';
      if (lastSeenOrder.current !== null && latestId && latestId !== lastSeenOrder.current) {
        toast.info(res.data[0].message, { title: 'New order received', duration: 8000 });
        if (staff?.preferences?.soundOnNewOrder !== false) chime();
      }
      lastSeenOrder.current = latestId;
    } catch { /* badge refresh is best-effort; pages show their own errors */ }
  }, [cid, staff?.preferences?.soundOnNewOrder, toast]);

  useEffect(() => { lastSeenOrder.current = null; refreshCounts(); }, [refreshCounts]);
  usePolling(refreshCounts, 15000, !!cid && status === 'signedIn');

  return (
    <ShellContext.Provider value={{ counts, refreshCounts }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-raised">Skip to content</a>
      <div className="min-h-screen lg:pl-[264px]">
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-[264px] bg-gradient-to-b from-brand-800 to-brand-900 z-30">
          <Sidebar counts={counts} />
        </aside>
        {mobileNav ? (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setMobileNav(false)} aria-hidden />
            <aside className="relative w-[280px] max-w-[85vw] h-full bg-gradient-to-b from-brand-800 to-brand-900 animate-rise-in" aria-label="Navigation">
              <button type="button" onClick={() => setMobileNav(false)} aria-label="Close navigation" className="absolute top-4 right-3 h-8 w-8 rounded-lg text-white/80 hover:bg-white/10 flex items-center justify-center"><FiX className="h-5 w-5" /></button>
              <Sidebar counts={counts} onNavigate={() => setMobileNav(false)} />
            </aside>
          </div>
        ) : null}

        <header className="sticky top-0 z-20 h-16 bg-canvas/85 backdrop-blur border-b border-line/70 flex items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setMobileNav(true)} className="lg:hidden h-10 w-10 -ml-1 rounded-lg flex items-center justify-center hover:bg-sunken" aria-label="Open navigation">
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="lg:hidden font-bold text-ink truncate">{canteen?.name}</p>
          </div>
          <OpenStatusSwitch />
          <Button variant="soft" size="sm" to="/live" icon={FiShoppingBag} className="hidden md:inline-flex">
            Live orders{counts.waiting ? ` · ${counts.waiting} new` : ''}
          </Button>
          <button type="button" onClick={() => navigate('/notifications')} className="relative h-10 w-10 rounded-full flex items-center justify-center hover:bg-sunken" aria-label={`Notifications${counts.unread ? `, ${counts.unread} unread` : ''}`}>
            <FiBell className="h-5 w-5 text-body" />
            {counts.unread ? <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10.5px] font-bold flex items-center justify-center tabular">{counts.unread > 9 ? '9+' : counts.unread}</span> : null}
          </button>
          <UserMenu />
        </header>

        {!online ? (
          <div className="bg-ink text-white text-[13px] px-6 py-2 flex items-center gap-2" role="status"><FiWifiOff className="h-4 w-4" aria-hidden />You’re offline. Changes can’t be saved until the connection is back.</div>
        ) : null}

        <main id="main" tabIndex={-1} className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px] mx-auto outline-none">
          <Outlet />
        </main>
      </div>
      <SessionExpiredDialog />
    </ShellContext.Provider>
  );
}

function SessionExpiredDialog() {
  const { status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Dialog
      open={status === 'expired'}
      onClose={() => navigate('/login', { replace: true, state: { from: location.pathname } })}
      title="Your session has expired"
      size="sm"
      footer={<Button onClick={() => navigate('/login', { replace: true, state: { from: location.pathname } })} data-autofocus>Sign in again</Button>}
    >
      <p className="text-body">For security, staff sessions end after 24 hours. Sign in again to continue — unsaved changes on this page may be lost.</p>
    </Dialog>
  );
}
