'use client';

import { PanelProfileBrandImages } from '@simple/ui/panel';
import { serenatasApi } from '@/lib/serenatas-api';

type ProviderGroupBrandImagesProps = {
    className?: string;
    name: string;
    logoUrl: string;
    coverUrl: string;
    subtitle?: string | null;
    onLogoChange: (url: string) => void;
    onCoverChange: (url: string) => void;
    onError?: (message: string) => void;
    onSave?: (logoUrl: string | null, coverUrl: string | null) => Promise<void>;
    isSaving?: boolean;
};

export function ProviderGroupBrandImages({
    className,
    name,
    logoUrl,
    coverUrl,
    subtitle,
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
            subtitle={subtitle}
            subtitleVariant="location"
            disabled={isSaving}
            hint={
                <>
                    <strong className="text-fg">Obligatorio para publicar:</strong> logo del mariachi (no tu foto personal)
                    y portada 16:9 recomendada 1600×900 px.
                </>
            }
            onLogoChange={(url) => {
                onLogoChange(url);
                void onSave?.(url, coverUrl || null);
            }}
            onCoverChange={(url) => {
                onCoverChange(url);
                void onSave?.(logoUrl || null, url);
            }}
            onUploadLogo={async (_file, croppedBlob) => {
                const uploadFile = new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                const result = await serenatasApi.uploadAvatar(uploadFile, 'logo.webp', 'logo');
                if (!result.ok || !result.url) {
                    throw new Error(result.error ?? 'No pudimos subir el logo.');
                }
                return { url: result.url };
            }}
            onUploadCover={async (_file, croppedBlob) => {
                const uploadFile = new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
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
