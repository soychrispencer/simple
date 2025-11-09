/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary color (se sobrescribe por vertical)
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-light': 'var(--color-primary-light)',
        'primary-dark': 'var(--color-primary-dark)',

        // Grays (Apple-inspired)
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },

        // Semantic colors
        success: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          dark: '#065f46',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          dark: '#991b1b',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          dark: '#92400e',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe',
          dark: '#1e40af',
        },
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
        full: '9999px',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.2' }],
        sm: ['0.8125rem', { lineHeight: '1.3' }],
        base: ['0.875rem', { lineHeight: '1.4' }],
        md: ['1rem', { lineHeight: '1.45' }],
        lg: ['1.125rem', { lineHeight: '1.3' }],
        xl: ['1.375rem', { lineHeight: '1.25' }],
        '2xl': ['1.75rem', { lineHeight: '1.15' }],
        '3xl': ['2.25rem', { lineHeight: '1.1' }],
        '4xl': ['3rem', { lineHeight: '1.05' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05), 0 8px 24px -8px rgba(0,0,0,0.12)',
        'card-hover': '0 2px 6px rgba(0,0,0,0.06), 0 12px 28px -10px rgba(0,0,0,0.16)',
        modal: '0 24px 48px rgba(0,0,0,0.24)',
        popover: '0 12px 24px rgba(0,0,0,0.20)',
        focus: '0 0 0 3px var(--shadow-focus-color)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.33, 1, 0.68, 1)',
        emphatic: 'cubic-bezier(0.83, 0, 0.17, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '360ms',
      },
    },
  },
  plugins: [],
};
