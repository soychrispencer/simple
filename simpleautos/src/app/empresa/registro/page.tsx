"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { IconBuilding, IconArrowRight } from '@tabler/icons-react';

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 dark:from-gray-900 dark:via-gray-800 dark:to-primary/5 flex items-center justify-center p-4">
      <div className="bg-lightcard dark:bg-darkcard rounded-3xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-12 max-w-2xl w-full text-center">
        {/* Icono */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-8">
          <IconBuilding size={40} className="text-primary" />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
          Registro Empresarial Simplificado
        </h1>

        {/* Descripción */}
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
          Hemos simplificado el proceso de registro. Ahora puedes registrarte como usuario individual
          y luego convertir tu cuenta a empresarial desde "Mi Empresa" en tu panel de control.
        </p>

        {/* Beneficios */}
        <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            ¿Por qué este cambio?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-black dark:text-white">Registro más rápido</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sin complicaciones iniciales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-black dark:text-white">Flexibilidad</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Convierte cuando lo necesites</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-black dark:text-white">Menos errores</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Proceso más confiable</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-black dark:text-white">Mejor experiencia</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Flujo más intuitivo</p>
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
          Serás redirigido automáticamente en unos segundos...
        </p>
      </div>
    </div>
  );
}
