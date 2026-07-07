'use client';

import { PanelProfileBrandImages } from '@simple/ui/panel';
import { serenatasApi } from '@/lib/serenatas-api';

type ProviderGroupBrandImagesProps = {
    className?: string;
    name: string;
    logoUrl: string;
    coverUrl: string;
    profession?: string | null;
    location?: string | null;
    previewHref?: string | null;
    onLogoChange: (url: string) => void;
    onCoverChange: (url: string) => void;
    onError?: (message: string) => void;
    onSave?: (logoUrl: string | null, coverUrl: string | null, kind: 'logo' | 'cover') => Promise<void>;
    isSaving?: boolean;
};

export function ProviderGroupBrandImages({
    className,
    name,
    logoUrl,
    coverUrl,
    profession = 'Mariachi',
    location,
    previewHref,
    onLogoChange,
    onCoverChange,
    onError,
    onSave,
    isSaving,
}: ProviderGroupBrandImagesProps) {
    return (
        <PanelProfileBrandImages
            className={className}
            displayName={name}
            logoUrl={logoUrl || null}
            coverUrl={coverUrl || null}
            profession={profession}
            location={location}
            previewHref={previewHref}
            previewVariant="profile-page"
            disabled={isSaving}
            onLogoChange={(url) => {
                onLogoChange(url);
                void onSave?.(url, coverUrl || null, 'logo');
            }}
            onCoverChange={(url) => {
                onCoverChange(url);
                void onSave?.(logoUrl || null, url, 'cover');
            }}
            onUploadLogo={async (file, croppedBlob) => {
                const uploadFile = croppedBlob === file
                    ? file
                    : new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                const result = await serenatasApi.uploadAvatar(uploadFile, 'logo.webp', 'logo');
                if (!result.ok || !result.url) {
                    throw new Error(result.error ?? 'No pudimos subir el logo.');
                }
                return { url: result.url };
            }}
            onUploadCover={async (file, croppedBlob) => {
                const uploadFile = croppedBlob === file
                    ? file
                    : new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
                const result = await serenatasApi.uploadAvatar(uploadFile, 'cover.webp', 'cover');
                if (!result.ok || !result.url) {
                    throw new Error(result.error ?? 'No pudimos subir la portada.');
                }
                return { url: result.url };
            }}
            onError={onError}
        />
    );
}
