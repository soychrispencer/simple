/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createEmptyListingLocation, patchListingLocation } from '@simple/types';
import { ListingLocationEditor } from './listing-location-editor';

const regions = [{ value: '13', label: 'Región Metropolitana' }];
const communes = [{ value: '13101', label: 'Santiago' }];
const baseLocation = patchListingLocation(createEmptyListingLocation(), { sourceMode: 'custom' });

describe('ListingLocationEditor addressHintMode', () => {
    it('muestra hint corto en modo minimal', () => {
        render(
            <ListingLocationEditor
                simpleMode
                addressHintMode="minimal"
                location={baseLocation}
                onChange={() => {}}
                regions={regions}
                communes={communes}
                addressBook={[]}
                showHeader={false}
                framed={false}
                showAreaFields
                showSourceSelector={false}
                showSimpleVisibilityToggle={false}
            />,
        );
        expect(screen.getByText('Escribe y elige una sugerencia de Google, o completa región y comuna.')).toBeInTheDocument();
    });

    it('no muestra hint en modo none', () => {
        render(
            <ListingLocationEditor
                simpleMode
                addressHintMode="none"
                location={baseLocation}
                onChange={() => {}}
                regions={regions}
                communes={communes}
                addressBook={[]}
                showHeader={false}
                framed={false}
                showAreaFields
                showSourceSelector={false}
                showSimpleVisibilityToggle={false}
            />,
        );
        expect(screen.queryByText('Escribe y elige una sugerencia de Google, o completa región y comuna.')).not.toBeInTheDocument();
        expect(screen.queryByText('Selecciona una sugerencia cuando aparezca.')).not.toBeInTheDocument();
    });
});
