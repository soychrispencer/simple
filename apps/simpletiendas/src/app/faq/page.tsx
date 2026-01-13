import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description: "Preguntas frecuentes de SimpleTiendas.",
};

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Preguntas Frecuentes</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Respuestas rápidas sobre publicación de productos, contacto y soporte.
      </p>
      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">¿Cómo publico productos?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80">
            Crea una publicación desde el panel y completa la información del producto.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Qué información debo incluir?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80">
            Nombre, fotos reales, descripción, precio, disponibilidad y condiciones de entrega/retiro.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Cómo contacto soporte?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80">
            Usa “Reportar Problema” con el detalle para ayudarte más rápido.
          </p>
        </div>
      </section>
    </main>
  );
}
