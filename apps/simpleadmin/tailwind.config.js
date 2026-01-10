const sharedPreset = require('../../packages/config/tailwind-preset.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  presets: [sharedPreset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/auth/src/**/*.{ts,tsx}',
  ],
};
