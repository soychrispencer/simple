'use client';

export type BarChartData = {
    label: string;
    value: number;
};

export function FinanceBarChart({
    data,
    maxValue,
    formatValue,
}: {
    data: BarChartData[];
    maxValue?: number;
    formatValue?: (value: number) => string;
}) {
    const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

    return (
        <div className="flex flex-col gap-2">
            {data.map((item) => {
                const pct = max > 0 ? (item.value / max) * 100 : 0;
                return (
                    <div key={item.label} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 truncate text-xs text-right" style={{ color: 'var(--fg-muted)' }}>
                            {item.label}
                        </span>
                        <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                            <div
                                className="h-full rounded-md transition-[width] duration-300"
                                style={{
                                    width: `${Math.max(pct, 2)}%`,
                                    background: 'var(--accent)',
                                }}
                            />
                        </div>
                        <span className="w-16 shrink-0 text-xs font-medium text-right" style={{ color: 'var(--fg)' }}>
                            {formatValue ? formatValue(item.value) : item.value.toLocaleString('es-CL')}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
