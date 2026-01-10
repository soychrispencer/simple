'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@simple/ui';

import { approveBrand, rejectBrand } from '@/app/actions/catalogAdmin';

type Props = {
	id: string;
	name: string;
	createdBy?: string | null;
};

export default function PendingBrandRow({ id, name, createdBy }: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);
	const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

	type ActionResult =
		| { ok: true; notified: boolean; notifiedUserId?: string | null; notificationError?: string | null; notificationSkippedReason?: string | null }
		| { ok: false; error: string };

	const run = (fn: (brandId: string) => Promise<ActionResult>) => {
		setMessage(null);
		setStatus('idle');
		startTransition(async () => {
			const result = await fn(id);
			if (result.ok) {
				setStatus('ok');
				if (result.notified) {
					setMessage(`Listo. Notificación enviada a ${result.notifiedUserId ?? 'usuario'}.`);
				} else {
					const reason = result.notificationSkippedReason
						? ` (${result.notificationSkippedReason})`
						: result.notificationError
							? ` (error: ${result.notificationError})`
							: '';
					setMessage(`Listo, pero no se envió notificación${reason}.`);
				}
				router.refresh();
			} else {
				setStatus('error');
				setMessage(result.error);
			}
		});
	};

	return (
		<div className="border-b border-black/5 dark:border-white/10 pb-2">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="min-w-[260px]">
					<div className="font-medium text-lighttext dark:text-darktext">{name}</div>
					<div className="text-[11px] text-lighttext/70 dark:text-darktext/70">{id}</div>
					<div className="text-[11px] text-lighttext/60 dark:text-darktext/60">
						Solicitante: {createdBy ?? '—'}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button size="sm" variant="primary" type="button" disabled={pending} onClick={() => run(approveBrand)}>
						{pending ? '...' : 'Aprobar'}
					</Button>
					<Button size="sm" variant="ghost" type="button" disabled={pending} onClick={() => run(rejectBrand)}>
						{pending ? '...' : 'Rechazar'}
					</Button>
				</div>
			</div>
			{message ? (
				<div className={`mt-2 text-[11px] ${status === 'error' ? 'text-[var(--color-danger)]' : 'text-lighttext/70 dark:text-darktext/70'}`.trim()}>
					{message}
				</div>
			) : null}
		</div>
	);
}
