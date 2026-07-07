'use client';

export * from './modern-select';
export * from './modern-datetime-input';

// Deuda técnica: Google Places Autocomplete (API clásica). Migrar a PlaceAutocompleteElement cuando actualicemos la integración.
import { joinClasses } from './shared/join-classes';
import {
    PanelBlockHeader,
    PanelChoiceCard,
    PanelNotice,
    PanelStatusBadge,
    PanelSwitch,
} from './panel/panel-primitives';
import type {
    PanelBlockHeaderProps,
    PanelChoiceCardProps,
    PanelNoticeProps,
    PanelStatusBadgeProps,
    PanelSwitchProps,
} from './panel/panel-primitives';
export { ThemeProvider, useTheme, useThemeToggle, SIMPLE_THEME_PROVIDER_DEFAULTS } from './theme-provider';
export type { SimpleThemeProviderProps } from './theme-provider';
export { ThemeToggleButton, type ThemeToggleButtonProps } from './theme-toggle-button';
export { BrandLogo, type BrandLogoProps, type BrandLogoVariant } from './brand/brand-logo';
export { ErrorView, type ErrorViewProps } from './feedback/error-view';
export { joinClasses };
export {
    ListingLocationEditor,
    LocationMapPreview,
    type ListingLocationEditorProps,
    type LocationMapPreviewProps,
} from './location/listing-location-editor';
export { AddressBookManager, type AddressBookManagerSubmitInput } from './address-book/address-book-manager';
export { useAddressBookPage } from './address-book/use-address-book-page';
export { PanelButton, getPanelButtonClassName, getPanelButtonStyle, type PanelButtonProps } from './panel/panel-button';
export { PanelCard, type PanelCardProps } from './panel/panel-card';
export { PanelFilterChip, type PanelFilterChipProps } from './panel/panel-filter-chip';
export {
    PanelBlockHeader,
    PanelChoiceCard,
    PanelNotice,
    PanelStatusBadge,
    PanelSwitch,
};
export type {
    PanelBlockHeaderProps,
    PanelChoiceCardProps,
    PanelNoticeProps,
    PanelStatusBadgeProps,
    PanelSwitchProps,
};
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
} from './panel/panel-navigation';
export {
    PanelSectionTabs,
    type PanelSectionTabItem,
    type PanelSectionTabsProps,
} from './panel/panel-section-tabs';
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
} from './panel/panel-display';
export {
    PanelConfigPage,
    PanelConfigSection,
    type PanelConfigPageProps,
    type PanelConfigSectionItem,
    type PanelConfigSectionProps,
} from './panel/panel-config-section';

export {
    InstagramTemplatePreview,
    type InstagramTemplatePreviewData,
    type InstagramTemplatePreviewProps,
} from './integrations/instagram-template-preview';
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
} from './panel/panel-uploaders';
export { default as PublicListingCard } from './listing-card/public-listing-card';
export { default as OwnerListingCard } from './listing-card/owner-listing-card';
export { default as FeaturedCardSwiper } from './listing-card/featured-card-swiper';
export { default as MarketplaceReelListingCard } from './listing-card/marketplace-reel-listing-card';
export {
    MarketplaceReelShareMenu,
    buildDefaultReelShareMenuItems,
} from './listing-card/marketplace-reel-share-menu';
export type {
    ListingAccent,
    ListingBadge,
    ListingBadgeTone,
    ListingEngagement,
    ListingImage,
    ListingMode,
    ListingPrice,
    ListingSellerRef,
    ListingVariant,
    OwnerListingAction,
    OwnerListingCardProps,
    OwnerListingStatus,
    PublicListingCardProps,
} from './listing-card/types';
export type {
    MarketplaceReelChip,
    MarketplaceReelListingCardProps,
    MarketplaceReelSpec,
} from './listing-card/marketplace-reel-listing-card';
export type { MarketplaceReelShareMenuItem } from './listing-card/marketplace-reel-share-menu';

// Sidebar
export { Sidebar, AppSidebar, type NavItem, type UserInfo, type SidebarProps, type AppSidebarProps } from './sidebar/app-sidebar';
export { PanelShell, type PanelShellProps } from './panel/panel-shell';
export { PanelConfirmDialog, type PanelConfirmDialogProps } from './panel/panel-confirm-dialog';
export {
    PanelConfirmProvider,
    usePanelConfirm,
    type PanelConfirmOptions,
} from './panel/panel-confirm-provider';
export {
    PanelPersonalDataList,
    PanelPersonalDataRow,
    type PanelPersonalDataAction,
    type PanelPersonalDataRowProps,
} from './panel/panel-personal-data-list.js';
export {
    PanelAccountPersonalDataSection,
    type PanelAccountPersonalDataSaveInput,
    type PanelAccountPersonalDataSaveResult,
    type PanelAccountPersonalDataSectionProps,
    type PanelAccountPersonalDataUser,
} from './panel/account-personal-data-section.js';
export { resolveActiveNavHref, cleanPanelPath } from './panel/resolve-active-nav';
export { PublicProfileEditor, type PublicProfileEditorProps, type PublicProfileVertical } from './panel/public-profile-editor';
export { AvatarUpload, type AvatarUploadConfig, type AvatarUploadHandle, type AvatarUploadProps } from './avatar-upload';
export { PanelAddressesPage } from './address-book/panel-addresses-page';
export {
    SubscriptionManager,
    type SubscriptionManagerProps,
    type SubscriptionManagerPayments,
} from './panel/subscription-manager';
export {
    InstagramIntegrationCard,
    type InstagramIntegrationCardProps,
    type InstagramIntegrationStatus,
} from './integrations/instagram-integration-card';
export { MarketplaceFooter, type MarketplaceFooterProps } from './layout/marketplace-footer';
export { FeaturedBoostSliderSection, type FeaturedBoostSliderSectionProps, type FeaturedBoostTab } from './featured/featured-boost-slider-section';
export { SiteInfoPage, type SiteInfoPageData, type SiteInfoSection } from './content/site-info-page';
export {
    PublicProfileShell,
    PUBLIC_PROFILE_DAY_LABELS,
    initialsFromPublicProfileName,
    formatPublicProfileTime,
    getPublicProfileTodayState,
    type PublicProfileShellProps,
    type PublicProfileShellData,
    type PublicProfileDay,
    type PublicProfileTodayState,
} from './public-profile/public-profile-shell';
