'use client';

import { IconSparkles } from '@tabler/icons-react';

export type MarketplaceListingCopyFieldsProps = {
    title: string;
    description: string;
    titleError?: string;
    descriptionError?: string;
    titlePlaceholder?: string;
    descriptionPlaceholder?: string;
    descriptionMaxLength?: number;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onRegenerateTitle: () => void;
    onRegenerateDescription: () => void;
    titleHint?: string;
    descriptionLabel?: string;
};

export function MarketplaceListingCopyFields({
    title,
    description,
    titleError,
    descriptionError,
    titlePlaceholder = 'Título del aviso',
    descriptionPlaceholder = 'Descripción para tu ficha y redes',
    descriptionMaxLength = 2500,
    onTitleChange,
    onDescriptionChange,
    onRegenerateTitle,
    onRegenerateDescription,
    titleHint = 'Se genera automáticamente con los datos del aviso. Puedes editarlo.',
    descriptionLabel = 'Descripción',
}: MarketplaceListingCopyFieldsProps) {
    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-(--fg)">Título del aviso</label>
                    <button
                        type="button"
                        onClick={onRegenerateTitle}
                        className="inline-flex items-center gap-1 text-xs text-(--accent) hover:underline"
                    >
                        <IconSparkles size={12} />
                        Regenerar
                    </button>
                </div>
                <input
                    type="text"
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder={titlePlaceholder}
                    className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2.5 text-sm font-medium text-(--fg)"
                />
                {titleError ? <p className="mt-1 text-xs text-(--color-error)">{titleError}</p> : null}
                {!titleError && titleHint ? <p className="mt-1 text-xs text-(--fg-muted)">{titleHint}</p> : null}
            </section>

            <section className="rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-(--fg)">{descriptionLabel}</label>
                    <button
                        type="button"
                        onClick={onRegenerateDescription}
                        className="inline-flex items-center gap-1 text-xs text-(--accent) hover:underline"
                    >
                        <IconSparkles size={12} />
                        Regenerar
                    </button>
                </div>
                <textarea
                    rows={5}
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    placeholder={descriptionPlaceholder}
                    className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2.5 text-sm text-(--fg)"
                />
                <p className="mt-1 text-xs text-(--fg-muted)">{description.length} / {descriptionMaxLength}</p>
                {descriptionError ? <p className="mt-1 text-xs text-(--color-error)">{descriptionError}</p> : null}
            </section>
        </div>
    );
}
