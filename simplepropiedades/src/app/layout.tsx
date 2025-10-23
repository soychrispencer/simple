import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GlobalProvider } from "@/context/GlobalProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SimplePropiedades - Encuentra tu hogar ideal",
  description: "Plataforma inmobiliaria para comprar, vender y alquilar propiedades en Chile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`bg-lightbg text-lighttext dark:bg-darkbg dark:text-darktext ${inter.variable}`}
        suppressHydrationWarning
      >
        <GlobalProvider>
          <Header />
          <div className="mt-[10px]">{children}</div>
          <Footer />
        </GlobalProvider>
      </body>
    </html>
  );
}