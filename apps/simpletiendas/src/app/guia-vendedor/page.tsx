import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía del Vendedor",
  description: "Guía rápida para vender en SimpleTiendas.",
};

export default function GuiaVendedorPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Guía del Vendedor</h1>
      <section className="mt-6 card-surface shadow-card p-6">
        <p className="text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          Recomendaciones para mejorar la calidad de tus publicaciones y convertir más.
        </p>
        <ol className="mt-4 list-decimal pl-5 space-y-3 text-sm text-lighttext/80 dark:text-darktext/80">
          <li>Publica con fotos claras (fondo limpio, buena luz, varias vistas).</li>
          <li>Incluye descripción completa: medidas, materiales, compatibilidad y tiempos de entrega.</li>
          <li>Mantén stock y precio actualizados para evitar cancelaciones.</li>
          <li>Responde rápido: claridad y velocidad aumentan ventas.</li>
        </ol>
      </section>
    </main>
  );
}
