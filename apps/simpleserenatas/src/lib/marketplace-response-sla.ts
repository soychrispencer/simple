/** Mantener alineado con `MARKETPLACE_RESPONSE_SLA_HOURS` en services/api availability.ts */
export const PLATFORM_MARKETPLACE_RESPONSE_SLA_HOURS = 24;

export function platformResponseSlaLabel(): string {
    return `${PLATFORM_MARKETPLACE_RESPONSE_SLA_HOURS} h para responder`;
}
