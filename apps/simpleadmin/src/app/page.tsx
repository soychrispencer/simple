import { getStaffGate } from '../lib/admin/auth';
import { Button } from '@simple/ui';
import LoginCard from '../components/LoginCard';
import { createAdminServerClient } from '../lib/supabase/adminServerClient';
import PendingBrandRow from '../components/PendingBrandRow';
import PendingModelRow from '../components/PendingModelRow';
import VehicleReportsSection from '../components/VehicleReportsSection';

type PendingBrand = {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
};

type PendingModel = {
  id: string;
  name: string;
  brand_id: string;
  created_at: string;
  created_by: string | null;
  vehicle_type_id: string | null;
  brands?: { name: string }[] | null;
  vehicle_types?: { slug: string }[] | null;
};

type ListingReport = {
  id: string;
  listing_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  listings?: { title: string }[] | null;
};

async function fetchPending() {
  const admin = createAdminServerClient();

  const { data: brands } = await admin
    .from('brands')
    .select('id,name,created_at,created_by')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: models } = await admin
    .from('models')
    .select('id,name,brand_id,created_at,created_by,vehicle_type_id,brands(name),vehicle_types(slug)')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(200);

  return {
    brands: (brands || []) as PendingBrand[],
    models: (models || []) as PendingModel[],
  };
}

async function fetchListingReports() {
  const admin = createAdminServerClient();

  const { data } = await admin
    .from('listing_reports')
    .select('id,listing_id,reason,details,status,created_at,listings(title)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (data || []) as ListingReport[];
}

function pickFirstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

const VERTICALS = [
  { key: 'autos', label: 'SimpleAutos' },
  { key: 'propiedades', label: 'SimplePropiedades' },
  { key: 'tiendas', label: 'SimpleTiendas' },
  { key: 'food', label: 'SimpleFood' },
] as const;

type VerticalKey = (typeof VERTICALS)[number]['key'];

function normalizeVertical(raw: string): VerticalKey {
  const value = raw.trim().toLowerCase();
  return (VERTICALS.some((v) => v.key === value) ? value : 'autos') as VerticalKey;
}

export default async function AdminHome({ searchParams }: { searchParams?: any }) {
  const gate = await getStaffGate();
  if (gate.status !== 'staff') {
    return <LoginCard forbidden={gate.status === 'forbidden'} />;
  }

  const resolvedSearchParams = await searchParams;
  const rawVertical = pickFirstString(resolvedSearchParams?.vertical);
  const vertical = normalizeVertical(rawVertical);
  const verticalLabel = VERTICALS.find((v) => v.key === vertical)?.label ?? 'SimpleAutos';

  const focusRaw = pickFirstString(resolvedSearchParams?.focus);
  const focus = (() => {
    const trimmed = focusRaw.trim();
    const match = /^(brand|model):(.+)$/.exec(trimmed);
    if (!match) return null;
    return { type: match[1] as 'brand' | 'model', id: match[2] };
  })();

  const [pending, reports] = vertical === 'autos'
    ? await Promise.all([fetchPending(), fetchListingReports()])
    : [{ brands: [], models: [] }, [] as ListingReport[]];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-lighttext dark:text-darktext">Panel administrativo</h1>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70">Vertical: {verticalLabel}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {VERTICALS.map((v) => {
            const active = v.key === vertical;
            return (
              <a
                key={v.key}
                href={`/?vertical=${v.key}`}
                className={
                  (
                    'px-3 py-1.5 rounded-full text-sm border transition ' +
                    (active
                      ? 'bg-[var(--field-bg)] border-[var(--field-border)] text-lighttext dark:text-darktext'
                      : 'bg-transparent border-black/10 dark:border-white/15 text-lighttext/80 dark:text-darktext/80 hover:bg-[var(--field-bg)]')
                  ).trim()
                }
              >
                {v.label}
              </a>
            );
          })}
        </div>

        {vertical !== 'autos' ? (
          <div className="mt-6 card-surface shadow-card rounded-3xl p-5">
            <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Próximamente</h2>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">
              Esta vertical todavía no tiene módulos configurados en el panel.
            </p>
          </div>
        ) : null}

        {vertical === 'autos' ? (
          <div className="mt-6 grid gap-6">
            <section id="pending-brands" className="card-surface shadow-card rounded-3xl p-5 scroll-mt-24">
              <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Marcas pendientes</h2>
              {pending.brands.length === 0 ? (
                <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">No hay marcas pendientes.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {pending.brands.map((b) => {
                    const focused = focus?.type === 'brand' && focus.id === b.id;
                    return (
                      <div key={b.id} className={focused ? 'rounded-xl bg-[var(--field-bg)] px-2' : ''}>
                        <PendingBrandRow id={b.id} name={b.name} createdBy={b.created_by} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section id="pending-models" className="card-surface shadow-card rounded-3xl p-5 scroll-mt-24">
              <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Modelos pendientes</h2>
              {pending.models.length === 0 ? (
                <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">No hay modelos pendientes.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {pending.models.map((m) => {
                    const focused = focus?.type === 'model' && focus.id === m.id;
                    return (
                      <div key={m.id} className={focused ? 'rounded-xl bg-[var(--field-bg)] px-2' : ''}>
                        <PendingModelRow
                          id={m.id}
                          name={m.name}
                          brandName={m.brands?.[0]?.name ?? null}
                          typeSlug={m.vehicle_types?.[0]?.slug ?? null}
                          createdBy={(m as any).created_by ?? null}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <VehicleReportsSection initialReports={reports} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
