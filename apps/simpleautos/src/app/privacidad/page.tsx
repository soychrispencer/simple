import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Políticas de Privacidad",
  description: "Política de privacidad de SimpleAutos.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Políticas de Privacidad</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Última actualización: 12 de enero de 2026
      </p>

      <section className="mt-6 card-surface shadow-card p-6">
        <div className="space-y-4 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <p>
            Esta política explica, de forma general, qué datos podríamos tratar para operar SimpleAutos. Debe ser
            revisada y ajustada antes de publicarse como versión definitiva.
          </p>
          <p className="text-xs text-lighttext/70 dark:text-darktext/70">
            Este contenido es informativo y no constituye asesoría legal.
          </p>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">1) Datos que podemos tratar</h2>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Datos de cuenta: correo y autenticación.</li>
              <li>Datos de perfil: nombre u otros datos que ingreses voluntariamente.</li>
              <li>Datos de publicaciones: información del vehículo, fotos, precio y ubicación aproximada.</li>
              <li>Datos técnicos: eventos de uso para diagnóstico y seguridad (por ejemplo, errores).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">2) Finalidades</h2>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Operar la plataforma y permitir el acceso a tu cuenta.</li>
              <li>Prevenir fraude y mejorar la seguridad.</li>
              <li>Atender solicitudes de soporte y mejorar la experiencia.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">3) Seguridad</h2>
            <p>
              Aplicamos medidas razonables para proteger los datos. Ningún sistema es 100% infalible; si detectas un
              problema de seguridad, repórtalo.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">4) Derechos y contacto</h2>
            <p>
              Puedes solicitar revisión/actualización de tus datos o reportar incidentes de seguridad a través del canal
              de soporte.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
