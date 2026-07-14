export type AgendaOperatorTier = 'individual' | 'independent' | 'company';

export type AgendaProfessionOption = {
    id: string;
    label: string;
};

export type AgendaProfessionGroup = {
    id: AgendaOperatorTier;
    label: string;
    options: AgendaProfessionOption[];
};

function agendaSubtypeId(label: string): string {
    return label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
}

function groupOptions(labels: string[]): AgendaProfessionOption[] {
    return labels.map((label) => ({ id: agendaSubtypeId(label), label }));
}

export const AGENDA_PROFESSION_GROUPS: AgendaProfessionGroup[] = [
    {
        id: 'individual',
        label: 'Particular',
        options: groupOptions([
            'Profesional independiente',
            'Consultor/a independiente',
            'Coach',
            'Terapeuta holístico/a',
            'Profesor/a particular',
        ]),
    },
    {
        id: 'independent',
        label: 'Profesional',
        options: groupOptions([
            'Médico/a',
            'Psicólogo/a clínico/a',
            'Nutricionista',
            'Kinesiólogo/a',
            'Fonoaudiólogo/a',
            'Terapeuta ocupacional',
            'Podólogo/a',
            'Veterinario/a',
            'Dentista',
            'Enfermero/a',
            'Matrona',
            'Abogado/a',
            'Contador/a',
            'Arquitecto/a',
            'Diseñador/a',
            'Estilista / peluquería',
            'Masajista',
            'Entrenador/a personal',
            'Musicoterapeuta',
        ]),
    },
    {
        id: 'company',
        label: 'Centro o empresa',
        options: groupOptions([
            'Clínica',
            'Centro médico',
            'Centro de kinesiología',
            'Centro de psicología',
            'Spa / estética',
            'Estudio / agencia',
            'Taller / servicio técnico',
            'Academia / instituto',
        ]),
    },
];

export const AGENDA_OPERATOR_SUBTYPES: Record<AgendaOperatorTier, AgendaProfessionOption[]> = {
    individual: AGENDA_PROFESSION_GROUPS.find((g) => g.id === 'individual')!.options,
    independent: AGENDA_PROFESSION_GROUPS.find((g) => g.id === 'independent')!.options,
    company: AGENDA_PROFESSION_GROUPS.find((g) => g.id === 'company')!.options,
};

export function flattenAgendaProfessionOptions(): string[] {
    return AGENDA_PROFESSION_GROUPS.flatMap((group) => group.options.map((option) => option.label));
}

export function resolveAgendaOperatorFields(input: {
    accountKind?: string | null;
    operatorSubtype?: string | null;
    profession?: string | null;
}): {
    accountKind: AgendaOperatorTier;
    operatorSubtype: string | null;
    operatorSubtypeCustom: string;
} {
    const fallbackKind: AgendaOperatorTier =
        input.accountKind === 'independent' || input.accountKind === 'company'
            ? input.accountKind
            : 'individual';

    if (input.operatorSubtype === 'other') {
        return {
            accountKind: fallbackKind,
            operatorSubtype: 'other',
            operatorSubtypeCustom: input.profession?.trim() ?? '',
        };
    }

    if (input.operatorSubtype?.trim()) {
        for (const tier of ['individual', 'independent', 'company'] as AgendaOperatorTier[]) {
            const match = AGENDA_OPERATOR_SUBTYPES[tier].find((item) => item.id === input.operatorSubtype);
            if (match) {
                return {
                    accountKind: tier,
                    operatorSubtype: match.id,
                    operatorSubtypeCustom: '',
                };
            }
        }
    }

    const profession = input.profession?.trim();
    if (profession) {
        for (const tier of ['individual', 'independent', 'company'] as AgendaOperatorTier[]) {
            const match = AGENDA_OPERATOR_SUBTYPES[tier].find(
                (item) => item.label.toLowerCase() === profession.toLowerCase(),
            );
            if (match) {
                return {
                    accountKind: tier,
                    operatorSubtype: match.id,
                    operatorSubtypeCustom: '',
                };
            }
        }
        return {
            accountKind: fallbackKind,
            operatorSubtype: 'other',
            operatorSubtypeCustom: profession,
        };
    }

    return {
        accountKind: fallbackKind,
        operatorSubtype: null,
        operatorSubtypeCustom: '',
    };
}

/** Sustantivo de CRM en UI: dominio sigue siendo `client`. */
export type AgendaClientNoun = 'paciente' | 'cliente' | 'alumno';

/** Profesiones clínicas / centros de salud → «paciente». */
const AGENDA_PATIENT_SUBTYPE_IDS = new Set([
    'medico_a',
    'psicologo_a_clinico_a',
    'nutricionista',
    'kinesiologo_a',
    'fonoaudiologo_a',
    'terapeuta_ocupacional',
    'podologo_a',
    'veterinario_a',
    'dentista',
    'enfermero_a',
    'matrona',
    'musicoterapeuta',
    'terapeuta_holistico_a',
    'clinica',
    'centro_medico',
    'centro_de_kinesiologia',
    'centro_de_psicologia',
]);

/** Educación / formación → «alumno». */
const AGENDA_STUDENT_SUBTYPE_IDS = new Set([
    'profesor_a_particular',
    'academia_instituto',
    'entrenador_a_personal',
]);

/**
 * Label de persona en CRM según el subtype del negocio.
 * Default: cliente (abogado, coach, estética, etc.).
 */
export function resolveAgendaClientNoun(operatorSubtype?: string | null): AgendaClientNoun {
    const id = operatorSubtype?.trim() || '';
    if (!id || id === 'other') return 'cliente';
    if (AGENDA_PATIENT_SUBTYPE_IDS.has(id)) return 'paciente';
    if (AGENDA_STUDENT_SUBTYPE_IDS.has(id)) return 'alumno';
    return 'cliente';
}
