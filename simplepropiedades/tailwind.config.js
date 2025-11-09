/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF3600',
        lightbg: '#eeeeee',    // gris claro fondo
        lightcard: '#fff',     // blanco tarjetas
        lighttext: '#000',     // negro texto
        lightborder: '#222',   // gris oscuro borde
        darkbg: '#111111',     // negro fondo
        darkcard: '#252525',   // gris oscuro tarjetas
        darktext: '#fff',      // blanco texto
        darkborder: '#ededed', // gris claro borde
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '30px',
        full: '999px'
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.2' }],
        sm: ['0.8125rem', { lineHeight: '1.3' }],
        base: ['0.875rem', { lineHeight: '1.4' }],
        md: ['1rem', { lineHeight: '1.45' }],
        lg: ['1.125rem', { lineHeight: '1.3' }],
        xl: ['1.375rem', { lineHeight: '1.25' }],
        '2xl': ['1.75rem', { lineHeight: '1.15' }],
        '3xl': ['clamp(1.9rem,2.9vw,2.6rem)', { lineHeight: '1.1' }],
      },
      boxShadow: {
        // Sombra base para tarjetas
        card: "0 1px 2px rgba(0,0,0,0.05), 0 8px 24px -8px rgba(0,0,0,0.12)",
        // Sombra sutil para hover de tarjetas
        'card-hover': "0 2px 6px rgba(0,0,0,0.06), 0 12px 28px -10px rgba(0,0,0,0.16)",
        // Overlays como modales
        modal: "0 24px 48px rgba(0,0,0,0.24)",
        // Popovers/dropdowns
        popover: "0 12px 24px rgba(0,0,0,0.20)",
        focus: '0 0 0 3px rgba(255,54,0,0.45)',
        'focus-dark': '0 0 0 3px rgba(255,255,255,0.55)',
      },
    },
  },
  plugins: [],
}