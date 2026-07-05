import type { ReactNode } from 'react';

export type SimplePublishStep = {
    key: string;
    label: string;
    helper?: string;
};

export type SimplePublishHeaderContinue = {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
};

export type SimplePublishShareIcon = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'whatsapp';

export type SimplePublishShareIntegration = {
    key: string;
    label: string;
    icon: SimplePublishShareIcon;
    /** Integración desarrollada por Simple y disponible en el producto. */
    available: boolean;
    connected: boolean;
    connectHref: string;
    requiresVideo?: boolean;
    busy?: boolean;
    published?: boolean;
    onPublish?: () => void | Promise<void>;
};

export type SimplePublishCtaCardProps = {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    loadingLabel?: string;
    hint?: string;
    icon?: ReactNode;
};
