import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso de SimpleAutos.",
};

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Términos y Condiciones</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Última actualización: 12 de enero de 2026
      </p>

      <section className="mt-6 card-surface shadow-card p-6">
        <div className="space-y-4 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <p>
            Estos términos describen reglas generales de uso de SimpleAutos (parte de Simple Plataforma). Están pensados
            para informar de manera clara; de todas formas, deben ser revisados y ajustados por asesoría legal antes de
            publicarse como versión definitiva.
          </p>
          <p className="text-xs text-lighttext/70 dark:text-darktext/70">
            Este contenido es informativo y no constituye asesoría legal.
          </p>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">1) Uso del servicio</h2>
            <p>
              Te comprometes a utilizar la plataforma de forma lícita y a no realizar acciones que afecten la
              disponibilidad, integridad o seguridad del servicio.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">2) Cuentas y seguridad</h2>
            <p>
              Eres responsable de mantener la confidencialidad de tus credenciales. Si crees que tu cuenta fue
              comprometida, debes cambiar tu contraseña y reportarlo.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">3) Publicaciones</h2>
            <p>
              La información publicada (vehículos, precios, descripciones, imágenes) debe ser veraz y actualizada. Nos
              reservamos el derecho de moderar y retirar contenido que infrinja estas reglas o que resulte engañoso.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">4) Relación entre usuarios</h2>
            <p>
              SimpleAutos facilita la conexión entre usuarios. Las condiciones finales de una transacción o arriendo se
              coordinan entre las partes, por lo que pueden intervenir terceros y factores externos.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">5) Cambios</h2>
            <p>
              Podemos actualizar estos términos para mejorar la plataforma o cumplir requisitos. Publicaremos la fecha de
              actualización.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
