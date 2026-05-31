'use client';

import { PanelSwitch } from '@simple/ui/panel';

export function NotificationCategoryRow({
    title,
    hint,
    emailChecked,
    whatsappChecked,
    whatsappAvailable = true,
    disabled,
    onEmailChange,
    onWhatsappChange,
}: {
    title: string;
    hint?: string;
    emailChecked: boolean;
    whatsappChecked: boolean;
    whatsappAvailable?: boolean;
    disabled?: boolean;
    onEmailChange: (value: boolean) => void;
    onWhatsappChange: (value: boolean) => void;
}) {
    return (
        <div className={`px-1 py-4 sm:py-5 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1 pr-0 sm:pr-4">
                    <p className="text-sm font-medium leading-snug text-(--fg)">{title}</p>
                    {hint ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-(--fg-muted)">{hint}</p>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-5 sm:justify-end sm:gap-6">
                    <div className="flex min-w-[5.5rem] items-center justify-between gap-3 sm:justify-end">
                        <span className="text-xs text-(--fg-muted)">Correo</span>
                        <PanelSwitch
                            checked={emailChecked}
                            onChange={onEmailChange}
                            size="sm"
                            ariaLabel={`${title} por correo`}
                            disabled={disabled}
                        />
                    </div>
                    <div className="flex min-w-[6.5rem] items-center justify-between gap-3 sm:justify-end">
                        <span className="text-xs text-(--fg-muted)">WhatsApp</span>
                        {whatsappAvailable ? (
                            <PanelSwitch
                                checked={whatsappChecked}
                                onChange={onWhatsappChange}
                                size="sm"
                                ariaLabel={`${title} por WhatsApp`}
                                disabled={disabled}
                            />
                        ) : (
                            <span className="text-xs text-(--fg-muted)" title="No disponible para esta categoría">
                                —
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function NotificationPrefsSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="divide-y divide-(--border) border-t border-(--border)" aria-hidden="true">
            {Array.from({ length: rows }, (_, i) => i + 1).map((key) => (
                <div key={key} className="h-[4.5rem] animate-pulse bg-(--bg-subtle)/60" />
            ))}
        </div>
    );
}
