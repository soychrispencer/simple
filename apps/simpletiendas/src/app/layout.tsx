import type { Metadata } from "next";
import "./globals.css";

import { ClientProviders } from "@/components/providers/ClientProviders";
import { LayoutContent } from "@/components/layout/LayoutContent";

export const metadata: Metadata = {
  title: "SimpleTiendas - Vende productos y servicios online",
  description: "Crea tu tienda digital, sincroniza catálogos y gestiona pedidos omnicanal con SimpleTiendas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
