/** @type {import('tailwindcss').Config} */
// Semantic colors come from CSS variables (src/index.css) so light and dark themes share every class.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: v('surface'),
        raised: v('raised'),
        sunken: v('sunken'),
        line: v('line'),
        divider: v('divider'),
        ink: v('ink'),
        body: v('body'),
        muted: v('muted'),
        faint: v('faint'),
        nav: { DEFAULT: v('nav'), deep: v('nav-deep'), text: v('nav-text') },
        brand: {
          DEFAULT: v('brand'),
          strong: v('brand-strong'),
          soft: v('brand-soft'),
          50: '#F0F8F7', 100: '#E1F0EE', 200: '#BFE3DF', 300: '#8CCBC4', 400: '#4FA7A0',
          500: '#1A8580', 600: '#0E6B6B', 700: '#094F4F', 800: '#073D3D', 900: '#052C2C',
        },
        accent: { DEFAULT: v('accent'), soft: v('accent-soft'), 400: '#F5B160', 500: '#F29E38', 600: '#C9761A' },
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        info: v('info'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.05), 0 6px 20px -8px rgb(var(--shadow) / 0.12)',
        raised: '0 18px 40px -12px rgb(var(--shadow) / 0.35)',
        focus: '0 0 0 3px rgb(var(--brand) / 0.35)',
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'rise-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'pop-in': { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulse2: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
        flash: { '0%': { backgroundColor: 'rgb(var(--accent) / 0.22)' }, '100%': { backgroundColor: 'transparent' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'rise-in': 'rise-in 220ms ease-out both',
        'slide-in': 'slide-in 240ms cubic-bezier(.2,.8,.2,1)',
        'pop-in': 'pop-in 160ms ease-out',
        pulse2: 'pulse2 1.6s ease-in-out infinite',
        flash: 'flash 1.6s ease-out',
      },
    },
  },
  plugins: [],
};
