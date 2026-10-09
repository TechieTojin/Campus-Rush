import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from './Feedback';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-strong dark:text-nav-deep shadow-sm disabled:opacity-50',
  accent: 'bg-accent text-ink hover:brightness-95 shadow-sm disabled:opacity-50 dark:text-nav-deep',
  secondary: 'bg-surface text-ink border border-line hover:bg-sunken disabled:opacity-50',
  ghost: 'text-body hover:bg-sunken disabled:opacity-50',
  danger: 'bg-danger text-white hover:brightness-95 shadow-sm disabled:opacity-50 dark:text-nav-deep',
  'danger-soft': 'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15 disabled:opacity-50',
  soft: 'bg-brand/10 text-brand hover:bg-brand/15 disabled:opacity-50',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-[12px] gap-1 rounded-lg',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
  'icon-sm': 'h-8 w-8 rounded-lg justify-center',
};

const cls = (variant = 'primary', size = 'md', extra = '') =>
  `inline-flex items-center justify-center font-semibold whitespace-nowrap transition select-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, icon: Icon, trailingIcon: Trailing, children, className = '', type = 'button', disabled, to, ...rest }, ref) {
  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className={size === 'sm' || size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden /> : null}
      {children}
      {Trailing && !loading ? <Trailing className="h-4 w-4" aria-hidden /> : null}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls(variant, size, className)} {...rest}>{content}</Link>;
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cls(variant, size, className)} {...rest}>
      {content}
    </button>
  );
});

export default Button;

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'icon', className = '', ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} className={cls(variant, size, className)} {...rest}>
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
