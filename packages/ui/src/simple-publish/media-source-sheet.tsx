'use client';

import { MediaSourcePicker } from './media-source-picker';
import { joinClasses } from '../shared/join-classes';

export type MediaSourceSheetProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    onCamera: () => void;
    onGallery: () => void;
    desktopLabel?: string;
};

/**
 * Sheet para elegir origen de video (mismos recuadros grandes que fotos).
 * En desktop el picker ya oculta cámara.
 */
export function MediaSourceSheet({
    open,
    title,
    onClose,
    onCamera,
    onGallery,
    desktopLabel = 'Subir archivo',
}: MediaSourceSheetProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
            <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative z-[1] w-full max-w-md animate-slide-up rounded-t-3xl border border-(--border) bg-(--surface) p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-5"
            >
                <div className="mb-3 flex justify-center sm:hidden" aria-hidden>
                    <span className="h-1 w-10 rounded-full bg-(--border)" />
                </div>
                <p className="mb-4 px-1 text-center text-sm font-semibold text-(--fg)">{title}</p>
                <MediaSourcePicker
                    size="empty"
                    onCamera={onCamera}
                    onGallery={onGallery}
                    desktopLabel={desktopLabel}
                />
                <button
                    type="button"
                    onClick={onClose}
                    className={joinClasses(
                        'mt-3 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold',
                        'text-(--fg-secondary) transition hover:bg-(--bg-subtle)',
                    )}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
