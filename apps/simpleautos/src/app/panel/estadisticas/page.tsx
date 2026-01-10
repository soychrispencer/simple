"use client";
import React from "react";
import { Button } from "@simple/ui";
import { PanelPageLayout } from "@simple/ui";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { Select, LineChart } from "@simple/ui";
import { IconEye, IconPhone, IconBookmark, IconShare, IconTrendingUp, IconTrophy, IconChartBar, IconChartLine } from '@tabler/icons-react';
import { useListingsScope } from "@simple/listings";
import { logError } from "@/lib/logger";

const AUTOS_VERTICAL_KEYS = ["vehicles", "autos"] as const;
const AUTOS_VERTICAL_FILTER = [...AUTOS_VERTICAL_KEYS];

type PeriodFilter = 'all' | 'week' | 'month' | 'year';
type VehicleFilter = 'all' | 'car' | 'motorcycle' | 'truck';

type ListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  status: string;
  published_at: string | null;
  created_at: string | null;
  listing_metrics?: { views?: number; clicks?: number; favorites?: number; shares?: number } | null;
  listings_vehicles?: {
    vehicle_type_id?: string | null;
    vehicle_types?: { slug?: string | null } | null;
  } | null;
  metadata?: Record<string, any> | null;
  images?: { url?: string | null; position?: number | null; is_primary?: boolean | null }[] | null;
};

type Metrics = {
  views: number;
  contacts: number;
  favorites: number;
  shares: number;
  conversionRate: number;
};

function getPeriodStart(period: PeriodFilter): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
}

function getPreviousRange(period: PeriodFilter): { start: Date; end: Date } | null {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'week') {
    const end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  if (period === 'month') {
    const end = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const start = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    return { start, end };
  }
  const end = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const start = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  return { start, end };
}

function normalizeMetrics(metrics?: ListingRow['listing_metrics']) {
  return {
    views: metrics?.views ?? 0,
    clicks: metrics?.clicks ?? 0,
    favorites: metrics?.favorites ?? 0,
    shares: metrics?.shares ?? 0,
  };
}

function aggregateMetrics(rows: ListingRow[]) {
  return rows.reduce(
    (acc, row) => {
      const metrics = normalizeMetrics(row.listing_metrics);
      acc.views += metrics.views;
      acc.contacts += metrics.clicks;
      acc.favorites += metrics.favorites;
      acc.shares += metrics.shares;
      return acc;
    },
    { views: 0, contacts: 0, favorites: 0, shares: 0 }
  );
}

function matchesVehicleFilter(row: ListingRow, filter: VehicleFilter) {
  if (filter === 'all') return true;
  const slug = row.listings_vehicles?.vehicle_types?.slug ?? row.metadata?.type_key ?? null;
  if (!slug) return false;
  return slug === filter;
}

function sortImages(images?: ListingRow['images']) {
  if (!Array.isArray(images)) return [];
  return [...images]
    .filter((img): img is { url: string; position?: number | null; is_primary?: boolean | null } => !!img?.url)
    .sort((a, b) => {
      if (!!a.is_primary === !!b.is_primary) {
        return (a.position ?? 0) - (b.position ?? 0);
      }
      return a.is_primary ? -1 : 1;
    });
}

