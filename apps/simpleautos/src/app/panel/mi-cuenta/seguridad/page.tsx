'use client';

import { useAuth } from '@simple/auth';
import {
    cancelAccountEmailChange,
    changeAccountPassword,
    deleteAccount,
    disconnectAccountGoogle,
    activateAccountPlatform,
    requestAccountEmailChange,
    updateAccountProfile,
    uploadAccountAvatar,
} from '@/lib/account-profile';
import { PanelAccountPersonalDataSection, PanelPageHeader } from '@simple/ui/panel';
import { PanelSectionTabs, accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function SeguridadCuentaPage() {
    const { user, refreshSession, requireAuth, logout } = useAuth();

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title="Mi cuenta"
                description="Datos personales, seguridad y preferencias."
            />

            <div className="flex flex-col gap-6">
                <PanelSectionTabs
                    items={accountSectionTabs}
                    activeKey="seguridad"
                />

                <PanelAccountPersonalDataSection
                    activeSection="security"
                    user={user}
                    roleLabel="Cuenta Simple"
                    onSave={updateAccountProfile}
                    onUploadAvatar={uploadAccountAvatar}
                    onRequestEmailChange={requestAccountEmailChange}
                    onCancelEmailChange={cancelAccountEmailChange}
                    onChangePassword={changeAccountPassword}
                    onDisconnectGoogle={disconnectAccountGoogle}
                    onActivatePlatform={activateAccountPlatform}
                    onDeleteAccount={deleteAccount}
                    onSaved={refreshSession}
                    onAfterDelete={logout}
                    onUnauthorized={requireAuth}
                />
            </div>
        </div>
    );
}
