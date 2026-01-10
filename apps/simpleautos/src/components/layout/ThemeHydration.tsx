"use client";
import React from "react";

/**
 * Envuelve el contenido y oculta visualmente hasta que el tema esté resuelto en cliente.
 * Aplica clases de opacidad para evitar flashes de tema.
 */
export function ThemeHydration({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={mounted ? "body-theme-resolved" : "body-theme-unresolved"}>
      {children}
    </div>
  );
}







