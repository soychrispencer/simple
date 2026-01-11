import { getStaffGate } from '@/lib/admin/auth';
import LoginCard from '@/components/LoginCard';
import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import PendingModelRow from '@/components/PendingModelRow';
import AutosHeaderTabs from '@/components/panel/AutosHeaderTabs';
import { PanelPageLayout } from '@simple/ui';

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

async function fetchPendingModels() {
	const admin = createAdminServerClient();
	const { data } = await admin
		.from('models')
		.select('id,name,brand_id,created_at,created_by,vehicle_type_id,brands(name),vehicle_types(slug)')
		.eq('is_verified', false)
		.order('created_at', { ascending: false })
		.limit(200);
	return (data || []) as PendingModel[];
}

export default async function AutosAdminModels() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return <LoginCard forbidden={gate.status === 'forbidden'} />;
	}

	const models = await fetchPendingModels();

	return (
		<div className="p-6">
			<div className="max-w-5xl mx-auto">
				<PanelPageLayout
					header={{
						title: 'SimpleAutos',
						description: 'Catálogo · Modelos pendientes',
						children: <AutosHeaderTabs />,
					}}
				>
					<section className="card-surface shadow-card rounded-3xl p-5">
						<h2 className="text-base font-semibold text-lighttext dark:text-darktext">Modelos pendientes</h2>
						{models.length === 0 ? (
							<p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">No hay modelos pendientes.</p>
						) : (
							<div className="mt-3 space-y-2">
								{models.map((m) => (
									<div key={m.id} className="rounded-xl">
										<PendingModelRow
											id={m.id}
											name={m.name}
											brandName={m.brands?.[0]?.name ?? null}
											typeSlug={m.vehicle_types?.[0]?.slug ?? null}
											createdBy={(m as any).created_by ?? null}
										/>
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
