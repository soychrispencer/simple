import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Canales de contacto y soporte de SimpleTiendas.",
};

export default function ContactoPage() {
  const whatsappHref = "https://wa.me/56978623828";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Contacto</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Soporte y consultas. Nuestro canal de atención es WhatsApp (no llamadas).
      </p>

      <section className="mt-6 grid gap-4">
        <div className="card-surface shadow-card p-6">
          <h2 className="text-base font-semibold">WhatsApp</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              +56 9 7862 3828
            </a>
          </p>
          <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Incluye tu correo de cuenta y el link de la publicación o sección donde ocurre el problema.
          </p>
        </div>
        <div className="card-surface shadow-card p-6">
          <h2 className="text-base font-semibold">Centro de Ayuda</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80">
            Revisa guías y respuestas rápidas en{" "}
            <Link className="underline" href="/ayuda">
              Centro de Ayuda
            </Link>
            .
          </p>
        </div>
        <div className="card-surface shadow-card p-6">
          <h2 className="text-base font-semibold">Reportar Problema</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80">
            Si algo no funciona como esperabas, repórtalo en{" "}
            <Link className="underline" href="/reportar">
              Reportar Problema
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
