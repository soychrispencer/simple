import { getStaffGate } from '@/lib/admin/auth';
import LoginCard from '@/components/LoginCard';
import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import AutosHeaderTabs from '@/components/panel/AutosHeaderTabs';
import { PanelPageLayout } from '@simple/ui';

async function fetchCounts() {
	const admin = createAdminServerClient();

	const [brandsPending, modelsPending, reportsOpen] = await Promise.all([
		admin.from('brands').select('id', { count: 'exact', head: true }).eq('is_verified', false),
		admin.from('models').select('id', { count: 'exact', head: true }).eq('is_verified', false),
		admin.from('listing_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
	]);

	return {
		brandsPending: brandsPending.count ?? 0,
		modelsPending: modelsPending.count ?? 0,
		reportsOpen: reportsOpen.count ?? 0,
	};
}

export default async function AutosAdminIndex() {
  const gate = await getStaffGate();
  if (gate.status !== 'staff') {
    return <LoginCard forbidden={gate.status === 'forbidden'} />;
  }

	const counts = await fetchCounts();

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <PanelPageLayout
          header={{
            title: 'SimpleAutos',
            description: 'Resumen y accesos a módulos.',
            children: <AutosHeaderTabs />,
          }}
        >
				<div className="grid gap-4">
					<div className="card-surface shadow-card rounded-3xl p-5">
						<h2 className="text-base font-semibold text-lighttext dark:text-darktext">Pendientes</h2>
						<p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">
							Entrá a cada módulo para revisar y moderar.
						</p>
						<div className="mt-4 grid gap-3 sm:grid-cols-3">
							<a
								href="/autos/brands"
								className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3"
							>
								<div className="font-semibold text-lighttext dark:text-darktext">Marcas</div>
								<div className="text-sm text-lighttext/70 dark:text-darktext/70">Pendientes: {counts.brandsPending}</div>
							</a>
							<a
								href="/autos/models"
								className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3"
							>
								<div className="font-semibold text-lighttext dark:text-darktext">Modelos</div>
								<div className="text-sm text-lighttext/70 dark:text-darktext/70">Pendientes: {counts.modelsPending}</div>
							</a>
							<a
								href="/autos/reports"
								className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3"
							>
								<div className="font-semibold text-lighttext dark:text-darktext">Reportes</div>
								<div className="text-sm text-lighttext/70 dark:text-darktext/70">Abiertos: {counts.reportsOpen}</div>
							</a>
						</div>
					</div>
				</div>
        </PanelPageLayout>
      </div>
    </div>
  );
}
