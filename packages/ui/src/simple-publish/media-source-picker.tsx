'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { IconCamera, IconPhoto, IconUpload } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';

export type MediaSourcePickerProps = {
    onCamera: () => void;
    onGallery: () => void;
    /** empty = recuadros grandes; compact = fila más baja (p. ej. “agregar más”). */
    size?: 'empty' | 'compact';
    invalid?: boolean;
    disabled?: boolean;
    cameraLabel?: string;
    galleryLabel?: string;
    /** Etiqueta del CTA único en desktop (sin cámara). */
    desktopLabel?: string;
    className?: string;
};

/** Touch / coarse pointer → tiene sentido ofrecer cámara. */
export function usePrefersCameraSource(): boolean {
    const [prefersCamera, setPrefersCamera] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(hover: none), (pointer: coarse)');
        const sync = () => setPrefersCamera(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    return prefersCamera;
}

/**
 * Elección Cámara / Galería en móvil; en desktop un solo CTA de subir archivos.
 */
export function MediaSourcePicker({
    onCamera,
    onGallery,
    size = 'empty',
    invalid = false,
    disabled = false,
    cameraLabel = 'Cámara',
    galleryLabel = 'Galería',
    desktopLabel = 'Subir fotos',
    className,
}: MediaSourcePickerProps) {
    const prefersCamera = usePrefersCameraSource();
    const empty = size === 'empty';

    if (!prefersCamera) {
        return (
            <div className={className}>
                <SourceCard
                    empty={empty}
                    invalid={invalid}
                    disabled={disabled}
                    fullWidth
                    icon={<IconUpload size={empty ? 28 : 22} stroke={1.6} />}
                    label={desktopLabel}
                    onClick={onGallery}
                />
            </div>
        );
    }

    return (
        <div className={joinClasses('grid grid-cols-2 gap-2.5', className)}>
            <SourceCard
                empty={empty}
                invalid={invalid}
                disabled={disabled}
                icon={<IconCamera size={empty ? 28 : 22} stroke={1.6} />}
                label={cameraLabel}
                onClick={onCamera}
            />
            <SourceCard
                empty={empty}
                invalid={invalid}
                disabled={disabled}
                icon={<IconPhoto size={empty ? 28 : 22} stroke={1.6} />}
                label={galleryLabel}
                onClick={onGallery}
            />
        </div>
    );
}

function SourceCard({
    empty,
    invalid,
    disabled,
    fullWidth = false,
    icon,
    label,
    onClick,
}: {
    empty: boolean;
    invalid: boolean;
    disabled: boolean;
    fullWidth?: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={joinClasses(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border bg-(--bg-subtle)/40 text-(--fg) transition',
                'active:scale-[0.98] hover:border-(--accent)/45 hover:bg-(--bg-subtle)/70',
                'disabled:cursor-not-allowed disabled:opacity-45',
                fullWidth && 'w-full',
                empty ? 'min-h-[132px] px-3 py-6' : 'min-h-[72px] px-2 py-3',
                invalid ? 'border-(--color-error)' : 'border-(--border)',
            )}
        >
            <span
                className={joinClasses(
                    'flex items-center justify-center rounded-2xl bg-(--surface) text-(--accent) shadow-sm',
                    empty ? 'h-12 w-12' : 'h-10 w-10',
                )}
            >
                {icon}
            </span>
            <span className={joinClasses('font-semibold', empty ? 'text-sm' : 'text-xs')}>{label}</span>
        </button>
    );
}
