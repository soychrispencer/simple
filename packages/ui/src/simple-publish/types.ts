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
    /** Flecha para avanzar; check en el paso final (publicar/guardar). */
    icon?: 'arrow' | 'check';
};

export type SimplePublishHeaderSave = {
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
};

export type SimplePublishHeaderReset = {
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
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
    /** Mensaje cuando la integración no se puede usar (ej. falta video). */
    unavailableReason?: string;
    busy?: boolean;
    published?: boolean;
    supportsPersonalize?: boolean;
    onPersonalize?: () => void;
    onPublish?: () => void | Promise<void>;
    /** Publicación manual (ej. Facebook Marketplace). */
    manual?: boolean;
    helper?: string;
    onCopyAssist?: () => void | Promise<void>;
    openHref?: string;
    onMarkPublished?: () => void | Promise<void>;
    onClearPublished?: () => void | Promise<void>;
    externalUrl?: string | null;
    onExternalUrlChange?: (value: string) => void;
};

export type SimplePublishCtaCardProps = {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    loadingLabel?: string;
    hint?: string;
    /** Contenido encima del botón (ej. progreso de optimización de fotos). */
    preamble?: ReactNode;
    icon?: ReactNode;
};
