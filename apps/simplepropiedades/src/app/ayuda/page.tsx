import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Centro de Ayuda",
  description: "Centro de ayuda de SimplePropiedades.",
};

export default function AyudaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Centro de Ayuda</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Guías y recomendaciones para comprar, vender o arrendar con más claridad.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">Atajos</h2>
          <ul className="mt-2 space-y-3 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>
              <Link className="underline" href="/faq">
                Preguntas Frecuentes
              </Link>
            </li>
            <li>
              <Link className="underline" href="/guia-propietario">
                Guía del Propietario
              </Link>
            </li>
            <li>
              <Link className="underline" href="/reportar">
                Reportar Problema
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">Consejos de seguridad</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>Evita adelantos sin respaldo y verifica identidad.</li>
            <li>Confirma dirección y condiciones antes de coordinar visita.</li>
            <li>No compartas contraseñas ni códigos de verificación.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
