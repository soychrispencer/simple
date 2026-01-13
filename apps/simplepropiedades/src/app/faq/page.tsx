import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description: "Preguntas frecuentes de SimplePropiedades.",
};

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Preguntas Frecuentes</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Respuestas rápidas sobre publicaciones, contacto, arriendos y seguridad.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">¿Cómo publicar una propiedad?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Entra al panel y crea una nueva publicación. Completa datos, fotos y condiciones.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Cómo coordino una visita?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Contacta al anunciante y coordina fecha/hora. Recomendamos confirmar ubicación y condiciones por escrito.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Dónde reporto un problema?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Usa la sección “Reportar Problema” para enviarnos el detalle.
          </p>
        </div>
      </section>
    </main>
  );
}
