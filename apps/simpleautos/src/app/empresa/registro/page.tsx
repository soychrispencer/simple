"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@simple/ui";
import { IconBuildingStore, IconArrowRight } from '@tabler/icons-react';

export default function RegistroEmpresa() {
  const router = useRouter();

  // Redirigir automáticamente al registro normal
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/registro');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] dark:bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="card-surface rounded-3xl shadow-card p-12 max-w-2xl w-full text-center border border-border/60">
        {/* Icono */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--field-bg)] dark:bg-[var(--field-bg)] mb-8 ring-1 ring-border/60">
          <IconBuildingStore size={40} className="text-primary" />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-lighttext dark:text-darktext mb-4">
          Registro Empresarial Simplificado
        </h1>

        {/* Descripción */}
        <p className="text-lighttext/80 dark:text-darktext/80 mb-8 text-lg leading-relaxed">
          Hemos simplificado el proceso de registro. Ahora puedes registrarte como usuario individual
          y luego convertir tu cuenta a empresarial desde &quot;Empresas&quot; en tu panel de control.
        </p>

        {/* Beneficios */}
        <div className="bg-[var(--field-bg)] dark:bg-[var(--field-bg)] rounded-2xl p-6 mb-8 ring-1 ring-border/60">
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext mb-4">
            ¿Por qué este cambio?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary-a20)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">?</span>
              </div>
              <div>
                <h4 className="font-medium text-lighttext dark:text-darktext">Registro más rápido</h4>
                <p className="text-sm text-lighttext/80 dark:text-darktext/80">Sin complicaciones iniciales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary-a20)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">?</span>
              </div>
              <div>
                <h4 className="font-medium text-lighttext dark:text-darktext">Flexibilidad</h4>
                <p className="text-sm text-lighttext/80 dark:text-darktext/80">Convierte cuando lo necesites</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary-a20)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">?</span>
              </div>
              <div>
                <h4 className="font-medium text-lighttext dark:text-darktext">Menos errores</h4>
                <p className="text-sm text-lighttext/80 dark:text-darktext/80">Proceso más confiable</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary-a20)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">?</span>
              </div>
              <div>
                <h4 className="font-medium text-lighttext dark:text-darktext">Mejor experiencia</h4>
                <p className="text-sm text-lighttext/80 dark:text-darktext/80">Flujo más intuitivo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/registro')}
            className="inline-flex items-center gap-2"
          >
            Ir al Registro
            <IconArrowRight size={20} />
          </Button>
          <Button
            variant="neutral"
            size="lg"
            onClick={() => router.push('/')}
          >
            Volver al Inicio
          </Button>
        </div>

        {/* Redirección automática */}
        <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-6">
          Serás redirigido automáticamente en unos segundos...
        </p>
      </div>
    </div>
  );
}







