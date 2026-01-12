'use client';

import { Button } from '@simple/ui';
import { usePathname } from 'next/navigation';

type Tab = {
	label: string;
	href: string;
	match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
	{ label: 'Resumen', href: '/autos', match: (p) => p === '/autos' },
	{ label: 'Marcas', href: '/autos/brands', match: (p) => p === '/autos/brands' },
	{ label: 'Modelos', href: '/autos/models', match: (p) => p === '/autos/models' },
	{ label: 'Reportes', href: '/autos/reports', match: (p) => p === '/autos/reports' },
	{ label: 'Venta asistida', href: '/autos/venta-asistida', match: (p) => p === '/autos/venta-asistida' },
];

export default function AutosHeaderTabs() {
	const pathname = usePathname() ?? '';

	return (
		<nav className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Secciones">
			{TABS.map((tab) => {
				const active = tab.match(pathname);
				return (
					<Button
						key={tab.href}
						asChild
						variant={active ? 'primary' : 'neutral'}
						size="sm"
						shape="pill"
					>
						<a href={tab.href} role="tab" aria-current={active ? 'page' : undefined}>
							{tab.label}
						</a>
					</Button>
				);
			})}
		</nav>
	);
}
