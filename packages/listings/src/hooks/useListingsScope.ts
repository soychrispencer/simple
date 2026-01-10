"use client";

import { useCallback, useMemo } from 'react';
import type { VerticalName } from '@simple/config';
import { useVerticalContext, useToast } from '@simple/ui';
import { resolveScopeFilter } from '../scope';
import type { ScopeFilter } from '../types';

export interface UseListingsScopeOptions {
  verticalKey?: VerticalName;
  /**
   * Muestra un toast de error cuando no existe scope válido.
   * Útil para vistas donde la interacción depende de la selección de empresa.
   */
  toastOnMissing?: boolean;
}

export function useListingsScope(options: UseListingsScopeOptions = {}) {
  const { verticalKey = 'autos', toastOnMissing = true } = options;
  const vertical = useVerticalContext(verticalKey);
  const { addToast } = useToast();

  const currentPublicProfileId = vertical.currentCompany?.company?.public_profile?.id
    || (vertical.profile?.public_profile as any)?.id
    || (vertical.profile as any)?.public_profile_id
    || null;

  const scopeFilter = useMemo<ScopeFilter | null>(
    () =>
      resolveScopeFilter({
        userId: vertical.user?.id,
        publicProfileId: currentPublicProfileId,
      }),
    [currentPublicProfileId, vertical.user?.id]
  );

  const ensureScope = useCallback(
    (message = 'Selecciona una empresa o perfil activo antes de continuar.') => {
      if (scopeFilter) return true;
      if (toastOnMissing) {
        addToast(message, { type: 'error' });
      }
      return false;
    },
    [addToast, scopeFilter, toastOnMissing]
  );

  return {
    user: vertical.user,
    currentCompany: vertical.currentCompany,
    loading: vertical.loading,
    scopeFilter,
    ensureScope,
    hasScope: !!scopeFilter,
  };
}
