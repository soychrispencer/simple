/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarUpload } from './avatar-upload';

describe('AvatarUpload', () => {
    it('renderiza el botón de cambiar foto en variante default', () => {
        render(<AvatarUpload currentUrl={null} variant="default" />);
        expect(screen.getByRole('button', { name: /Cambiar foto/i })).toBeInTheDocument();
    });

    it('renderiza el botón + en variante overlay', () => {
        render(<AvatarUpload currentUrl={null} variant="overlay" config={{ circular: true, maxWidth: 96, maxHeight: 96 }} />);
        expect(screen.getByRole('button', { name: /Agregar foto de perfil/i })).toBeInTheDocument();
    });
});
