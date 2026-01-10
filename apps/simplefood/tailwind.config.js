const sharedPreset = require('@simple/config/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/**/src/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [sharedPreset],
  plugins: [],
};
