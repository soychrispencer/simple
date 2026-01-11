import { getStaffGate } from '@/lib/admin/auth';
import LoginCard from '@/components/LoginCard';
import { PanelPageLayout } from '@simple/ui';

export default async function PropertiesAdminPage() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return <LoginCard forbidden={gate.status === 'forbidden'} />;
	}

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <PanelPageLayout
          header={{
            title: 'SimplePropiedades',
				description: 'Módulos administrativos por vertical (en preparación).',
          }}
        >
          <div className="card-surface shadow-card rounded-3xl p-5">
				<p className="text-sm text-lighttext/70 dark:text-darktext/70">
					Aún no hay módulos activos para Propiedades. Cuando se habilite esta vertical, acá vivirán los módulos de catálogo,
					moderación y reportes propios de Propiedades.
				</p>
          </div>
        </PanelPageLayout>
      </div>
    </div>
  );
}
