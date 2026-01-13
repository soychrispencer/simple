import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Políticas de Privacidad",
  description: "Política de privacidad de SimpleTiendas.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Políticas de Privacidad</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">Última actualización: 12 de enero de 2026</p>

      <section className="mt-6 card-surface shadow-card p-6">
        <div className="space-y-4 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <p>
            Esta política explica, de forma general, qué datos podríamos tratar para operar SimpleTiendas. Debe ser
            revisada y ajustada antes de publicarse como versión definitiva.
          </p>
          <p className="text-xs text-lighttext/70 dark:text-darktext/70">
            Este contenido es informativo y no constituye asesoría legal.
          </p>
          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">1) Datos</h2>
            <p>
              Podemos tratar datos de cuenta, publicaciones de productos/servicios y eventos técnicos para seguridad.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">2) Finalidades</h2>
            <p>
              Operación del servicio, soporte, prevención de fraude y mejora continua.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