export default function Estadisticas(): React.ReactElement {
  const supabase = useSupabase();
  const { user, scopeFilter, loading: scopeLoading } = useListingsScope({ verticalKey: 'autos' });
  
  const [metrics, setMetrics] = React.useState<Metrics>({
    views: 0,
    contacts: 0,
    favorites: 0,
    shares: 0,
    conversionRate: 0
  });
  const [previousMetrics, setPreviousMetrics] = React.useState({
    views: 0,
    contacts: 0,
    favorites: 0,
    shares: 0
  });
  const [bars, setBars] = React.useState<number[]>([]);
  const [barLabels, setBarLabels] = React.useState<string[]>([]);
  const [recentVehicles, setRecentVehicles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<PeriodFilter>('all');
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');
  const [chartData, setChartData] = React.useState<number[]>([]);
  const [chartLabels, setChartLabels] = React.useState<string[]>([]);
  const [vehicleType, setVehicleType] = React.useState<VehicleFilter>('all');

  const fetchMetrics = React.useCallback(async () => {
    if (!supabase || scopeLoading) return;

    if (!user || !scopeFilter) {
      setMetrics({ views: 0, contacts: 0, favorites: 0, shares: 0, conversionRate: 0 });
      setPreviousMetrics({ views: 0, contacts: 0, favorites: 0, shares: 0 });
      setBars([]);
      setBarLabels([]);
      setRecentVehicles([]);
      setChartData([]);
      setChartLabels([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const periodStart = getPeriodStart(period);
      let listingsQuery = supabase
        .from('listings')
        .select(`
          id,
          title,
          price,
          status,
          published_at,
          created_at,
          metadata,
          listing_metrics(views, clicks, favorites, shares),
          listings_vehicles(vehicle_type_id, vehicle_types(slug)),
          images:images(url, position, is_primary),
          verticals!inner(key)
        `)
        .eq(scopeFilter.column, scopeFilter.value)
        .in('verticals.key', AUTOS_VERTICAL_FILTER);

      if (periodStart) {
        listingsQuery = listingsQuery.gte('published_at', periodStart.toISOString());
      }

      const { data: listingsData, error } = await listingsQuery;
      if (error) throw error;

      const filteredListings = (listingsData || []).filter((row: ListingRow) => matchesVehicleFilter(row, vehicleType));
      const aggregates = aggregateMetrics(filteredListings);
      const conversionRate = aggregates.views > 0 ? (aggregates.contacts / aggregates.views) * 100 : 0;

      setMetrics({
        views: aggregates.views,
        contacts: aggregates.contacts,
        favorites: aggregates.favorites,
        shares: aggregates.shares,
        conversionRate,
      });

      type EnrichedVehicle = {
        id: string;
        title: string;
        published_at: string | null;
        price: number;
        views: number;
        clicks: number;
        favorites: number;
        shares: number;
        cover: string | null;
      };

      const enrichedVehicles: EnrichedVehicle[] = filteredListings
        .map((row: ListingRow): EnrichedVehicle => {
          const metrics = normalizeMetrics(row.listing_metrics);
          const orderedImages = sortImages(row.images);
          return {
            id: row.id,
            title: row.title || 'Sin título',
            published_at: row.published_at,
            price: row.price ?? 0,
            views: metrics.views,
            clicks: metrics.clicks,
            favorites: metrics.favorites,
            shares: metrics.shares,
            cover: orderedImages[0]?.url || null,
          };
        })
        .sort((a: EnrichedVehicle, b: EnrichedVehicle) => {
          const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
          const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
          return dateB - dateA;
        });

      setRecentVehicles(enrichedVehicles);
      setBars(enrichedVehicles.slice(0, 7).map((v: EnrichedVehicle) => v.views));
      setBarLabels(enrichedVehicles.slice(0, 7).map((v: EnrichedVehicle) => v.title));

      const chartStart = new Date();
      chartStart.setDate(chartStart.getDate() - 13);
      const chartBuckets = new Map<string, number>();
      enrichedVehicles.forEach((vehicle: EnrichedVehicle) => {
        if (!vehicle.published_at) return;
        const publishedDate = new Date(vehicle.published_at);
        if (publishedDate < chartStart) return;
        const key = publishedDate.toISOString().split('T')[0];
        chartBuckets.set(key, (chartBuckets.get(key) || 0) + vehicle.views);
      });

      const nextChartData: number[] = [];
      const nextChartLabels: string[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        nextChartData.push(chartBuckets.get(key) || 0);
        nextChartLabels.push(date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));
      }
      setChartData(nextChartData);
      setChartLabels(nextChartLabels);

      const previousRange = getPreviousRange(period);
      if (previousRange) {
        let previousQuery = supabase
          .from('listings')
          .select(`
            id,
            listing_metrics(views, clicks, favorites, shares),
            listings_vehicles(vehicle_type_id, vehicle_types(slug)),
            metadata,
            verticals!inner(key)
          `)
          .eq(scopeFilter.column, scopeFilter.value)
          .in('verticals.key', AUTOS_VERTICAL_FILTER)
          .gte('published_at', previousRange.start.toISOString())
          .lt('published_at', previousRange.end.toISOString());

        const { data: previousRows, error: previousError } = await previousQuery;
        if (previousError) throw previousError;
        const prevAggregates = aggregateMetrics(
          (previousRows || []).filter((row: ListingRow) => matchesVehicleFilter(row, vehicleType))
        );
        setPreviousMetrics(prevAggregates);
      } else {
        setPreviousMetrics(aggregates);
      }
    } catch (error) {
      logError('Error en fetchMetrics', error, { scope: 'estadisticas' });
      setMetrics({ views: 0, contacts: 0, favorites: 0, shares: 0, conversionRate: 0 });
      setPreviousMetrics({ views: 0, contacts: 0, favorites: 0, shares: 0 });
      setBars([]);
      setBarLabels([]);
      setRecentVehicles([]);
      setChartData([]);
      setChartLabels([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, scopeFilter, scopeLoading, user, period, vehicleType]);

  React.useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const periodOptions = [
    { value: 'all', label: 'Todo el tiempo' },
    { value: 'week', label: '�ltima semana' },
    { value: 'month', label: '�ltimo mes' },
    { value: 'year', label: '�ltimo a�o' },
  ];

  const vehicleTypeOptions = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'car', label: 'Autos' },
    { value: 'motorcycle', label: 'Motos' },
    { value: 'truck', label: 'Camiones' },
  ];

  const chartStats = React.useMemo(() => ({
    promedio: chartData.length > 0 ? Math.round(chartData.reduce((a, b) => a + b, 0) / chartData.length) : 0,
    maximo: chartData.length > 0 ? Math.max(...chartData) : 0,
    minimo: chartData.length > 0 ? Math.min(...chartData) : 0,
    tendencia: chartData.length >= 2 ? (chartData[chartData.length - 1] > chartData[chartData.length - 2] ? 'up' : 'down') : 'stable'
  }), [chartData]);

  const BarChart = ({ data, labels }: { data: number[], labels: string[] }) => {
    const maxValue = Math.max(...data, 1);
    return (
      <div className="flex items-end gap-1 h-96">
        {data.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-primary rounded-t transition-all hover:bg-[var(--color-primary-a90)]"
              style={{ height: `${(value / maxValue) * 100}%` }}
              title={`${labels[index]}: ${value} vistas`}
            />
            <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-2 text-center max-w-full truncate">
              {labels[index]}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100);
  };

  const formatGrowth = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  return (
    <PanelPageLayout
      header={{
        title: "Estadísticas",
        description: "Resumen de rendimiento de tus publicaciones."
      }}
    >
      <div className="card-surface shadow-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <Select
          label=""
          value={vehicleType}
          onChange={(value) => setVehicleType(value as 'all' | 'car' | 'motorcycle' | 'truck')}
          options={vehicleTypeOptions}
          className="w-48"
        />
        <Select
          label=""
          value={period}
          onChange={(value) => setPeriod(value as 'all' | 'week' | 'month' | 'year')}
          options={periodOptions}
          className="w-48"
        />
        <Button variant="neutral" size="md" onClick={() => { void fetchMetrics(); }}>Actualizar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center">Cargando metricas...</div>
        ) : (
          [
            {
              label: "Vistas",
              value: metrics.views.toLocaleString(),
              growth: getGrowthPercentage(metrics.views, previousMetrics.views),
              icon: IconEye
            },
            {
              label: "Contactos",
              value: metrics.contacts.toLocaleString(),
              growth: getGrowthPercentage(metrics.contacts, previousMetrics.contacts),
              icon: IconPhone
            },
            {
              label: "Favoritos",
              value: metrics.favorites.toLocaleString(),
              growth: getGrowthPercentage(metrics.favorites, previousMetrics.favorites),
              icon: IconBookmark
            },
            {
              label: "Compartidos",
              value: metrics.shares.toLocaleString(),
              growth: getGrowthPercentage(metrics.shares, previousMetrics.shares),
              icon: IconShare
            },
            {
              label: "Tasa de Conversion",
              value: `${metrics.conversionRate.toFixed(1)}%`,
              growth: null,
              icon: IconTrendingUp
            },
          ].map((m) => (
            <div key={m.label} className="card-surface shadow-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-lighttext/70 dark:text-darktext/70">{m.label}</div>
                <m.icon size={20} stroke={1.7} className="text-primary" />
              </div>
              <div className="text-3xl font-bold text-lighttext dark:text-darktext mb-1">{m.value}</div>
              {m.growth !== null && (
                <div className={`text-sm ${m.growth >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  {formatGrowth(m.growth)} vs periodo anterior
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="card-surface shadow-card p-6">
        <div className="text-lighttext dark:text-darktext font-semibold mb-4">Vistas en ultimas 7 publicaciones</div>
        {loading ? (
          <div>Cargando grafico...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-2 h-40">
              {bars.map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-[var(--color-primary-a90)]"
                    style={{ height: `${Math.min((height / Math.max(...bars, 1)) * 100, 100)}%` }}
                    title={`${barLabels[i]}: ${height} vistas`}
                  />
                  <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-2 text-center leading-tight max-w-full truncate">
                    {barLabels[i] || `Pub ${i + 1}`}
                  </div>
                  <div className="text-xs font-semibold text-primary mt-1">
                    {height}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm text-lighttext/70 dark:text-darktext/70 text-center">
              Numero de vistas por publicacion
            </div>
          </div>
        )}
      </div>

      {/* Tendencia de Vistas Mejorada */}
      <div className="card-surface shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Tendencia de Vistas</h3>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70">Ultimas 2 semanas de actividad</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'line' ? 'primary' : 'neutral'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <IconChartLine size={16} stroke={1.7} className="mr-2" />
              L�nea
            </Button>
            <Button
              variant={chartType === 'bar' ? 'primary' : 'neutral'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <IconChartBar size={16} stroke={1.7} className="mr-2" />
              Barras
            </Button>
          </div>
        </div>

        {/* Estad�sticas r�pidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 card-surface shadow-card rounded-lg">
            <div className="text-lg font-bold text-primary">{chartStats.promedio}</div>
            <div className="text-xs text-lighttext/70 dark:text-darktext/70">Promedio diario</div>
          </div>
          <div className="text-center p-3 card-surface shadow-card rounded-lg">
            <div className="text-lg font-bold text-[var(--color-success)]">{chartStats.maximo}</div>
            <div className="text-xs text-lighttext/70 dark:text-darktext/70">Máximo</div>
          </div>
          <div className="text-center p-3 card-surface shadow-card rounded-lg">
            <div className="text-lg font-bold text-[var(--color-warn)]">{chartStats.minimo}</div>
            <div className="text-xs text-lighttext/70 dark:text-darktext/70">Mínimo</div>
          </div>
          <div className="text-center p-3 card-surface shadow-card rounded-lg">
            <div className={`text-lg font-bold ${chartStats.tendencia === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {chartStats.tendencia === 'up' ? '↗' : '↘'}
            </div>
            <div className="text-xs text-lighttext/70 dark:text-darktext/70">Tendencia</div>
          </div>
        </div>

        {/* Gr�fica principal */}
        <div className="flex justify-center">
          <div className="w-full max-w-4xl h-96">
            {loading ? (
              <div className="h-full flex items-center justify-center">Cargando gr�fica...</div>
            ) : chartType === 'line' ? (
              <LineChart
                data={chartData}
                labels={chartLabels}
              />
            ) : (
              <BarChart
                data={chartData}
                labels={chartLabels}
              />
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-lighttext/70 dark:text-darktext/70 text-center">
          Vistas diarias en las �ltimas 2 semanas
        </div>
      </div>

      {/* Top Publicaciones por Rendimiento */}
      <div className="card-surface shadow-card p-6">
        <div className="text-lighttext dark:text-darktext font-semibold mb-4">Top Publicaciones por Rendimiento</div>
        {loading ? (
          <div>Cargando...</div>
        ) : (
          <div className="space-y-3">
            {recentVehicles
              .filter(v => v.views > 0)
              .sort((a, b) => b.views - a.views)
              .slice(0, 5)
              .map((vehicle: any, index: number) => (
                <div key={vehicle.id || index} className="flex items-center justify-between p-3 card-surface shadow-card rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--color-primary-a10)] rounded-full flex items-center justify-center text-sm font-bold text-[var(--color-primary)]">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)] text-sm">
                        {vehicle.title || 'Sin t�tulo'}
                      </div>
                      <div className="text-xs text-lighttext/70 dark:text-darktext/70">
                        {new Date(vehicle.published_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[var(--color-primary)]">
                      {vehicle.views || 0} vistas
                    </div>
                    <div className="text-xs text-lighttext/70 dark:text-darktext/70">
                      {vehicle.clicks || 0} contactos
                    </div>
                  </div>
                </div>
              ))}
            {recentVehicles.filter(v => v.views > 0).length === 0 && (
              <div className="text-center text-lighttext/70 dark:text-darktext/70 py-4">
                No hay publicaciones con vistas a�n
              </div>
            )}
          </div>
        )}
      </div>
    </PanelPageLayout>
  );
}







