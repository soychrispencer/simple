import { getStaffGate } from '@/lib/admin/auth';
import LoginCard from '@/components/LoginCard';
import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import VehicleReportsSection from '@/components/VehicleReportsSection';
import AutosHeaderTabs from '@/components/panel/AutosHeaderTabs';
import { PanelPageLayout } from '@simple/ui';

type ListingReport = {
	id: string;
	listing_id: string;
	reason: string;
	details: string;
	status: string;
	created_at: string;
	listings?: { title: string }[] | null;
};

async function fetchListingReports() {
	const admin = createAdminServerClient();
	const { data } = await admin
		.from('listing_reports')
		.select('id,listing_id,reason,details,status,created_at,listings(title)')
		.order('created_at', { ascending: false })
		.limit(100);
	return (data || []) as ListingReport[];
}

export default async function AutosAdminReports() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return <LoginCard forbidden={gate.status === 'forbidden'} />;
	}

	const reports = await fetchListingReports();

	return (
		<div className="p-6">
			<div className="max-w-5xl mx-auto">
				<PanelPageLayout
					header={{
						title: 'SimpleAutos',
						description: 'Moderación · Reportes de publicaciones',
						children: <AutosHeaderTabs />,
					}}
				>
					<VehicleReportsSection initialReports={reports} />
				</PanelPageLayout>
			</div>
		</div>
	);
}
