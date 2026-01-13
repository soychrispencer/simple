import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description: "Preguntas frecuentes de SimpleFood.",
};

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Preguntas Frecuentes</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Respuestas rápidas sobre publicaciones, soporte y seguridad.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">¿Dónde veo políticas sanitarias?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            En la sección “Políticas Sanitarias”.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Cómo pido soporte?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Te atendemos exclusivamente por WhatsApp (no llamadas) en +56 9 7862 3828.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Cómo reporto un problema?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Usa la página “Reportar Problema” y envíanos el detalle.
          </p>
        </div>
      </section>
    </main>
  );
}
