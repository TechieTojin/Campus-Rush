import { forwardRef, useId, useState } from 'react';
import { FiAlertCircle, FiChevronDown, FiEye, FiEyeOff, FiSearch, FiX } from 'react-icons/fi';

// Wraps a control with label, hint and inline error, wiring the aria attributes.
export function Field({ label, hint, error, required, children, className = '', optional }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="label">
          {label}
          {required ? <span className="text-danger ml-0.5" aria-hidden>*</span> : null}
          {optional ? <span className="text-faint font-normal ml-1.5">Optional</span> : null}
        </label>
      ) : null}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, 'aria-required': required || undefined })}
      {hint && !error ? <p id={hintId} className="text-[12.5px] text-muted mt-1.5">{hint}</p> : null}
      {error ? (
        <p id={errorId} className="text-[12.5px] text-danger mt-1.5 flex items-center gap-1">
          <FiAlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />{error}
        </p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef(function TextInput({ label, hint, error, required, optional, className, prefix, suffix, inputClassName = '', ...props }, ref) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optional={optional} className={className}>
      {(a11y) => (
        <div className="relative">
          {prefix ? <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-semibold pointer-events-none">{prefix}</span> : null}
          <input ref={ref} {...a11y} {...props} className={`input ${error ? 'input-error' : ''} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-16' : ''} ${inputClassName}`} />
          {suffix ? <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-[13px] pointer-events-none">{suffix}</span> : null}
        </div>
      )}
    </Field>
  );
});

export function PasswordInput({ label, hint, error, required, className, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(a11y) => (
        <div className="relative">
          <input {...a11y} {...props} type={shown ? 'text' : 'password'} className={`input pr-11 ${error ? 'input-error' : ''}`} />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-sunken"
          >
            {shown ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
      )}
    </Field>
  );
}

export function TextArea({ label, hint, error, required, optional, className, maxLength, value, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optional={optional} className={className}>
      {(a11y) => (
        <div className="relative">
          <textarea {...a11y} {...props} value={value} maxLength={maxLength} className={`input h-auto py-2.5 min-h-[96px] resize-y ${error ? 'input-error' : ''}`} />
          {maxLength ? <span className="absolute bottom-2 right-3 text-[11.5px] text-faint tabular pointer-events-none">{(value || '').length}/{maxLength}</span> : null}
        </div>
      )}
    </Field>
  );
}

export function Select({ label, hint, error, required, optional, className, children, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optional={optional} className={className}>
      {(a11y) => (
        <div className="relative">
          <select {...a11y} {...props} className={`input appearance-none pr-10 cursor-pointer ${error ? 'input-error' : ''}`}>
            {children}
          </select>
          <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" aria-hidden />
        </div>
      )}
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description, disabled, size = 'md', id: idProp, className = '' }) {
  const autoId = useId();
  const id = idProp || autoId;
  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4 peer-checked:translate-x-4' : 'h-5 w-5 peer-checked:translate-x-5';
  return (
    <label htmlFor={id} className={`inline-flex items-start gap-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <span className="relative inline-flex shrink-0 mt-0.5">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-checked={!!checked} />
        <span className={`${track} rounded-full bg-faint/50 transition-colors peer-checked:bg-brand peer-focus-visible:shadow-focus`} />
        <span className={`absolute left-0.5 top-0.5 ${knob} rounded-full bg-white shadow transition-transform`} />
      </span>
      {label || description ? (
        <span className="min-w-0">
          {label ? <span className="block font-semibold text-ink leading-6">{label}</span> : null}
          {description ? <span className="block text-[13px] text-muted">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, indeterminate, className = '', ...rest }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={!!checked}
      ref={(el) => { if (el) el.indeterminate = !!indeterminate; }}
      onChange={(e) => onChange(e.target.checked)}
      className={`h-4 w-4 rounded border-line accent-[rgb(var(--brand))] cursor-pointer ${className}`}
      {...rest}
    />
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search', className = '', label }) {
  return (
    <div className={`relative ${className}`}>
      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint pointer-events-none" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className="input pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-muted hover:bg-sunken">
          <FiX className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

// Segmented control for small option sets (filters, ranges).
export function Segmented({ options, value, onChange, label, size = 'md', className = '' }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex p-1 rounded-xl bg-sunken border border-line/60 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`${size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13px]'} rounded-lg font-semibold whitespace-nowrap transition-colors ${active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
            {o.count != null ? <span className={`ml-1.5 tabular ${active ? 'text-brand' : 'text-faint'}`}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
