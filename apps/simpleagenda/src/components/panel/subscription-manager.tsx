'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconCheck, IconCreditCard, IconLoader2, IconAlertCircle, IconX } from '@tabler/icons-react';
import { PanelBlockHeader, PanelButton, PanelCard, PanelNotice, PanelStatusBadge } from '@simple/ui';
import {
  confirmCheckout,
  fetchSubscriptionCatalog,
  startSubscriptionCheckout,
  type PaymentOrderStatus,
  type PaymentOrderView,
  type SubscriptionPlan,
} from '@/lib/payments';
import { fetchAgendaProfile } from '@/lib/agenda-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatMoney(value: number): string {
  return value.toLocaleString('es-CL');
}

function subscriptionTone(status: PaymentOrderStatus): 'success' | 'warning' | 'neutral' | 'info' {
  if (status === 'approved' || status === 'authorized') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'neutral';
  return 'info';
}

function subscriptionLabel(status: PaymentOrderStatus): string {
  if (status === 'approved') return 'Aprobado';
  if (status === 'authorized') return 'Activo';
  if (status === 'pending') return 'Pendiente';
  if (status === 'cancelled') return 'Cancelado';
  return 'Rechazado';
}

// ── Agenda plan cancel card ───────────────────────────────────────────────────

function AgendaPlanCard() {
  const [agendaPlan, setAgendaPlan] = useState<'free' | 'pro'>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const loadPlan = async () => {
    setLoadingPlan(true);
    const prof = await fetchAgendaProfile();
    if (prof) {
      setAgendaPlan(prof.plan as 'free' | 'pro');
      setPlanExpiresAt(prof.planExpiresAt);
    }
    setLoadingPlan(false);
  };

  useEffect(() => { void loadPlan(); }, []);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch(`${API_BASE}/api/agenda/subscription/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setCancelError(data.error ?? 'Error al cancelar'); setCancelling(false); return; }
      setCancelSuccess(true);
      setAgendaPlan('free');
      setPlanExpiresAt(null);
      setConfirmCancel(false);
    } catch {
      setCancelError('Error de conexión');
    } finally {
      setCancelling(false);
    }
  };

  const isPro = agendaPlan === 'pro';
  const isExpired = isPro && planExpiresAt && new Date(planExpiresAt) < new Date();
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <PanelCard size="lg">
      <PanelBlockHeader title="Plan SimpleAgenda" description="Estado actual de tu plan y opciones de cancelación." />

      {loadingPlan ? (
        <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
      ) : cancelSuccess ? (
        <PanelNotice tone="success">Tu plan ha sido cancelado. Ahora estás en el plan Gratuito.</PanelNotice>
      ) : (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--fg-muted)' }}>Plan actual</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                {isPro ? 'Profesional' : 'Gratuito'}
              </p>
              {isPro && planExpiresAt && (
                <p className="text-xs mt-1" style={{ color: isExpired ? 'rgb(190,18,60)' : 'var(--fg-muted)' }}>
                  {isExpired ? 'Expiró el' : 'Expira el'} {fmtDate(planExpiresAt)}
                </p>
              )}
              {isPro && !planExpiresAt && (
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Sin fecha de expiración</p>
              )}
            </div>
            <PanelStatusBadge
              label={isPro && !isExpired ? 'Pro activo' : isPro && isExpired ? 'Expirado' : 'Gratuito'}
              tone={isPro && !isExpired ? 'success' : isPro && isExpired ? 'danger' : 'neutral'}
            />
          </div>

          {isPro && !isExpired && !confirmCancel && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setConfirmCancel(true)}
                className="text-xs underline"
                style={{ color: 'var(--fg-muted)' }}
              >
                Cancelar mi suscripción
              </button>
            </div>
          )}

          {confirmCancel && (
            <div className="mt-4 pt-4 rounded-xl p-4" style={{ borderTop: '1px solid var(--border)', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <div className="flex items-start gap-2 mb-3">
                <IconAlertCircle size={15} style={{ color: 'rgb(190,18,60)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>¿Confirmas la cancelación?</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    Tu cuenta pasará al plan Gratuito de inmediato. Perderás acceso a las funciones Pro (integraciones, notificaciones WhatsApp, límites ampliados).
                  </p>
                </div>
              </div>
              {cancelError && <p className="text-xs mb-2" style={{ color: 'rgb(190,18,60)' }}>{cancelError}</p>}
              <div className="flex gap-2">
                <PanelButton variant="secondary" size="sm" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
                  <IconX size={13} /> Mantener plan
                </PanelButton>
                <button
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'rgba(244,63,94,0.1)', color: 'rgb(190,18,60)', borderColor: 'rgba(244,63,94,0.3)' }}
                >
                  {cancelling ? <IconLoader2 size={13} className="animate-spin" /> : null}
                  {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PanelCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SubscriptionManager() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [freePlan, setFreePlan] = useState<SubscriptionPlan | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string>('free');
  const [currentPlanName, setCurrentPlanName] = useState('Gratuito');
  const [orders, setOrders] = useState<PaymentOrderView[]>([]);
  const [mercadoPagoEnabled, setMercadoPagoEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const catalog = await fetchSubscriptionCatalog();
    if (!catalog) {
      setError('No pudimos cargar tus suscripciones.');
      setLoading(false);
      return;
    }

    setPlans(catalog.plans);
    setFreePlan(catalog.freePlan);
    setOrders(catalog.orders);
    setMercadoPagoEnabled(catalog.mercadoPagoEnabled);
    setCurrentPlanId(catalog.currentSubscription?.planId ?? catalog.freePlan?.id ?? 'free');
    setCurrentPlanName(catalog.currentSubscription?.planName ?? catalog.freePlan?.name ?? 'Gratuito');
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const purchaseId = searchParams.get('purchaseId');
    if (!purchaseId || handledPurchaseId === purchaseId) return;

    setHandledPurchaseId(purchaseId);
    setError('');

    void (async () => {
      const result = await confirmCheckout({
        orderId: purchaseId ?? undefined,
        paymentId: searchParams.get('payment_id') ?? searchParams.get('collection_id') ?? undefined,
      });

      if (!result.ok) {
        setError(result.error ?? 'No pudimos confirmar la suscripción.');
        return;
      }

      if (result.status === 'authorized' || result.status === 'approved') {
        setMessage('Suscripción activada correctamente.');
      } else if (result.status === 'pending') {
        setMessage('Tu suscripción quedó pendiente de validación en Mercado Pago.');
      } else if (result.status === 'cancelled') {
        setError('La suscripción fue cancelada.');
      } else {
        setError('La suscripción no pudo ser aprobada.');
      }

      await load();
    })();
  }, [handledPurchaseId, searchParams]);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId) ?? freePlan,
    [plans, freePlan, currentPlanId]
  );

  const startCheckout = async (planId: string) => {
    setBusyPlanId(planId);
    setError('');
    setMessage('');

    const result = await startSubscriptionCheckout({
      planId: planId as 'free' | 'basic' | 'pro' | 'enterprise',
      returnUrl: `${window.location.origin}/panel/suscripciones`,
    });

    if (!result.ok || !result.checkoutUrl) {
      setError(result.error ?? 'No pudimos iniciar la suscripción.');
      setBusyPlanId(null);
      return;
    }

    window.location.assign(result.checkoutUrl);
  };

  return (
    <div className="space-y-6">
      {message ? <PanelNotice tone="success">{message}</PanelNotice> : null}
      {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
      {!mercadoPagoEnabled && !loading ? (
        <PanelNotice tone="warning">Mercado Pago aún no está disponible en este entorno.</PanelNotice>
      ) : null}

      <PanelCard size="lg">
        <PanelBlockHeader
          title="Plan actual"
          description="Gestiona tu suscripción mensual para SimpleAgenda."
        />

        {loading ? (
          <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        ) : (
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Actualmente activo</p>
                <h3 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{currentPlanName}</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                  {currentPlan?.priceMonthly ? `$${formatMoney(currentPlan.priceMonthly)} / mes (+IVA)` : 'Sin costo mensual'}
                </p>
              </div>
              <PanelStatusBadge
                label={currentPlanId === 'free' ? 'Base' : 'Suscrito'}
                tone={currentPlanId === 'free' ? 'neutral' : 'success'}
              />
            </div>
            {currentPlan?.features?.length ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentPlan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm">
                    <IconCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-secondary)' }} />
                    <span style={{ color: 'var(--fg-secondary)' }}>{feature}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </PanelCard>

      <PanelCard size="lg">
        <PanelBlockHeader
          title="Planes disponibles"
          description="Elige el plan que quieres facturar mensualmente con Mercado Pago."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isPaid = plan.priceMonthly > 0 && plan.id !== 'free';
            return (
              <article
                key={plan.id}
                className="rounded-2xl border p-5"
                style={{
                  borderColor: isCurrent ? 'var(--fg)' : 'var(--border)',
                  background: isCurrent ? 'var(--bg-subtle)' : 'var(--surface)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{plan.name}</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>{plan.description}</p>
                  </div>
                  {plan.recommended ? <PanelStatusBadge label="Recomendado" tone="info" size="sm" /> : null}
                </div>

                <p className="mt-4 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                  {plan.priceMonthly ? `$${formatMoney(plan.priceMonthly)}` : 'Gratis'}
                </p>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  {plan.priceMonthly ? 'facturación mensual + IVA' : 'sin facturación'}
                </p>

                <div className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <IconCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-secondary)' }} />
                      <span style={{ color: 'var(--fg-secondary)' }}>{feature}</span>
                    </div>
                  ))}
                </div>

                <PanelButton
                  className="mt-5 w-full"
                  variant={isCurrent ? 'secondary' : 'primary'}
                  disabled={!isPaid || isCurrent || busyPlanId === plan.id || !mercadoPagoEnabled}
                  onClick={() => {
                    if (plan.id !== 'free') {
                      void startCheckout(plan.id);
                    }
                  }}
                >
                  {busyPlanId === plan.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconCreditCard size={14} />}
                  {isCurrent ? 'Plan activo' : isPaid ? 'Suscribirme' : 'Plan base'}
                </PanelButton>
              </article>
            );
          })}
        </div>
      </PanelCard>

      <AgendaPlanCard />

      <PanelCard size="lg">
        <PanelBlockHeader
          title="Historial de cobros"
          description="Seguimiento simple de tus órdenes de suscripción."
        />

        {loading ? (
          <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        ) : orders.length === 0 ? (
          <PanelNotice tone="neutral">Aún no tienes órdenes de suscripción.</PanelNotice>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border p-4 flex items-center justify-between gap-3 flex-wrap"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--fg)' }}>{order.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>
                    ${formatMoney(order.amount)} · {new Date(order.createdAt).toLocaleString('es-CL')}
                  </p>
                </div>
                <PanelStatusBadge label={subscriptionLabel(order.status)} tone={subscriptionTone(order.status)} />
              </article>
            ))}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
