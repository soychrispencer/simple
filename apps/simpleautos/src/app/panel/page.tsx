"use client";
import React from "react";
import Link from "next/link";
import { Button, PanelPageLayout } from "@simple/ui";
import { useRouter } from "next/navigation";
import { useListingsScope } from "@simple/listings";
import { logError } from "@/lib/logger";
import {
  IconEye,
  IconBookmark
} from "@tabler/icons-react";

type PubItem = {
  id: string;
  titulo: string;
  precio: number;
  estado: string;
  estadoKey: string;
  portada?: string;
  views: number;
  favorites: number;
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
  published: "Publicado",
  inactive: "Pausado",
  draft: "Borrador",
  sold: "Pausado",
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
  draft: {
    bg: "card-surface",
    text: "text-[var(--text-primary)]",
  },
  sold: {
    bg: "bg-[var(--surface-2)] border border-[var(--card-border)]",
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

type VehiclePanelRow = {
  id: string;
  title: string;
  price?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  views?: number | null;
  clicks?: number | null;
  images?: { url?: string | null; position?: number | null; is_cover?: boolean | null }[] | null;
};

export default function PanelHome() {
  const [mounted, setMounted] = React.useState(false);
  const [recientes, setRecientes] = React.useState<PubItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [kpiStats, setKpiStats] = React.useState<KpiStats>(EMPTY_KPI_STATS);
  const [profileStatus, setProfileStatus] = React.useState({
    profileComplete: false,
    accountVerified: false,
    planActive: false,
    documentsVerified: false
  });
  const { user, loading: scopeLoading, scopeFilter } = useListingsScope({ verticalKey: 'autos' });
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
        const listingsPromise = (async (): Promise<VehiclePanelRow[]> => {
          const params = new URLSearchParams({
            scopeColumn: scopeFilter.column,
            scopeValue: scopeFilter.value
          });
          const response = await fetch(`/api/vehicles?${params.toString()}`, {
            cache: 'no-store'
          });
          const payload = await response.json().catch(() => ({} as Record<string, unknown>));
          if (!response.ok) {
            throw new Error(String(payload?.error || 'No se pudieron cargar los vehículos'));
          }
          return Array.isArray((payload as { vehicles?: unknown[] }).vehicles)
            ? ((payload as { vehicles: VehiclePanelRow[] }).vehicles ?? [])
            : [];
        })();

        const subscriptionPromise = (async () => {
          const response = await fetch('/api/vehicles?mode=subscription', {
            cache: 'no-store'
          });
          const payload = await response.json().catch(() => ({} as Record<string, unknown>));
          if (!response.ok) {
            throw new Error(String(payload?.error || 'No se pudo cargar la suscripción'));
          }
          return payload as {
            status?: string | null;
          };
        })();

        const [listingRows, subscriptionData] = await Promise.all([
          listingsPromise,
          subscriptionPromise
        ]);

        if (!cancelled) {
          const statsSnapshot = (listingRows || []).reduce((acc: KpiStats, row: { status?: string | null }) => {
            const status = String(row.status || 'draft');
            acc.total += 1;
            if (status === 'published') {
              acc.active += 1;
            } else if (status === 'inactive' || status === 'sold') {
              acc.paused += 1;
            } else {
              acc.drafts += 1;
            }
            return acc;
          }, { ...EMPTY_KPI_STATS });
          setKpiStats(statsSnapshot);
        }

        if (!cancelled) {
          const mappedRecientes: PubItem[] = [...(listingRows || [])]
            .filter((row) => String(row.status || '') === 'published')
            .sort((a, b) => {
              const aTs = Date.parse(a.created_at || a.updated_at || '1970-01-01T00:00:00.000Z');
              const bTs = Date.parse(b.created_at || b.updated_at || '1970-01-01T00:00:00.000Z');
              return bTs - aTs;
            })
            .slice(0, 5)
            .map((row) => {
            const orderedImages = [...(row.images || [])].sort((a, b) => {
              if (!!a.is_cover === !!b.is_cover) {
                return (a.position ?? 0) - (b.position ?? 0);
              }
              return a.is_cover ? -1 : 1;
            });
            const views = typeof row.views === 'number' ? row.views : 0;
            const favorites = typeof row.clicks === 'number' ? row.clicks : 0;
            return {
              id: row.id,
              titulo: row.title,
              precio: row.price || 0,
              estado: STATUS_LABEL_BY_DB[String(row.status || '')] || 'Desconocido',
              estadoKey: String(row.status || 'default'),
              portada: orderedImages[0]?.url || '',
              views,
              favorites,
            };
          });
          setRecientes(mappedRecientes);
        }

        const planActive = String(subscriptionData?.status || 'inactive') === 'active';
        const profileComplete = !!(user?.user_metadata?.full_name && user?.user_metadata?.phone);
        const accountVerified = !!user?.email_confirmed_at;
        const documentsVerified = false; // TODO: implementar verificación de documentos

        if (!cancelled) {
          setProfileStatus({
            profileComplete,
            accountVerified,
            planActive,
            documentsVerified,
          });
        }

      } catch (error) {
        if (!cancelled) {
          logError('Error en fetchData', error, { scope: 'panel-home' });
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

  const headerDescription = profileStatus.planActive
    ? 'Gestiona tus publicaciones y mantén al día tu plan SimpleAutos.'
    : 'Actualmente estás en el plan gratuito. Activa un plan para escalar tu visibilidad.';

  const hasPublished = kpiStats.total > 0;

  const nextSteps = [
    {
      id: "profile",
      label: "Completa tu perfil",
      done: profileStatus.profileComplete,
      href: "/panel/mi-perfil",
      actionLabel: "Actualizar",
    },
    {
      id: "email",
      label: "Verifica tu correo",
      done: profileStatus.accountVerified,
      href: "/panel/mi-perfil",
      actionLabel: "Revisar",
    },
    {
      id: "plan",
      label: "Activa un plan",
      done: profileStatus.planActive,
      href: "/panel/mis-suscripciones",
      actionLabel: "Ver planes",
    },
    {
      id: "publish",
      label: "Publica tu primer vehículo",
      done: hasPublished,
      href: "/panel/publicar-vehiculo?new=1",
      actionLabel: "Publicar",
    },
  ];

  const pendingSteps = nextSteps.filter((step) => !step.done).slice(0, 3);

  return (
    <PanelPageLayout
      header={{
        title: `Hola, ${displayName}.`,
        description: headerDescription,
        actions: (
          <Button
            variant="outline"
            size="md"
            onClick={() => router.push('/panel/mis-suscripciones')}
          >
            Mis Suscripciones
          </Button>
        )
      }}
    >

      <div className="card-surface shadow-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="type-title-3 text-lighttext dark:text-darktext">Tus publicaciones</h3>
            <p className="type-body-sm text-lighttext/70 dark:text-darktext/70">Lo esencial para tomar decisiones rápido.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={() => router.push("/panel/mis-publicaciones")}>Ver publicaciones</Button>
            <Button variant="primary" size="md" onClick={() => router.push("/panel/publicar-vehiculo?new=1")}>Publicar</Button>
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
            <Link className="link-base link-plain type-body-md font-medium" href="/panel/mis-publicaciones">Ver todas</Link>
          </div>
          <p className="mt-1 type-body-sm text-lighttext/70 dark:text-darktext/70">Actividad reciente y métricas clave.</p>

          {!mounted || loading || recientes.length === 0 ? (
            <div className="mt-4 type-body-md text-lighttext/80 dark:text-darktext/80">
              {loading ? "Cargando..." : "Aún no tienes publicaciones."}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-lightborder/10 dark:divide-darkborder/10">
              {recientes.slice(0, 4).map((i: PubItem) => (
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
                      <span className="font-medium text-lighttext dark:text-darktext">${i.precio}</span>
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

                  <Button variant="ghost" size="sm" onClick={() => router.push(`/panel/mis-publicaciones/${i.id}`)}>
                    Ver
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

        {/* Tarjeta de horarios de atención eliminada por solicitud */}
      </PanelPageLayout>
    );
  }







