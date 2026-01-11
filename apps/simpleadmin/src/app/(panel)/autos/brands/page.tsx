import { getStaffGate } from '@/lib/admin/auth';
import LoginCard from '@/components/LoginCard';
import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import PendingBrandRow from '@/components/PendingBrandRow';
import AutosHeaderTabs from '@/components/panel/AutosHeaderTabs';
import { PanelPageLayout } from '@simple/ui';

type PendingBrand = {
	id: string;
	name: string;
	created_at: string;
	created_by: string | null;
};

async function fetchPendingBrands() {
	const admin = createAdminServerClient();
	const { data } = await admin
		.from('brands')
		.select('id,name,created_at,created_by')
		.eq('is_verified', false)
		.order('created_at', { ascending: false })
		.limit(200);
	return (data || []) as PendingBrand[];
}

export default async function AutosAdminBrands() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return <LoginCard forbidden={gate.status === 'forbidden'} />;
	}

	const brands = await fetchPendingBrands();

	return (
		<div className="p-6">
			<div className="max-w-5xl mx-auto">
				<PanelPageLayout
					header={{
						title: 'SimpleAutos',
						description: 'Catálogo · Marcas pendientes',
						children: <AutosHeaderTabs />,
					}}
				>
					<section className="card-surface shadow-card rounded-3xl p-5">
						<h2 className="text-base font-semibold text-lighttext dark:text-darktext">Marcas pendientes</h2>
						{brands.length === 0 ? (
							<p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">No hay marcas pendientes.</p>
						) : (
							<div className="mt-3 space-y-2">
								{brands.map((b) => (
									<div key={b.id} className="rounded-xl">
										<PendingBrandRow id={b.id} name={b.name} createdBy={b.created_by} />
									</div>
								))}
							</div>
						)}
					</section>
				</PanelPageLayout>
			</div>
		</div>
	);
}
