"use client";
import React from "react";
import Link from "next/link";
import { PanelPageLayout, Button } from "@simple/ui";
import { normalizeSubscriptionPlanId } from "@simple/config";
import { useRouter } from "next/navigation";
import { useListingsScope } from "@simple/listings";
import { logError } from "@/lib/logger";
import {
  IconEye,
  IconBookmark
} from "@tabler/icons-react";

type PropertyItem = {
  id: string;
  titulo: string;
  precio: number;
  currency?: string | null;
  estado: string;
  estadoKey: string;
  portada?: string;
  views: number;
  favorites: number;
};

type PanelListingRow = {
  id: string;
  title: string;
  price?: number | null;
  currency?: string | null;
  status: string;
  published_at?: string | null;
  created_at?: string | null;
  listing_metrics?:
    | { views?: number | null; favorites?: number | null }
    | { views?: number | null; favorites?: number | null }[]
    | null;
  images?: { url?: string | null; position?: number | null; is_primary?: boolean | null }[] | null;
};

type KpiStats = {
  total: number;
  active: number;
  paused: number;
  drafts: number;
};

const EMPTY_KPI_STATS: KpiStats = {
  total: 0,
  active: 0,
  paused: 0,
  drafts: 0,
};

const STATUS_LABEL_BY_DB: Record<string, string> = {
  published: "Publicada",
  inactive: "Pausada",
  paused: "Pausada",
  draft: "Borrador",
};

const STATUS_CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  published: {
    bg: "bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)]",
    text: "text-[var(--color-success)]",
  },
  inactive: {
    bg: "bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)]",
    text: "text-[var(--color-warn)]",
  },
  paused: {
    bg: "bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)]",
    text: "text-[var(--color-warn)]",
  },
  draft: {
    bg: "card-surface",
    text: "text-[var(--text-primary)]",
  },
  default: {
    bg: "card-surface",
    text: "text-[var(--text-primary)]",
  },
};

const getStatusChipClasses = (status: string) => {
  const style = STATUS_CHIP_STYLES[status] || STATUS_CHIP_STYLES.default;
  return `${style.bg} ${style.text}`;
};

const formatCurrency = (value: number, currency?: string | null) => {
  const amount = typeof value === "number" ? value : 0;
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: currency || "CLP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString("es-CL")}`;
  }
};

