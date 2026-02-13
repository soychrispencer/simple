import type { Metadata } from "next";
import Link from "next/link";
import { AUTOS_BRANDING } from "@/config/branding";

export const metadata: Metadata = {
  title: "Sobre Nosotros",
  description: "Información de la empresa detrás de SimpleAutos.",
};

export default function EmpresaPage() {
  const whatsappHref = `https://wa.me/${AUTOS_BRANDING.supportWhatsAppDigits}`;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sobre Nosotros</h1>
      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
        SimpleAutos es parte de Simple Plataforma. Nuestro foco es simplificar la compra, venta y arriendo de vehículos
        con una experiencia clara, segura y rápida.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold">Qué hacemos</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Conectamos compradores y vendedores a través de publicaciones verificables, herramientas de contacto y un
            panel para administrar tus anuncios.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Transparencia y seguridad</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
            <li>Recomendamos coordinar encuentros en lugares seguros y verificar documentación.</li>
            <li>Protegemos el acceso a tu cuenta con flujos de verificación y recuperación de contraseña.</li>
            <li>Si detectas un comportamiento sospechoso, repórtalo para revisarlo cuanto antes.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">Contacto</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Nuestro canal de atención es vía WhatsApp (no atendemos llamadas):{" "}
            <a className="underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              {AUTOS_BRANDING.supportWhatsAppDisplay}
            </a>
            . Correo oficial:{" "}
            <a className="underline" href={`mailto:${AUTOS_BRANDING.supportEmail}`}>
              {AUTOS_BRANDING.supportEmail}
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
