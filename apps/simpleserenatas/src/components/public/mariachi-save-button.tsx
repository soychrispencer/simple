'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { isMariachiSaved, subscribeSavedMariachis, toggleSavedMariachi } from '@/lib/saved-mariachis';

type MariachiSaveButtonProps = {
    providerGroupId: string;
    className?: string;
    variant?: 'overlay' | 'surface';
};

export function MariachiSaveButton({
    providerGroupId,
    className = '',
    variant = 'overlay',
}: MariachiSaveButtonProps) {
    const { isLoggedIn, openAuth } = useAuth();
    const [favorite, setFavorite] = useState(false);

    useEffect(() => {
        setFavorite(isMariachiSaved(providerGroupId));
        return subscribeSavedMariachis(() => setFavorite(isMariachiSaved(providerGroupId)));
    }, [providerGroupId]);

    const handleSave = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isLoggedIn) {
            openAuth('login');
            return;
        }
        const result = await toggleSavedMariachi(providerGroupId);
        if (result.ok) setFavorite(result.saved);
    };

    const surfaceClass =
        variant === 'overlay'
            ? 'border-white/20 bg-black/40 text-white hover:bg-black/55'
            : 'border-border bg-surface text-fg-muted hover:bg-bg-subtle hover:text-accent';

    return (
        <button
            type="button"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition ${surfaceClass} ${className}`.trim()}
            aria-label={favorite ? 'Quitar de guardados' : 'Guardar mariachi'}
            aria-pressed={favorite}
            onClick={(event) => {
                void handleSave(event);
            }}
        >
            {favorite ? (
                <IconHeartFilled size={20} className="text-red-500" aria-hidden />
            ) : (
                <IconHeart size={20} aria-hidden />
            )}
        </button>
    );
}
