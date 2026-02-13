import type { Metadata } from "next";
import "./globals.css";

import { ClientProviders } from "@/components/providers/ClientProviders";
import { LayoutContent } from "@/components/layout/LayoutContent";
import { PROPERTIES_BRANDING } from "@/config/branding";

function resolveSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    PROPERTIES_BRANDING.siteUrl;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  title: "SimplePropiedades - Encuentra tu hogar ideal",
  description: "Compra y arrienda propiedades de forma simple, rápida y segura",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: PROPERTIES_BRANDING.appName,
    title: "SimplePropiedades - Encuentra tu hogar ideal",
    description: "Compra y arrienda propiedades de forma simple, rápida y segura",
  },
  twitter: {
    card: "summary_large_image",
    title: "SimplePropiedades - Encuentra tu hogar ideal",
    description: "Compra y arrienda propiedades de forma simple, rápida y segura",
  },
  icons: {
    icon: [{ url: "/brand/favicon.png", type: "image/png" }],
    shortcut: [{ url: "/brand/favicon.png", type: "image/png" }],
    apple: [{ url: "/brand/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="bg-lightbg text-lighttext dark:bg-darkbg dark:text-darktext font-sans"
        suppressHydrationWarning
      >
        <ClientProviders>
          <LayoutContent>{children}</LayoutContent>
        </ClientProviders>
      </body>
    </html>
  );
}
