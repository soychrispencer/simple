const sharedPreset = require('@simple/config/tailwind-preset');

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
  plugins: [],
};
