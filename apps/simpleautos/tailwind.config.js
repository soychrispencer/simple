const sharedPreset = require('@simple/config/tailwind-preset');

const withOpacityValue = (variable) => {
  return ({ opacityValue } = {}) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`;
    }
    return `rgb(var(${variable}) / ${opacityValue})`;
  };
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Incluir componentes compartidos del monorepo para que Tailwind
    // genere utilidades usadas por @simple/ui y otros paquetes.
    "../../packages/**/src/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [sharedPreset],
  theme: {
    extend: {
      colors: {
        primary: withOpacityValue('--color-primary-rgb'),
        border: withOpacityValue('--color-border-rgb'),
        lightbg: withOpacityValue('--lightbg-rgb'),
        lightcard: withOpacityValue('--lightcard-rgb'),
        lighttext: withOpacityValue('--lighttext-rgb'),
        lightborder: withOpacityValue('--lightborder-rgb'),
        darkbg: withOpacityValue('--darkbg-rgb'),
        darkcard: withOpacityValue('--darkcard-rgb'),
        darktext: withOpacityValue('--darktext-rgb'),
        darkborder: withOpacityValue('--darkborder-rgb'),
        simpleautos: '#FF3600',
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        'card-hover': 'var(--shadow-md)',
      },
      borderRadius: {
        panel: 'var(--card-radius)',
      },
    },
  },
  plugins: [],
};
