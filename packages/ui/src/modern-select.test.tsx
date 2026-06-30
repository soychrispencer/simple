/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModernSelect } from './modern-select';
import React from 'react';

const mockOptions = [
    { value: '1', label: 'Opción 1' },
    { value: '2', label: 'Opción 2' },
    { value: '3', label: 'Opción 3', disabled: true },
];

describe('ModernSelect', () => {
    it('renders placeholder correctly', () => {
        render(<ModernSelect value="" onChange={vi.fn()} options={mockOptions} placeholder="Seleccione algo" />);
        expect(screen.getByText('Seleccione algo')).toBeInTheDocument();
    });

    it('opens dropdown when clicked', () => {
        render(<ModernSelect value="" onChange={vi.fn()} options={mockOptions} placeholder="Seleccione algo" />);
        
        const trigger = screen.getByRole('button');
        fireEvent.click(trigger);
        
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();
        expect(screen.getByText('Opción 1')).toBeInTheDocument();
        expect(screen.getByText('Opción 2')).toBeInTheDocument();
    });

    it('selects an option and calls onChange', () => {
        const onChangeSpy = vi.fn();
        render(<ModernSelect value="" onChange={onChangeSpy} options={mockOptions} placeholder="Seleccione algo" />);
        
        const trigger = screen.getByRole('button');
        fireEvent.click(trigger);
        
        const option = screen.getByRole('option', { name: 'Opción 2' });
        fireEvent.click(option);
        
        expect(onChangeSpy).toHaveBeenCalledWith('2');
    });

    it('does not select disabled options', () => {
        const onChangeSpy = vi.fn();
        render(<ModernSelect value="" onChange={onChangeSpy} options={mockOptions} placeholder="Seleccione algo" />);
        
        const trigger = screen.getByRole('button');
        fireEvent.click(trigger);
        
        const disabledOption = screen.getByRole('option', { name: 'Opción 3' });
        fireEvent.click(disabledOption);
        
        expect(onChangeSpy).not.toHaveBeenCalled();
    });
});
