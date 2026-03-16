'use client';

import PanelSectionHeader from '@/components/panel/panel-section-header';
import CrmTeamSettingsManager from '@/components/panel/crm-team-settings-manager';

export default function EquipoPage() {
    return (
        <div className="container-app panel-page py-8 space-y-6">
            <PanelSectionHeader
                title="Equipo y leads"
                description="Administra tu equipo comercial, define quién recibe leads y ajusta el routing automático de la cuenta. La presencia pública del equipo se edita por separado."
            />
            <CrmTeamSettingsManager />
        </div>
    );
}
