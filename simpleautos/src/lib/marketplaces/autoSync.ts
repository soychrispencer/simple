// Ejemplo de integración de sincronización automática en publicaciones
// Este código debería integrarse en el componente de AdminVehicleCard o en el flujo de publicación

import { useMarketplaceSync } from '@/hooks/useMarketplaceSync';
import { MarketplaceConfig } from '@/lib/marketplaces';

// Configuraciones de marketplaces (en producción vendrían de la base de datos)
const marketplaceConfigs: MarketplaceConfig[] = [
  {
    id: 'chileautos',
    name: 'Chileautos',
    baseUrl: 'https://api.chileautos.cl',
    apiKey: process.env.CHILEAUTOS_API_KEY,
    apiSecret: process.env.CHILEAUTOS_API_SECRET,
    enabled: true, // Esto vendría de las preferencias del usuario
    settings: {
      username: 'usuario_chileautos',
      password: 'password_chileautos'
    }
  },
  {
    id: 'yapo',
    name: 'Yapo',
    baseUrl: 'https://www.yapo.cl',
    enabled: false,
    settings: {
      username: 'usuario_yapo',
      password: 'password_yapo'
    }
  },
  {
    id: 'facebook',
    name: 'Facebook Marketplace',
    baseUrl: 'https://graph.facebook.com',
    apiKey: process.env.FACEBOOK_APP_ID,
    apiSecret: process.env.FACEBOOK_APP_SECRET,
    enabled: false, // DESHABILITADO por defecto - requiere configuración especial
    settings: {
      pageId: process.env.FACEBOOK_PAGE_ID,
      latitude: -33.4489, // Santiago por defecto
      longitude: -70.6693
    }
  }
];

export function useAutoSync() {
  const { syncVehicle, updateVehicle, isLoading, isInitialized } = useMarketplaceSync(marketplaceConfigs);

  const syncOnPublish = async (vehicle: any) => {
    if (!isInitialized) {
      throw new Error('Marketplace service not initialized yet');
    }

    try {
      const results = await syncVehicle(vehicle);

      // Procesar resultados
      const successfulSyncs: string[] = [];
      const failedSyncs: string[] = [];

      results.forEach((result, marketplaceId) => {
        if (result.success) {
          successfulSyncs.push(marketplaceId);
          console.log(`✅ Sincronizado en ${marketplaceId}: ${result.url}`);
        } else {
          failedSyncs.push(marketplaceId);
          console.error(`❌ Error en ${marketplaceId}: ${result.error}`);
        }
      });

      return {
        success: failedSyncs.length === 0,
        successfulSyncs,
        failedSyncs,
        results
      };
    } catch (error) {
      console.error('Error en sincronización automática:', error);
      return {
        success: false,
        successfulSyncs: [],
        failedSyncs: marketplaceConfigs.map(c => c.id),
        results: new Map()
      };
    }
  };

  const syncOnUpdate = async (externalIds: Map<string, string>, vehicle: any) => {
    if (!isInitialized) {
      throw new Error('Marketplace service not initialized yet');
    }

    try {
      const results = await updateVehicle(externalIds, vehicle);

      results.forEach((result, marketplaceId) => {
        if (result.success) {
          console.log(`✅ Actualizado en ${marketplaceId}`);
        } else {
          console.error(`❌ Error actualizando en ${marketplaceId}: ${result.error}`);
        }
      });

      return results;
    } catch (error) {
      console.error('Error en actualización automática:', error);
      return new Map();
    }
  };

  return {
    syncOnPublish,
    syncOnUpdate,
    isLoading,
    isInitialized
  };
}

// Ejemplo de uso en un componente:
/*
import { useAutoSync } from '@/lib/marketplaces/autoSync';

function PublishButton({ vehicle }) {
  const { syncOnPublish, isLoading } = useAutoSync();

  const handlePublish = async () => {
    // Primero publicar en SimpleAutos
    const publishResult = await publishToSimpleAutos(vehicle);

    if (publishResult.success) {
      // Luego sincronizar automáticamente con marketplaces
      const syncResult = await syncOnPublish(vehicle);

      if (syncResult.success) {
        toast.success(`Publicado exitosamente en ${syncResult.successfulSyncs.length + 1} plataformas`);
      } else {
        toast.warning(`Publicado en SimpleAutos, pero algunos marketplaces fallaron`);
      }
    }
  };

  return (
    <Button onClick={handlePublish} disabled={isLoading}>
      {isLoading ? 'Publicando...' : 'Publicar'}
    </Button>
  );
}
*/