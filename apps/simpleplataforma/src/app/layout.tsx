import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Simple Plataforma",
  description: "Autenticación unificada para las verticales de Simple.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>{children}</body>
    </html>
  );
}
