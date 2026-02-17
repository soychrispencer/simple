import type { Metadata } from "next";
import { ThemeHydration } from "@/components/layout/ThemeHydration";
import "./globals.css";
import "./styles/select-dropdown.css";
import "./styles/brand-overrides.css";

import { Chrome } from "@/components/layout/Chrome";
import { ToastProvider, NotificationsProvider, AuthModalMount, DisplayCurrencyProvider, AuthCallbackToasts } from "@simple/ui";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { autosAuthCopy } from "@/config/authCopy";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CompareProvider } from "@/context/CompareContext";
import { AUTOS_BRANDING } from "@/config/branding";

function resolveSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || AUTOS_BRANDING.siteUrl;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  title: {
    default: "SimpleAutos | Marketplace Automotriz",
    template: "%s | SimpleAutos",
  },
  description: "Publica y encuentra vehículos en SimpleAutos.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: AUTOS_BRANDING.appName,
    title: "SimpleAutos | Marketplace Automotriz",
    description: "Publica y encuentra vehículos en SimpleAutos.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SimpleAutos | Marketplace Automotriz",
    description: "Publica y encuentra vehículos en SimpleAutos.",
  },
  icons: {
    icon: [
      { url: "/brand/favicon.png?v=20260213", type: "image/png", sizes: "32x32" },
    ],
    shortcut: [
      { url: "/brand/favicon.png?v=20260213", type: "image/png" },
    ],
    apple: [{ url: "/brand/favicon.png?v=20260213", type: "image/png", sizes: "180x180" }],
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
                <AuthCallbackToasts redirectTo="/panel" />
                <FavoritesProvider>
                  <CompareProvider>
                    <NotificationsProvider>
                      <DisplayCurrencyProvider>
                        <AuthModalMount copy={autosAuthCopy} />
                        <Chrome>{children}</Chrome>
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







