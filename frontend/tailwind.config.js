/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          hover: 'rgba(255,255,255,0.10)',
          active: 'rgba(255,255,255,0.14)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.18)',
        },
        accent: {
          blue:   '#4F8EF7',
          red:    '#F56565',
          green:  '#48BB78',
          purple: '#9F7AEA',
          orange: '#ED8936',
        },
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        DEFAULT: '16px',
        lg: '24px',
        xl: '40px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(-10px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(16px) scale(0.96)' }, to: { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'toast-out': { from: { opacity: '1', transform: 'translateY(0) scale(1)' }, to: { opacity: '0', transform: 'translateY(8px) scale(0.96)' } },
        'pop': { '0%': { transform: 'scale(0.95)' }, '60%': { transform: 'scale(1.03)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-in': 'slide-in 0.18s ease-out',
        'toast-in': 'toast-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        'toast-out': 'toast-out 0.18s ease-in forwards',
        'pop': 'pop 0.2s ease-out',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.10)',
        panel: '0 2px 16px rgba(0,0,0,0.4)',
        btn: '0 1px 4px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}
