import type { Config } from 'tailwindcss';
import uiConfig from '@simple/ui/tailwind.config';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      ...uiConfig.theme.extend,
      colors: {
        ...uiConfig.theme.extend.colors,
        // SimpleAutos usa el color naranja/rojo
        primary: '#FF3600',
      },
    },
  },
  plugins: [],
};

export default config;
