import { and, asc, desc, eq, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { messageEntries, messageThreads } from '../../db/schema.js';
import { mapMessageEntryRow, mapMessageThreadRow } from './row-mappers.js';
import { formatAgo, publicSectionLabel } from '../../lib/format-relative.js';
import type { BoostSection } from '../../lib/domain-types.js';
import { resolveMessageThreadListingDisplay } from './message-thread-context.js';
import type { MessageServiceDeps } from './service.js';

export function createMessageServiceDeps(input: {
    listingsById: Map<string, {
        id: string;
        title: string;
        href: string;
        section: string;
        price: unknown;
        location?: string | null;
    }>;
    usersById: Map<string, { id: string; name: string; email: string }>;
}): MessageServiceDeps {
    return {
        db,
        eq,
        and,
        or,
        desc,
        asc,
        tables: { messageThreads, messageEntries },
        usersById: input.usersById,
        listingsById: input.listingsById,
        formatAgo,
        publicSectionLabel: (section) => publicSectionLabel(section as BoostSection),
        resolveThreadListingDisplay: (thread) =>
            resolveMessageThreadListingDisplay(thread, input.listingsById, (section) => publicSectionLabel(section as BoostSection)),
        mapMessageThreadRow,
        mapMessageEntryRow,
    };
}

export function getMinimalMessageServiceDeps(): MessageServiceDeps {
    return createMessageServiceDeps({
        listingsById: new Map(),
        usersById: new Map(),
    });
}
