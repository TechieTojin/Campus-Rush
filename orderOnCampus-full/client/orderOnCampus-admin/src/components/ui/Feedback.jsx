import { useCallback, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiRefreshCw, FiX, FiXCircle } from 'react-icons/fi';
import { ToastContext } from './useToast';

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonRows({ rows = 5, className = 'h-14' }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className={`${className} w-full`} />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = FiInfo, title, message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-[16px] font-bold">{title}</h3>
      {message ? <p className="text-muted mt-1 max-w-sm">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center text-center px-6 py-12 ${className}`}>
      <div className="h-14 w-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mb-4">
        <FiAlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-[16px] font-bold">Couldn’t load this</h3>
      <p className="text-muted mt-1 max-w-md">{message}</p>
      {onRetry ? (
        <button type="button" onClick={() => onRetry()} className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-line bg-surface font-semibold text-ink hover:bg-sunken">
          <FiRefreshCw className="h-4 w-4" aria-hidden /> Try again
        </button>
      ) : null}
    </div>
  );
}

const BANNER = {
  info: 'bg-info/10 border-info/25 text-info',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  danger: 'bg-danger/10 border-danger/25 text-danger',
  success: 'bg-success/10 border-success/25 text-success',
};
const BANNER_ICON = { info: FiInfo, warning: FiAlertTriangle, danger: FiXCircle, success: FiCheckCircle };

export function Banner({ tone = 'info', title, children, action, className = '' }) {
  const Icon = BANNER_ICON[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${BANNER[tone]} ${className}`}>
      <Icon className="h-[18px] w-[18px] mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={`text-body ${title ? 'mt-0.5' : ''}`}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);
  const dismiss = useCallback((tid) => setToasts((t) => t.filter((x) => x.id !== tid)), []);
  const push = useCallback((message, tone = 'success', opts = {}) => {
    const tid = ++id.current;
    setToasts((t) => [...t.slice(-3), { id: tid, message, tone, title: opts.title }]);
    setTimeout(() => dismiss(tid), opts.duration || (tone === 'danger' ? 7000 : 4000));
  }, [dismiss]);
  const api = useMemo(() => Object.assign(push, {
    success: (m, o) => push(m, 'success', o),
    error: (m, o) => push(m, 'danger', o),
    info: (m, o) => push(m, 'info', o),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[70] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {toasts.map((t) => {
          const Icon = BANNER_ICON[t.tone];
          const color = t.tone === 'danger' ? 'text-red-400' : t.tone === 'info' ? 'text-sky-300' : 'text-emerald-400';
          return (
            <div key={t.id} role={t.tone === 'danger' ? 'alert' : 'status'} data-toast className="pointer-events-auto animate-rise-in w-full sm:w-[400px] flex items-start gap-3 rounded-xl bg-[#101a19] text-white px-4 py-3 shadow-raised ring-1 ring-white/10">
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} aria-hidden />
              <div className="flex-1 min-w-0 text-[14px]">
                {t.title ? <p className="font-semibold">{t.title}</p> : null}
                <p className="text-white/85 break-words">{t.message}</p>
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-white/60 hover:text-white rounded-md">
                <FiX className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
