export type SerenataRejectTemplate = {
    id: string;
    label: string;
    message: string;
};

/** Motivos rápidos al rechazar una solicitud marketplace (dueño). */
export const SERENATA_REJECT_TEMPLATES: SerenataRejectTemplate[] = [
    {
        id: 'no_availability',
        label: 'Sin disponibilidad en esa fecha',
        message: 'No tenemos disponibilidad para la fecha y hora solicitadas.',
    },
    {
        id: 'out_of_zone',
        label: 'Fuera de zona',
        message: 'La dirección queda fuera de nuestra zona de cobertura.',
    },
    {
        id: 'agenda_full',
        label: 'Agenda completa',
        message: 'Ese día ya tenemos la agenda completa y no podemos tomar más serenatas.',
    },
    {
        id: 'repertoire',
        label: 'Repertorio',
        message: 'Las canciones o el tipo de evento no encajan con nuestro repertorio actual.',
    },
    {
        id: 'service_mismatch',
        label: 'Servicio no disponible',
        message: 'El servicio o la duración solicitada no está disponible en este momento.',
    },
];

export const SERENATA_REJECT_OTHER_ID = 'other';

export function resolveSerenataRejectReason(templateId: string, customText?: string): string | null {
    if (templateId === SERENATA_REJECT_OTHER_ID) {
        const trimmed = customText?.trim() ?? '';
        return trimmed.length >= 3 ? trimmed : null;
    }
    const template = SERENATA_REJECT_TEMPLATES.find((entry) => entry.id === templateId);
    return template?.message ?? null;
}
