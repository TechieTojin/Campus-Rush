import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import Button from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Focus trap + Escape + scroll lock + focus restore shared by dialogs and drawers.
function useModal(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    const first = node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE);
    (first || node)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const [a, b] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && previous.focus) previous.focus();
    };
  }, [open, onClose, ref]);
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useModal(open, onClose, ref);
  if (!open) return null;
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${width} bg-raised rounded-t-2xl sm:rounded-2xl shadow-raised animate-pop-in max-h-[92vh] flex flex-col`}
      >
        <div className="flex items-start gap-4 px-6 pt-5 pb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold">{title}</h2>
            {description ? <p className="text-muted mt-1">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="h-8 w-8 -mr-2 rounded-lg flex items-center justify-center text-muted hover:bg-sunken hover:text-ink">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 pb-5 overflow-y-auto scroll-thin">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-divider bg-sunken/60 rounded-b-2xl">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'danger', loading, children }) {
  return (
    <Dialog
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' ? (
          <div className="h-10 w-10 shrink-0 rounded-xl bg-danger/10 text-danger flex items-center justify-center"><FiAlertTriangle className="h-5 w-5" aria-hidden /></div>
        ) : null}
        <div className="text-body">{message}{children}</div>
      </div>
    </Dialog>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }) {
  const ref = useRef(null);
  useModal(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/45 animate-fade-in" onClick={onClose} aria-hidden />
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`relative w-full ${width} h-full bg-raised shadow-raised animate-slide-in flex flex-col`}>
        <div className="flex items-start gap-4 px-6 py-4 border-b border-divider">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold truncate">{title}</h2>
            {subtitle ? <div className="text-muted text-[13px] mt-0.5">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close panel" className="h-8 w-8 -mr-2 rounded-lg flex items-center justify-center text-muted hover:bg-sunken hover:text-ink">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-5">{children}</div>
        {footer ? <div className="px-6 py-4 border-t border-divider bg-sunken/60">{footer}</div> : null}
      </aside>
    </div>,
    document.body
  );
}
