import { createElement, type ReactNode } from 'react';
import {
    IconBath,
    IconBed,
    IconBuilding,
    IconCar,
    IconGasStation,
    IconGauge,
    IconManualGearbox,
    IconRuler,
} from '@tabler/icons-react';
import type { ListingAccent } from '../types';
import type { MarketplaceReelSpec } from '../marketplace-reel-listing-card';

function specIcon(accent: ListingAccent, index: number): ReactNode {
    const autosCycle = [IconCar, IconGauge, IconGasStation, IconManualGearbox];
    const propCycle = [IconBuilding, IconBed, IconBath, IconRuler];
    const cycle = accent === 'propiedades' ? propCycle : autosCycle;
    const Icon = cycle[index] ?? cycle[0];
    return createElement(Icon, { size: 20 });
}

export function buildReelSpecsFromMetaTags(metaTags: string[], accent: ListingAccent): MarketplaceReelSpec[] {
    return metaTags.slice(0, 4).map((label, index) => ({
        icon: specIcon(accent, index),
        label,
    }));
}
