'use client';

import { Button } from '@simple/ui';

type VerticalTab = {
	key: 'autos' | 'properties' | 'stores' | 'food';
	label: string;
	href: string;
};

const TABS: VerticalTab[] = [
	{ key: 'autos', label: 'SimpleAutos', href: '/autos' },
	{ key: 'properties', label: 'SimplePropiedades', href: '/properties' },
	{ key: 'stores', label: 'SimpleTiendas', href: '/stores' },
	{ key: 'food', label: 'SimpleFood', href: '/food' },
];

export default function AdminVerticalTabs({
	activeVertical,
}: {
	activeVertical: VerticalTab['key'];
}) {
	return (
		<nav className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Verticales">
			{TABS.map((tab) => {
				const active = tab.key === activeVertical;
				return (
					<Button
						key={tab.key}
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
