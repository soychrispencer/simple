'use client';

import { IconCheck, IconX } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelStatusBadge } from '@simple/ui';
import type { Invitation } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import { EmptyBlock, formatDate } from './shared';

export function InvitationsView({ invitations, refresh }: { invitations: Invitation[]; refresh: () => Promise<void> }) {
    async function respond(id: string, status: 'accepted' | 'rejected') {
        await serenatasApi.respondInvitation(id, status);
        await refresh();
    }

    return (
        <PanelCard>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Invitaciones</h2>
            <div className="mt-4 grid gap-3">
                {invitations.length === 0 ? <EmptyBlock title="Sin invitaciones" description="Cuando un coordinador te invite, aparecerá aquí." /> : invitations.map((item) => (
                    <div key={item.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-medium" style={{ color: 'var(--fg)' }}>{item.groupName}</p>
                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{formatDate(item.groupDate)} · {item.instrument ?? 'Instrumento por definir'}</p>
                                {item.message ? <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.message}</p> : null}
                            </div>
                            <PanelStatusBadge tone={item.status === 'accepted' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'} label={item.status} />
                        </div>
                        {item.status === 'invited' ? (
                            <div className="mt-4 flex gap-2">
                                <PanelButton onClick={() => void respond(item.id, 'accepted')}><IconCheck size={16} /> Aceptar</PanelButton>
                                <PanelButton variant="secondary" onClick={() => void respond(item.id, 'rejected')}><IconX size={16} /> Rechazar</PanelButton>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </PanelCard>
    );
}
