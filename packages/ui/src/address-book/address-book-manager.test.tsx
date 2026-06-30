/// <reference types="@testing-library/jest-dom" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddressBookManager } from './address-book-manager';

const managerSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'address-book-manager.tsx'),
    'utf8',
);

describe('AddressBookManager', () => {
    it('no contiene copy del diseño denso legacy', () => {
        expect(managerSource).not.toMatch(/Guarda una dirección clara/);
        expect(managerSource).not.toMatch(/Busca la dirección y selecciona/);
    });

    it('muestra estado vacío sin direcciones', () => {
        render(
            <AddressBookManager
                entries={[]}
                regions={[]}
                getCommunes={() => []}
                onSaveEntry={vi.fn().mockResolvedValue(true)}
                onDeleteEntry={vi.fn()}
            />,
        );
        expect(screen.getByText(/Todavía no tienes direcciones guardadas/i)).toBeInTheDocument();
    });

    it('composer usa editor liviano sin hints densos', () => {
        render(
            <AddressBookManager
                showHeader={false}
                entries={[]}
                regions={[{ value: '13', label: 'Región Metropolitana' }]}
                getCommunes={() => [{ value: '13101', label: 'Santiago' }]}
                onSaveEntry={vi.fn().mockResolvedValue(true)}
                onDeleteEntry={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Agregar dirección/i }));
        expect(screen.queryByText(/Guarda una dirección clara/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Selecciona una sugerencia cuando aparezca/i)).not.toBeInTheDocument();
    });
});
