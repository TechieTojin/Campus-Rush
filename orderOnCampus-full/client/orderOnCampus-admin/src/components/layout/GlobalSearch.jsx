import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiHome, FiSearch, FiUser, FiUsers } from 'react-icons/fi';
import { api } from '../../lib/api';
import { money, orderRef } from '../../lib/format';
import { Spinner } from '../ui/Feedback';

// Searches canteens, staff, students and orders through the normal admin APIs.
export default function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const box = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName))) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return undefined; }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const [canteens, staff, students, orders] = await Promise.allSettled([
        api.canteens({ q: term }), api.staff({ q: term }), api.students({ q: term, limit: 5 }), api.orders({ q: term, limit: 5 }),
      ]);
      if (!alive) return;
      const list = [];
      if (canteens.status === 'fulfilled') canteens.value.data.slice(0, 5).forEach((c) => list.push({ key: `c${c._id}`, icon: FiHome, group: 'Canteens', title: c.name, sub: c.location, to: `/canteens/${c._id}` }));
      if (staff.status === 'fulfilled') staff.value.slice(0, 5).forEach((s) => list.push({ key: `s${s._id}`, icon: FiUser, group: 'Staff', title: s.name, sub: s.email, to: `/staff?open=${s._id}` }));
      if (students.status === 'fulfilled') students.value.data.forEach((s) => list.push({ key: `u${s._id}`, icon: FiUsers, group: 'Students', title: s.name, sub: s.email, to: `/students?open=${s._id}` }));
      if (orders.status === 'fulfilled') orders.value.data.forEach((o) => list.push({ key: `o${o._id}`, icon: FiClipboard, group: 'Orders', title: `${orderRef(o._id)} · ${money(o.totalPrice)}`, sub: `${o.canteen.name} · ${o.customer.name}`, to: `/orders?open=${o._id}` }));
      setResults(list);
      setActive(0);
      setLoading(false);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const go = (r) => { setOpen(false); setQ(''); navigate(r.to); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && results[active]) go(results[active]);
    if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
  };

  return (
    <div className="relative w-full max-w-md" ref={box}>
      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint pointer-events-none" aria-hidden />
      <input
        ref={input}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search canteens, staff, students, orders…"
        aria-label="Search the platform"
        role="combobox"
        aria-expanded={open && q.trim().length >= 2}
        aria-controls="global-search-results"
        className="input h-10 pl-10 pr-14 bg-sunken/60"
      />
      <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-faint border border-line rounded px-1.5 py-0.5">Ctrl K</kbd>
      {open && q.trim().length >= 2 ? (
        <div id="global-search-results" role="listbox" className="absolute left-0 right-0 mt-2 card p-1.5 shadow-raised z-40 max-h-[420px] overflow-y-auto scroll-thin animate-pop-in">
          {loading ? <p className="px-3 py-3 text-muted flex items-center gap-2"><Spinner className="h-4 w-4" />Searching…</p> : !results.length ? (
            <p className="px-3 py-3 text-muted">No matches for “{q.trim()}”.</p>
          ) : results.map((r, i) => (
            <button key={r.key} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(r)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${i === active ? 'bg-sunken' : ''}`}>
              <r.icon className="h-4 w-4 text-muted shrink-0" aria-hidden />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink truncate">{r.title}</span>
                <span className="block text-[12.5px] text-muted truncate">{r.sub}</span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">{r.group}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
