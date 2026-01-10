"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button, CircleButton, useToast } from "@simple/ui";
import { PanelPageLayout } from "@simple/ui";
import { IconSettings, IconPlug, IconPlugOff, IconRefresh, IconExternalLink } from '@tabler/icons-react';
import { MarketplaceConfig } from "@/lib/marketplaces";
import { logError } from "@/lib/logger";

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
  const loadMarketplaces = useCallback(async () => {
    try {
      // Simular carga de configuraciones desde base de datos
      const configs: MarketplaceConfig[] = [
        {
          id: 'chileautos',
          name: 'Chileautos',
          baseUrl: 'https://api.chileautos.cl',
          enabled: false,
          settings: {},
        },
      ];

      const statuses: MarketplaceStatus[] = configs.map(config => ({
        id: config.id,
        name: config.name,
        enabled: config.enabled,
        connected: false // En producci�n verificar conexi�n real
      }));

      setMarketplaces(statuses);
    } catch (error) {
      logError('[Marketplaces] Error al cargar marketplaces', error);
      addToast('Error al cargar marketplaces', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadMarketplaces();
  }, [loadMarketplaces]);

  const toggleMarketplace = async (marketplaceId: string) => {
    let nextEnabled: boolean | null = null;
    let targetName = '';

    setMarketplaces(prev =>
      prev.map(mp => {
        if (mp.id === marketplaceId) {
          nextEnabled = !mp.enabled;
          targetName = mp.name;
          return { ...mp, enabled: nextEnabled };
        }
        return mp;
      })
    );

    if (nextEnabled !== null) {
      // Aquí guardar configuración en base de datos
      addToast(
        `Marketplace ${targetName} ${nextEnabled ? 'activado' : 'desactivado'}`,
        { type: 'success' }
      );
    }
  };

  const testConnection = async (marketplaceId: string) => {
    let nextConnected: boolean | null = null;
    let targetName = '';

    // Simular test de conexión
    setMarketplaces(prev =>
      prev.map(mp => {
        if (mp.id === marketplaceId) {
          nextConnected = !mp.connected;
          targetName = mp.name;
          return { ...mp, connected: nextConnected };
        }
        return mp;
      })
    );

    if (nextConnected !== null) {
      addToast(
        `Conexión ${nextConnected ? 'establecida' : 'perdida'} para ${targetName}`,
        { type: nextConnected ? 'success' : 'error' }
      );
    }
  };

  const configureMarketplace = (marketplaceId: string) => {
    // Abrir modal de configuración
    addToast(`Configuración de ${marketplaceId} próximamente`, { type: 'info' });
  };

  if (loading) {
    return (
      <PanelPageLayout
        header={{
          title: "Integraciones",
          description: "Conecta tus publicaciones con marketplaces y otros canales"
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
        title: "Integraciones",
        description: "Conecta tus publicaciones con marketplaces para llegar a más compradores",
        actions: (
          <Button variant="primary" size="md" onClick={loadMarketplaces}>
            <IconRefresh size={18} className="mr-2" />
            Actualizar
          </Button>
        )
      }}
    >
      <div className="space-y-6">
        {/* Informaci�n general */}
        <div className="card-surface shadow-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext mb-2">
            ¿Qué es la sincronización con marketplaces?
          </h3>
          <p className="text-lighttext/80 dark:text-darktext/80 text-sm">
            Conecta tus publicaciones de SimpleAutos con otros marketplaces populares en Chile.
            Tus vehículos aparecerán automáticamente en múltiples plataformas, aumentando tu alcance y posibilidades de venta.
          </p>
        </div>

        {/* Lista de marketplaces */}
        <div className="grid gap-4">
          {marketplaces.map((marketplace) => (
            <div
              key={marketplace.id}
              className="card-surface shadow-card p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    marketplace.enabled
                      ? 'bg-[var(--color-success-subtle-bg)]'
                      : 'bg-[var(--field-bg)] dark:bg-darkbg'
                  }`}>
                    {marketplace.enabled ? (
                      <IconPlug size={24} className="text-[var(--color-success)]" />
                    ) : (
                      <IconPlugOff size={24} className="text-lighttext/60 dark:text-darktext/60" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">
                      {marketplace.name}
                    </h3>
                    <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                      {marketplace.connected ? 'Conectado' : 'Sin conectar'} ·
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
                <div className="mt-4 card-surface shadow-card rounded-lg p-3 bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)]">
                  <p className="text-sm text-[var(--color-danger)]">
                    Error: {marketplace.error}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Información adicional */}
        <div className="card-surface shadow-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext mb-2">
            ℹ️ Información importante
          </h3>
          <ul className="text-sm text-lighttext/80 dark:text-darktext/80 space-y-1">
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







