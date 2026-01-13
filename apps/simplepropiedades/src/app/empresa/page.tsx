import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre Nosotros",
  description: "Información de la empresa detrás de SimplePropiedades.",
};

export default function EmpresaPage() {
  const whatsappHref = "https://wa.me/56978623828";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sobre Nosotros</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
        SimplePropiedades es parte de Simple Plataforma. Buscamos simplificar la compra, venta y arriendo de
        propiedades con una experiencia clara y confiable.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">Nuestra propuesta</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>Publicaciones claras con información relevante y fotos.</li>
            <li>Herramientas para administrar tus anuncios desde el panel.</li>
            <li>Buenas prácticas para coordinar visitas y evitar fraudes.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">Soporte</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Atendemos exclusivamente por WhatsApp (no llamadas):{" "}
            <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              +56 9 7862 3828
            </a>
            . Revisa también el{" "}
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
