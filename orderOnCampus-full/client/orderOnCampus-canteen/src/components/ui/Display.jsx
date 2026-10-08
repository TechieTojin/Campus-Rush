import { useState } from 'react';
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import { imageUrl } from '../../lib/api';
import { STATUS } from '../../lib/constants';
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
        {eyebrow ? <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand-600 mb-1">{eyebrow}</p> : null}
        <h1 className="text-[26px] leading-tight font-extrabold">{title}</h1>
        {description ? <p className="text-muted mt-1 max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  neutral: 'bg-sunken text-body',
  brand: 'bg-brand-50 text-brand-700',
  saffron: 'bg-saffron-100 text-saffron-700',
  success: 'bg-emerald-50 text-emerald-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-700',
  dark: 'bg-ink text-white',
};

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[12px] font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, long }) {
  const s = STATUS[status] || { label: status, tone: 'neutral', icon: FiClock };
  return <Badge tone={s.tone} icon={s.icon}>{long ? s.long : s.label}</Badge>;
}

export function PaymentBadge({ order }) {
  if (order.status === 'Cancelled') return <Badge tone="neutral">No payment</Badge>;
  return order.paymentStatus === 'paid'
    ? <Badge tone="success" icon={FiCheckCircle}>Paid at counter</Badge>
    : <Badge tone="saffron" icon={FiClock}>Unpaid · counter</Badge>;
}

export function Avatar({ name, size = 'h-9 w-9 text-[13px]', className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center shrink-0 rounded-full bg-brand-100 text-brand-700 font-bold ${size} ${className}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

const THUMB_PALETTE = ['bg-saffron-100 text-saffron-700', 'bg-brand-100 text-brand-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700'];

// Item/canteen image with a deterministic letter fallback when there's no image or it fails to load.
export function Thumb({ src, name = '', className = 'h-12 w-12', rounded = 'rounded-xl', dimmed }) {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(src);
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  if (url && !failed) {
    return <img src={url} alt="" onError={() => setFailed(true)} loading="lazy" className={`${className} ${rounded} object-cover shrink-0 bg-sunken ${dimmed ? 'opacity-50 grayscale' : ''}`} />;
  }
  return (
    <span className={`${className} ${rounded} shrink-0 inline-flex items-center justify-center font-extrabold ${THUMB_PALETTE[hash % THUMB_PALETTE.length]} ${dimmed ? 'opacity-50' : ''}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', loading, onClick, footnote }) {
  const ring = { brand: 'bg-brand-50 text-brand-600', saffron: 'bg-saffron-100 text-saffron-700', success: 'bg-emerald-50 text-emerald-600', info: 'bg-sky-50 text-sky-600', danger: 'bg-red-50 text-red-600', neutral: 'bg-sunken text-muted' }[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`card p-4 text-left w-full ${onClick ? 'hover:border-brand-300 hover:shadow-raised/40 transition-all' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        {Icon ? <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${ring}`}><Icon className="h-4 w-4" aria-hidden /></span> : null}
      </div>
      {loading ? <div className="skeleton h-8 w-24 mt-2" /> : <p className="text-[26px] font-extrabold text-ink tabular mt-1 leading-tight">{value}</p>}
      {hint ? <p className="text-[12.5px] text-muted mt-1">{hint}</p> : null}
      {footnote}
    </Tag>
  );
}

export function Pagination({ page, pages, total, onPage, label = 'results' }) {
  if (pages <= 1) return <p className="text-[13px] text-muted px-1">{total} {label}</p>;
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-[13px] text-muted">Page {page} of {pages} · {total} {label}</p>
      <div className="flex gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-9 px-3 rounded-lg border border-line bg-white font-semibold text-[13px] inline-flex items-center gap-1 disabled:opacity-40 hover:bg-sunken" aria-label="Previous page">
          <FiChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="h-9 px-3 rounded-lg border border-line bg-white font-semibold text-[13px] inline-flex items-center gap-1 disabled:opacity-40 hover:bg-sunken" aria-label="Next page">
          Next <FiChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

export function KeyValue({ label, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-faint">{label}</dt>
      <dd className="text-ink font-medium mt-0.5">{children}</dd>
    </div>
  );
}
