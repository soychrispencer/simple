/** Resume errores de validación para avisos globales del wizard. */
export function summarizeValidationErrors(errors: Record<string, string>, maxItems = 3): string | null {
    const messages = [...new Set(Object.values(errors).filter(Boolean))];
    if (messages.length === 0) return null;
    if (messages.length === 1) return messages[0] ?? null;
    const head = messages.slice(0, maxItems).join(' · ');
    const remaining = messages.length - maxItems;
    if (remaining > 0) {
        return `${head} · y ${remaining} campo${remaining === 1 ? '' : 's'} más`;
    }
    return head;
}
