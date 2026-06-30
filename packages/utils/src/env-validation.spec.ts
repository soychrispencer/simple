import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateClientEnvVars } from './env-validation';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
});

describe('validateClientEnvVars', () => {
    it('returns errors when required public URLs are missing', () => {
        delete process.env.NEXT_PUBLIC_API_URL;
        delete process.env.NEXT_PUBLIC_APP_URL;
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const result = validateClientEnvVars('SimpleTest');

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('accepts configured required public URLs', () => {
        process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const result = validateClientEnvVars('SimpleTest');

        expect(result).toEqual({ valid: true, errors: [] });
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
