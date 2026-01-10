import { useState, useCallback, useEffect } from 'react';
import { MarketplaceSyncService, MarketplaceConfig, SyncResult } from '@/lib/marketplaces';
import { convertVehicleToSyncData, validateSyncData } from '@/lib/marketplaces/utils';

export function useMarketplaceSync(configs: MarketplaceConfig[]) {
  const [syncService] = useState(() => new MarketplaceSyncService(configs));
  const [isLoading, setIsLoading] = useState(false);
  const [lastResults, setLastResults] = useState<Map<string, SyncResult>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Verificar inicialización periódicamente
    const checkInit = () => {
      if ((syncService as any).initialized) {
        setIsInitialized(true);
      } else {
        setTimeout(checkInit, 50);
      }
    };
    checkInit();
  }, [syncService]);

  const syncVehicle = useCallback(async (
    vehicle: any,
    marketplaceIds?: string[]
  ): Promise<Map<string, SyncResult>> => {
    if (!isInitialized) {
      throw new Error('Marketplace service not initialized yet');
    }

    setIsLoading(true);
    try {
      const syncData = convertVehicleToSyncData(vehicle);

      // Validar datos antes de sincronizar
      const validation = validateSyncData(syncData);
      if (!validation.valid) {
        throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      }

      const results = await syncService.syncVehicleToMarketplaces(syncData, marketplaceIds);
      setLastResults(results);
      return results;
    } finally {
      setIsLoading(false);
    }
  }, [syncService, isInitialized]);

  const updateVehicle = useCallback(async (
    externalIds: Map<string, string>,
    vehicle: Partial<any>
  ): Promise<Map<string, SyncResult>> => {
    if (!isInitialized) {
      throw new Error('Marketplace service not initialized yet');
    }

    setIsLoading(true);
    try {
      const syncData = convertVehicleToSyncData(vehicle);
      const results = await syncService.updateVehicleInMarketplaces(externalIds, syncData);
      setLastResults(results);
      return results;
    } finally {
      setIsLoading(false);
    }
  }, [syncService, isInitialized]);

  const deleteVehicle = useCallback(async (
    externalIds: Map<string, string>
  ): Promise<Map<string, boolean>> => {
    if (!isInitialized) {
      throw new Error('Marketplace service not initialized yet');
    }

    setIsLoading(true);
    try {
      return await syncService.deleteVehicleFromMarketplaces(externalIds);
    } finally {
      setIsLoading(false);
    }
  }, [syncService, isInitialized]);

  const getEnabledMarketplaces = useCallback(() => {
    if (!isInitialized) return [];
    return syncService.getEnabledMarketplaces();
  }, [syncService, isInitialized]);

  return {
    syncVehicle,
    updateVehicle,
    deleteVehicle,
    getEnabledMarketplaces,
    isLoading,
    lastResults,
    isInitialized
  };
}

