"use client";
import React from "react";
import { Button } from "@/components/ui/Button";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { IconCreditCard, IconDownload, IconCalendar, IconCheck, IconX } from '@tabler/icons-react';

interface Plan {
  id: string;
  nombre: string;
  precio: number;
  features: string[];
  limitePublicaciones: number;
  destacado: boolean;
}

interface Factura {
  id: string;
  fecha: string;
  monto: number;
  estado: 'pagada' | 'pendiente' | 'fallida';
  descripcion: string;
}

export default function Suscripcion() {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [currentPlan, setCurrentPlan] = React.useState<string>('free');
  const [loading, setLoading] = React.useState(true);
  const [facturas, setFacturas] = React.useState<Factura[]>([]);

  const planes: Plan[] = [
    {
      id: 'free',
      nombre: "Free",
      precio: 0,
      features: ["1 publicación activa", "Soporte básico", "Sin destacados"],
      limitePublicaciones: 1,
      destacado: false
    },
    {
      id: 'pro',
      nombre: "Pro",
      precio: 9990,
      features: ["10 publicaciones activas", "Destacados incluidos", "Soporte prioritario", "Estadísticas avanzadas"],
      limitePublicaciones: 10,
      destacado: true
    },
    {
      id: 'empresa',
      nombre: "Empresa",
      precio: 29990,
      features: ["Publicaciones ilimitadas", "Branding personalizado", "Equipo de soporte", "API access", "Análisis premium"],
      limitePublicaciones: -1, // ilimitado
      destacado: false
    },
  ];

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Obtener plan actual del usuario desde profiles
        // Primero intentar por user_id (para usuarios autenticados), luego por email (para usuarios legacy)
        let profileQuery = supabase
          .from('profiles')
          .select('plan')
          .limit(1);

        if (user.id) {
          // Usuario autenticado - buscar por user_id
          profileQuery = profileQuery.eq('user_id', user.id);
        } else if (user.email) {
          // Usuario legacy - buscar por email
          profileQuery = profileQuery.eq('email', user.email);
        } else {
          // No hay información suficiente para identificar al usuario
          console.error('No se puede identificar al usuario: no hay id ni email');
          setCurrentPlan('free');
          setLoading(false);
          return;
        }

        const { data: profiles, error: profileError } = await profileQuery;

        if (profileError) {
          console.error('Error obteniendo perfil:', profileError);
          setCurrentPlan('free');
        } else {
          const profile = profiles && profiles.length > 0 ? profiles[0] : null;
          setCurrentPlan(profile?.plan || 'free');
        }

        // Obtener facturas del usuario (simulado por ahora hasta implementar tabla de pagos)
        const mockFacturas: Factura[] = [
          {
            id: "F-001",
            fecha: new Date().toISOString().split('T')[0],
            monto: 9990,
            estado: "pagada",
            descripcion: "Plan Pro - Mensual"
          },
          {
            id: "F-002",
            fecha: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            monto: 9990,
            estado: "pagada",
            descripcion: "Plan Pro - Mensual"
          },
          {
            id: "F-003",
            fecha: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            monto: 9990,
            estado: "pagada",
            descripcion: "Plan Pro - Mensual"
          }
        ];
        setFacturas(mockFacturas);

      } catch (error) {
        console.error('Error cargando datos de suscripción:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase]);

  const handleChangePlan = async (planId: string) => {
    if (!user) return;

    try {
      setLoading(true);

      // Actualizar plan en la base de datos
      const { error } = await supabase
        .from('profiles')
        .update({ plan: planId })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error actualizando plan:', error);
        alert('Error al cambiar de plan. Inténtalo de nuevo.');
        return;
      }

      // Actualizar estado local
      setCurrentPlan(planId);
      alert(`Plan cambiado exitosamente a ${planes.find(p => p.id === planId)?.nombre}`);

    } catch (error) {
      console.error('Error cambiando plan:', error);
      alert('Error al cambiar de plan. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFactura = async (facturaId: string) => {
    // TODO: Implementar descarga real de PDF
    alert(`Descarga de factura ${facturaId} próximamente disponible`);
  };

  const getEstadoFactura = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return { text: 'Pagada', color: 'text-green-600 bg-green-50 dark:bg-green-900/20', icon: IconCheck };
      case 'pendiente':
        return { text: 'Pendiente', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', icon: IconCalendar };
      case 'fallida':
        return { text: 'Fallida', color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: IconX };
      default:
        return { text: estado, color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20', icon: IconCalendar };
    }
  };

  const planActual = planes.find(p => p.id === currentPlan);
  const proximaFactura = new Date();
  proximaFactura.setMonth(proximaFactura.getMonth() + 1);

  return (
    <PanelPageLayout
      header={{
        title: "Suscripción y Pagos",
        description: "Gestiona tu plan, método de pago y revisa tu historial de facturación.",
        actions: (
          <div className="flex gap-2">
            <Button variant="neutral" size="sm">
              <IconCreditCard size={16} className="mr-2" />
              Método de Pago
            </Button>
          </div>
        )
      }}
    >
      <div className="space-y-8">
        {/* Plan Actual */}
        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white">Plan Actual</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Tu suscripción activa</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{planActual?.nombre}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {planActual?.precio === 0 ? 'Gratuito' : `$${planActual?.precio?.toLocaleString()}/mes`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-black dark:text-white">
                {planActual?.limitePublicaciones === -1 ? '∞' : planActual?.limitePublicaciones}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Publicaciones activas</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-black dark:text-white">
                {proximaFactura.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Próxima facturación</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Activo</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Estado</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {planActual?.features.map((feature, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <IconCheck size={12} className="mr-1" />
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Cambiar Plan */}
        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Cambiar Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planes.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 transition-all ${
                  plan.id === currentPlan
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                } ${plan.destacado ? 'ring-2 ring-primary/20' : ''}`}
              >
                {plan.destacado && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white text-xs px-3 py-1 rounded-full font-medium">
                      Más Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="text-xl font-bold text-black dark:text-white">{plan.nombre}</h4>
                  <div className="text-3xl font-bold text-primary mt-2">
                    {plan.precio === 0 ? 'Gratis' : `$${plan.precio.toLocaleString()}`}
                    {plan.precio > 0 && <span className="text-sm font-normal text-gray-600 dark:text-gray-300">/mes</span>}
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <IconCheck size={16} className="text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.id === currentPlan ? "neutral" : "primary"}
                  disabled={plan.id === currentPlan}
                  onClick={() => handleChangePlan(plan.id)}
                >
                  {plan.id === currentPlan ? 'Plan Actual' : 'Seleccionar Plan'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Historial de Pagos */}
        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-black dark:text-white">Historial de Pagos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Revisa tus facturas y descargas comprobantes</p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {facturas.map((factura) => {
              const estadoInfo = getEstadoFactura(factura.estado);
              const EstadoIcon = estadoInfo.icon;

              return (
                <div key={factura.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <IconCreditCard size={20} className="text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <div className="font-medium text-black dark:text-white">{factura.descripcion}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(factura.fecha).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-black dark:text-white">
                        ${factura.monto.toLocaleString()}
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                        <EstadoIcon size={12} className="mr-1" />
                        {estadoInfo.text}
                      </div>
                    </div>

                    {factura.estado === 'pagada' && (
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => handleDownloadFactura(factura.id)}
                      >
                        <IconDownload size={16} className="mr-2" />
                        Descargar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {facturas.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No hay facturas disponibles
            </div>
          )}
        </div>
      </div>
    </PanelPageLayout>
  );
}
