"use client";

import { PanelPageLayout } from "@simple/ui";

export default function MensajesPage() {
  return (
    <PanelPageLayout
      header={{
        title: "Mensajes",
        description: "Administra consultas y leads de tus publicaciones.",
      }}
    >
      <section className="card-surface shadow-card p-6 mt-8">
        <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">
          Bandeja de mensajes en despliegue
        </h2>
        <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">
          Este módulo ya está visible en el panel y se encuentra en proceso de homologación funcional.
        </p>
      </section>
    </PanelPageLayout>
  );
}
