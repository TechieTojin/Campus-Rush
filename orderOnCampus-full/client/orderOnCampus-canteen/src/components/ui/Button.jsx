import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from './Feedback';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm disabled:bg-brand-600/50',
  accent: 'bg-saffron-500 text-ink hover:bg-saffron-400 active:bg-saffron-600 shadow-sm disabled:opacity-50',
  secondary: 'bg-white text-ink border border-line hover:bg-sunken hover:border-faint/60 active:bg-divider disabled:opacity-50',
  ghost: 'text-body hover:bg-sunken active:bg-divider disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm disabled:opacity-50',
  'danger-soft': 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:opacity-50',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
  'icon-sm': 'h-8 w-8 rounded-lg justify-center',
};

const buttonClass = (variant = 'primary', size = 'md', extra = '') =>
  `inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, icon: Icon, trailingIcon: Trailing, children, className = '', type = 'button', disabled, to, ...rest }, ref) {
  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden /> : null}
      {children}
      {Trailing && !loading ? <Trailing className="h-4 w-4" aria-hidden /> : null}
    </>
  );
  if (to) {
    return <Link ref={ref} to={to} className={buttonClass(variant, size, className)} {...rest}>{content}</Link>;
  }
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...rest}>
      {content}
    </button>
  );
});

export default Button;

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'icon', className = '', ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} className={buttonClass(variant, size, className)} {...rest}>
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
