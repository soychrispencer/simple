"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import { Button, PanelPageLayout } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { logError, logWarn } from "@/lib/logger";
import { IconDownload, IconCalendar, IconCheck, IconX, IconCreditCard } from '@tabler/icons-react';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import type { SubscriptionPlan } from '@/lib/mercadopago';
import { FREE_TIER_MAX_ACTIVE_LISTINGS, SUBSCRIPTION_PLANS } from '@simple/config';

interface Plan {
  id: string;
  nombre: string;
  precio: number;
  features: string[];
  limitePublicaciones: number | null;
  destacado: boolean;
  mpPlanKey?: SubscriptionPlan;
  comingSoon?: boolean;
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
  const { createSubscriptionPayment, loading: mpLoading, error: mpError } = useMercadoPago();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('status');

  const [currentPlan, setCurrentPlan] = React.useState<string>('free');
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState<string | null>(null);
  const [facturas, setFacturas] = React.useState<Factura[]>([]);

  const formatCLP = React.useCallback((amount: number) => {
    return amount.toLocaleString('es-CL');
  }, []);

  const planes: Plan[] = [
    {
      id: 'free',
      nombre: 'Free',
      precio: 0,
      features: [`${FREE_TIER_MAX_ACTIVE_LISTINGS} publicación activa`, 'Sin página pública', 'Sin módulo Estadísticas'],
      limitePublicaciones: FREE_TIER_MAX_ACTIVE_LISTINGS,
      destacado: false,
    },
    {
      id: 'pro',
      nombre: SUBSCRIPTION_PLANS.pro.name,
      precio: SUBSCRIPTION_PLANS.pro.price,
      features: [...SUBSCRIPTION_PLANS.pro.features],
      limitePublicaciones: SUBSCRIPTION_PLANS.pro.maxActiveListings,
      destacado: true,
      mpPlanKey: 'pro',
    },
  ];

  const fetchData = React.useCallback(async () => {
    if (!user) return;
    if (!supabase) {
      logWarn('[MisSuscripciones] Supabase no disponible');
      setCurrentPlan('free');
      return;
    }

    try {
      // Obtener plan activo desde subscriptions (fuente real)
      const { data: activeSub, error: subsError, status: subsStatus } = await supabase
        .from('subscriptions')
        .select('status, current_period_end, subscription_plans(plan_key, name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subsError && subsStatus !== 406) {
        logError('Error obteniendo suscripción', subsError, { scope: 'mis-suscripciones' });
        setCurrentPlan('free');
        setCurrentPeriodEnd(null);
      } else {
        const planKey = (activeSub as any)?.subscription_plans?.plan_key || 'free';
        setCurrentPlan(planKey || 'free');
        setCurrentPeriodEnd((activeSub as any)?.current_period_end || null);
      }

      // Obtener pagos reales
      const { data: paymentRows, error: paymentsError, status: paymentsStatus } = await supabase
        .from('payments')
        .select('id, created_at, amount, status, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (paymentsError && paymentsStatus !== 406) {
        logError('Error obteniendo pagos', paymentsError, { scope: 'mis-suscripciones' });
        setFacturas([]);
      } else {
        const mapped: Factura[] = (paymentRows || []).map((row: any) => {
          const rawStatus = String(row.status || '').toLowerCase();
          const estado: Factura['estado'] =
            rawStatus === 'approved' || rawStatus === 'completed' || rawStatus === 'paid'
              ? 'pagada'
              : rawStatus === 'pending' || rawStatus === 'in_process'
                ? 'pendiente'
                : 'fallida';

          return {
            id: row.id,
            fecha: row.created_at || new Date().toISOString(),
            monto: Number(row.amount || 0),
            estado,
            descripcion: row.description || 'Pago',
          };
        });
        setFacturas(mapped);
      }

    } catch (error) {
      logError('Error cargando datos de suscripción', error, { scope: 'mis-suscripciones' });
    }
  }, [user, supabase]);

  React.useEffect(() => {
    void fetchData();
    // Si vuelve desde MercadoPago con status=success/failure/pending, re-consultamos.
  }, [fetchData, checkoutStatus]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return;

    if (plan.id === 'free') {
      // El plan free se aplica automáticamente cuando no hay suscripción activa.
      return;
    }

    const key = plan.mpPlanKey ?? (plan.id as SubscriptionPlan);

    try {
      await createSubscriptionPayment(key, user.id, user.email || '');
    } catch (error) {
      logError('Error iniciando checkout', error, { scope: 'mis-suscripciones', planId: plan.id });
      alert('Error al iniciar el pago. Inténtalo de nuevo.');
    }
  };

  const handleDownloadFactura = async (facturaId: string) => {
    // TODO: Implementar descarga real de PDF
    alert(`Descarga de factura ${facturaId} próximamente disponible`);
  };

