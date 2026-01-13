import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso de SimplePropiedades.",
};

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Términos y Condiciones</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">Última actualización: 12 de enero de 2026</p>

      <section className="mt-6 card-surface shadow-card p-6">
        <div className="space-y-4 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <p>
            Estos términos describen reglas generales de uso de SimplePropiedades (parte de Simple Plataforma). Deben ser
            revisados y ajustados por asesoría legal antes de publicarse como versión definitiva.
          </p>
          <p className="text-xs text-lighttext/70 dark:text-darktext/70">
            Este contenido es informativo y no constituye asesoría legal.
          </p>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">1) Publicaciones</h2>
            <p>
              Los anunciantes son responsables de que la información sea veraz (precio, condiciones, disponibilidad y
              características).
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">2) Conducta</h2>
            <p>
              No se permite contenido engañoso o fraudulento. Podemos moderar y retirar publicaciones que infrinjan estas
              reglas.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
