import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reportar Problema",
  description: "Reporta un problema de seguridad o funcionamiento en SimplePropiedades.",
};

export default function ReportarPage() {
  const whatsappHref = "https://wa.me/56978623828";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Reportar Problema</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Cuéntanos qué pasó para ayudarte lo antes posible.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-5">
        <div className="text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
          <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Incluye esta información</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>¿Qué estabas intentando hacer?</li>
            <li>¿Qué resultado esperabas y qué ocurrió?</li>
            <li>URL o sección de la app, si aplica</li>
            <li>Capturas de pantalla (si es posible)</li>
          </ul>
        </div>

        <div className="text-sm text-lighttext/80 dark:text-darktext/80">
          <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Soporte</h2>
          <p className="mt-2">
            Atendemos por WhatsApp (no llamadas):{" "}
            <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              +56 9 7862 3828
            </a>
            .
          </p>
          <p className="mt-2">
            Puedes revisar también el{" "}
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
