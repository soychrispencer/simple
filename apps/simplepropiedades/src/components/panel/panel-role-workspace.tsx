'use client';

import Link from 'next/link';
import { IconArrowUpRight } from '@tabler/icons-react';
import { resolveOperatorDisplayLabel, type AccountWorkspaceSettings, type MarketplaceOperatorAnalytics } from '@simple/utils';
import {
    getPanelButtonClassName,
    getPanelButtonStyle,
    PanelCard,
} from '@simple/ui/panel';

type WorkspaceExperience = {
    roleLabel: string;
    title: string;
    description: string;
    primaryActionLabel: string;
    primaryActionHref?: string;
};

const SUBTYPE_EXPERIENCES: Record<string, WorkspaceExperience> = {
    broker: {
        roleLabel: 'Corredor independiente',
        title: 'Tu operación de corretaje, en un solo lugar',
        description: 'Publica tu cartera, atiende consultas y da seguimiento a cada oportunidad desde el mismo espacio.',
        primaryActionLabel: 'Publicar propiedad',
    },
    advisor: {
        roleLabel: 'Asesor inmobiliario',
        title: 'Tu actividad inmobiliaria, lista para crecer',
        description: 'Ordena tus publicaciones, conversaciones y próximos pasos desde un espacio de trabajo.',
        primaryActionLabel: 'Publicar propiedad',
    },
    appraiser: {
        roleLabel: 'Tasador',
        title: 'Haz visible tu experiencia inmobiliaria',
        description: 'Presenta tu trabajo y organiza las consultas que recibes en el mismo espacio.',
        primaryActionLabel: 'Completar perfil profesional',
        primaryActionHref: '/panel/mi-negocio',
    },
    auctioneer: {
        roleLabel: 'Martillero y remates',
        title: 'Un espacio profesional para tus oportunidades inmobiliarias',
        description: 'Publica propiedades, presenta tu perfil y sigue el interés que despiertan tus avisos.',
        primaryActionLabel: 'Publicar propiedad',
    },
    rental_administrator: {
        roleLabel: 'Administrador independiente',
        title: 'Organiza las propiedades que administras',
        description: 'Reúne sus publicaciones y consultas para dar continuidad a cada gestión.',
        primaryActionLabel: 'Publicar propiedad',
    },
    property_manager: {
        roleLabel: 'Gestora de propiedades',
        title: 'Organiza las propiedades que administras',
        description: 'Reúne sus publicaciones y consultas para dar continuidad a cada gestión.',
        primaryActionLabel: 'Publicar propiedad',
    },
    real_estate_agency: {
        roleLabel: 'Inmobiliaria',
        title: 'Coordina la operación de tu inmobiliaria',
        description: 'Publicaciones, equipo y contactos comparten el mismo contexto para que cada oportunidad avance.',
        primaryActionLabel: 'Publicar propiedad',
    },
    developer: {
        roleLabel: 'Desarrolladora inmobiliaria',
        title: 'Cada proyecto, con sus interesados conectados',
        description: 'Presenta tus proyectos y da seguimiento a las consultas que genera cada uno.',
        primaryActionLabel: 'Publicar proyecto',
    },
    coworking: {
        roleLabel: 'Espacios flexibles',
        title: 'Administra y presenta tus espacios',
        description: 'Publica tus espacios y organiza las consultas que recibes desde el mismo panel.',
        primaryActionLabel: 'Publicar espacio',
    },
    owner: {
        roleLabel: 'Propietario',
        title: 'Publica tus propiedades y atiende a cada interesado',
        description: 'Mantén tus avisos y el interés de las personas en un mismo espacio.',
        primaryActionLabel: 'Publicar propiedad',
    },
    landlord: {
        roleLabel: 'Arrendador',
        title: 'Un espacio simple para tus propiedades en arriendo',
        description: 'Publica tus inmuebles y revisa las consultas y conversaciones asociadas a cada aviso.',
        primaryActionLabel: 'Publicar propiedad',
    },
};

