import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre Nosotros",
  description: "Información de la empresa detrás de SimpleTiendas.",
};

export default function EmpresaPage() {
  const whatsappHref = "https://wa.me/56978623828";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sobre Nosotros</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
        SimpleTiendas es parte de Simple Plataforma. Ayudamos a vender productos y servicios con una experiencia clara,
        rápida y confiable.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold">Para quién es</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Para emprendedores, tiendas y servicios que necesitan un canal simple para publicar, recibir consultas y
            administrar su catálogo.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Soporte</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Atención por WhatsApp (no llamadas):{" "}
            <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              +56 9 7862 3828
            </a>
            . También puedes revisar el{" "}
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
