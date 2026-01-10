import { logError } from '../logger';

// Sistema de sincronización con marketplaces externos
export interface MarketplaceConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface VehicleSyncData {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  location: {
    commune: string;
    region: string;
  };
  category: string;
  condition: string;
  features: string[];
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface SyncResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
  syncedAt: Date;
}

export abstract class MarketplaceAdapter {
  protected config: MarketplaceConfig;

  constructor(config: MarketplaceConfig) {
    this.config = config;
  }

  abstract authenticate(): Promise<boolean>;
  abstract syncVehicle(vehicle: VehicleSyncData): Promise<SyncResult>;
  abstract updateVehicle(externalId: string, vehicle: Partial<VehicleSyncData>): Promise<SyncResult>;
  abstract deleteVehicle(externalId: string): Promise<boolean>;
  abstract getVehicleStatus(externalId: string): Promise<{ status: string; views?: number; contacts?: number }>;

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): MarketplaceConfig {
    return this.config;
  }
}

// Registry de marketplaces disponibles
export class MarketplaceRegistry {
  private static adapters: Map<string, new (config: MarketplaceConfig) => MarketplaceAdapter> = new Map();
  private static initialized = false;

  static register(marketplaceId: string, adapterClass: new (config: MarketplaceConfig) => MarketplaceAdapter) {
    this.adapters.set(marketplaceId, adapterClass);
  }

  static async initialize() {
    if (this.initialized) return;

    try {
      // Importaciones dinámicas para evitar dependencias circulares
      const { ChileautosAdapter } = await import('./chileautos');
      const { YapoAdapter } = await import('./yapo');
      const { FacebookAdapter } = await import('./facebook');

      this.register('chileautos', ChileautosAdapter);
      this.register('yapo', YapoAdapter);
      this.register('facebook', FacebookAdapter);

      this.initialized = true;
    } catch (error) {
      logError('Error initializing marketplace adapters', error);
    }
  }

  static createAdapter(config: MarketplaceConfig): MarketplaceAdapter | null {
    const AdapterClass = this.adapters.get(config.id);
    if (!AdapterClass) return null;
    return new AdapterClass(config);
  }

  static getAvailableMarketplaces(): string[] {
    return Array.from(this.adapters.keys());
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}

// Remover las importaciones estáticas y el registro automático
// import { ChileautosAdapter } from './chileautos';
// import { YapoAdapter } from './yapo';

// MarketplaceRegistry.register('chileautos', ChileautosAdapter);
// MarketplaceRegistry.register('yapo', YapoAdapter);

// Servicio principal de sincronización
export class MarketplaceSyncService {
  private adapters: Map<string, MarketplaceAdapter> = new Map();
  private initialized = false;

  constructor(configs: MarketplaceConfig[]) {
    // Inicializar de forma asíncrona
    this.initializeAsync(configs);
  }

  private async initializeAsync(configs: MarketplaceConfig[]) {
    await MarketplaceRegistry.initialize();

    for (const config of configs) {
      const adapter = MarketplaceRegistry.createAdapter(config);
      if (adapter) {
        this.adapters.set(config.id, adapter);
      }
    }

    this.initialized = true;
  }

  async syncVehicleToMarketplaces(vehicle: VehicleSyncData, marketplaceIds?: string[]): Promise<Map<string, SyncResult>> {
    // Esperar inicializaci�n si no est� lista
    if (!this.initialized) {
      await new Promise(resolve => {
        const checkInit = () => {
          if (this.initialized) resolve(void 0);
          else setTimeout(checkInit, 10);
        };
        checkInit();
      });
    }

    const results = new Map<string, SyncResult>();
    const targetAdapters = marketplaceIds
      ? marketplaceIds.map(id => this.adapters.get(id)).filter((adapter): adapter is MarketplaceAdapter => adapter !== undefined)
      : Array.from(this.adapters.values()).filter(adapter => adapter.isEnabled());

    for (const adapter of targetAdapters) {
      try {
        const result = await adapter.syncVehicle(vehicle);
        results.set(adapter.getConfig().id, result);
      } catch (error) {
        results.set(adapter.getConfig().id, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          syncedAt: new Date()
        });
      }
    }

    return results;
  }

  async updateVehicleInMarketplaces(externalIds: Map<string, string>, vehicle: Partial<VehicleSyncData>): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    for (const [marketplaceId, externalId] of externalIds) {
      const adapter = this.adapters.get(marketplaceId);
      if (!adapter || !adapter.isEnabled()) continue;

      try {
        const result = await adapter.updateVehicle(externalId, vehicle);
        results.set(marketplaceId, result);
      } catch (error) {
        results.set(marketplaceId, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          syncedAt: new Date()
        });
      }
    }

    return results;
  }

  async deleteVehicleFromMarketplaces(externalIds: Map<string, string>): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [marketplaceId, externalId] of externalIds) {
      const adapter = this.adapters.get(marketplaceId);
      if (!adapter) continue;

      try {
        const success = await adapter.deleteVehicle(externalId);
        results.set(marketplaceId, success);
      } catch {
        results.set(marketplaceId, false);
      }
    }

    return results;
  }

  getEnabledMarketplaces(): MarketplaceConfig[] {
    return Array.from(this.adapters.values())
      .filter(adapter => adapter.isEnabled())
      .map(adapter => adapter.getConfig());
  }
}

