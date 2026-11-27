import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatAgendaTeamsAnnualTotalPrice } from '@simple/utils';
import { useAgendaSignup } from './use-agenda-signup';

const mocks = vi.hoisted(() => ({
    openAuth: vi.fn(),
    push: vi.fn(),
    track: vi.fn(),
    isLoggedIn: false,
}));

vi.mock('@simple/auth', () => ({
    useAuth: () => ({ openAuth: mocks.openAuth, isLoggedIn: mocks.isLoggedIn }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/analytics', () => ({ track: mocks.track }));

describe('continuing from an Agenda plan on the landing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.isLoggedIn = false;
    });

    it('keeps the paid plan and cycle through registration', () => {
        const { result } = renderHook(() => useAgendaSignup());
        result.current.startPlan('enterprise', 'annual');

        expect(mocks.openAuth).toHaveBeenCalledWith('register', {
            returnTo: '/panel/mi-negocio/plan?plan=enterprise&billingCycle=annual',
            contextLabel: `Negocios anual · ${formatAgendaTeamsAnnualTotalPrice()}`,
        });
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it('opens the same plan directly for a signed-in customer', () => {
        mocks.isLoggedIn = true;
        const { result } = renderHook(() => useAgendaSignup());
        result.current.startPlan('pro', 'monthly');

        expect(mocks.push).toHaveBeenCalledWith('/panel/mi-negocio/plan?plan=pro&billingCycle=monthly');
        expect(mocks.openAuth).not.toHaveBeenCalled();
    });

    it('opens regular registration for Gratis', () => {
        const { result } = renderHook(() => useAgendaSignup());
        result.current.startPlan('gratis');

        expect(mocks.openAuth).toHaveBeenCalledExactlyOnceWith('register');
    });
});
