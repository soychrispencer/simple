import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Políticas de Privacidad",
  description: "Política de privacidad de SimplePropiedades.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Políticas de Privacidad</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">Última actualización: 12 de enero de 2026</p>

      <section className="mt-6 card-surface shadow-card p-6">
        <div className="space-y-4 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <p>
            Esta política explica, de forma general, qué datos podríamos tratar para operar SimplePropiedades. Debe ser
            revisada y ajustada antes de publicarse como versión definitiva.
          </p>
          <p className="text-xs text-lighttext/70 dark:text-darktext/70">
            Este contenido es informativo y no constituye asesoría legal.
          </p>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">1) Datos</h2>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Datos de cuenta: correo y autenticación.</li>
              <li>Datos de publicaciones: información de propiedades y fotos.</li>
              <li>Datos técnicos: eventos de uso para diagnóstico y seguridad.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">2) Finalidades</h2>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Operación del servicio y acceso a tu cuenta.</li>
              <li>Soporte y prevención de fraude.</li>
              <li>Mejora continua de la plataforma.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">3) Seguridad</h2>
            <p>
              Aplicamos medidas razonables para proteger los datos. Si detectas un incidente, repórtalo.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
