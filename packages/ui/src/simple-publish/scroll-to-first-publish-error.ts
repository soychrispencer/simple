/**
 * Tras fallar validación, lleva el viewport al primer control inválido
 * (inputs con form-input-error / aria-invalid, o bloques data-publish-invalid).
 */
export function scrollToFirstPublishError(options?: { delayMs?: number }): void {
    const run = () => {
        const target =
            document.querySelector<HTMLElement>('.form-input-error, [aria-invalid="true"], [data-publish-invalid="true"]')
            ?? document.querySelector<HTMLElement>('[data-publish-error="true"]');

        if (!target) return;

        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        const focusable =
            target.matches('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')
                ? target
                : target.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');

        focusable?.focus({ preventScroll: true });
    };

    const delayMs = options?.delayMs ?? 0;
    if (delayMs > 0) {
        window.setTimeout(run, delayMs);
        return;
    }

    // Espera a que React pinte las clases de error.
    requestAnimationFrame(() => {
        requestAnimationFrame(run);
    });
}
