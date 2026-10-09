import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import { imageUrl } from '../../lib/api';
import { ACCOUNT_STATUS, CANTEEN_STATUS, ORDER_STATUS } from '../../lib/constants';
import { initials } from '../../lib/format';

export function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return <Tag className={`card ${className}`} {...rest}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 pt-5 pb-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {subtitle ? <p className="text-[13px] text-muted mt-0.5">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow, back }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
      <div className="min-w-0">
        {back}
        {eyebrow ? <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent mb-1">{eyebrow}</p> : null}
        <h1 className="text-[26px] leading-tight font-extrabold">{title}</h1>
        {description ? <p className="text-muted mt-1 max-w-3xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  neutral: 'bg-sunken text-body ring-1 ring-line/70',
  brand: 'bg-brand/10 text-brand',
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[12px] font-semibold whitespace-nowrap ${TONES[tone] || TONES.neutral} ${className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status, long }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'neutral', icon: FiClock };
  return <Badge tone={s.tone} icon={s.icon}>{long ? s.long : s.label}</Badge>;
}

export function CanteenStatusBadge({ status }) {
  const s = CANTEEN_STATUS[status || 'active'];
  return <Badge tone={s.tone} icon={s.icon}>{s.label}</Badge>;
}

export function AccountStatusBadge({ status }) {
  const s = ACCOUNT_STATUS[status || 'active'] || ACCOUNT_STATUS.active;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PaymentBadge({ order }) {
  if (order.status === 'Cancelled') return <Badge tone="neutral">No payment</Badge>;
  return order.paymentStatus === 'paid' ? <Badge tone="success">Paid · recorded</Badge> : <Badge tone="warning">Not recorded</Badge>;
}

export function Avatar({ name, size = 'h-9 w-9 text-[13px]', className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center shrink-0 rounded-full bg-brand/15 text-brand font-bold ${size} ${className}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

const THUMB = ['bg-accent/15 text-accent', 'bg-brand/15 text-brand', 'bg-info/15 text-info', 'bg-success/15 text-success', 'bg-danger/15 text-danger'];

export function Thumb({ src, name = '', className = 'h-12 w-12', rounded = 'rounded-xl', dimmed }) {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(src);
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  if (url && !failed) {
    return <img src={url} alt="" onError={() => setFailed(true)} loading="lazy" className={`${className} ${rounded} object-cover shrink-0 bg-sunken ${dimmed ? 'opacity-50 grayscale' : ''}`} />;
  }
  return (
    <span className={`${className} ${rounded} shrink-0 inline-flex items-center justify-center font-extrabold ${THUMB[hash % THUMB.length]} ${dimmed ? 'opacity-50' : ''}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

const STAT_TONES = { brand: 'bg-brand/10 text-brand', accent: 'bg-accent/15 text-accent', success: 'bg-success/10 text-success', info: 'bg-info/10 text-info', danger: 'bg-danger/10 text-danger', warning: 'bg-warning/10 text-warning', neutral: 'bg-sunken text-muted' };

export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', loading, to, footnote }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        {Icon ? <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${STAT_TONES[tone]}`}><Icon className="h-4 w-4" aria-hidden /></span> : null}
      </div>
      {loading ? <div className="skeleton h-8 w-24 mt-2" /> : <p className="text-[26px] font-extrabold text-ink tabular mt-1 leading-tight">{value}</p>}
      {hint ? <p className="text-[12.5px] text-muted mt-1">{hint}</p> : null}
      {footnote}
    </>
  );
  if (to) return <NavLink to={to} className="card p-4 block hover:border-brand/40 transition-colors">{body}</NavLink>;
  return <div className="card p-4">{body}</div>;
}

export function Pagination({ page, pages, total, onPage, label = 'results' }) {
  if (pages <= 1) return <p className="text-[13px] text-muted">{total} {label}</p>;
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-[13px] text-muted">Page {page} of {pages} · {total} {label}</p>
      <div className="flex gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-9 px-3 rounded-lg border border-line bg-surface font-semibold text-[13px] text-ink inline-flex items-center gap-1 disabled:opacity-40 hover:bg-sunken">
          <FiChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="h-9 px-3 rounded-lg border border-line bg-surface font-semibold text-[13px] text-ink inline-flex items-center gap-1 disabled:opacity-40 hover:bg-sunken">
          Next <FiChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

export function KeyValue({ label, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-faint">{label}</dt>
      <dd className="text-ink font-medium mt-0.5 break-words">{children}</dd>
    </div>
  );
}

// Responsive table wrapper: horizontal scroll inside the card, never the page.
export function TableWrap({ children, minWidth = 720, caption }) {
  return (
    <div className="overflow-x-auto relative scroll-thin">
      <table className="w-full text-[14px]" style={{ minWidth }}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line mb-5 overflow-x-auto scroll-thin">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`h-10 px-3 -mb-px border-b-2 text-[14px] font-semibold whitespace-nowrap transition-colors ${value === t.value ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {t.label}{t.count != null ? <span className="ml-1.5 tabular text-faint">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
