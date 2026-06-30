import type { IconType } from 'react-icons';
import {
    GiAccordion,
    GiDrum,
    GiDrumKit,
    GiFlute,
    GiGrandPiano,
    GiGuitar,
    GiGuitarBassHead,
    GiHarp,
    GiMicrophone,
    GiMusicalKeyboard,
    GiMusicalNotes,
    GiSaxophone,
    GiTrumpet,
    GiViolin,
} from 'react-icons/gi';

type IconProps = { size?: number; className?: string };

/** Game Icons (CC BY 3.0) vía react-icons — iconos de instrumentos reconocibles. */
function normalizeInstrument(value: string): string {
    return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function resolveInstrumentIcon(instrument: string): IconType {
    const key = normalizeInstrument(instrument);

    if (key.includes('voz') || key.includes('canto') || key.includes('coro')) return GiMicrophone;
    if (key.includes('tromp') || key.includes('tromb') || key.includes('cornet') || key.includes('clarin')) {
        return GiTrumpet;
    }
    if (key.includes('violin') || (key.includes('viol') && !key.includes('guitar'))) return GiViolin;
    if (key.includes('arpa')) return GiHarp;
    if (key.includes('acordeon')) return GiAccordion;
    if (key.includes('piano')) return GiGrandPiano;
    if (key.includes('teclado')) return GiMusicalKeyboard;
    if (key.includes('sax')) return GiSaxophone;
    if (key.includes('flaut')) return GiFlute;
    if (key.includes('cajon')) return GiDrum;
    if (key.includes('bater')) return GiDrumKit;
    if (key.includes('percus')) return GiDrumKit;
    if (key.includes('bajo') || key.includes('tololoche')) return GiGuitarBassHead;
    if (
        key.includes('guitar')
        || key.includes('vihuela')
        || key.includes('guitarr')
        || key.includes('requinto')
        || key.includes('charango')
    ) {
        return GiGuitar;
    }
    return GiMusicalNotes;
}

export function MusicianInstrumentIcon({
    instrument,
    size = 14,
    className = 'shrink-0 text-accent',
}: {
    instrument: string;
    size?: number;
    className?: string;
}) {
    const Icon = resolveInstrumentIcon(instrument);
    return <Icon size={size} className={className} aria-hidden />;
}
