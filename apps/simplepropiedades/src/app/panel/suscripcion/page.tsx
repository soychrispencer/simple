"use client";

import React from "react";
import { useAuth } from "@simple/auth";
import { Button, PanelPageLayout, Select, Textarea, useToast } from "@simple/ui";
import {
  FREE_TIER_MAX_ACTIVE_LISTINGS,
  SUBSCRIPTION_PLANS,
  normalizeSubscriptionPlanId
} from "@simple/config";
import { logError, logWarn } from "@/lib/logger";

type ManualPaymentRequest = {
  id: string;
  created_at: string;
  request_type: string;
  plan_key: string | null;
  amount: number;
  currency: string;
  status: "pending" | "proof_uploaded" | "approved" | "rejected" | "cancelled";
  proof_note: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
};

type PlanCard = {
  id: string;
  name: string;
  price: number;
  maxActiveListings: number | null;
  features: string[];
};

const PLAN_CARDS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    maxActiveListings: FREE_TIER_MAX_ACTIVE_LISTINGS,
    features: ["1 publicación activa", "Sin página pública", "Sin estadísticas avanzadas"]
  },
  {
    id: "pro",
    name: SUBSCRIPTION_PLANS.pro.name,
    price: SUBSCRIPTION_PLANS.pro.price,
    maxActiveListings: SUBSCRIPTION_PLANS.pro.maxActiveListings,
    features: [...SUBSCRIPTION_PLANS.pro.features]
  },
  {
    id: "enterprise",
    name: SUBSCRIPTION_PLANS.business.name,
    price: SUBSCRIPTION_PLANS.business.price,
    maxActiveListings: SUBSCRIPTION_PLANS.business.maxActiveListings,
    features: [...SUBSCRIPTION_PLANS.business.features]
  }
];

function formatPlan(planKey: string | null | undefined) {
  const normalized = normalizeSubscriptionPlanId(planKey || "free");
  const card = PLAN_CARDS.find((item) => normalizeSubscriptionPlanId(item.id) === normalized);
  return card?.name || "Free";
}

function formatRequestStatus(status: ManualPaymentRequest["status"]) {
  if (status === "approved") return "Aprobada";
  if (status === "rejected") return "Rechazada";
  if (status === "cancelled") return "Cancelada";
  if (status === "proof_uploaded") return "Comprobante recibido";
  return "Pendiente";
}

