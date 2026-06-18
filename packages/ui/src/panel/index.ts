'use client';

export { PanelButton, getPanelButtonClassName, getPanelButtonStyle, type PanelButtonProps } from './panel-button';
export { PanelCard, type PanelCardProps } from './panel-card';
export {
    PanelBlockHeader,
    PanelChoiceCard,
    PanelNotice,
    PanelStatusBadge,
    PanelSwitch,
    type PanelBlockHeaderProps,
    type PanelChoiceCardProps,
    type PanelNoticeProps,
    type PanelStatusBadgeProps,
    type PanelSwitchProps,
} from './panel-primitives';
export { PanelFilterChip, type PanelFilterChipProps } from './panel-filter-chip';
export { PanelShell, type PanelShellProps } from './panel-shell';
export { PanelConfirmDialog, type PanelConfirmDialogProps } from './panel-confirm-dialog';
export {
    PanelConfirmProvider,
    usePanelConfirm,
    type PanelConfirmOptions,
} from './panel-confirm-provider';
export {
    PanelPersonalDataList,
    PanelPersonalDataRow,
    type PanelPersonalDataAction,
    type PanelPersonalDataRowProps,
} from './panel-personal-data-list';
export {
    PanelAccountPersonalDataSection,
    type PanelAccountPersonalDataSaveInput,
    type PanelAccountPersonalDataSaveResult,
    type PanelAccountPersonalDataSectionProps,
    type PanelAccountPersonalDataUser,
} from './account-personal-data-section';
export {
    PanelAccountPersonalNotificationsSection,
    type AccountPersonalNotificationPrefs,
    type PanelAccountPersonalNotificationsSectionProps,
} from './account-personal-notifications-section';
export { PanelAccountPersonalNotificationsConnected } from './account-personal-notifications-connected';
export { PanelAccountAddressesContent } from './account-addresses-content';
export { PanelAccountResidenceSection, type PanelAccountResidenceSectionProps } from './account-residence-section';
export { PanelAccountLocationContent, type PanelAccountLocationContentProps } from './account-location-content';
export {
    PanelAccountShell,
    DEFAULT_ACCOUNT_SECTION_TABS,
    MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS,
    buildAccountSectionTabs,
    ACCOUNT_PAGE_DEFAULTS,
    type PanelAccountShellProps,
} from './account-shell';
export {
    PanelBusinessShell,
    PanelBusinessSubsectionLink,
    type PanelBusinessShellProps,
    type PanelBusinessSubsectionBack,
} from './business-shell';
export {
    PanelMiNegocioShell,
    PanelMiNegocioLoading,
    type PanelMiNegocioShellProps,
    type PanelMiNegocioLoadingProps,
} from './panel-mi-negocio-shell';
export {
    MarketplaceMiNegocioSectionPage,
    type MarketplaceMiNegocioSectionPageProps,
} from './marketplace-mi-negocio-section-page';
export {
    agendaBusinessSubsectionShellProps,
    type AgendaBusinessSubsectionKey,
    type AgendaBusinessSubsectionShellProps,
} from './agenda-business-subsections';
export {
    usePanelBusinessSetup,
    type PanelBusinessSetupStatus,
} from './use-panel-business-setup';
export {
    PanelBusinessPublishToggle,
    type PanelBusinessPublishToggleProps,
    type PanelBusinessPublishStatus,
} from './panel-business-publish-toggle';
export { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle';
export {
    billingAccessBadgeLabel,
    businessSetupProgress,
    businessSetupSubtitle,
    isBusinessSetupComplete,
    nextBusinessSetupStep,
    clampTrialDaysRemaining,
    panelBillingDaysRemaining,
    PANEL_BILLING_TRIAL_DAYS,
    resolvePanelBillingAccess,
    resolvePanelBillingFromCatalog,
    type BusinessSetupStep,
    type PanelBillingAccess,
    type PanelBillingStatus,
} from './business-setup';
export { PanelBusinessSetupCard, type PanelBusinessSetupCardProps } from './business-setup-card';
export {
    AGENDA_BUSINESS_TABS,
    SERENATAS_BUSINESS_TABS,
} from './business-tabs';
export {
    BUSINESS_PAGE_DEFAULTS,
    MARKETPLACE_PUBLIC_PROFILE_PAGE,
    MARKETPLACE_BUSINESS_CONTACTO_PAGE,
    MARKETPLACE_BUSINESS_REDES_PAGE,
    MARKETPLACE_BUSINESS_HORARIOS_PAGE,
    MARKETPLACE_BUSINESS_EQUIPO_PAGE,
    AGENDA_BUSINESS_PERFIL_PAGE,
    AGENDA_BUSINESS_PAGINA_PAGE,
    AGENDA_BUSINESS_DATOS_PAGE,
    PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE,
    AGENDA_BUSINESS_SERVICIOS_PAGE,
    AGENDA_BUSINESS_DISPONIBILIDAD_PAGE,
    AGENDA_BUSINESS_COBROS_PAGE,
    AGENDA_BUSINESS_CONFIGURACIONES_PAGE,
    AGENDA_BUSINESS_PACKS_PAGE,
    AGENDA_BUSINESS_PROMOCIONES_PAGE,
    AGENDA_BUSINESS_GRUPALES_PAGE,
    AGENDA_BUSINESS_DOMINIO_PAGE,
    SERENATAS_BUSINESS_DATOS_PAGE,
    SERENATAS_BUSINESS_SERVICIOS_PAGE,
    SERENATAS_BUSINESS_DISPONIBILIDAD_PAGE,
    SERENATAS_BUSINESS_REPERTORIO_PAGE,
    SERENATAS_BUSINESS_GRUPOS_PAGE,
    SERENATAS_BUSINESS_CONFIGURACIONES_PAGE,
    resolveSerenatasBusinessPageCopy,
    type SerenatasBusinessTabKey,
} from './business-copy';
export {
    FINANCE_NAV_LABEL,
    AGENDA_FINANCE_PAGE,
    SERENATAS_FINANCE_PAGE,
    SUBSCRIPTION_BILLING_HISTORY,
    BUSINESS_PAYMENT_METHODS_PAGE,
} from './finance-copy';
export { bindAccountProfileSection, type BindAccountProfileSectionInput } from './bind-account-profile-section';
export {
    ACCOUNT_LOCATION_PAGE,
    ACCOUNT_NOTIFICATIONS_PAGE,
    ACCOUNT_SUBSCRIPTION_PAGE,
    ACCOUNT_SECURITY_PAGE,
    ACCOUNT_REFERRALS_PAGE,
    ACCOUNT_INTEGRATIONS_PAGE,
    accountIntegrationsDescription,
    accountSubscriptionDescription,
    /** @deprecated */ ACCOUNT_CONNECTIONS_PAGE,
    /** @deprecated */ accountConnectionsDescription,
    ACCOUNT_ADDRESSES_PAGE,
    ACCOUNT_RESIDENCE_BLOCK,
    ACCOUNT_ADDRESSES_BLOCK,
    ACCOUNT_RESIDENCE_SECTION_TITLE,
    accountResidenceDescription,
    accountAddressesBlockDescription,
} from './account-copy';
export {
    StructuredLocationFields,
    type StructuredLocationFieldsProps,
} from './structured-location-fields';
export { resolveActiveNavHref, cleanPanelPath } from './resolve-active-nav';
export { PublicProfileEditor, type PublicProfileEditorProps, type PublicProfileEditorSection, type PublicProfileVertical } from './public-profile-editor';
export { PanelProfileBrandImages, type PanelProfileBrandImagesProps } from './panel-profile-brand-images';
export {
    SubscriptionManager,
    type SubscriptionManagerProps,
    type SubscriptionManagerPayments,
} from './subscription-manager';

export {
    PanelBottomNav,
    PanelPillNav,
    PanelSearchField,
    PanelSegmentedToggle,
    PanelStepNav,
    type PanelBottomNavItem,
    type PanelBottomNavProps,
    type PanelPillNavItem,
    type PanelPillNavProps,
    type PanelSearchFieldProps,
    type PanelSegmentedToggleItem,
    type PanelSegmentedToggleProps,
    type PanelStepNavItem,
    type PanelStepNavProps,
} from './panel-navigation';
export {
    PanelSectionTabs,
    type PanelSectionTabItem,
    type PanelSectionTabsProps,
} from './panel-section-tabs';
export {
    PanelAccountProfileCard,
    PanelActions,
    PanelEmptyState,
    PanelField,
    PanelIconButton,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelPageHeader,
    PanelStatCard,
    PanelSummaryCard,
    type PanelAccountProfileCardProps,
    type PanelActionsProps,
    type PanelEmptyStateProps,
    type PanelFieldProps,
    type PanelIconButtonProps,
    type PanelListHeaderProps,
    type PanelListProps,
    type PanelListRowProps,
    type PanelPageHeaderProps,
    type PanelStatCardProps,
    type PanelSummaryCardProps,
    type PanelSummaryRowProps,
} from './panel-display';
export {
    PanelConfigPage,
    PanelConfigSection,
    type PanelConfigPageProps,
    type PanelConfigSectionItem,
    type PanelConfigSectionProps,
} from './panel-config-section';
export {
    PanelMessagesInbox,
    type PanelMessagesCopy,
    type PanelMessagesInboxProps,
} from './panel-messages-inbox.js';

export {
    PanelDocumentUploader,
    PanelMediaUploader,
    PanelVideoUploader,
    type PanelDocumentAsset,
    type PanelDocumentUploaderProps,
    type PanelMediaAsset,
    type PanelMediaUploaderProps,
    type PanelVideoAsset,
    type PanelVideoUploaderProps,
} from './panel-uploaders';
