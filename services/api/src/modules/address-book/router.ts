import { Hono } from 'hono';

export type AddressBookRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
    getAddressBookEntries: (userId: string) => Promise<any[]>;
    upsertAddressBookEntry: (userId: string, input: any, existingId?: string) => Promise<any[]>;
    deleteAddressBookEntry: (userId: string, addressId: string) => Promise<any[]>;
    schemas: {
        addressBookWriteSchema: any;
    };
};

function createAddressBookHandlers(deps: AddressBookRouterDeps) {
    const getHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        return c.json({ ok: true, items: await deps.getAddressBookEntries(user.id) });
    };

    const postHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.addressBookWriteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        if (!parsed.data.regionId || !parsed.data.communeId) {
            return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
        }

        const items = await deps.upsertAddressBookEntry(user.id, parsed.data);
        return c.json({ ok: true, items }, 201);
    };

    const patchHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const addressId = c.req.param('id') ?? '';
        const current = await deps.getAddressBookEntries(user.id);
        if (!current.some((item: any) => item.id === addressId)) {
            return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.addressBookWriteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);
        if (!parsed.data.regionId || !parsed.data.communeId) {
            return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
        }

        const items = await deps.upsertAddressBookEntry(user.id, parsed.data, addressId);
        return c.json({ ok: true, items });
    };

    const deleteHandler = async (c: any) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const addressId = c.req.param('id') ?? '';
        const current = await deps.getAddressBookEntries(user.id);
        if (!current.some((item: any) => item.id === addressId)) {
            return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
        }

        const items = await deps.deleteAddressBookEntry(user.id, addressId);
        return c.json({ ok: true, items });
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
