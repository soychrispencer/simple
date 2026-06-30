import type { AppMode } from '@/lib/app-mode';

export function suspendedAccountNotice(mode: AppMode): string {
    if (mode === 'work') {
        return 'Tu cuenta está suspendida. Puedes revisar tu perfil, pero no podrás responder invitaciones ni gestionar serenatas hasta que se reactive.';
    }
    return 'Tu cuenta está suspendida. Puedes revisar tu perfil, pero no podrás contratar serenatas hasta que se reactive.';
}
