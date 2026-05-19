/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarUpload } from './avatar-upload';

describe('AvatarUpload', () => {
    it('renderiza el botón de cambiar foto', () => {
        render(<AvatarUpload currentUrl={null} />);
        expect(screen.getByRole('button', { name: /Cambiar foto/i })).toBeInTheDocument();
    });
});
