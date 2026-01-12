'use client';

import React from 'react';
import { Button, Input, Select, Textarea, useToast } from '@simple/ui';

type LeadRow = {
	id: string;
	created_at: string;
	status: string;
	source: string;
	reference_code: string | null;
	user_id?: string | null;
	owner_name: string | null;
	owner_email: string | null;
	owner_phone: string | null;
	owner_city: string | null;
	listing_id: string | null;
	listing?:
		| {
				id?: string;
				title?: string | null;
				status?: string | null;
				published_at?: string | null;
				price?: number | null;
				currency?: string | null;
				listings_vehicles?:
					| Array<{
							year?: number | null;
							mileage?: number | null;
							vehicle_types?: Array<{ slug?: string | null; name?: string | null }> | null;
							brands?: Array<{ name?: string | null }> | null;
							models?: Array<{ name?: string | null }> | null;
						}>
					| null;
				images?: Array<{ url?: string | null; is_primary?: boolean | null; position?: number | null }> | null;
		  }
		| null;
	vehicle_type?: string | null;
	vehicle_brand?: string | null;
	vehicle_model?: string | null;
	vehicle_year?: number | null;
	vehicle_mileage_km?: number | null;
	desired_price: number | null;
	notes?: string | null;
	admin_notes: string | null;
	contacted_at: string | null;
};

const STATUS_OPTIONS = [
	{ value: '', label: 'Todos' },
	{ value: 'new', label: 'Nuevo' },
	{ value: 'contacted', label: 'Contactado' },
	{ value: 'in_progress', label: 'En gestión' },
	{ value: 'sold', label: 'Vendido' },
	{ value: 'discarded', label: 'Descartado' },
];

