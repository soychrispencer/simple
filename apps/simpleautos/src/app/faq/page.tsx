import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description: "Preguntas frecuentes de SimpleAutos.",
};

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Preguntas Frecuentes</h1>

      <p className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
        Respuestas rápidas sobre publicaciones, contacto, arriendos y seguridad.
      </p>

      <section className="mt-6 card-surface shadow-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold">¿Cómo publico un vehículo?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Entra al panel y crea una nueva publicación. Completa los datos, sube fotos y publica.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Cómo arrendar un vehículo?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Explora la sección de arriendos y contacta al anunciante. Las condiciones finales se coordinan entre las
            partes.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Cómo contacto al vendedor?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Usa los botones de contacto dentro de la publicación. Recomendamos mantener el intercambio dentro de la
            plataforma o canales oficiales.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Qué hago si no puedo iniciar sesión?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Verifica tu correo, revisa spam y usa “¿Olvidaste tu contraseña?” para recuperar acceso.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold">¿Dónde reporto un problema?</h2>
          <p className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            Usa la sección “Reportar Problema” para enviarnos el detalle y ayudarte más rápido.
          </p>
        </div>
      </section>
    </main>
  );
}
