import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía del Propietario",
  description: "Guía rápida para publicar y arrendar/vender en SimplePropiedades.",
};

export default function GuiaPropietarioPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Guía del Propietario</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Recomendaciones para publicar mejor y coordinar con más seguridad.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">Checklist de publicación</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>Fotos claras: fachada, interiores, cocina/baños y áreas comunes.</li>
            <li>Información completa: metros, dormitorios, baños, estacionamiento, gastos comunes.</li>
            <li>Condiciones: disponibilidad, requisitos, garantía y reglas (si aplica).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">Cómo responder mejor</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>Responde rápido y confirma horarios para visita.</li>
            <li>Comparte ubicación aproximada primero; dirección exacta al confirmar.</li>
            <li>Evita pedir adelantos sin respaldo y utiliza medios seguros.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