export default function PanelPage() {
  const [mounted, setMounted] = React.useState(false);
  const [recientes, setRecientes] = React.useState<PropertyItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [kpiStats, setKpiStats] = React.useState<KpiStats>(EMPTY_KPI_STATS);
  const [profileStatus, setProfileStatus] = React.useState({
    profileComplete: false,
    accountVerified: false,
    planActive: false,
    documentsVerified: false,
  });
  const [subscriptionInfo, setSubscriptionInfo] = React.useState<{ plan?: string | null; renewalDate?: string | null; status: string }>(
    {
      plan: null,
      renewalDate: null,
      status: "inactive",
    }
  );
  const { user, loading: scopeLoading, scopeFilter } = useListingsScope({ verticalKey: "properties" });
  const router = useRouter();

  React.useEffect(() => {
    if (scopeLoading) {
      return;
    }

    if (!user || !scopeFilter) {
      setKpiStats(EMPTY_KPI_STATS);
      setRecientes([]);
      setProfileStatus({
        profileComplete: false,
        accountVerified: false,
        planActive: false,
        documentsVerified: false,
      });
      setLoading(false);
      setMounted(true);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        setMounted(true);
        return;
      }
      try {
        setLoading(true);

        const propertiesPromise = (async (): Promise<PanelListingRow[]> => {
          const params = new URLSearchParams({
            scopeColumn: scopeFilter.column,
            scopeValue: scopeFilter.value,
          });
          const response = await fetch(`/api/properties?${params.toString()}`, {
            cache: "no-store",
          });
          const payload = await response.json().catch(() => ({} as Record<string, unknown>));
          if (!response.ok) {
            throw new Error(String(payload?.error || "No se pudieron cargar las propiedades"));
          }
          return Array.isArray((payload as { listings?: unknown[] }).listings)
            ? ((payload as { listings: PanelListingRow[] }).listings ?? [])
            : [];
        })();

        const subscriptionPromise = (async () => {
          const response = await fetch("/api/properties?mode=subscription", {
            cache: "no-store",
          });
          const payload = await response.json().catch(() => ({} as Record<string, unknown>));
          if (!response.ok) {
            throw new Error(String(payload?.error || "No se pudo cargar la suscripción"));
          }
          return payload as {
            status?: string | null;
            plan?: string | null;
            planKey?: string | null;
            renewalDate?: string | null;
          };
        })();

        const [listingRows, subscriptionData] = await Promise.all([
          propertiesPromise,
          subscriptionPromise,
        ]);

        if (!cancelled) {
          const statsSnapshot = (listingRows || []).reduce((acc: KpiStats, row: { status: string }) => {
            acc.total += 1;
            if (row.status === "published") {
              acc.active += 1;
            } else if (row.status === "paused" || row.status === "inactive") {
              acc.paused += 1;
            } else {
              acc.drafts += 1;
            }
            return acc;
          }, { ...EMPTY_KPI_STATS });
          setKpiStats(statsSnapshot);
        }

        if (!cancelled) {
          const recentsRows = [...(listingRows || [])]
            .filter((row) => row.status === "published")
            .sort((a, b) => {
              const aTs = Date.parse(a.published_at || a.created_at || "1970-01-01T00:00:00.000Z");
              const bTs = Date.parse(b.published_at || b.created_at || "1970-01-01T00:00:00.000Z");
              return bTs - aTs;
            })
            .slice(0, 5);

          const mappedRecientes: PropertyItem[] = recentsRows.map((row) => {
            const orderedImages = [...(row.images || [])].sort((a, b) => {
              if (!!a.is_primary === !!b.is_primary) {
                return (a.position ?? 0) - (b.position ?? 0);
              }
              return a.is_primary ? -1 : 1;
            });
            const metrics = Array.isArray(row.listing_metrics)
              ? row.listing_metrics[0]
              : row.listing_metrics;
            const views = typeof metrics?.views === "number" ? metrics.views : 0;
            const favorites = typeof metrics?.favorites === "number" ? metrics.favorites : 0;
            return {
              id: row.id,
              titulo: row.title,
              precio: row.price || 0,
              currency: row.currency || "CLP",
              estado: STATUS_LABEL_BY_DB[row.status] || "Desconocido",
              estadoKey: row.status || "default",
              portada: orderedImages[0]?.url || "",
              views,
              favorites,
            };
          });
          setRecientes(mappedRecientes);
        }

        const planStatus = typeof subscriptionData?.status === "string" ? subscriptionData.status : "inactive";
        const planActive = planStatus === "active";
        const normalizedPlan = normalizeSubscriptionPlanId(subscriptionData?.planKey || null);
        const planLabel = subscriptionData?.plan
          || normalizedPlan
          || null;
        const profileComplete = !!(user?.user_metadata?.full_name && user?.user_metadata?.phone);
        const accountVerified = !!user?.email_confirmed_at;
        const documentsVerified = false;

        if (!cancelled) {
          setProfileStatus({
            profileComplete,
            accountVerified,
            planActive,
            documentsVerified,
          });
          setSubscriptionInfo({
            status: planStatus,
            plan: planLabel,
            renewalDate: subscriptionData?.renewalDate || null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          logError("Error en fetchData (SimplePropiedades panel):", error);
          setKpiStats(EMPTY_KPI_STATS);
          setRecientes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setMounted(true);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [scopeFilter, user, scopeLoading]);

  const displayName = React.useMemo(() => {
    const asTrimmedString = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const firstToken = (value: unknown): string | null => {
      const str = asTrimmedString(value);
      if (!str) return null;
      const [first] = str.split(/\s+/);
      return first || null;
    };

    const candidates: Array<string | null> = [
      firstToken(user?.first_name),
      firstToken(user?.profile?.first_name),
      firstToken(user?.public_name),
      firstToken(user?.nombre),
      firstToken(user?.name),
      firstToken(user?.user_metadata?.first_name),
      firstToken(user?.user_metadata?.full_name),
      firstToken(user?.user_metadata?.name),
      firstToken(user?.user_metadata?.nombre),
      firstToken(user?.user_metadata?.display_name),
      firstToken(user?.public_profile?.full_name),
      firstToken(user?.public_profile?.name),
    ];

    return candidates.find((value) => Boolean(value)) ?? "Usuario";
  }, [user]);

  const renewalLabel = React.useMemo(() => {
    if (!subscriptionInfo.renewalDate) return null;
    try {
      return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(
        new Date(subscriptionInfo.renewalDate)
      );
    } catch {
      return null;
    }
  }, [subscriptionInfo.renewalDate]);
  const planLabel = profileStatus.planActive
    ? subscriptionInfo.plan || "Plan activo"
    : "Gratuito";
  const planSupport = profileStatus.planActive
    ? renewalLabel
      ? `Renueva el ${renewalLabel}`
      : "Plan activo vigente"
    : "Activa un plan para llegar a mas compradores.";

  const headerDescription = profileStatus.planActive
    ? "Gestiona tus propiedades y mantiene tu plan SimplePropiedades al dia."
    : "Actualmente estas en el plan gratuito. Activa un plan para escalar tu visibilidad inmobiliaria.";

  const hasPublished = kpiStats.total > 0;

  const nextSteps = [
    {
      id: "profile",
      label: "Completa tu perfil",
      done: profileStatus.profileComplete,
      href: "/panel/perfil",
      actionLabel: "Actualizar",
    },
    {
      id: "email",
      label: "Verifica tu correo",
      done: profileStatus.accountVerified,
      href: "/panel/perfil",
      actionLabel: "Revisar",
    },
    {
      id: "plan",
      label: "Activa un plan",
      done: profileStatus.planActive,
      href: "/panel/planes",
      actionLabel: "Ver planes",
    },
    {
      id: "publish",
      label: "Publica tu primera propiedad",
      done: hasPublished,
      href: "/panel/nueva-publicacion",
      actionLabel: "Publicar",
    },
  ];

  const pendingSteps = nextSteps.filter((step) => !step.done).slice(0, 3);

  return (
    <PanelPageLayout
      header={{
        title: `Hola, ${displayName}.`,
        description: headerDescription,
      }}
    >
      <div className="card-surface shadow-card p-5 mb-4 flex flex-col md:flex-row md:items-center md:gap-4">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-lighttext/70 dark:text-darktext/70">Plan actual</div>
          <div className="text-lg font-semibold leading-tight text-lighttext dark:text-darktext">{planLabel}</div>
          <div className="text-xs text-lighttext/70 dark:text-darktext/70">{planSupport}</div>
        </div>
        <Button
          variant="outline"
          className="text-sm"
          onClick={() => router.push("/panel/planes")}
        >
          Ver planes
        </Button>
      </div>

      <div className="card-surface shadow-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="type-title-3 text-lighttext dark:text-darktext">Tus publicaciones</h3>
            <p className="type-body-sm text-lighttext/70 dark:text-darktext/70">Lo esencial para tomar decisiones rápido.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={() => router.push("/panel/publicaciones")}>Ver publicaciones</Button>
            <Button variant="primary" size="md" onClick={() => router.push("/panel/nueva-publicacion")}>Publicar</Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Totales", value: kpiStats.total },
            { label: "Activas", value: kpiStats.active },
            { label: "Pausadas", value: kpiStats.paused },
            { label: "Borradores", value: kpiStats.drafts },
          ].map((stat) => (
            <div key={stat.label} className="card-inset p-4">
              <div className="type-label text-lighttext/70 dark:text-darktext/70">{stat.label}</div>
              <div className="mt-1 type-kpi text-lighttext dark:text-darktext">{loading ? "..." : stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card-surface shadow-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="type-title-4 text-lighttext dark:text-darktext">Lo importante</h3>
            <span className="type-caption text-lighttext/60 dark:text-darktext/60">Resumen del panel</span>
          </div>

          <div className="mt-4">
            <div className="type-label text-lighttext/60 dark:text-darktext/60 mb-2">Próximos pasos</div>
            {pendingSteps.length === 0 ? (
              <div className="type-body-md text-lighttext/70 dark:text-darktext/70">Todo listo por ahora.</div>
            ) : (
              <div className="divide-y divide-lightborder/10 dark:divide-darkborder/10">
                {pendingSteps.map((step) => (
                  <div key={step.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="type-body-md font-medium text-lighttext dark:text-darktext">{step.label}</div>
                    <Button size="sm" variant="outline" onClick={() => router.push(step.href)}>{step.actionLabel}</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card-surface shadow-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="type-title-4 text-lighttext dark:text-darktext">Publicaciones recientes</h3>
            <Link className="link-base link-plain type-body-md font-medium" href="/panel/publicaciones">Ver todas</Link>
          </div>
          <p className="mt-1 type-body-sm text-lighttext/70 dark:text-darktext/70">Actividad reciente y métricas clave.</p>

          {!mounted || loading || recientes.length === 0 ? (
            <div className="mt-4 type-body-md text-lighttext/70 dark:text-darktext/70">
              {loading ? "Cargando..." : "Aún no tienes publicaciones."}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-lightborder/10 dark:divide-darkborder/10">
              {recientes.slice(0, 4).map((i: PropertyItem) => (
                <div key={i.id} className="py-4 flex items-center gap-4">
                  <div className="w-12 h-12 card-inset rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {i.portada ? (
                      <img src={i.portada} alt={i.titulo} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-lighttext/60 dark:text-darktext/60 text-xs">Sin imagen</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="type-body-md font-semibold text-lighttext dark:text-darktext truncate">{i.titulo}</div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusChipClasses(i.estadoKey)}`}>
                        {i.estado}
                      </span>
                    </div>
                    <div className="mt-1 type-caption text-lighttext/70 dark:text-darktext/70">
                      <span className="font-medium text-lighttext dark:text-darktext">{formatCurrency(i.precio, i.currency)}</span>
                      <span className="mx-2">·</span>
                      <span className="inline-flex items-center gap-1">
                        <IconEye size={14} className="text-lighttext/50 dark:text-darktext/50" />
                        {i.views.toLocaleString("es-CL")}
                      </span>
                      <span className="mx-2">·</span>
                      <span className="inline-flex items-center gap-1">
                        <IconBookmark size={14} className="text-lighttext/50 dark:text-darktext/50" />
                        {i.favorites.toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => router.push(`/panel/publicaciones/${i.id}`)}>
                    Ver
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PanelPageLayout>
  );
}
