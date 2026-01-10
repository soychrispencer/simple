'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, FormSelect as Select, FormInput as Input } from '@simple/ui';
import { getCurrencyOptions, getVerticalRegion } from '@simple/config';
import { SearchBoxLayout } from '@simple/ui';
import { PROPERTY_TYPE_OPTIONS } from '@/types/property';
import { getSupabaseClient } from '@/lib/supabase/supabase';

const listTypes = [
  { value: "todos", label: "Todos" },
  { value: "sale", label: "Comprar" },
  { value: "rent", label: "Arrendar" },
];

const PROPERTY_CONDITION_OPTIONS = [
  { value: '', label: 'Estado' },
  { value: 'new', label: 'Nuevo' },
  { value: 'used', label: 'Usado' },
  { value: 'needs_renovation', label: 'Para remodelar' },
];

const PROPERTY_REGION = getVerticalRegion('properties');
const PROPERTY_CURRENCY_OPTIONS = getCurrencyOptions({ region: PROPERTY_REGION });
const LISTING_ROUTE_MAP: Record<string, string> = {
  todos: '/propiedades',
  all: '/propiedades',
  sale: '/propiedades/venta',
  rent: '/propiedades/arriendo',
};

export default function PropertySearchBox() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    listing_type: "todos",
    property_type: "",
    region_id: '',
    commune_id: '',
    condition: '',
    currency: PROPERTY_CURRENCY_OPTIONS[0]?.value || 'CLP',
    max_price: '',
  });
  const [regions, setRegions] = useState<Array<{ value: string; label: string }>>([{ value: '', label: 'Región' }]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [communes, setCommunes] = useState<Array<{ value: string; label: string }>>([{ value: '', label: 'Comuna' }]);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  useEffect(() => {
    let active = true;
    async function syncFromQueryString() {
      if (typeof window === 'undefined') return;
      await Promise.resolve();
      if (!active) return;
      const params = new URLSearchParams(window.location.search);
      setFilters(prev => {
        const listingParam = params.get('listing_type');
        const normalizedListing = listingParam === 'all' ? 'todos' : listingParam || prev.listing_type;
        const routeKey = normalizedListing && normalizedListing in LISTING_ROUTE_MAP ? normalizedListing : 'todos';
        const next = {
          ...prev,
          listing_type: routeKey,
          property_type: params.get('property_type') || '',
          condition: params.get('condition') || '',
          region_id: params.get('region_id') || '',
          commune_id: params.get('commune_id') || '',
          currency: params.get('currency') || prev.currency,
          max_price: params.get('max_price') || '',
        };
        const unchanged = Object.keys(next).every((key) => (next as any)[key] === (prev as any)[key]);
        return unchanged ? prev : next;
      });
    }
    syncFromQueryString();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchRegions() {
      try {
        setLoadingRegions(true);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('regions')
          .select('id,name')
          .order('name');
        if (!active) return;
        if (!error && data) {
          setRegions([{ value: '', label: 'Región' }, ...data.map((r: any) => ({ value: r.id, label: r.name }))]);
        }
      } finally {
        if (active) setLoadingRegions(false);
      }
    }
    fetchRegions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!filters.region_id) {
      setCommunes([{ value: '', label: 'Comuna' }]);
      setLoadingCommunes(false);
      return () => {
        active = false;
      };
    }
    async function fetchCommunes(regionId: string) {
      try {
        setLoadingCommunes(true);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('communes')
          .select('id,name')
          .eq('region_id', regionId)
          .order('name');
        if (!active) return;
        if (!error && data) {
          setCommunes([{ value: '', label: 'Comuna' }, ...data.map((c: any) => ({ value: c.id, label: c.name }))]);
        } else {
          setCommunes([{ value: '', label: 'Comuna' }]);
        }
      } finally {
        if (active) setLoadingCommunes(false);
      }
    }
    fetchCommunes(filters.region_id);
    return () => {
      active = false;
    };
  }, [filters.region_id]);

  const handleSubmit = () => {
    // Construir query string con parámetros no vacíos
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        if (key === 'listing_type' && value === 'todos') return;
        params.append(key, value);
      }
    });
    const target = LISTING_ROUTE_MAP[filters.listing_type] || '/propiedades';
    const qs = params.toString();
    router.push(qs ? `${target}?${qs}` : target);
  };

  return (
    <SearchBoxLayout
      tabs={listTypes}
      activeTab={filters.listing_type}
      onTabChange={(value) => setFilters(f => ({ ...f, listing_type: value }))}
      panelProps={{
        as: 'form',
        onSubmit: (event) => {
          event.preventDefault();
          handleSubmit();
        },
      }}
    >
        <div className="grid w-full gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 xl:[grid-template-columns:repeat(6,minmax(0,1fr))_auto]">
          <div className="col-span-1 min-w-0">
            <Select
              value={filters.property_type}
              onChange={(value) => setFilters(f => ({ ...f, property_type: String(value) }))}
              options={[
                { label: 'Tipo', value: '' },
                ...PROPERTY_TYPE_OPTIONS.map((opt: { value: string; label: string; icon: string }) => ({
                  label: `${opt.icon} ${opt.label}`,
                  value: opt.value
                }))
              ]}
            />
          </div>
          <div className="col-span-1 min-w-0">
            <Select
              value={filters.condition}
              onChange={(value) => setFilters(f => ({ ...f, condition: String(value) }))}
              options={PROPERTY_CONDITION_OPTIONS}
            />
          </div>
          <div className="col-span-1 min-w-0">
            <Select
              value={filters.region_id}
              onChange={(value) => setFilters(f => ({ ...f, region_id: String(value), commune_id: '' }))}
              options={regions}
              placeholder={loadingRegions ? 'Cargando...' : 'Región'}
            />
          </div>
          <div className="col-span-1 min-w-0">
            <Select
              value={filters.commune_id}
              onChange={(value) => setFilters(f => ({ ...f, commune_id: String(value) }))}
              options={communes}
              placeholder={!filters.region_id ? 'Selecciona una región' : (loadingCommunes ? 'Cargando...' : 'Ciudad / comuna')}
              disabled={!filters.region_id}
            />
          </div>
          <div className="col-span-1 sm:col-span-2 xl:col-span-2 min-w-0">
            <label className="sr-only" htmlFor="property-price-max">Precio máximo</label>
            <div className="relative">
              <Input
                id="property-price-max"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder={`Precio (${filters.currency})`}
                value={filters.max_price}
                onChange={(event) => setFilters(f => ({ ...f, max_price: event.target.value }))}
                className="pr-24"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <div className="currency-select w-[96px] pointer-events-auto">
                  <Select
                    size="md"
                    value={filters.currency}
                    onChange={(value) => setFilters(f => ({ ...f, currency: String(value) }))}
                    options={PROPERTY_CURRENCY_OPTIONS}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1 flex w-full justify-start sm:justify-end">
            <Button className="w-full sm:w-auto min-w-[140px]" type="submit">Buscar</Button>
          </div>
        </div>
    </SearchBoxLayout>
  );
}
