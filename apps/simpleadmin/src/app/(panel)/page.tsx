import { getStaffGate } from '@/lib/admin/auth';
import LoginCard from '@/components/LoginCard';
export default async function AdminHome() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return <LoginCard forbidden={gate.status === 'forbidden'} />;
	}

	return (
		<div className="p-6">
			<div className="max-w-5xl mx-auto">
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<div>
						<h1 className="text-xl font-semibold text-lighttext dark:text-darktext">Panel administrativo</h1>
						<p className="text-sm text-lighttext/70 dark:text-darktext/70">
							Accesos rápidos y módulos por vertical.
						</p>
					</div>
				</div>

				<div className="mt-6 card-surface shadow-card rounded-3xl p-5">
					<h2 className="text-base font-semibold text-lighttext dark:text-darktext">Control de usuarios</h2>
					<p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">Revisa usuarios registrados, plan activo y pagos.</p>
					<div className="mt-4">
						<a
							href="/users"
							className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm border bg-[var(--field-bg)] border-[var(--field-border)] text-lighttext dark:text-darktext"
						>
							Ver usuarios
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
