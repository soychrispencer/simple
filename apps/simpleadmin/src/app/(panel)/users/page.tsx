import { requireStaffUser } from '@/lib/admin/auth';
import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import { PanelPageLayout } from '@simple/ui';

type UserRow = {
	id: string;
	email: string | null;
	created_at: string | null;
	last_sign_in_at: string | null;
};

type SubscriptionRow = {
	id: string;
	user_id: string;
	status: string | null;
	current_period_end: string | null;
	verticals?: { key?: string | null } | null;
	subscription_plans?: { plan_key?: string | null; name?: string | null } | null;
};

type PaymentRow = {
	user_id: string | null;
	amount: number;
	currency: string | null;
	status: string;
	created_at: string;
	external_id: string | null;
	description: string | null;
};

function formatDate(value: string | null): string {
	if (!value) return '-';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '-';
	return new Intl.DateTimeFormat('es-CL', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(d);
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
	if (typeof amount !== 'number' || !Number.isFinite(amount)) return '-';
	const curr = currency || 'CLP';
	try {
		return new Intl.NumberFormat('es-CL', {
			style: 'currency',
			currency: curr,
			maximumFractionDigits: 0,
		}).format(amount);
	} catch {
		return `${amount} ${curr}`;
	}
}


function planLabel(subs: SubscriptionRow[] | undefined): string {
	if (!subs || subs.length === 0) return 'Free';
	const parts = subs
		.map((s) => {
			const vertical = (s.verticals?.key || '—').toString();
			const key = s.subscription_plans?.plan_key;
			const name = s.subscription_plans?.name;
			const label = (name || key || 'Free').toString();
			return `${vertical}: ${label}`;
		})
		.sort((a, b) => a.localeCompare(b));
	return parts.join(' · ');
}

function statusPill(status: string): { label: string; className: string } {
	const s = status.toLowerCase();
	if (s === 'approved' || s === 'paid' || s === 'active') {
		return { label: status, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' };
	}
	if (s === 'pending' || s === 'in_process') {
		return { label: status, className: 'bg-amber-500/15 text-amber-700 dark:text-amber-200' };
	}
	if (s === 'rejected' || s === 'cancelled' || s === 'canceled' || s === 'failure' || s === 'failed') {
		return { label: status, className: 'bg-rose-500/15 text-rose-700 dark:text-rose-200' };
	}
	return { label: status, className: 'bg-black/10 dark:bg-white/10 text-lighttext dark:text-darktext' };
}

export default async function AdminUsersPage() {
	await requireStaffUser();

	const admin = createAdminServerClient();

	// 1) Listar usuarios de Supabase Auth (máximo 200 por ahora)
	const listRes = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
	const users: UserRow[] = (listRes.data?.users || []).map((u: any) => ({
		id: u.id,
		email: u.email ?? null,
		created_at: u.created_at ?? null,
		last_sign_in_at: u.last_sign_in_at ?? null,
	}));

	// Ordenar más nuevos primero
	users.sort((a, b) => ((a.created_at || '') < (b.created_at || '') ? 1 : -1));

	const userIds = users.map((u) => u.id);

	// 2) Suscripciones activas por usuario
	const subsRes = userIds.length
		? await admin
				.from('subscriptions')
				.select('id,user_id,status,current_period_end,verticals(key),subscription_plans(plan_key,name)')
				.in('user_id', userIds)
				.eq('status', 'active')
		: { data: [], error: null };

	if ((subsRes as any).error) {
		throw new Error(`Error cargando subscriptions: ${(subsRes as any).error.message}`);
	}

	const subsByUser = new Map<string, SubscriptionRow[]>();
	for (const s of ((subsRes as any).data || []) as any[]) {
		const existing = subsByUser.get(s.user_id) || [];
		existing.push(s as SubscriptionRow);
		subsByUser.set(s.user_id, existing);
	}

	// 3) Pagos (últimos 1000, luego agrupamos por usuario para sacar el último y si hubo fallos)
	const paysRes = userIds.length
		? await admin
				.from('payments')
				.select('user_id,amount,currency,status,created_at,external_id,description')
				.in('user_id', userIds)
				.order('created_at', { ascending: false })
				.limit(1000)
		: { data: [], error: null };

	if ((paysRes as any).error) {
		throw new Error(`Error cargando payments: ${(paysRes as any).error.message}`);
	}

	const paymentsByUser = new Map<string, PaymentRow[]>();
	for (const p of ((paysRes as any).data || []) as any[]) {
		if (!p.user_id) continue;
		const arr = paymentsByUser.get(p.user_id) || [];
		arr.push(p as PaymentRow);
		paymentsByUser.set(p.user_id, arr);
	}

	return (
		<div className="p-6">
			<div className="max-w-6xl mx-auto">
				<PanelPageLayout
					header={{
						title: 'Usuarios y suscripciones',
						description: 'Vista administrativa: plan activo y últimos pagos.',
						actions: (
							<a href="/" className="text-sm text-lighttext/80 dark:text-darktext/80 hover:underline">
								Volver
							</a>
						),
					}}
				>
					<div className="card-surface shadow-card rounded-3xl p-5">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<h2 className="text-base font-semibold text-lighttext dark:text-darktext">Resumen</h2>
							<p className="text-sm text-lighttext/70 dark:text-darktext/70">Total: {users.length}</p>
						</div>

						<div className="mt-4 overflow-x-auto">
							<table className="min-w-full text-sm">
								<thead>
									<tr className="text-left text-lighttext/70 dark:text-darktext/70 border-b border-black/10 dark:border-white/15">
										<th className="py-2 pr-4">Usuario</th>
										<th className="py-2 pr-4">Plan</th>
										<th className="py-2 pr-4">Renueva</th>
										<th className="py-2 pr-4">Último pago</th>
										<th className="py-2 pr-4">Estado</th>
										<th className="py-2 pr-4">Alertas</th>
									</tr>
								</thead>
								<tbody>
									{users.map((u) => {
										const subs = subsByUser.get(u.id) || [];
										const primarySub = subs[0];
										const payments = paymentsByUser.get(u.id) || [];
										const lastPayment = payments[0];
										const nonApprovedCount = payments.filter((p) => (p.status || '').toLowerCase() !== 'approved').length;

										const renewal = primarySub?.current_period_end || null;
										const isExpired = renewal ? new Date(renewal).getTime() < Date.now() : false;

										const alerts: string[] = [];
										if (!subs.length) alerts.push('Sin suscripción activa');
										if (primarySub && isExpired) alerts.push('Suscripción vencida');
										if (lastPayment && (lastPayment.status || '').toLowerCase() !== 'approved') alerts.push('Último pago no aprobado');
										if (nonApprovedCount > 0) alerts.push(`${nonApprovedCount} pago(s) no aprobados`);

										const plan = planLabel(subs);
										const payStatus = lastPayment?.status ? statusPill(lastPayment.status) : null;

										return (
											<tr key={u.id} className="border-b border-black/5 dark:border-white/10 align-top">
												<td className="py-3 pr-4">
													<div className="font-medium text-lighttext dark:text-darktext">{u.email || '(sin email)'}</div>
													<div className="text-xs text-lighttext/60 dark:text-darktext/60">{u.id}</div>
													<div className="text-xs text-lighttext/60 dark:text-darktext/60">Alta: {formatDate(u.created_at)}</div>
												</td>
												<td className="py-3 pr-4">
													<div className="font-medium text-lighttext dark:text-darktext">{plan}</div>
														<div className="text-xs text-lighttext/60 dark:text-darktext/60">{primarySub?.status || 'free'}</div>
												</td>
												<td className="py-3 pr-4">
													<div className="text-lighttext dark:text-darktext">{formatDate(renewal)}</div>
												</td>
												<td className="py-3 pr-4">
													{lastPayment ? (
														<>
															<div className="text-lighttext dark:text-darktext">{formatMoney(lastPayment.amount, lastPayment.currency)}</div>
															<div className="text-xs text-lighttext/60 dark:text-darktext/60">{formatDate(lastPayment.created_at)}</div>
															<div className="text-xs text-lighttext/60 dark:text-darktext/60">{lastPayment.description || 'Pago'}</div>
														</>
													) : (
														<div className="text-lighttext/70 dark:text-darktext/70">-</div>
													)}
												</td>
												<td className="py-3 pr-4">
													{payStatus ? (
														<span className={`inline-flex px-2 py-1 rounded-full text-xs ${payStatus.className}`}>{payStatus.label}</span>
													) : (
														<span className="inline-flex px-2 py-1 rounded-full text-xs bg-black/10 dark:bg-white/10 text-lighttext dark:text-darktext">-</span>
													)}
												</td>
												<td className="py-3 pr-4">
													{alerts.length ? (
														<div className="text-xs text-rose-700 dark:text-rose-200">{alerts.join(' · ')}</div>
													) : (
														<div className="text-xs text-lighttext/60 dark:text-darktext/60">OK</div>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<p className="mt-4 text-xs text-lighttext/60 dark:text-darktext/60">
							Nota: esta vista usa Service Role en el servidor. No expongas estos datos en cliente.
						</p>
					</div>
				</PanelPageLayout>
			</div>
		</div>
	);
}

