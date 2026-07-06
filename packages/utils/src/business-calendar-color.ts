/** Paleta compartida para identificar servicios en agenda, Google Calendar y listados del panel. */
export const BUSINESS_CALENDAR_COLORS = [
    '#0F766E',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#EF4444',
    '#6366F1',
] as const;

export const DEFAULT_BUSINESS_CALENDAR_COLOR = BUSINESS_CALENDAR_COLORS[0];

export type BusinessCalendarColor = (typeof BUSINESS_CALENDAR_COLORS)[number];
