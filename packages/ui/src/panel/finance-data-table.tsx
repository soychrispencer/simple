'use client';

import type { ReactNode } from 'react';
import { IconDownload } from '@tabler/icons-react';
import { PanelButton } from './panel-button.js';

export type FinanceColumn<T> = {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    className?: string;
    headerClassName?: string;
};

export function FinanceDataTable<T>({
    columns,
    rows,
    onExportCsv,
    exportFilename = 'export.csv',
    emptyMessage = 'Sin movimientos en este período.',
}: {
    columns: FinanceColumn<T>[];
    rows: T[];
    onExportCsv?: (rows: T[]) => void;
    exportFilename?: string;
    emptyMessage?: string;
}) {
    if (rows.length === 0) {
        return (
            <div className="rounded-card border p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="rounded-card border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            {onExportCsv ? (
                <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{rows.length} registros</span>
                    <PanelButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onExportCsv(rows)}
                    >
                        <IconDownload size={14} />
                        Exportar CSV
                    </PanelButton>
                </div>
            ) : null}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ background: 'var(--bg-muted)' }}>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider ${col.headerClassName ?? ''}`}
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr
                                key={i}
                                className="border-t"
                                style={{ borderColor: 'var(--border)' }}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-4 py-3 ${col.className ?? ''}`}
                                        style={{ color: 'var(--fg-secondary)' }}
                                    >
                                        {col.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
