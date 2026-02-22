"use client";
import React from "react";
import { Button } from "@simple/ui";
import { PanelPageLayout } from "@simple/ui";
import { Select, LineChart } from "@simple/ui";
import { IconEye, IconPhone, IconBookmark, IconShare, IconTrendingUp, IconChartBar, IconChartLine } from '@tabler/icons-react';
import { useListingsScope } from "@simple/listings";
import { logError } from "@/lib/logger";
import { usePanelCapabilities } from "@/lib/panelCapabilities";

type PeriodFilter = 'all' | 'week' | 'month' | 'year';
type VehicleFilter = 'all' | 'car' | 'motorcycle' | 'truck';

type Metrics = {
  views: number;
  contacts: number;
  favorites: number;
  shares: number;
  conversionRate: number;
};

type StatsApiPayload = {
  metrics?: Metrics;
  previousMetrics?: Omit<Metrics, 'conversionRate'>;
  bars?: number[];
  barLabels?: string[];
  chartData?: number[];
  chartLabels?: string[];
  recentVehicles?: any[];
  error?: string;
};

const BAR_HEIGHT_CLASS: Record<number, string> = {
  0: 'bar-h-0',
  5: 'bar-h-5',
  10: 'bar-h-10',
  15: 'bar-h-15',
  20: 'bar-h-20',
  25: 'bar-h-25',
  30: 'bar-h-30',
  35: 'bar-h-35',
  40: 'bar-h-40',
  45: 'bar-h-45',
  50: 'bar-h-50',
  55: 'bar-h-55',
  60: 'bar-h-60',
  65: 'bar-h-65',
  70: 'bar-h-70',
  75: 'bar-h-75',
  80: 'bar-h-80',
  85: 'bar-h-85',
  90: 'bar-h-90',
  95: 'bar-h-95',
  100: 'bar-h-100',
};

function toBarHeightClass(value: number, maxValue: number) {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) {
    return BAR_HEIGHT_CLASS[0];
  }
  const percent = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const bucket = Math.round(percent / 5) * 5;
  return BAR_HEIGHT_CLASS[bucket] ?? BAR_HEIGHT_CLASS[0];
}


export default function Estadisticas(): React.ReactElement {
  const { user, scopeFilter, loading: scopeLoading } = useListingsScope({ verticalKey: 'autos' });
  const { capabilities, loading: capabilitiesLoading } = usePanelCapabilities();
  const canViewStats = capabilities?.hasGrowth ?? false;
  
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
    if (scopeLoading || capabilitiesLoading) return;
    if (!canViewStats) {
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
      const params = new URLSearchParams({
        period,
        vehicleType,
        scopeColumn: scopeFilter.column,
        scopeValue: scopeFilter.value,
      });
      const response = await fetch(`/api/vehicles/stats?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as StatsApiPayload));
      if (!response.ok) {
        throw new Error(payload?.error || 'stats_fetch_failed');
      }

      setMetrics(payload.metrics || { views: 0, contacts: 0, favorites: 0, shares: 0, conversionRate: 0 });
      setPreviousMetrics(payload.previousMetrics || { views: 0, contacts: 0, favorites: 0, shares: 0 });
      setBars(Array.isArray(payload.bars) ? payload.bars : []);
      setBarLabels(Array.isArray(payload.barLabels) ? payload.barLabels : []);
      setRecentVehicles(Array.isArray(payload.recentVehicles) ? payload.recentVehicles : []);
      setChartData(Array.isArray(payload.chartData) ? payload.chartData : []);
      setChartLabels(Array.isArray(payload.chartLabels) ? payload.chartLabels : []);
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
  }, [scopeFilter, scopeLoading, capabilitiesLoading, canViewStats, user, period, vehicleType]);

  React.useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const periodOptions = [
    { value: 'all', label: 'Todo el tiempo' },
    { value: 'week', label: 'Última semana (publicadas)' },
    { value: 'month', label: 'Último mes (publicadas)' },
    { value: 'year', label: 'Último año (publicadas)' },
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
              className={`w-full bg-primary rounded-t transition-all hover:bg-[var(--color-primary-a90)] ${toBarHeightClass(value, maxValue)}`}
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
        description: "Resumen de rendimiento de tus publicaciones (métricas acumuladas por publicación)."
      }}
    >
      {!capabilitiesLoading && !canViewStats ? (
        <div className="card-surface shadow-card p-6">
          <div className="text-lg font-semibold text-lighttext dark:text-darktext mb-2">
            Disponible en Pro
          </div>
          <div className="text-sm text-lighttext/70 dark:text-darktext/70 mb-4">
            Las estadísticas avanzadas están incluidas en el plan Pro. Activa tu plan para ver vistas, contactos y rendimiento.
          </div>
          <Button variant="primary" size="md" onClick={() => { window.location.href = '/panel/mis-suscripciones'; }}>
            Activar Pro
          </Button>
        </div>
      ) : (
        <>
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
                  {formatGrowth(m.growth)} vs publicaciones del período anterior
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="card-surface shadow-card p-6">
        <div className="text-lighttext dark:text-darktext font-semibold mb-4">Vistas en últimas 7 publicaciones</div>
        {loading ? (
          <div>Cargando grafico...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-2 h-40">
              {bars.map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full bg-primary rounded-t transition-all hover:bg-[var(--color-primary-a90)] ${toBarHeightClass(height, Math.max(...bars, 1))}`}
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
              Número de vistas por publicación
            </div>
          </div>
        )}
      </div>

      {/* Tendencia de Vistas Mejorada */}
      <div className="card-surface shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Tendencia de Vistas</h3>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70">Distribución de vistas acumuladas por fecha de publicación (últimas 2 semanas)</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'line' ? 'primary' : 'neutral'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <IconChartLine size={16} stroke={1.7} className="mr-2" />
              Línea
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

        {/* Estadísticas rápidas */}
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

        {/* Gráfica principal */}
        <div className="flex justify-center">
          <div className="w-full max-w-4xl h-96">
            {loading ? (
              <div className="h-full flex items-center justify-center">Cargando gráfica...</div>
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
          Vistas acumuladas agrupadas por fecha de publicación
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
                        {vehicle.title || 'Sin título'}
                      </div>
                      <div className="text-xs text-lighttext/70 dark:text-darktext/70">
                        {vehicle.published_at
                          ? new Date(vehicle.published_at).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Sin fecha'}
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
                No hay publicaciones con vistas aún
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </PanelPageLayout>
  );
}







