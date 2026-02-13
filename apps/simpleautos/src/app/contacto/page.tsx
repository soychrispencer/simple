import type { Metadata } from "next";
import Link from "next/link";
import { AUTOS_BRANDING } from "@/config/branding";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Canales de contacto y soporte de SimpleAutos.",
};

export default function ContactoPage() {
  const whatsappHref = `https://wa.me/${AUTOS_BRANDING.supportWhatsAppDigits}`;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Contacto</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Para solicitudes comerciales, soporte o dudas, usa estos canales.
      </p>

      <section className="mt-6 grid gap-4">
        <div className="card-surface shadow-card p-6">
          <h2 className="text-base font-semibold">WhatsApp (soporte)</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Atendemos exclusivamente por WhatsApp (no llamadas):{" "}
            <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              {AUTOS_BRANDING.supportWhatsAppDisplay}
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            También puedes escribirnos al correo{" "}
            <a className="underline" href={`mailto:${AUTOS_BRANDING.supportEmail}`}>
              {AUTOS_BRANDING.supportEmail}
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Para ayudarte más rápido, incluye: link de la publicación, tu correo de cuenta y una breve descripción del
            problema.
          </p>
        </div>

        <div className="card-surface shadow-card p-6">
          <h2 className="text-base font-semibold">Soporte</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Si tienes un problema con tu cuenta, una publicación o una transacción, ve a{" "}
            <Link className="underline" href="/reportar">
              Reportar Problema
            </Link>
            .
          </p>
        </div>

        <div className="card-surface shadow-card p-6">
          <h2 className="text-base font-semibold">Centro de Ayuda</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Revisa guías rápidas y preguntas frecuentes en{" "}
            <Link className="underline" href="/ayuda">
              Centro de Ayuda
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
