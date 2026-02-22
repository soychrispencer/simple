"use client";

import { PanelPageLayout } from "@simple/ui";

export default function MiPaginaPage() {
  return (
    <PanelPageLayout
      header={{
        title: "Mi Página",
        description: "Gestiona tu vitrina pública de SimplePropiedades.",
      }}
    >
      <section className="card-surface shadow-card p-6 mt-8">
        <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">
          Tu página pública estará aquí
        </h2>
        <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">
          Estamos homologando esta sección para que tenga el mismo estándar del panel de SimpleAutos.
        </p>
      </section>
    </PanelPageLayout>
  );
}
