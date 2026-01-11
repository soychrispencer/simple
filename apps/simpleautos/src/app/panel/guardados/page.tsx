"use client";

import React from "react";
import Link from "next/link";
import { PanelPageLayout } from "@simple/ui";
import { Button, useToast } from "@simple/ui";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { useListingsScope } from "@simple/listings";
import { logError } from "@/lib/logger";
import { useFavorites } from "@/context/FavoritesContext";
import { useCompare } from "@/context/CompareContext";
import { getVehicleById, type VehicleDetail } from "@/lib/getVehicleById";

type FavoriteCard = {
  favoriteId: string;
  listingId: string;
  title: string;
  price: number;
  cover: string | null;
};

export default function Favoritos() {
  const supabase = useSupabase();
  const { user } = useListingsScope({ verticalKey: 'autos', toastOnMissing: false });
  const { addToast } = useToast();
  const { refresh: refreshFavorites } = useFavorites();
  const { items: compareIds, has: isCompared, toggle: toggleCompare, remove: removeCompare, clear: clearCompare, maxItems } = useCompare();

  const [favorites, setFavorites] = React.useState<FavoriteCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [compareLoading, setCompareLoading] = React.useState(false);
  const [compareError, setCompareError] = React.useState<string | null>(null);
  const [compareVehicles, setCompareVehicles] = React.useState<VehicleDetail[]>([]);

  const fetchFavorites = React.useCallback(async () => {
    if (!supabase) return;
    if (!user?.id) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          listing_id,
          listings:listings (
            id,
            title,
            price,
            metadata,
            images:images(url, position, is_primary)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((row: any) => {
        const listing = row.listings;
        const images = Array.isArray(listing?.images)
          ? [...listing.images].sort((a, b) => {
              if (!!a.is_primary === !!b.is_primary) {
                return (a.position ?? 0) - (b.position ?? 0);
              }
              return a.is_primary ? -1 : 1;
            })
          : [];

        return {
          favoriteId: row.id,
          listingId: listing?.id || row.listing_id,
          title: listing?.title || 'Sin título',
          price: listing?.price ?? 0,
          cover: images[0]?.url || listing?.metadata?.main_image || null,
        } as FavoriteCard;
      });

      setFavorites(mapped);
    } catch (err: any) {
      logError('[Favoritos] Error cargando favoritos', err);
      addToast('Error cargando favoritos: ' + (err?.message || 'Error desconocido'), { type: 'error' });
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [addToast, supabase, user?.id]);

  React.useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  React.useEffect(() => {
    let cancelled = false;

    const loadCompare = async () => {
      setCompareError(null);
      if (!compareIds || compareIds.length === 0) {
        setCompareVehicles([]);
        return;
      }

      setCompareLoading(true);
      try {
        const results = await Promise.all(compareIds.map((id) => getVehicleById(id)));
        const cleaned = results.filter(Boolean) as VehicleDetail[];
        if (!cancelled) setCompareVehicles(cleaned);
      } catch (e: any) {
        if (!cancelled) setCompareError(e?.message || 'No se pudo cargar la comparación.');
      } finally {
        if (!cancelled) setCompareLoading(false);
      }
    };

    void loadCompare();
    return () => {
      cancelled = true;
    };
  }, [compareIds]);

  const handleRemove = async (favoriteId: string) => {
    if (!supabase) return;
    try {
      const listingId = favorites.find((f) => f.favoriteId === favoriteId)?.listingId;
      const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);
      if (error) throw error;
      setFavorites((prev) => prev.filter((fav) => fav.favoriteId !== favoriteId));
      addToast('Publicación eliminada de favoritos', { type: 'info' });
      void refreshFavorites();
      if (listingId && isCompared(listingId)) removeCompare(listingId);
    } catch (err: any) {
      logError('[Favoritos] Error al quitar favorito', err);
      addToast('No se pudo quitar el favorito: ' + (err?.message || 'Error desconocido'), { type: 'error' });
    }
  };

  const handleViewComparison = () => {
    const el = document.getElementById('comparacion');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatCompareValue = (v: any) => {
    if (v == null) return '—';
    const s = String(v);
    return s.trim().length > 0 ? s : '—';
  };

  const formatMoney = (veh: VehicleDetail) => {
    const amount = typeof veh.price === 'number' ? veh.price : null;
    const currency = String((veh as any).currency || 'CLP').toUpperCase();
    if (amount == null) return '—';
    try {
      return amount.toLocaleString('es-CL', { style: 'currency', currency, currencyDisplay: 'symbol' });
    } catch {
      return `$${amount.toLocaleString('es-CL')}`;
    }
  };

  const formatBoolean = (v: any) => {
    if (v == null) return '—';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    const s = String(v).toLowerCase();
    if (['true', 'sí', 'si', '1'].includes(s)) return 'Sí';
    if (['false', 'no', '0'].includes(s)) return 'No';
    return formatCompareValue(v);
  };

  const formatList = (value: any, max = 12) => {
    const arr = Array.isArray(value) ? value.filter(Boolean).map((x) => String(x)) : [];
    if (arr.length === 0) return '—';
    const sliced = arr.slice(0, max);
    const rest = arr.length - sliced.length;
    return rest > 0 ? `${sliced.join(' · ')} · +${rest}` : sliced.join(' · ');
  };

  const getEquipmentByCategory = React.useCallback((veh: VehicleDetail) => {
    const specs = (veh as any)?.specs || {};
    const equipmentItems = Array.isArray(specs?.equipment_items) ? specs.equipment_items : [];

    const byCategory = new Map<string, string[]>();

    if (equipmentItems.length > 0) {
      for (const it of equipmentItems) {
        const category = String(it?.category || 'Otros');
        const label = String(it?.label || it?.code || '').trim();
        if (!label) continue;
        const current = byCategory.get(category) || [];
        current.push(label);
        byCategory.set(category, current);
      }
      for (const [cat, labels] of byCategory.entries()) {
        byCategory.set(cat, Array.from(new Set(labels)));
      }
      return byCategory;
    }

    // Fallback: specs.equipment (labels) o features (códigos)
    const fromSpecs = Array.isArray(specs?.equipment) ? specs.equipment : [];
    const fromFeatures = Array.isArray((veh as any)?.features) ? (veh as any).features : [];
    const list = (fromSpecs.length > 0 ? fromSpecs : fromFeatures).filter(Boolean).map((x: any) => String(x));
    if (list.length > 0) byCategory.set('Equipamiento', Array.from(new Set(list)));
    return byCategory;
  }, []);

  const equipmentCategories = React.useMemo(() => {
    const set = new Set<string>();
    for (const v of compareVehicles) {
      const map = getEquipmentByCategory(v);
      for (const cat of map.keys()) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [compareVehicles, getEquipmentByCategory]);

  return (
    <PanelPageLayout
      header={{
        title: "Guardados",
        description: user?.id ? "Administra tus guardados y arma comparaciones (hasta 3 vehículos)." : "Inicia sesión para ver tus guardados.",
        actions: user?.id ? (
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 w-full">
            <div className="text-sm text-lighttext/80 dark:text-darktext/80 w-full sm:w-auto">
              Comparación: <span className="font-semibold">{compareIds.length}</span>/{maxItems}
            </div>
            <Button
              variant="neutral"
              size="sm"
              disabled={compareIds.length < 2}
              onClick={handleViewComparison}
              className="w-full sm:w-auto"
            >
              Ver comparación
            </Button>
            <Button
              variant="neutral"
              size="sm"
              disabled={compareIds.length === 0}
              onClick={clearCompare}
              className="w-full sm:w-auto"
            >
              Limpiar
            </Button>
          </div>
        ) : undefined,
        children: user?.id ? (
          <div className="space-y-2">
            {compareIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {compareIds.map((id) => {
                  const fav = favorites.find((f) => f.listingId === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCompare(id)}
                      className="px-3 py-1 rounded-full border border-border/60 bg-[var(--surface-2)] text-xs text-[var(--text-secondary)] hover:bg-[var(--field-bg-hover)]"
                      title="Quitar de comparación"
                    >
                      {fav?.title || 'Vehículo'}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {compareIds.length === 1 ? (
              <div className="text-xs text-lighttext/70 dark:text-darktext/70">
                Agrega al menos 2 vehículos para comparar.
              </div>
            ) : null}
          </div>
        ) : undefined,
      }}
    >
      {loading ? (
        <div className="card-surface shadow-card text-center text-lighttext/80 dark:text-darktext/80 py-16 rounded-2xl">
          Cargando favoritos...
        </div>
      ) : !user?.id ? (
        <div className="card-surface shadow-card text-center text-lighttext/80 dark:text-darktext/80 py-16 rounded-2xl">
          Debes iniciar sesión para ver tus favoritos.
        </div>
      ) : favorites.length === 0 ? (
        <div className="card-surface shadow-card text-center text-lighttext/80 dark:text-darktext/80 py-16 rounded-2xl">
          Aún no tienes publicaciones en favoritos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {favorites.map((fav) => (
            <div key={fav.favoriteId} className="card-surface shadow-card overflow-hidden flex flex-col">
              <div className="h-40 card-surface shadow-card flex items-center justify-center">
                {fav.cover ? (
                  <img src={fav.cover} alt={fav.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm text-lighttext/70 dark:text-darktext/70">Sin imagen</span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div>
                  <div className="font-semibold text-lighttext dark:text-darktext line-clamp-2">{fav.title}</div>
                  <div className="text-sm text-lighttext/80 dark:text-darktext/80">{fav.price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', currencyDisplay: 'symbol' })}</div>
                </div>
                <div className="mt-auto grid grid-cols-3 gap-2">
                  <Link href={`/vehiculo/${fav.listingId}`} className="w-full">
                    <Button variant="neutral" size="sm" className="w-full">Ver</Button>
                  </Link>
                  <Button
                    variant={isCompared(fav.listingId) ? "primary" : "neutral"}
                    size="sm"
                    className="w-full"
                    onClick={() => toggleCompare(fav.listingId)}
                  >
                    {isCompared(fav.listingId) ? 'Comparando' : 'Comparar'}
                  </Button>
                  <Button variant="danger" size="sm" className="w-full" onClick={() => handleRemove(fav.favoriteId)}>
                    Quitar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparación (misma página) */}
      {user?.id ? (
        <section id="comparacion" className="mt-10">
          <div className="card-surface shadow-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Comparación</h2>
              <Button variant="neutral" size="sm" disabled={compareIds.length === 0} onClick={clearCompare}>
                Limpiar
              </Button>
            </div>

            {compareIds.length < 2 ? (
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">
                Selecciona al menos 2 vehículos para ver la comparación.
              </div>
            ) : compareLoading ? (
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Cargando comparación...</div>
            ) : compareError ? (
              <div className="text-sm text-[var(--color-danger)]">{compareError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border/60">
                      <th className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70 font-medium">Campo</th>
                      {compareVehicles.map((v) => (
                        <th key={v.id} className="py-3 px-4 font-semibold text-lighttext dark:text-darktext">
                          {v.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Marca</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.brands?.name)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Modelo</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.models?.name)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Tipo</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.vehicle_types?.label || v.vehicle_types?.name)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Precio</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4 font-medium">{formatMoney(v)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Ubicación</td>
                      {compareVehicles.map((v) => {
                        const loc = [v.communes?.name, v.regions?.name].filter(Boolean).join(', ');
                        return (
                          <td key={v.id} className="py-3 px-4">{formatCompareValue(loc)}</td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Año</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.year)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Kilometraje</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{v.mileage != null ? `${Number(v.mileage).toLocaleString('es-CL')} km` : '—'}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Condición</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.condition)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Combustible</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.fuel_type)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Transmisión</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.transmission)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Tracción</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.traction)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Motor</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue((v as any).engine_size ?? (v as any)?.specs?.engine_size)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Carrocería</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue((v as any).body_type ?? (v as any)?.specs?.body_type)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Color</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue(v.color)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Puertas</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue((v as any).doors ?? (v as any)?.specs?.doors)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Asientos</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue((v as any).seats ?? (v as any)?.specs?.seats)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Financiamiento</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatBoolean(v.allow_financing)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Permuta</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatBoolean(v.allow_exchange)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Garantía</td>
                      {compareVehicles.map((v) => (
                        <td key={v.id} className="py-3 px-4">{formatCompareValue((v as any).warranty ?? (v as any)?.specs?.warranty)}</td>
                      ))}
                    </tr>
                    {equipmentCategories.length > 0 ? (
                      equipmentCategories.map((cat) => (
                        <tr key={cat} className={cat === equipmentCategories[equipmentCategories.length - 1] ? '' : 'border-b border-border/60'}>
                          <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Equipamiento — {cat}</td>
                          {compareVehicles.map((v) => {
                            const map = getEquipmentByCategory(v);
                            return (
                              <td key={v.id} className="py-3 px-4">{formatList(map.get(cat) || [], 12)}</td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 pr-4 text-lighttext/70 dark:text-darktext/70">Equipamiento</td>
                        {compareVehicles.map((v) => {
                          const map = getEquipmentByCategory(v);
                          const all = Array.from(map.values()).flat();
                          return (
                            <td key={v.id} className="py-3 px-4">{formatList(all, 12)}</td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </PanelPageLayout>
  );
}







