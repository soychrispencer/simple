import { getStaffGate } from '@/lib/admin/auth';
import LoginCard from '@/components/LoginCard';
import AutosHeaderTabs from '@/components/panel/AutosHeaderTabs';
import { PanelPageLayout } from '@simple/ui';
import VentaAsistidaLeadsClient from '@/components/panel/autos/VentaAsistidaLeadsClient';

export default async function AutosVentaAsistidaPage() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return <LoginCard forbidden={gate.status === 'forbidden'} />;
	}

	return (
		<div className="p-6">
			<div className="max-w-6xl mx-auto">
				<PanelPageLayout
					header={{
						title: 'Venta asistida',
						description: 'Solicitudes de dueños para venta asistida (SimpleAutos).',
						children: <AutosHeaderTabs />,
					}}
				>
					<VentaAsistidaLeadsClient />
				</PanelPageLayout>
			</div>
		</div>
	);
}
