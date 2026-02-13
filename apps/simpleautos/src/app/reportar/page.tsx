import type { Metadata } from "next";
import Link from "next/link";
import { AUTOS_BRANDING } from "@/config/branding";

export const metadata: Metadata = {
  title: "Reportar Problema",
  description: "Reporta un problema de seguridad o funcionamiento en SimpleAutos.",
};

export default function ReportarPage() {
  const whatsappHref = `https://wa.me/${AUTOS_BRANDING.supportWhatsAppDigits}`;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Reportar Problema</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Cuéntanos qué pasó para ayudarte lo antes posible.
      </p>

      <section className="mt-6 card-surface shadow-card p-6">
        <div className="space-y-4 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Incluye esta información</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>¿Qué estabas intentando hacer?</li>
              <li>¿Qué resultado esperabas y qué ocurrió?</li>
              <li>URL o sección de la app, si aplica</li>
              <li>Capturas de pantalla (si es posible)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Canal de soporte</h2>
            <p>
              Atendemos por WhatsApp (no llamadas):{" "}
              <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                {AUTOS_BRANDING.supportWhatsAppDisplay}
              </a>
              .
            </p>
            <p className="mt-2">
              También puedes reportar por correo en{" "}
              <a className="underline" href={`mailto:${AUTOS_BRANDING.supportEmail}`}>
                {AUTOS_BRANDING.supportEmail}
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Ayuda adicional</h2>
            <p>
              También puedes revisar el{" "}
              <Link className="underline" href="/ayuda">
                Centro de Ayuda
              </Link>
              {" "}o las{" "}
              <Link className="underline" href="/faq">
                Preguntas Frecuentes
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
