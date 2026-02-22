"use client";

import { PanelPageLayout } from "@simple/ui";

export default function FavoritosPage() {
  return (
    <PanelPageLayout
      header={{
        title: "Guardados",
        description: "Accede rápidamente a tus propiedades favoritas.",
      }}
    >
      <section className="card-surface shadow-card p-6 mt-8">
        <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">
          Módulo de guardados en integración
        </h2>
        <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">
          Este acceso ya queda habilitado en el panel para unificar la experiencia entre verticales.
        </p>
      </section>
    </PanelPageLayout>
  );
}