const TIER_EXPERIENCES: Record<string, WorkspaceExperience> = {
    individual: {
        roleLabel: 'Propietario o vendedor',
        title: 'Tus propiedades, publicaciones y consultas en un solo lugar',
        description: 'Publica, presenta tu perfil y revisa el interés que genera cada propiedad.',
        primaryActionLabel: 'Publicar propiedad',
    },
    independent: {
        roleLabel: 'Profesional inmobiliario',
        title: 'Tu actividad inmobiliaria, en un espacio profesional',
        description: 'Presenta tu marca, administra tus publicaciones y atiende las consultas desde tu panel.',
        primaryActionLabel: 'Publicar propiedad',
    },
    company: {
        roleLabel: 'Empresa inmobiliaria',
        title: 'Tu operación inmobiliaria, coordinada en un solo espacio',
        description: 'Publicaciones, contactos y equipo comparten el mismo contexto para dar continuidad a cada oportunidad.',
        primaryActionLabel: 'Publicar propiedad',
    },
};

function resolveExperience(
    analytics: MarketplaceOperatorAnalytics | null,
    workspace?: AccountWorkspaceSettings | null,
    memberRole?: string | null,
): WorkspaceExperience {
    if (memberRole === 'agent') {
        return {
            roleLabel: 'Agente de equipo',
            title: 'Tu cartera de trabajo',
            description: 'Revisa tus propiedades asignadas, atiende conversaciones y lleva el seguimiento de cada contacto.',
            primaryActionLabel: 'Publicar propiedad',
        };
    }

    const operator = workspace
        ? {
            ...(analytics?.operator ?? {
                displayName: '',
                isPublished: false,
                publicUrl: null,
                followers: 0,
                operationTags: [],
            }),
            accountKind: workspace.accountKind,
            operatorSubtype: workspace.operatorSubtype,
            operatorLabel: resolveOperatorDisplayLabel(
                'propiedades',
                workspace.accountKind,
                workspace.operatorSubtype,
                workspace.operatorSubtypeCustom,
            ),
        }
        : analytics?.operator;
    if (!operator) {
        return {
            roleLabel: 'Tu espacio inmobiliario',
            title: 'Publica y gestiona tu actividad inmobiliaria desde un solo panel',
            description: 'Administra tus propiedades, presenta tu perfil y revisa las consultas que recibes.',
            primaryActionLabel: 'Publicar propiedad',
        };
    }

    const subtypeExperience = operator.operatorSubtype
        ? SUBTYPE_EXPERIENCES[operator.operatorSubtype]
        : undefined;
    const tierExperience = TIER_EXPERIENCES[operator.accountKind];

    return {
        ...(tierExperience ?? TIER_EXPERIENCES.individual),
        ...(subtypeExperience ?? {}),
        roleLabel: subtypeExperience?.roleLabel ?? operator.operatorLabel,
    };
}

export function PanelRoleWorkspace({
    analytics,
    workspace,
    memberRole,
}: {
    analytics: MarketplaceOperatorAnalytics | null;
    workspace?: AccountWorkspaceSettings | null;
    memberRole?: string | null;
}) {
    const experience = resolveExperience(analytics, workspace, memberRole);
    const accountKind = workspace?.accountKind ?? analytics?.operator?.accountKind;
    const operatorSubtype = workspace?.operatorSubtype ?? analytics?.operator?.operatorSubtype;
    const primaryActionHref = experience.primaryActionHref
        ?? (operatorSubtype === 'developer' ? '/panel/publicar?op=project' : '/panel/publicar');
    const workspaceLabel = memberRole === 'agent'
        ? 'Tu equipo'
        : !accountKind || accountKind === 'individual'
            ? 'Tu espacio Simple'
            : 'Espacio profesional';

    return (
        <PanelCard size="lg" className="overflow-hidden">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="max-w-3xl">
                    <p
                        className="text-xs font-semibold uppercase tracking-[0.14em]"
                        style={{ color: 'var(--accent)' }}
                    >
                        {workspaceLabel} · {experience.roleLabel}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: 'var(--fg)' }}>
                        {experience.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                        {experience.description}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={primaryActionHref}
                        className={getPanelButtonClassName()}
                        style={getPanelButtonStyle('primary')}
                    >
                        {experience.primaryActionLabel}
                        <IconArrowUpRight size={15} />
                    </Link>
                    <Link
                        href="/panel/contactos"
                        className={getPanelButtonClassName()}
                        style={getPanelButtonStyle('secondary')}
                    >
                        Ver contactos
                    </Link>
                    {memberRole !== 'agent' ? (
                        <Link
                            href="/panel/mi-negocio"
                            className={getPanelButtonClassName()}
                            style={getPanelButtonStyle('ghost')}
                        >
                            Mi negocio
                        </Link>
                    ) : null}
                </div>
            </div>
        </PanelCard>
    );
}
