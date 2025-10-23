"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { CircleButton } from "@/components/ui/CircleButton";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { IconSettings, IconPlug, IconPlugOff, IconRefresh, IconExternalLink } from '@tabler/icons-react';
import { MarketplaceRegistry, MarketplaceConfig, MarketplaceSyncService } from "@/lib/marketplaces";

interface MarketplaceStatus {
  id: string;
  name: string;
  enabled: boolean;
  connected: boolean;
  lastSync?: Date;
  error?: string;
}

export default function MarketplacesSync() {
  const { addToast } = useToast();
  const [marketplaces, setMarketplaces] = useState<MarketplaceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncService, setSyncService] = useState<MarketplaceSyncService | null>(null);

  useEffect(() => {
    loadMarketplaces();
  }, []);

  const loadMarketplaces = async () => {
    try {
      // Simular carga de configuraciones desde base de datos
      const configs: MarketplaceConfig[] = [
        {
          id: 'chileautos',
          name: 'Chileautos',
          baseUrl: 'https://api.chileautos.cl',
          enabled: false,
          settings: {}
        },
        {
          id: 'yapo',
          name: 'Yapo',
          baseUrl: 'https://www.yapo.cl',
          enabled: false,
          settings: {}
        }
      ];

      const service = new MarketplaceSyncService(configs);
      setSyncService(service);

      const statuses: MarketplaceStatus[] = configs.map(config => ({
        id: config.id,
        name: config.name,
        enabled: config.enabled,
        connected: false // En producción verificar conexión real
      }));

      setMarketplaces(statuses);
    } catch (error) {
      addToast('Error al cargar marketplaces', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleMarketplace = async (marketplaceId: string) => {
    setMarketplaces(prev =>
      prev.map(mp =>
        mp.id === marketplaceId
          ? { ...mp, enabled: !mp.enabled }
          : mp
      )
    );

    // Aquí guardar configuración en base de datos
    addToast(
      `Marketplace ${marketplaces.find(mp => mp.id === marketplaceId)?.enabled ? 'desactivado' : 'activado'}`,
      { type: 'success' }
    );
  };

  const testConnection = async (marketplaceId: string) => {
    // Simular test de conexión
    setMarketplaces(prev =>
      prev.map(mp =>
        mp.id === marketplaceId
          ? { ...mp, connected: !mp.connected }
          : mp
      )
    );

    addToast(
      `Conexión ${marketplaces.find(mp => mp.id === marketplaceId)?.connected ? 'perdida' : 'establecida'}`,
      { type: marketplaces.find(mp => mp.id === marketplaceId)?.connected ? 'error' : 'success' }
    );
  };

  const configureMarketplace = (marketplaceId: string) => {
    // Abrir modal de configuración
    addToast('Funcionalidad de configuración próximamente', { type: 'info' });
  };

  if (loading) {
    return (
      <PanelPageLayout
        header={{
          title: "Sincronización con Marketplaces",
          description: "Conecta tus publicaciones con otros marketplaces"
        }}
      >
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PanelPageLayout>
    );
  }

  return (
    <PanelPageLayout
      header={{
        title: "Sincronización con Marketplaces",
        description: "Conecta tus publicaciones con otros marketplaces para llegar a más compradores",
        actions: (
          <Button variant="primary" size="md" onClick={loadMarketplaces}>
            <IconRefresh size={18} className="mr-2" />
            Actualizar
          </Button>
        )
      }}
    >
      <div className="space-y-6">
        {/* Información general */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ¿Qué es la sincronización con marketplaces?
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            Conecta tus publicaciones de SimpleAutos con otros marketplaces populares en Chile.
            Tus vehículos aparecerán automáticamente en múltiples plataformas, aumentando tu alcance y posibilidades de venta.
          </p>
        </div>

        {/* Lista de marketplaces */}
        <div className="grid gap-4">
          {marketplaces.map((marketplace) => (
            <div
              key={marketplace.id}
              className="bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    marketplace.enabled
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {marketplace.enabled ? (
                      <IconPlug size={24} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <IconPlugOff size={24} className="text-gray-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">
                      {marketplace.name}
                    </h3>
                    <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                      {marketplace.connected ? 'Conectado' : 'Sin conectar'} •
                      {marketplace.enabled ? ' Activado' : ' Desactivado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CircleButton
                    size={40}
                    variant="default"
                    onClick={() => testConnection(marketplace.id)}
                    title="Probar conexión"
                    aria-label="Probar conexión"
                  >
                    <IconExternalLink size={18} stroke={1.5} />
                  </CircleButton>

                  <CircleButton
                    size={40}
                    variant="default"
                    onClick={() => configureMarketplace(marketplace.id)}
                    title="Configurar"
                    aria-label="Configurar marketplace"
                  >
                    <IconSettings size={18} stroke={1.5} />
                  </CircleButton>

                  <Button
                    variant={marketplace.enabled ? 'neutral' : 'primary'}
                    size="md"
                    onClick={() => toggleMarketplace(marketplace.id)}
                  >
                    {marketplace.enabled ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>

              {marketplace.error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Error: {marketplace.error}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Información adicional */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
            ⚠️ Información importante
          </h3>
          <ul className="text-amber-800 dark:text-amber-200 text-sm space-y-1">
            <li>• La sincronización es automática cuando activas un marketplace</li>
            <li>• Los cambios en tus publicaciones se reflejan automáticamente</li>
            <li>• Cada marketplace tiene sus propias reglas y comisiones</li>
            <li>• Mantén tus credenciales actualizadas para evitar interrupciones</li>
          </ul>
        </div>
      </div>
    </PanelPageLayout>
  );
}
