import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reportar Problema",
  description: "Reporta un problema de seguridad o funcionamiento en SimpleTiendas.",
};

export default function ReportarPage() {
  const whatsappHref = "https://wa.me/56978623828";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Reportar Problema</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">Incluye el máximo de detalle posible.</p>

      <section className="mt-6 card-surface shadow-card p-6">
        <ul className="list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
          <li>Qué estabas intentando hacer</li>
          <li>Qué ocurrió y qué esperabas</li>
          <li>URL o sección de la app</li>
        </ul>
        <p className="mt-4 text-sm text-lighttext/80 dark:text-darktext/80">
          Soporte por WhatsApp (no llamadas):{" "}
          <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            +56 9 7862 3828
          </a>
          .
        </p>
        <p className="mt-4 text-sm text-lighttext/80 dark:text-darktext/80">
          También puedes revisar el{" "}
          <Link className="underline" href="/ayuda">
            Centro de Ayuda
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
