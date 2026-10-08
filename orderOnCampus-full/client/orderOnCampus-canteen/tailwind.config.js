/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Shared with the student app (constants/theme.js)
        brand: {
          50: '#F0F8F7',
          100: '#E1F0EE',
          200: '#BFE3DF',
          300: '#8CCBC4',
          400: '#4FA7A0',
          500: '#1A8580',
          600: '#0E6B6B',
          700: '#094F4F',
          800: '#073D3D',
          900: '#052C2C',
        },
        saffron: {
          50: '#FFF8EE',
          100: '#FFF1DE',
          200: '#FDDDB0',
          400: '#F5B160',
          500: '#F29E38',
          600: '#C9761A',
          700: '#9C5A12',
        },
        ink: '#13201F',
        body: '#2B3634',
        muted: '#66716F',
        faint: '#9AA3A1',
        line: '#E7E2D8',
        divider: '#EFEBE3',
        canvas: '#F7F5F0',
        sunken: '#F0EDE6',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19,32,31,0.04), 0 4px 16px -6px rgba(19,32,31,0.08)',
        raised: '0 12px 32px -8px rgba(19,32,31,0.22)',
        focus: '0 0 0 3px rgba(14,107,107,0.28)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'rise-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'pop-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulse2: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'rise-in': 'rise-in 220ms ease-out both',
        'slide-in': 'slide-in 240ms cubic-bezier(.2,.8,.2,1)',
        'pop-in': 'pop-in 160ms ease-out',
        shimmer: 'shimmer 1.4s infinite',
        pulse2: 'pulse2 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
