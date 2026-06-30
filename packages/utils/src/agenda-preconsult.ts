export const AGENDA_PRECONSULT_FIELD_TYPES = ['text', 'textarea', 'select', 'checkbox', 'number'] as const;
export type AgendaPreconsultFieldType = (typeof AGENDA_PRECONSULT_FIELD_TYPES)[number];

export type AgendaPreconsultField = {
    id: string;
    label: string;
    type: AgendaPreconsultFieldType;
    required: boolean;
    placeholder?: string;
    options?: string[];
};

export const AGENDA_PRECONSULT_FIELD_TYPE_LABELS: Record<AgendaPreconsultFieldType, string> = {
    text: 'Texto corto',
    textarea: 'Texto largo',
    select: 'Selección',
    checkbox: 'Sí / No',
    number: 'Número',
};

export function createAgendaPreconsultField(): AgendaPreconsultField {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return { id, label: '', type: 'text', required: false };
}

export function filterAgendaPreconsultFieldsForSave(fields: AgendaPreconsultField[]): AgendaPreconsultField[] {
    return fields.filter((field) => field.label.trim());
}
