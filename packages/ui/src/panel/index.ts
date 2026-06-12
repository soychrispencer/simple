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
export { resolveActiveNavHref, cleanPanelPath } from './resolve-active-nav';
export { PublicProfileEditor, type PublicProfileEditorProps, type PublicProfileVertical } from './public-profile-editor';
export { CrmTeamSettingsManager, type CrmTeamSettingsManagerProps } from './crm-team-settings-manager';
export { CrmModalShell, type CrmModalShellProps } from './crm-modal-shell';
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
