import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    agendaAppointments,
    agendaProfessionalProfiles,
    agendaServices,
    serenatas,
    users,
} from '../../db/schema.js';
import type { MessageThreadRecord } from './row-mappers.js';

export type MessageThreadListingDisplay = {
    id: string;
    title: string;
    href: string;
    section: 'sale' | 'rent' | 'auction' | 'project';
    sectionLabel: string;
    price: string;
    location: string;
};

export async function resolveMessageThreadListingDisplay(
    thread: MessageThreadRecord,
    listingsById: Map<string, {
        id: string;
        title: string;
        href: string;
        section: string;
        price: unknown;
        location?: string | null;
    }>,
    publicSectionLabel: (section: unknown) => string,
): Promise<MessageThreadListingDisplay | null> {
    if (thread.listingId) {
        const listing = listingsById.get(thread.listingId);
        if (!listing) return null;
        return {
            id: listing.id,
            title: listing.title,
            href: listing.href,
            section: listing.section as MessageThreadListingDisplay['section'],
            sectionLabel: publicSectionLabel(listing.section),
            price: String(listing.price ?? ''),
            location: listing.location ?? '',
        };
    }

    if (thread.contextType === 'serenata' && thread.contextId) {
        const row = await db.query.serenatas.findFirst({
            where: eq(serenatas.id, thread.contextId),
        });
        if (!row) return null;
        const location = [row.comuna, row.region].filter(Boolean).join(', ') || row.address.slice(0, 80);
        const eventDate = row.eventDate.toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            timeZone: 'America/Santiago',
        });
        return {
            id: row.id,
            title: `Serenata para ${row.recipientName}`,
            href: `/panel/serenatas?serenata=${encodeURIComponent(row.id)}`,
            section: 'sale',
            sectionLabel: 'Serenata',
            price: row.price != null ? String(row.price) : '',
            location: `${eventDate}${location ? ` · ${location}` : ''}`,
        };
    }

    if (thread.contextType === 'agenda_appointment' && thread.contextId) {
        const row = await db.query.agendaAppointments.findFirst({
            where: eq(agendaAppointments.id, thread.contextId),
        });
        if (!row) return null;
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.id, row.professionalId),
        });
        let serviceName: string | null = null;
        if (row.serviceId) {
            const service = await db.query.agendaServices.findFirst({
                where: eq(agendaServices.id, row.serviceId),
            });
            serviceName = service?.name ?? null;
        }
        const startsLabel = row.startsAt.toLocaleString('es-CL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: profile?.timezone ?? 'America/Santiago',
        });
        return {
            id: row.id,
            title: `${serviceName ?? 'Cita'} — ${row.clientName}`,
            href: `/panel/agenda?appt=${encodeURIComponent(row.id)}`,
            section: 'sale',
            sectionLabel: 'Agenda',
            price: row.price != null ? String(row.price) : '',
            location: `${startsLabel}${profile?.displayName ? ` · ${profile.displayName}` : ''}`,
        };
    }

    return null;
}

export async function findUserIdByEmail(email: string | null | undefined): Promise<string | null> {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) return null;
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1);
    return rows[0]?.id ?? null;
}
