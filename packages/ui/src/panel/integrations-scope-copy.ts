/** Descripción de la página Integraciones en Mi cuenta, por vertical. */

export function accountIntegrationsDescription(appLabel: string): string {
    const label = appLabel.toLowerCase();

    if (label.includes('agenda')) {
        return 'Activa Mercado Pago y Google Calendar con el interruptor. Requiere plan Pro o prueba activa.';
    }
    if (label.includes('serenata')) {
        return 'Activa Google Calendar con el interruptor para sincronizar tu agenda.';
    }
    if (label.includes('propiedad')) {
        return 'Activa Instagram con el interruptor. Requiere plan Pro o Empresa.';
    }
    return 'Activa cada integración con el interruptor. Algunas requieren plan de pago.';
}