export default function VentaAsistidaLeadsClient() {
	const { addToast } = useToast();

	const autosPublicBaseUrl = String(process.env.NEXT_PUBLIC_SIMPLEAUTOS_PUBLIC_URL || '').replace(/\/$/, '');

	const [status, setStatus] = React.useState('');
	const [q, setQ] = React.useState('');
	const [loading, setLoading] = React.useState(false);
	const [rows, setRows] = React.useState<LeadRow[]>([]);

	const [selected, setSelected] = React.useState<LeadRow | null>(null);
	const [editStatus, setEditStatus] = React.useState('');
	const [editNotes, setEditNotes] = React.useState('');
	const [saving, setSaving] = React.useState(false);

	const load = React.useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (status) params.set('status', status);
			if (q.trim()) params.set('q', q.trim());
			params.set('limit', '50');

			const res = await fetch(`/api/admin/venta-asistida/requests?${params.toString()}`, { cache: 'no-store' });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				addToast((data as any)?.error || 'No se pudo cargar.', { type: 'error' });
				return;
			}
			setRows(((data as any)?.data || []) as LeadRow[]);
		} finally {
			setLoading(false);
		}
	}, [addToast, q, status]);

	React.useEffect(() => {
		void load();
	}, [load]);

	const openRow = (row: LeadRow) => {
		setSelected(row);
		setEditStatus(row.status || 'new');
		setEditNotes(String(row.admin_notes || ''));
	};

	const vehicleSummary = (row: LeadRow) => {
		const listingVehicle = row.listing?.listings_vehicles?.[0];
		const brand =
			row.vehicle_brand ||
			listingVehicle?.brands?.[0]?.name ||
			'';
		const model =
			row.vehicle_model ||
			listingVehicle?.models?.[0]?.name ||
			'';
		const year =
			row.vehicle_year != null
				? String(row.vehicle_year)
				: listingVehicle?.year != null
					? String(listingVehicle.year)
					: '';
		const parts = [brand, model, year].map((v) => String(v).trim()).filter(Boolean);
		return parts.length ? parts.join(' ') : '-';
	};

	const mileageValue = (row: LeadRow) => {
		if (row.vehicle_mileage_km != null) return row.vehicle_mileage_km;
		const listingVehicle = row.listing?.listings_vehicles?.[0];
		return listingVehicle?.mileage ?? null;
	};

	const save = async () => {
		if (!selected) return;

		setSaving(true);
		try {
			const res = await fetch(`/api/admin/venta-asistida/requests/${selected.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					status: editStatus,
					adminNotes: editNotes,
					contactedAt: editStatus === 'contacted' ? new Date().toISOString() : undefined,
				}),
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				addToast((data as any)?.error || 'No se pudo guardar.', { type: 'error' });
				return;
			}

			addToast('Actualizado.', { type: 'success' });
			setSelected(null);
			await load();
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<div className="card-surface shadow-card p-6 rounded-3xl">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<Select label="Estado" value={status} onChange={(v) => setStatus(String(v || ''))} options={STATUS_OPTIONS} />
					<Input
						label="Buscar"
						value={q}
						onChange={(e) => setQ(String(e.target.value))}
						placeholder="Nombre, teléfono, email o código..."
					/>
					<div className="flex items-end">
						<Button variant="outline" size="md" onClick={() => void load()} disabled={loading}>
							{loading ? 'Cargando...' : 'Actualizar'}
						</Button>
					</div>
				</div>

				<div className="mt-5 overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="text-left text-lighttext/70 dark:text-darktext/70">
							<tr>
								<th className="py-2 pr-3">Fecha</th>
								<th className="py-2 pr-3">Código</th>
								<th className="py-2 pr-3">Publicación / Vehículo</th>
								<th className="py-2 pr-3">Nombre</th>
								<th className="py-2 pr-3">Teléfono</th>
								<th className="py-2 pr-3">Estado</th>
								<th className="py-2 pr-3">Acción</th>
							</tr>
						</thead>
						<tbody className="text-lighttext dark:text-darktext">
							{rows.length === 0 && (
								<tr>
									<td colSpan={7} className="py-6 text-lighttext/70 dark:text-darktext/70">
										{loading ? 'Cargando...' : 'Sin resultados'}
									</td>
								</tr>
							)}

							{rows.map((r) => (
								<tr key={r.id} className="border-t border-border/60">
									<td className="py-3 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
									<td className="py-3 pr-3 whitespace-nowrap">{r.reference_code || '-'}</td>
									<td className="py-3 pr-3">
										{r.listing?.id ? (
											<a
												href={`${autosPublicBaseUrl || ''}/vehiculo/${String(r.listing.id)}`}
												target="_blank"
												rel="noreferrer"
												className="font-medium underline underline-offset-4"
												aria-label="Abrir publicación pública"
											>
												{r.listing?.title || 'Ver publicación'}
											</a>
										) : (
											<div className="font-medium">{r.listing?.title || (r.listing_id ? 'Con publicación' : '-')}</div>
										)}
										<div className="text-xs text-lighttext/60 dark:text-darktext/60">{vehicleSummary(r)}</div>
									</td>
									<td className="py-3 pr-3 whitespace-nowrap">{r.owner_name || '-'}</td>
									<td className="py-3 pr-3 whitespace-nowrap">{r.owner_phone || '-'}</td>
									<td className="py-3 pr-3 whitespace-nowrap">{r.status}</td>
									<td className="py-3 pr-3">
										<Button variant="outline" size="sm" onClick={() => openRow(r)}>
											Ver / editar
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{selected && (
				<div className="mt-6 card-surface shadow-card p-6 rounded-3xl">
					<div className="flex items-start justify-between gap-4">
						<div>
							<div className="text-base font-semibold text-lighttext dark:text-darktext">
								{selected.reference_code || '(sin código)'} · {selected.owner_name || '(sin nombre)'}
							</div>
							<div className="mt-1 text-sm text-lighttext/70 dark:text-darktext/70">
								{selected.owner_phone || '-'} · {selected.owner_email || '-'} · {selected.owner_city || '-'}
							</div>
							{selected.user_id ? (
								<div className="mt-1 text-xs text-lighttext/60 dark:text-darktext/60">Usuario registrado: {selected.user_id}</div>
							) : null}
						</div>
						<Button variant="outline" size="sm" onClick={() => setSelected(null)}>
							Cerrar
						</Button>
					</div>

					<div className="mt-4 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-xs text-lighttext/60 dark:text-darktext/60">Publicación</div>
								<div className="mt-1 text-sm text-lighttext dark:text-darktext">
									{selected.listing?.id ? (
										<a
											href={`${autosPublicBaseUrl || ''}/vehiculo/${String(selected.listing.id)}`}
											target="_blank"
											rel="noreferrer"
											className="font-medium underline underline-offset-4"
										>
											{selected.listing?.title || 'Ver publicación pública'}
										</a>
									) : (
										<span className="font-medium">{selected.listing?.title || (selected.listing_id ? `ID: ${selected.listing_id}` : 'Sin publicación')}</span>
									)}
								</div>
								<div className="mt-1 text-xs text-lighttext/60 dark:text-darktext/60">
									{selected.listing?.status ? `Estado: ${String(selected.listing.status)}` : ''}
									{selected.listing?.published_at ? ` · Publicada: ${new Date(String(selected.listing.published_at)).toLocaleDateString()}` : ''}
									{selected.listing?.price != null ? ` · Precio: $${Number(selected.listing.price).toLocaleString('es-CL')}` : ''}
								</div>
							</div>
							{selected.listing?.id ? (
								<div className="shrink-0 flex flex-col items-end gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											const listingId = String(selected.listing?.id || '');
											if (!listingId) return;
											navigator.clipboard.writeText(listingId).catch(() => {});
										}}
									>
										Copiar ID
									</Button>
									<div className="text-[11px] text-lighttext/60 dark:text-darktext/60">ID: {String(selected.listing.id)}</div>
								</div>
							) : null}
						</div>

						<div className="mt-3">
							<div className="text-xs text-lighttext/60 dark:text-darktext/60">Vehículo</div>
							<div className="mt-1 text-sm text-lighttext dark:text-darktext font-medium">{vehicleSummary(selected)}</div>
							<div className="mt-1 text-xs text-lighttext/60 dark:text-darktext/60">
								{mileageValue(selected) != null ? `${mileageValue(selected)} km` : ''}
								{selected.desired_price != null ? ` · Precio deseado: $${Number(selected.desired_price).toLocaleString('es-CL')}` : ''}
							</div>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
						<Select
							label="Estado"
							value={editStatus}
							onChange={(v) => setEditStatus(String(v || ''))}
							options={STATUS_OPTIONS.filter((o) => o.value !== '')}
						/>
						<Input label="Fuente" value={String(selected.source || '')} onChange={() => {}} disabled />
					</div>

					{selected.notes ? (
						<div className="mt-3">
							<Textarea label="Notas del cliente" value={String(selected.notes || '')} onChange={() => {}} disabled />
						</div>
					) : null}

					<div className="mt-3">
						<Textarea
							label="Notas internas"
							value={editNotes}
							onChange={(e) => setEditNotes(String(e.target.value))}
							placeholder="Resumen, próximos pasos, observaciones..."
						/>
					</div>

					<div className="mt-4 flex justify-end">
						<Button variant="primary" size="md" onClick={() => void save()} disabled={saving}>
							{saving ? 'Guardando...' : 'Guardar'}
						</Button>
					</div>
				</div>
			)}
		</>
	);
}
