import type { Metadata } from "next";
import { ThemeHydration } from "@/components/layout/ThemeHydration";
import "./globals.css";
import "./styles/select-dropdown.css";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ToastProvider, NotificationsProvider, AuthModalMount, DisplayCurrencyProvider } from "@simple/ui";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { autosAuthCopy } from "@/config/authCopy";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CompareProvider } from "@/context/CompareContext";

export const metadata: Metadata = {
  title: {
    default: "SimpleAutos | Marketplace Automotriz",
    template: "%s | SimpleAutos",
  },
  description: "Publica y encuentra vehículos en SimpleAutos.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "2048x2048" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: [
      { url: "/favicon.png", type: "image/png", sizes: "2048x2048" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/favicon.png", type: "image/png", sizes: "2048x2048" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className="bg-lightbg text-lighttext dark:bg-darkbg dark:text-darktext font-sans"
        suppressHydrationWarning
      >
        <ThemeHydration>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <ToastProvider>
                <FavoritesProvider>
                  <CompareProvider>
                    <NotificationsProvider>
                      <DisplayCurrencyProvider>
                        <Header />
                        <AuthModalMount copy={autosAuthCopy} />
                        {/* Mantener todo el contenido 10px por debajo del header */}
                        <div className="mt-[10px]">{children}</div>
                        <Footer />
                      </DisplayCurrencyProvider>
                    </NotificationsProvider>
                  </CompareProvider>
                </FavoritesProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ThemeHydration>
      </body>
    </html>
  );
}







