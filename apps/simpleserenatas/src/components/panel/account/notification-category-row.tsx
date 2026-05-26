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
        <div className={`py-3 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
                    {hint ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">{hint}</p>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--fg-muted)]">Correo</span>
                        <PanelSwitch
                            checked={emailChecked}
                            onChange={onEmailChange}
                            size="sm"
                            ariaLabel={`${title} por correo`}
                            disabled={disabled}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--fg-muted)]">WhatsApp</span>
                        {whatsappAvailable ? (
                            <PanelSwitch
                                checked={whatsappChecked}
                                onChange={onWhatsappChange}
                                size="sm"
                                ariaLabel={`${title} por WhatsApp`}
                                disabled={disabled}
                            />
                        ) : (
                            <span className="text-xs text-[var(--fg-muted)]" title="No disponible para esta categoría">
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
        <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]" aria-hidden="true">
            {Array.from({ length: rows }, (_, i) => i + 1).map((key) => (
                <div key={key} className="h-14 animate-pulse bg-[var(--bg-subtle)]/60" />
            ))}
        </div>
    );
}
