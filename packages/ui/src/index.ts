// Layout Components (Header, Footer)
export * from './components/layout';

// Form Components (Input, Select, Textarea)
export { Input as FormInput, Select as FormSelect, Textarea } from './components/forms';

// Feedback Components (Toast)
export * from './components/feedback';

// Auth Components (AuthModal, SocialIcons)
export * from './components/auth';
export { ContactModal as LeadContactModal } from './components/auth/ContactModal';

// UI Components (Button, CircleButton, Input, Select)
export { Button, CircleButton, UserAvatar, Chip, RatingChip, Input, Select, Card, CardHeader, CardTitle, CardContent, Badge, ViewToggle } from './components/ui';
export { default as Modal } from './components/ui/modal/Modal';
export { default as ContactModal } from './components/ui/modal/ContactModal';
export { default as LineChart } from './components/ui/LineChart';
export { default as ProfileCoverUploader } from './components/ui/uploader/ProfileCoverUploader';
export { default as FormStepper } from './components/ui/form/FormStepper';
export type { StepStatus } from './components/ui/form/FormStepper';

// Search components
export * from './components/search';

// Notifications
export * from './components/notifications';

// Panel components
export { default as PanelSidebar } from './components/panel/Sidebar';
export type { PanelSidebarProps } from './components/panel/Sidebar';
export { default as PanelHeader } from './components/panel/PanelHeader';
export type { PanelHeaderProps } from './components/panel/PanelHeader';
export { default as PanelPageLayout } from './components/panel/PanelPageLayout';
export type { PanelPageLayoutProps } from './components/panel/PanelPageLayout';
export { default as PanelShell } from './components/panel/PanelShell';
export type {
	PanelShellProps,
	PanelShellSidebarRenderProps,
} from './components/panel/PanelShell';
export { useVerticalContext } from './components/panel/useVerticalContext';
export type {
	CompanyMembership,
	CompanyRecord,
	VerticalContextValue,
} from './components/panel/useVerticalContext';
export type {
	PanelManifest,
	PanelSidebarItem,
	PanelSidebarSection,
	PanelDashboardSection,
	PanelDashboardWidget,
	PanelIconId,
	PanelModuleStatus,
} from './components/panel/panelManifest';

// Shared hooks/helpers
export { useSupabase } from './lib/supabase';
export { useAvatarUrl, getAvatarUrl } from './lib/storage';
export { cn } from './lib/cn';

// Global preferences
export { DisplayCurrencyProvider, useDisplayCurrency } from './context/DisplayCurrencyContext';
export type { DisplayCurrency } from './context/DisplayCurrencyContext';

// Styles
export { filterSectionLabelClass } from './styles/filter';
