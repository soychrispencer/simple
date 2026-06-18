import {
    activateAccountPlatform,
    cancelAccountEmailChange,
    changeAccountPassword,
    deleteAccount,
    disconnectAccountGoogle,
    requestAccountEmailChange,
    updateAccountProfile,
    uploadAccountAvatar,
} from '@simple/utils';
import type {
    PanelAccountPersonalDataSectionProps,
    PanelAccountPersonalDataUser,
} from './account-personal-data-section.js';

export type BindAccountProfileSectionInput = {
    user?: PanelAccountPersonalDataUser | null;
    appLabel: string;
    activeSection: 'personal' | 'security';
    refreshSession: () => Promise<unknown> | unknown;
    logout: () => Promise<unknown> | unknown;
    requireAuth: () => void;
    roleLabel?: string;
};

export function bindAccountProfileSection(
    input: BindAccountProfileSectionInput,
): PanelAccountPersonalDataSectionProps {
    return {
        activeSection: input.activeSection,
        user: input.user,
        appLabel: input.appLabel,
        roleLabel: input.roleLabel ?? 'Cuenta Simple',
        onSave: updateAccountProfile,
        onUploadAvatar: uploadAccountAvatar,
        onRequestEmailChange: requestAccountEmailChange,
        onCancelEmailChange: cancelAccountEmailChange,
        onChangePassword: changeAccountPassword,
        onDisconnectGoogle: disconnectAccountGoogle,
        onActivatePlatform: activateAccountPlatform,
        onDeleteAccount: deleteAccount,
        onSaved: input.refreshSession,
        onAfterDelete: input.logout,
        onUnauthorized: input.requireAuth,
    };
}
