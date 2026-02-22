"use client";

import { PanelPageLayout } from "@simple/ui";

export default function EstadisticasPage() {
  return (
    <PanelPageLayout
      header={{
        title: "Estadísticas",
        description: "Resumen de rendimiento de tus propiedades y canal comercial.",
      }}
    >
      <section className="card-surface shadow-card p-6 mt-8">
        <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">
          Métricas en integración
        </h2>
        <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">
          Esta sección está habilitada para mantener el panel unificado con la estructura de SimpleAutos.
        </p>
      </section>
    </PanelPageLayout>
  );
}
