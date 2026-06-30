'use client';

import { BUSINESS_CALENDAR_COLORS } from '@simple/utils';
import { PanelField } from './panel-display.js';

export type BusinessCatalogCalendarColorFieldProps = {
    value: string;
    onChange: (color: string) => void;
    className?: string;
};

export function BusinessCatalogCalendarColorField({
    value,
    onChange,
    className = 'md:col-span-2',
}: BusinessCatalogCalendarColorFieldProps) {
    return (
        <PanelField
            label="Color en calendario"
            hint="Identifica este servicio en tu agenda y al sincronizar con Google Calendar."
            className={className}
        >
            <div className="flex flex-wrap gap-2">
                {BUSINESS_CALENDAR_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onChange(color)}
                        aria-label={`Color ${color}`}
                        aria-pressed={value === color}
                        className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                        style={{
                            background: color,
                            outline: value === color ? `2px solid ${color}` : '2px solid transparent',
                            outlineOffset: '2px',
                        }}
                    />
                ))}
            </div>
        </PanelField>
    );
}
