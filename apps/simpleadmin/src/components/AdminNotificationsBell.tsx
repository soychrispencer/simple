'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBell } from '@tabler/icons-react';
import { CircleButton } from '@simple/ui';

type CountsResponse = {
	counts: {
		catalog: {
			brandsPending: number;
			modelsPending: number;
		};
		reports?: {
			open: number;
		};
	};
};

type FeedItem = {
	type: 'brand' | 'model' | 'report';
	id: string;
	title: string;
	subtitle?: string;
	createdAt: string;
	href: string;
};

function safeNumber(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export default function AdminNotificationsBell() {
	const [open, setOpen] = useState(false);
	const [brandsPending, setBrandsPending] = useState(0);
	const [modelsPending, setModelsPending] = useState(0);
	const [reportsOpen, setReportsOpen] = useState(0);
	const [items, setItems] = useState<FeedItem[]>([]);
	const ref = useRef<HTMLDivElement>(null);

	const unreadCount = brandsPending + modelsPending + reportsOpen;

	useEffect(() => {
		let mounted = true;

		async function load() {
			try {
				const [countsRes, feedRes] = await Promise.all([
					fetch('/api/admin/notifications/counts', { cache: 'no-store' }),
					fetch('/api/admin/notifications/feed', { cache: 'no-store' }),
				]);
				if (!mounted) return;

				if (countsRes.ok) {
					const json = (await countsRes.json()) as Partial<CountsResponse>;
					setBrandsPending(safeNumber(json.counts?.catalog?.brandsPending));
					setModelsPending(safeNumber(json.counts?.catalog?.modelsPending));
					setReportsOpen(safeNumber(json.counts?.reports?.open));
				}

				if (feedRes.ok) {
					const json = (await feedRes.json()) as { items?: FeedItem[] };
					setItems(Array.isArray(json.items) ? json.items : []);
				}
			} catch {
				// ignore
			}
		}

		void load();
		const id = window.setInterval(load, 30_000);
		return () => {
			mounted = false;
			window.clearInterval(id);
		};
	}, []);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div ref={ref} className="relative flex items-center h-full">
			<CircleButton
				aria-label="Notificaciones"
				onClick={() => setOpen((state) => !state)}
				size={40}
				variant="default"
				className="relative"
			>
				<IconBell size={20} stroke={1} className="align-middle" />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 bg-[var(--color-danger)] text-[var(--color-on-primary)] text-xs rounded-full h-5 w-5 flex items-center justify-center">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</CircleButton>

			{open && (
				<div
					className="absolute right-0 top-full w-72 rounded-xl card-surface card-surface-raised border border-[var(--field-border)] shadow-card py-2 z-[9999]"
					style={{ marginTop: 0 }}
				>
					<div className="px-4 py-3 border-b border-lightborder/10 dark:border-darkborder/10">
						<p className="font-semibold text-lighttext dark:text-darktext">Pendientes</p>
						<p className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Moderación pendiente por módulo</p>
					</div>
					<div className="px-4 py-3 text-sm">
						<a
							href="/autos/brands"
							onClick={() => setOpen(false)}
							className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-[var(--field-bg)]"
						>
							<span className="text-lighttext/80 dark:text-darktext/80">Catálogo · Marcas</span>
							<span className="font-medium text-lighttext dark:text-darktext">{brandsPending}</span>
						</a>
						<a
							href="/autos/models"
							onClick={() => setOpen(false)}
							className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-[var(--field-bg)]"
						>
							<span className="text-lighttext/80 dark:text-darktext/80">Catálogo · Modelos</span>
							<span className="font-medium text-lighttext dark:text-darktext">{modelsPending}</span>
						</a>
						<a
							href="/autos/reports"
							onClick={() => setOpen(false)}
							className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-[var(--field-bg)]"
						>
							<span className="text-lighttext/80 dark:text-darktext/80">Reportes · Vehículos</span>
							<span className="font-medium text-lighttext dark:text-darktext">{reportsOpen}</span>
						</a>
					</div>

					<div className="px-4 pb-3">
						<div className="text-xs text-lighttext/60 dark:text-darktext/60 mb-2">Recientes</div>
						{items.length === 0 ? (
							<div className="text-sm text-lighttext/70 dark:text-darktext/70">Sin items recientes.</div>
						) : (
							<div className="space-y-1">
								{items.map((item) => (
									<a
										key={`${item.type}:${item.id}`}
										href={item.href}
										onClick={() => setOpen(false)}
										className="block rounded-lg px-2 py-2 hover:bg-[var(--field-bg)]"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="text-sm font-medium text-lighttext dark:text-darktext truncate">
													{item.title}
												</div>
												{item.subtitle ? (
													<div className="text-xs text-lighttext/70 dark:text-darktext/70 truncate">
														{item.subtitle}
													</div>
												) : null}
											</div>
											<span className="text-[11px] text-lighttext/60 dark:text-darktext/60 whitespace-nowrap">
												{new Date(item.createdAt).toLocaleDateString()}
											</span>
										</div>
									</a>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
