import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía del Vendedor",
  description: "Guía rápida para publicar y vender en SimpleAutos.",
};

export default function GuiaVendedorPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Guía del Vendedor</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Recomendaciones prácticas para publicar mejor y responder más rápido.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">Checklist para una buena publicación</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>Información completa: marca, modelo, año, versión, kilometraje, estado y precio.</li>
            <li>Fotos claras: exterior, interior, tablero, neumáticos y detalles importantes.</li>
            <li>Descripción honesta: mantenimiento, fallas conocidas y accesorios incluidos.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">Cómo responder mejor</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>Responde en menos de 1 hora cuando sea posible.</li>
            <li>Comparte ubicación aproximada y horarios para visita/prueba.</li>
            <li>Evita enviar datos sensibles por mensajes públicos.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">Seguridad</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Coordina en lugares seguros y, si es posible, con acompañante. Si detectas fraude o suplantación, repórtalo.
          </p>
        </div>
      </section>
    </main>
  );
}
