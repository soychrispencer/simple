import { Hono } from 'hono';
import { isKindValidForScope, resolveAddressBookScope } from '@simple/utils';
import type { AddressBookBusinessVertical, AddressBookScope } from '../../lib/domain-types.js';
import { AddressBookWriteAccessError } from '../accounts/address-book-service.js';

export type AddressBookRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
    getAddressBookEntries: (
        userId: string,
        scope?: AddressBookScope,
        vertical?: AddressBookBusinessVertical,
    ) => Promise<any[]>;
    canManageActiveAccountProfile: (userId: string) => Promise<boolean>;
    upsertAddressBookEntry: (userId: string, input: any, existingId?: string) => Promise<any[]>;
    deleteAddressBookEntry: (userId: string, addressId: string) => Promise<any[]>;
    schemas: {
        addressBookWriteSchema: any;
    };
};

function parseScopeParam(raw: string | undefined): AddressBookScope | undefined {
    if (raw === 'personal' || raw === 'business') return raw;
    return undefined;
}

function parseVerticalParam(raw: string | undefined): AddressBookBusinessVertical | undefined {
    if (raw === 'autos' || raw === 'propiedades' || raw === 'serenatas') return raw;
    return undefined;
}

function createAddressBookHandlers(deps: AddressBookRouterDeps) {
    const canManageBusinessAddress = (userId: string) =>
        deps.canManageActiveAccountProfile(userId);

    const getHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const scope = parseScopeParam(c.req.query('scope'));
        const vertical = parseVerticalParam(c.req.query('vertical'));
        if (scope === 'business' && c.req.query('vertical') && !vertical) {
            return c.json({ ok: false, error: 'Vertical inválida.' }, 400);
        }
        return c.json({ ok: true, items: await deps.getAddressBookEntries(user.id, scope, vertical) });
    };

    const postHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.addressBookWriteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const scope = resolveAddressBookScope(parsed.data.scope, parsed.data.kind);
        if (!isKindValidForScope(parsed.data.kind, scope)) {
            return c.json({ ok: false, error: 'El tipo de dirección no es compatible con el ámbito seleccionado.' }, 400);
        }
        if (scope === 'business' && !await canManageBusinessAddress(user.id)) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar sus direcciones comerciales.' }, 403);
        }

        if (!parsed.data.regionId || !parsed.data.communeId) {
            return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
        }

        try {
            const items = await deps.upsertAddressBookEntry(user.id, { ...parsed.data, scope });
            return c.json({ ok: true, items }, 201);
        } catch (error) {
            if (error instanceof AddressBookWriteAccessError) {
                return c.json({ ok: false, error: error.message }, error.status);
            }
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'No se pudo guardar la dirección.',
            }, 400);
        }
    };

    const patchHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const addressId = c.req.param('id') ?? '';
        const current = await deps.getAddressBookEntries(user.id);
        const existing = current.find((item: any) => item.id === addressId);
        if (!existing) {
            return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.addressBookWriteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const scope = resolveAddressBookScope(parsed.data.scope ?? existing.scope, parsed.data.kind);
        if (!isKindValidForScope(parsed.data.kind, scope)) {
            return c.json({ ok: false, error: 'El tipo de dirección no es compatible con el ámbito seleccionado.' }, 400);
        }
        if ((existing.scope === 'business' || scope === 'business') && !await canManageBusinessAddress(user.id)) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar sus direcciones comerciales.' }, 403);
        }

        if (!parsed.data.regionId || !parsed.data.communeId) {
            return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
        }

        try {
            const items = await deps.upsertAddressBookEntry(user.id, { ...parsed.data, scope }, addressId);
            return c.json({ ok: true, items });
        } catch (error) {
            if (error instanceof AddressBookWriteAccessError) {
                return c.json({ ok: false, error: error.message }, error.status);
            }
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'No se pudo guardar la dirección.',
            }, 400);
        }
    };

    const deleteHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const addressId = c.req.param('id') ?? '';
        const current = await deps.getAddressBookEntries(user.id);
        const existing = current.find((item: any) => item.id === addressId);
        if (!existing) {
            return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
        }
        if (existing.scope === 'business' && !await canManageBusinessAddress(user.id)) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede eliminar sus direcciones comerciales.' }, 403);
        }

        try {
            const items = await deps.deleteAddressBookEntry(user.id, addressId);
            return c.json({ ok: true, items });
        } catch (error) {
            if (error instanceof AddressBookWriteAccessError) {
                return c.json({ ok: false, error: error.message }, error.status);
            }
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'No se pudo eliminar la dirección.',
            }, 400);
        }
    };

    return { getHandler, postHandler, patchHandler, deleteHandler };
}

export function createAddressBookRouter(deps: AddressBookRouterDeps) {
    const app = new Hono();
    const { getHandler, postHandler, patchHandler, deleteHandler } = createAddressBookHandlers(deps);

    app.get('/', getHandler);
    app.post('/', postHandler);
    app.patch('/:id', patchHandler);
    app.delete('/:id', deleteHandler);

    return app;
}
