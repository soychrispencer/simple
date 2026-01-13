import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Políticas Sanitarias",
  description: "Buenas prácticas sanitarias y de seguridad alimentaria en SimpleFood.",
};

export default function PoliticasPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Políticas Sanitarias</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">Última actualización: 12 de enero de 2026</p>

      <section className="mt-6 card-surface shadow-card p-6">
        <div className="space-y-4 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <p>
            Estas políticas describen recomendaciones generales de higiene y seguridad alimentaria para publicaciones y
            comercios en SimpleFood. Deben ser ajustadas según normativa local y validación operativa.
          </p>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Buenas prácticas</h2>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Mantener cadena de frío cuando corresponda.</li>
              <li>Separación de alimentos crudos y cocidos para evitar contaminación cruzada.</li>
              <li>Superficies y utensilios limpios y desinfectados.</li>
              <li>Rotulación de alérgenos cuando aplique.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Responsabilidad</h2>
            <p>
              Cada comercio es responsable de cumplir la normativa y de la información entregada a los clientes.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