  const getEstadoFactura = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return { text: 'Pagada', color: 'text-[var(--color-success)] bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)]', icon: IconCheck };
      case 'pendiente':
        return { text: 'Pendiente', color: 'text-[var(--color-warn)] bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)]', icon: IconCalendar };
      case 'fallida':
        return { text: 'Fallida', color: 'text-[var(--color-danger)] bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)]', icon: IconX };
      default:
        return { text: estado, color: 'text-lighttext/80 card-surface shadow-card dark:text-darktext/80', icon: IconCalendar };
    }
  };

  const planActual = planes.find(p => p.id === currentPlan);
  const proximaFactura = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const isPaidPlan = currentPlan !== 'free';

  return (
    <PanelPageLayout
      header={{
        title: "Mis Suscripciones",
        description: "Administra tu plan, upgrades y facturación en un solo lugar.",
      }}
    >
      <div className="space-y-8">
        {/* Plan Actual */}
        <div className="card-surface shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Plan Actual</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                {isPaidPlan ? 'Tu suscripción activa' : 'Plan gratuito (sin suscripción activa)'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{planActual?.nombre}</div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">
                {planActual?.precio === 0 ? 'Gratuito' : `$${formatCLP(planActual?.precio ?? 0)}/mes`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 card-surface ring-1 ring-border/60 rounded-lg">
              <div className="text-2xl font-bold text-lighttext dark:text-darktext">
                {typeof planActual?.limitePublicaciones === 'number'
                  ? (planActual.limitePublicaciones === -1 ? 'Ilimitadas' : planActual.limitePublicaciones)
                  : '—'}
              </div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Publicaciones activas</div>
            </div>
            <div className="text-center p-4 card-surface ring-1 ring-border/60 rounded-lg">
              <div className="text-2xl font-bold text-lighttext dark:text-darktext">
                {isPaidPlan && proximaFactura
                  ? proximaFactura.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  : '—'}
              </div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Vence</div>
            </div>
            <div className="text-center p-4 card-surface ring-1 ring-border/60 rounded-lg">
              <div className={`text-2xl font-bold ${isPaidPlan ? 'text-[var(--color-success)]' : 'text-lighttext dark:text-darktext'}`}>
                {isPaidPlan ? 'Activo' : 'Gratis'}
              </div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Estado</div>
            </div>
          </div>

          {planActual?.id !== 'free' && planActual?.features?.length ? (
            <div className="flex flex-wrap gap-2">
              {planActual.features.map((feature, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs card-surface ring-1 ring-border/60 text-lighttext/80 dark:text-darktext/80">
                  <IconCheck size={12} className="mr-1" />
                  {feature}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Cambiar Plan */}
        <div className="card-surface shadow-card p-6">
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext mb-4">Cambiar Plan</h3>
          {mpError && (
            <div className="mb-4 text-sm text-[var(--color-danger)]">{mpError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planes.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl card-surface ring-1 p-6 transition-all ${
                  plan.id === currentPlan
                    ? 'ring-[color:var(--color-primary)] bg-[var(--color-primary-a05)] dark:bg-[var(--color-primary-a10)]'
                    : 'ring-border/60 hover:ring-[color:var(--color-primary-a50)]'
                } ${plan.destacado ? 'shadow-token-sm ring-[color:var(--color-primary-a30)]' : ''}`}
              >
                {plan.destacado && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-[var(--color-on-primary)] text-xs px-3 py-1 rounded-full font-medium">
                      Más Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="text-xl font-bold text-lighttext dark:text-darktext">{plan.nombre}</h4>
                  <div className="text-3xl font-bold text-[var(--color-primary)] mt-2">
                    {plan.precio === 0 ? 'Gratis' : `$${formatCLP(plan.precio)}`}
                    {plan.precio > 0 && <span className="text-sm font-normal text-lighttext/70 dark:text-darktext/70">/mes</span>}
                  </div>
                </div>

                {plan.features.length ? (
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-lighttext/80 dark:text-darktext/80">
                        <IconCheck size={16} className="text-[var(--color-success)] mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mb-6" />
                )}

                <Button
                  className="w-full"
                  variant={plan.id === currentPlan ? "neutral" : "primary"}
                  disabled={plan.id === currentPlan || mpLoading || plan.id === 'free'}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.id === currentPlan
                    ? 'Plan Actual'
                    : plan.id === 'free'
                      ? 'Plan por defecto'
                      : mpLoading
                        ? 'Redirigiendo…'
                        : 'Activar'}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 card-surface shadow-card p-4 rounded-2xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-lighttext dark:text-darktext">Empresa</div>
                <div className="text-sm text-lighttext/70 dark:text-darktext/70">
                  Próximamente: pensado para equipos y operación multi-sucursal.
                </div>
              </div>
              <span className="card-surface ring-1 ring-border/60 text-xs px-3 py-1 rounded-full font-medium text-lighttext/80 dark:text-darktext/80">
                Próximamente
              </span>
            </div>
          </div>
        </div>

        {/* Historial de Pagos */}
        <div className="card-surface shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Historial de Pagos</h3>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70">Revisa tus facturas y descargas comprobantes</p>
          </div>

          <div className="divide-y divide-border/60">
            {facturas.map((factura) => {
              const estadoInfo = getEstadoFactura(factura.estado);
              const EstadoIcon = estadoInfo.icon;

              return (
                <div key={factura.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 card-surface ring-1 ring-border/60 rounded-lg flex items-center justify-center">
                      <IconCreditCard size={20} className="text-lighttext/70 dark:text-darktext/70" />
                    </div>
                    <div>
                      <div className="font-medium text-lighttext dark:text-darktext">{factura.descripcion}</div>
                      <div className="text-sm text-lighttext/70 dark:text-darktext/70">
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
                      <div className="font-semibold text-lighttext dark:text-darktext">
                        ${formatCLP(factura.monto)}
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
            <div className="p-8 text-center text-lighttext/70 dark:text-darktext/70">
              No hay facturas disponibles
            </div>
          )}
        </div>
      </div>
    </PanelPageLayout>
  );
}