export default function SuscripcionPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [currentPlan, setCurrentPlan] = React.useState<string>("free");
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = React.useState(false);

  const [manualRequests, setManualRequests] = React.useState<ManualPaymentRequest[]>([]);
  const [manualPlan, setManualPlan] = React.useState<string>("pro");
  const [manualNote, setManualNote] = React.useState("");
  const [manualSubmitting, setManualSubmitting] = React.useState(false);

  const loadPlan = React.useCallback(async () => {
    if (!user?.id) return;
    setLoadingPlan(true);
    try {
      const response = await fetch("/api/properties?mode=subscription", {
        cache: "no-store"
      });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        logError("[SuscripcionProps] Error cargando suscripción", payload);
        setCurrentPlan("free");
        setCurrentPeriodEnd(null);
        return;
      }

      const plan = normalizeSubscriptionPlanId(String(payload?.planKey || "free"));
      setCurrentPlan(plan);
      setCurrentPeriodEnd(String(payload?.renewalDate || "") || null);
    } catch (error) {
      logError("[SuscripcionProps] Error inesperado cargando plan", error);
      setCurrentPlan("free");
      setCurrentPeriodEnd(null);
    } finally {
      setLoadingPlan(false);
    }
  }, [user?.id]);

  const loadManualRequests = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/payments/manual-requests", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        logWarn("[SuscripcionProps] No se pudieron cargar solicitudes manuales", json);
        setManualRequests([]);
        return;
      }
      setManualRequests((json?.data || []) as ManualPaymentRequest[]);
    } catch (error) {
      logWarn("[SuscripcionProps] Error cargando solicitudes manuales", error);
      setManualRequests([]);
    }
  }, [user?.id]);

  React.useEffect(() => {
    void loadPlan();
    void loadManualRequests();
  }, [loadPlan, loadManualRequests]);

  const createManualRequest = async () => {
    if (!user?.id || manualSubmitting) return;
    setManualSubmitting(true);
    try {
      const res = await fetch("/api/payments/manual-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestType: "subscription_upgrade",
          planKey: manualPlan,
          proofNote: manualNote || undefined
        })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json?.error || "No se pudo crear la solicitud", { type: "error" });
        return;
      }

      addToast("Solicitud enviada. Revisaremos tu pago manual y activación.", { type: "success" });
      setManualNote("");
      await loadManualRequests();
    } finally {
      setManualSubmitting(false);
    }
  };

  const currentPlanLabel = formatPlan(currentPlan);
  const currentPlanCard =
    PLAN_CARDS.find((card) => normalizeSubscriptionPlanId(card.id) === normalizeSubscriptionPlanId(currentPlan)) ||
    PLAN_CARDS[0];
  const isPaidPlan = normalizeSubscriptionPlanId(currentPlan) !== "free";

  return (
    <PanelPageLayout
      header={{
        title: "Mis Suscripciones",
        description: "Gestiona tu plan y solicitudes de activación manual."
      }}
    >
      <div className="space-y-8 mt-8">
        <div className="card-surface shadow-card p-6">
          <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Plan actual</h2>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-1">
            {loadingPlan ? "Cargando..." : isPaidPlan ? "Suscripción activa" : "Plan gratuito"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 card-surface ring-1 ring-border/60 rounded-lg">
              <div className="text-2xl font-bold text-primary">{currentPlanLabel}</div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Plan</div>
            </div>
            <div className="text-center p-4 card-surface ring-1 ring-border/60 rounded-lg">
              <div className="text-2xl font-bold text-lighttext dark:text-darktext">
                {typeof currentPlanCard.maxActiveListings === "number"
                  ? currentPlanCard.maxActiveListings === -1
                    ? "Ilimitadas"
                    : currentPlanCard.maxActiveListings
                  : "—"}
              </div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Publicaciones activas</div>
            </div>
            <div className="text-center p-4 card-surface ring-1 ring-border/60 rounded-lg">
              <div className="text-2xl font-bold text-lighttext dark:text-darktext">
                {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString("es-CL") : "—"}
              </div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Vigencia</div>
            </div>
          </div>
        </div>

        <div className="card-surface shadow-card p-6">
          <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Solicitar upgrade manual</h2>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-1">
            Solicita activación por transferencia y nuestro equipo aprobará tu plan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <Select
              label="Plan solicitado"
              value={manualPlan}
              onChange={(value) => setManualPlan(String(value || "pro"))}
              options={[
                { value: "pro", label: "Pro" },
                { value: "business", label: "Empresa" }
              ]}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Nota (opcional)"
                value={manualNote}
                onChange={(event) => setManualNote(String(event.target.value || ""))}
                placeholder="Ej: referencia de transferencia, horario de contacto..."
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="md" onClick={() => void createManualRequest()} disabled={manualSubmitting}>
              {manualSubmitting ? "Enviando..." : "Enviar solicitud manual"}
            </Button>
          </div>
        </div>

        <div className="card-surface shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Historial de solicitudes manuales</h2>
          </div>

          {manualRequests.length === 0 ? (
            <div className="px-6 py-6 text-sm text-lighttext/70 dark:text-darktext/70">
              Aún no tienes solicitudes manuales.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {manualRequests.map((request) => (
                <div key={request.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-lighttext dark:text-darktext">
                      {request.plan_key || "Plan"} · {Number(request.amount || 0).toLocaleString("es-CL")}{" "}
                      {request.currency || "CLP"}
                    </div>
                    <div className="text-xs text-lighttext/70 dark:text-darktext/70">
                      {new Date(request.created_at).toLocaleString("es-CL")}
                    </div>
                    {request.admin_note ? (
                      <div className="text-xs text-lighttext/80 dark:text-darktext/80 mt-1">
                        Nota admin: {request.admin_note}
                      </div>
                    ) : null}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full card-surface ring-1 ring-border/60 text-lighttext/80 dark:text-darktext/80">
                    {formatRequestStatus(request.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelPageLayout>
  );
}
