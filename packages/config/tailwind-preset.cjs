/**
 * Tailwind preset compartido para todas las verticales Simple.
 * Define tokens neutrales, tipografías y utilidades críticas.
 */
const withOpacityValue = (variable) => {
  return ({ opacityValue } = {}) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`;
    }
    return `rgb(var(${variable}) / ${opacityValue})`;
  };
};

const sharedPreset = {
  safelist: [
    'bg-lightbg', 'text-lighttext', 'dark:bg-darkbg', 'dark:text-darktext',
    'bg-lightcard', 'dark:bg-darkcard', 'border-lightborder', 'dark:border-darkborder',
    'hover:bg-lightbg', 'dark:hover:bg-darkbg', 'bg-primary', 'text-primary',
    'text-lightmuted', 'dark:text-darkmuted'
  ],
  theme: {
    extend: {
      colors: {
        primary: withOpacityValue('--color-primary-rgb'),
        'primary-foreground': 'var(--color-on-primary)',
        accent: 'var(--color-accent)',
        neutral: {
          50: '#F8F8F8',
          100: '#F2F0ED',
          200: '#E3E0DB',
          400: '#A6A39E',
          500: '#5B5B5B',
          900: '#0C0C0C',
        },
        lightbg: '#F8F8F8',
        lightcard: '#FFFFFF',
        lighttext: '#0C0C0C',
        lightmuted: '#5B5B5B',
        lightborder: '#D8D6D2',
        darkbg: '#0F0F10',
        darkcard: '#161616',
        darktext: '#F4F4F5',
        darkmuted: '#9E9EA4',
        darkborder: '#2A2A2F',
      },
      fontFamily: {
        sans: ['"Poppins"', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      fontSize: {
        xs: ['0.79rem', { lineHeight: '1.28', letterSpacing: '0.008em' }],
        sm: ['0.87rem', { lineHeight: '1.33', letterSpacing: '0.004em' }],
        base: ['0.94rem', { lineHeight: '1.45' }],
        md: ['1.06rem', { lineHeight: '1.38' }],
        lg: ['1.2rem', { lineHeight: '1.3', letterSpacing: '-0.006em' }],
        xl: ['1.46rem', { lineHeight: '1.22', letterSpacing: '-0.012em' }],
        '2xl': ['1.83rem', { lineHeight: '1.18', letterSpacing: '-0.016em' }],
        '3xl': ['clamp(2.05rem,2.95vw,2.75rem)', { lineHeight: '1.14', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        card: 'var(--shadow-md)',
        'card-hover': 'var(--shadow-lg)',
        modal: 'var(--shadow-raised)',
        popover: 'var(--shadow-glass)',
        focus: '0 0 0 3px rgba(15,157,146,0.35)',
        'focus-dark': '0 0 0 3px rgba(255,255,255,0.35)',
      },
    },
  },
  plugins: [],
};

module.exports = sharedPreset;
