import { Instrument_Sans, Inter } from 'next/font/google';

export const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export const instrumentSans = Instrument_Sans({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
});

/** Clases para body: Inter (UI) + Instrument Sans (display/títulos). */
export const simpleFontClassName = `${inter.variable} ${instrumentSans.variable} font-sans antialiased`;
