"use client";
import { getJSON, setJSON } from "@/lib/storage";
import Link from "next/link";
import React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { CircleButton } from "@/components/ui/CircleButton";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { AdminVehicleCard } from "@/components/vehicles/AdminVehicleCard";
import { ensureLegacyFormat } from "@/lib/normalizeVehicleSpecs";
import { IconLayoutGrid, IconLayoutList, IconPlus, IconCar, IconFilterX, IconSearch, IconTrash, IconStar, IconStarFilled, IconChecks, IconX, IconPlayerPause, IconCircleCheck, IconEyeCheck, IconBolt } from '@tabler/icons-react';
import Input from "@/components/ui/form/Input";
import Select from "@/components/ui/form/Select";

type Item = {
  id: string;
  titulo: string;
  precio: number;
  estadoPublicacion: string; // Estado de publicación: Publicado/Pausado/Borrador
  condicionVehiculo?: string; // Condición del vehículo: Nuevo/Usado/Seminuevo
  portada: string;
  vistas?: number; 
  clics?: number;
  imagenes?: string[];
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  commune?: string;
  region?: string;
  listing_type?: string;
  featured?: boolean;
  type_key?: string;
  type_label?: string;
  extra_specs?: {
    rent_daily_price?: number | null;
    rent_weekly_price?: number | null;
    rent_monthly_price?: number | null;
    rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
    estado?: string | null;
    condition?: string | null;
    state?: string | null;
    location?: {
      commune_name?: string | null;
      region_name?: string | null;
    } | null;
    legacy?: {
      fuel_legacy?: string | null;
      transmission_legacy?: string | null;
      commune_name?: string | null;
      region_name?: string | null;
    } | null;
    [key: string]: any;
  } | null;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  // Condiciones comerciales avanzadas
  commercial_conditions?: {
    financing?: any[];
    bonuses?: any[];
    discounts?: any[];
    additional_conditions?: string;
  } | null;
};

export default function Publicaciones() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const supabase = useSupabase();
  
  const [view, setView] = React.useState<"list" | "grid">("grid");
  const [items, setItems] = React.useState<Item[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterFeatured, setFilterFeatured] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("date-desc");
  
  // Estados para acciones en lote
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false);
  
  // Estado para modal de confirmación de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [vehicleToDelete, setVehicleToDelete] = React.useState<{ id: string; titulo: string } | null>(null);
  const [modalMounted, setModalMounted] = React.useState(false);

  React.useEffect(() => {
    setModalMounted(true);
  }, []);

  React.useEffect(() => {
    setMounted(true);
    const v = getJSON<"list" | "grid">("pub:view", "grid");
    setView(v);
    
    (async () => {
      try {
        setLoading(true);

        if (!user) {
          console.log('[Publicaciones] Usuario no disponible');
          setLoading(false);
          return;
        }

        // Primero obtener el perfil del usuario para conseguir su profile.id
        let profileQuery = supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (user.id) {
          console.log('[Publicaciones] Usuario tiene ID, buscando por user_id:', user.id);
          // Usuario autenticado - buscar por user_id
          profileQuery = profileQuery.eq('user_id', user.id);
        } else if (user.email) {
          console.log('[Publicaciones] Usuario no tiene ID, buscando por email:', user.email);
          // Usuario legacy - buscar por email
          profileQuery = profileQuery.eq('email', user.email);
        } else {
          // No hay información suficiente para identificar al usuario
          console.error('[Publicaciones] No se puede identificar al usuario: no hay id ni email');
          console.log('[Publicaciones] Objeto user completo:', user);
          setLoading(false);
          return;
        }

        let { data: profiles, error: profileError } = await profileQuery;

        console.log('[Publicaciones] Resultado consulta perfil:', { profiles, profileError });

        // Si no se encontró perfil por user_id, intentar por email (para usuarios con perfiles huérfanos)
        if ((!profiles || profiles.length === 0) && user.email && user.id) {
          console.log('[Publicaciones] No se encontró perfil por user_id, intentando por email:', user.email);
          const { data: emailProfiles, error: emailError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', user.email)
            .limit(1);

          if (!emailError && emailProfiles && emailProfiles.length > 0) {
            console.log('[Publicaciones] Encontrado perfil huérfano por email:', emailProfiles[0]);
            profiles = emailProfiles;
            profileError = null;
          }
        }

        if (profileError) {
          console.error('[Publicaciones] Error obteniendo perfil:', profileError);
          setLoading(false);
          return;
        }

        if (!profiles || profiles.length === 0) {
          console.log('[Publicaciones] No se encontró perfil para el usuario, mostrando lista vacía');
          // Usuario no tiene perfil, mostrar lista vacía
          setItems([]);
          setLoading(false);
          return;
        }

        const profileId = profiles[0].id;
        console.log('[Publicaciones] Cargando vehículos para profile:', profileId);

        const { data: vehicles, error } = await supabase
          .from('vehicles')
          .select(`
            *,
            vehicle_types!inner(slug, label),
            communes(name),
            regions(name),
            commercial_conditions(financing, bonuses, discounts, additional_conditions)
          `)
          .eq('owner_id', profileId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Publicaciones] Error cargando vehículos:', error);
          addToast('Error cargando publicaciones: ' + (error.message || 'Error desconocido'), { type: 'error' });
          setLoading(false);
          return;
        }

        console.log('[Publicaciones] Vehículos recibidos:', vehicles);
        
        // DEBUG: Ver si viene la columna status
        if (vehicles && vehicles.length > 0) {
          console.log('[Publicaciones] Primer vehículo status:', vehicles[0].status);
          console.log('[Publicaciones] Primer vehículo condition:', vehicles[0].condition);
        }

        const mapped: Item[] = (vehicles || []).map((v: any) => {
          const extraSpecs = ensureLegacyFormat(v.specs ?? null) as Item['extra_specs'];
          const rentDaily = v.rent_daily_price ?? extraSpecs?.rent_daily_price ?? null;
          const rentWeekly = v.rent_weekly_price ?? extraSpecs?.rent_weekly_price ?? null;
          const rentMonthly = v.rent_monthly_price ?? extraSpecs?.rent_monthly_price ?? null;
          const rentPeriod = (extraSpecs?.rent_price_period as Item['rent_price_period'])
            ?? (rentDaily != null ? 'daily'
              : rentWeekly != null ? 'weekly'
              : rentMonthly != null ? 'monthly'
              : null);

          // Priorizar columna condition sobre extra_specs (legacy)
          const condition = v.condition ?? extraSpecs?.estado ?? extraSpecs?.condition ?? extraSpecs?.state ?? null;
          const communeName = v.communes?.name ?? extraSpecs?.location?.commune_name ?? extraSpecs?.legacy?.commune_name ?? undefined;
          const regionName = v.regions?.name ?? extraSpecs?.location?.region_name ?? extraSpecs?.legacy?.region_name ?? undefined;

          // Precio de subasta
          const auctionStartPrice = v.auction_start_price ?? extraSpecs?.auction_start_price ?? null;
          const auctionStartAt = v.auction_start_at ?? extraSpecs?.auction_start_at ?? null;
          const auctionEndAt = v.auction_end_at ?? extraSpecs?.auction_end_at ?? null;

          return {
            id: v.id,
            titulo: v.title,
            precio: v.price,
            estadoPublicacion: v.status === 'active' ? 'Publicado' : v.status === 'paused' ? 'Pausado' : 'Borrador',
            condicionVehiculo: condition ?? undefined,
            portada: '/file.svg',
            imagenes: [],
            vistas: v.views || 0,
            clics: v.clicks || 0,
            year: v.year,
            mileage: v.mileage,
            fuel: extraSpecs?.legacy?.fuel_legacy ?? undefined,
            transmission: extraSpecs?.legacy?.transmission_legacy ?? undefined,
            commune: communeName,
            region: regionName,
            listing_type: v.listing_type,
            featured: v.featured,
            type_key: v.vehicle_types?.slug ?? undefined,
            type_label: v.vehicle_types?.label ?? undefined,
            extra_specs: extraSpecs,
            rent_daily_price: rentDaily,
            rent_weekly_price: rentWeekly,
            rent_monthly_price: rentMonthly,
            rent_price_period: rentPeriod ?? undefined,
            auction_start_price: auctionStartPrice ?? undefined,
            auction_start_at: auctionStartAt ?? undefined,
            auction_end_at: auctionEndAt ?? undefined,
            commercial_conditions: v.commercial_conditions || null,
          } satisfies Item;
        });

        console.log('[Publicaciones] Items mapeados:', mapped);
        setItems(mapped);
      } catch (error) {
        console.error('[Publicaciones] Error en carga:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, supabase, addToast]);
  
  React.useEffect(() => { if (mounted) setJSON("pub:view", view); }, [mounted, view]);

  const confirmarEliminar = (id: string, titulo: string) => {
    setVehicleToDelete({ id, titulo });
    setDeleteModalOpen(true);
  };

  const eliminar = async () => {
    if (!vehicleToDelete) return;
    
    try {
      console.log('[Publicaciones] Eliminando vehículo:', vehicleToDelete.id);
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleToDelete.id)
        .eq('owner_id', user?.id);
      
      if (error) {
        console.error('[Publicaciones] Error eliminando:', error);
        throw error;
      }
      
      setItems((arr) => arr.filter((i) => i.id !== vehicleToDelete.id));
      addToast(`"${vehicleToDelete.titulo}" eliminada`, { type: 'info' });
      setDeleteModalOpen(false);
      setVehicleToDelete(null);
    } catch (error: any) {
      console.error('[Publicaciones] Error:', error);
      addToast('Error eliminando publicación: ' + error.message, { type: 'error' });
    }
  };
  
  const duplicar = async (id: string) => {
    try {
      console.log('[duplicar] Iniciando duplicación del vehículo:', id);
      
      // 1. Obtener el vehículo original de la base de datos
      const { data: originalVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('[duplicar] Error obteniendo vehículo:', fetchError);
        throw fetchError;
      }
      
      if (!originalVehicle) {
        console.error('[duplicar] Vehículo no encontrado:', id);
        addToast('Vehículo no encontrado', { type: 'error' });
        return;
      }

      console.log('[duplicar] Vehículo original obtenido:', originalVehicle.titulo);

      // 2. Crear copia con nuevos valores (eliminar campos que no deben duplicarse)
      const { 
        id: _id, 
        created_at, 
        updated_at, 
        vistas, 
        clics,
        ...vehicleData 
      } = originalVehicle;

      const newVehicle = {
        ...vehicleData,
        titulo: originalVehicle.titulo + ' (copia)',
        status: 'draft', // Siempre duplicar como borrador
        vistas: 0, // Resetear métricas
        clics: 0
      };

      console.log('[duplicar] Datos para insertar:', { titulo: newVehicle.titulo, status: newVehicle.status });

      // 3. Insertar en la base de datos
      const { data: insertedVehicle, error: insertError } = await supabase
        .from('vehicles')
        .insert(newVehicle)
        .select()
        .single();

      if (insertError) {
        console.error('[duplicar] Error insertando vehículo:', insertError);
        throw insertError;
      }

      console.log('[duplicar] Vehículo duplicado exitosamente:', insertedVehicle.id);

      // 4. Actualizar lista local
      const newItem: Item = {
        id: insertedVehicle.id,
        titulo: insertedVehicle.titulo,
        precio: insertedVehicle.precio || 0,
        estadoPublicacion: 'Borrador',
        condicionVehiculo: insertedVehicle.condition === 'new' ? 'Nuevo' 
          : insertedVehicle.condition === 'used' ? 'Usado'
          : insertedVehicle.condition === 'certified' ? 'Seminuevo'
          : 'Desconocido',
        portada: insertedVehicle.portada || undefined,
        imagenes: insertedVehicle.imagenes || [],
        vistas: 0,
        clics: 0,
        year: insertedVehicle.year || undefined,
        mileage: insertedVehicle.mileage || undefined,
        fuel: insertedVehicle.fuel || undefined,
        transmission: insertedVehicle.transmission || undefined,
        commune: insertedVehicle.commune || undefined,
        region: insertedVehicle.region || undefined,
        listing_type: insertedVehicle.listing_type || 'sale',
        featured: insertedVehicle.visibility === 'featured',
        type_key: insertedVehicle.type_key || undefined,
        type_label: insertedVehicle.type_label || undefined,
        rent_daily_price: insertedVehicle.rent_daily_price,
        rent_weekly_price: insertedVehicle.rent_weekly_price,
        rent_monthly_price: insertedVehicle.rent_monthly_price,
        rent_price_period: insertedVehicle.rent_price_period,
        auction_start_price: insertedVehicle.auction_start_price,
        auction_start_at: insertedVehicle.auction_start_at,
        auction_end_at: insertedVehicle.auction_end_at,
        extra_specs: insertedVehicle.extra_specs
      };

      setItems(prevItems => [newItem, ...prevItems]);
      addToast('Publicación duplicada exitosamente', { type: 'success' });
      
    } catch (error: any) {
      console.error('[duplicar] Error completo:', error);
      console.error('[duplicar] Error message:', error?.message);
      console.error('[duplicar] Error details:', error?.details);
      console.error('[duplicar] Error hint:', error?.hint);
      
      const errorMsg = error?.message || error?.details || error?.hint || 'Error desconocido al duplicar';
      addToast('Error duplicando publicación: ' + errorMsg, { type: 'error' });
    }
  };

  const editarVehiculo = (id: string) => {
    window.location.href = `/panel/nueva-publicacion?id=${id}`;
  };

  // Impulsar publicación (cambiar entre destacada y normal)
  const impulsarPublicacion = async (id: string) => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const newVisibility = item.featured ? 'normal' : 'featured';
      const actionText = item.featured ? 'quitado el destaque' : 'destacada';

      const { error } = await supabase
        .from('vehicles')
        .update({ visibility: newVisibility })
        .eq('id', id);

      if (error) throw error;

      // Actualizar estado local
      setItems(prevItems =>
        prevItems.map(i =>
          i.id === id ? { ...i, featured: !i.featured } : i
        )
      );

      addToast(`Publicación ${actionText} exitosamente`, { type: 'success' });
    } catch (error: any) {
      console.error('[impulsarPublicacion] Error:', error);
      const errorMsg = error?.message || error?.details || error?.hint || 'Error desconocido';
      addToast('Error al impulsar publicación: ' + errorMsg, { type: 'error' });
    }
  };

  // Cambiar estado de un solo vehículo
  const cambiarEstadoIndividual = async (id: string, nuevoEstado: 'Publicado' | 'Pausado' | 'Borrador') => {
    try {
      // Mapeo de estado UI -> DB
      const statusMap: Record<string, 'active' | 'paused' | 'draft'> = {
        'Publicado': 'active',
        'Pausado': 'paused',
        'Borrador': 'draft'
      };
      
      const dbStatus = statusMap[nuevoEstado];
      
      const { error } = await supabase
        .from('vehicles')
        .update({ status: dbStatus })
        .eq('id', id);

      if (error) throw error;

      // Actualizar estado local
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id ? { ...item, estadoPublicacion: nuevoEstado } : item
        )
      );

      addToast(`Publicación cambiada a ${nuevoEstado}`, { type: 'success' });
    } catch (error: any) {
      console.error('[cambiarEstadoIndividual] Error:', error);
      addToast('Error cambiando estado: ' + error.message, { type: 'error' });
    }
  };

  // Tracking de compartir en Facebook
  const trackShareToFacebook = async (id: string) => {
    try {
      // Aquí puedes agregar lógica de tracking/analytics
      console.log(`Vehículo ${id} compartido en Facebook Marketplace`);

      // Opcional: guardar en base de datos para analytics
      // await supabase.from('vehicle_shares').insert({
      //   vehicle_id: id,
      //   platform: 'facebook_marketplace',
      //   shared_at: new Date().toISOString(),
      //   user_id: user?.id
      // });

      addToast('Compartido en Facebook Marketplace', { type: 'info' });
    } catch (error) {
      console.error('Error tracking Facebook share:', error);
    }
  };

  // Funciones para acciones en lote
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`¿Estás seguro de eliminar ${selectedIds.size} publicación(es)?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .in('id', Array.from(selectedIds))
        .eq('owner_id', user?.id);
      
      if (error) throw error;
      
      setItems((arr) => arr.filter((i) => !selectedIds.has(i.id)));
      addToast(`${selectedIds.size} publicación(es) eliminadas`, { type: 'success' });
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error: any) {
      console.error('[Publicaciones] Error en eliminación masiva:', error);
      addToast('Error eliminando publicaciones: ' + error.message, { type: 'error' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkChangeStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return;

    // Mapear el estado UI a los valores de la BD
    const statusMap: Record<string, string> = {
      'Publicado': 'active',
      'Pausado': 'paused',
      'Borrador': 'draft'
    };
    
    const dbStatus = statusMap[newStatus] || 'draft';

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ status: dbStatus })
        .in('id', Array.from(selectedIds))
        .eq('owner_id', user?.id);
      
      if (error) throw error;
      
      setItems((arr) => arr.map((i) => 
        selectedIds.has(i.id) ? { ...i, estadoPublicacion: newStatus } : i
      ));
      addToast(`${selectedIds.size} publicación(es) actualizadas a ${newStatus}`, { type: 'success' });
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error: any) {
      console.error('[Publicaciones] Error en cambio de estado masivo:', error);
      addToast('Error actualizando publicaciones: ' + error.message, { type: 'error' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkToggleFeatured = async (featured: boolean) => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ featured })
        .in('id', Array.from(selectedIds))
        .eq('owner_id', user?.id);
      
      if (error) throw error;
      
      setItems((arr) => arr.map((i) => 
        selectedIds.has(i.id) ? { ...i, featured } : i
      ));
      addToast(`${selectedIds.size} publicación(es) ${featured ? 'destacadas' : 'no destacadas'}`, { type: 'success' });
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error: any) {
      console.error('[Publicaciones] Error en cambio de destacado masivo:', error);
      addToast('Error actualizando publicaciones: ' + error.message, { type: 'error' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Filtrar items según búsqueda y filtros
  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
      // Búsqueda por título
      const matchesSearch = searchQuery === "" || 
        item.titulo.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtro por tipo de publicación
      const matchesType = filterType === "all" || item.listing_type === filterType;
      
      // Filtro por estado
      const matchesStatus = filterStatus === "all" || item.estadoPublicacion === filterStatus;
      
      // Filtro por destacado
      const matchesFeatured = filterFeatured === "all" || 
        (filterFeatured === "featured" && item.featured) ||
        (filterFeatured === "not-featured" && !item.featured);
      
      return matchesSearch && matchesType && matchesStatus && matchesFeatured;
    });
  }, [items, searchQuery, filterType, filterStatus, filterFeatured]);

  // Ordenar items filtrados
  const sortedItems = React.useMemo(() => {
    const itemsToSort = [...filteredItems];
    
    switch(sortBy) {
      case 'date-desc':
        // Más reciente primero (ya viene así de la DB)
        return itemsToSort;
      
      case 'date-asc':
        // Más antiguo primero
        return itemsToSort.reverse();
      
      case 'price-desc':
        // Precio mayor a menor
        return itemsToSort.sort((a, b) => (b.precio || 0) - (a.precio || 0));
      
      case 'price-asc':
        // Precio menor a mayor
        return itemsToSort.sort((a, b) => (a.precio || 0) - (b.precio || 0));
      
      case 'views-desc':
        // Más vistas primero
        return itemsToSort.sort((a, b) => (b.vistas || 0) - (a.vistas || 0));
      
      case 'clicks-desc':
        // Más clics primero
        return itemsToSort.sort((a, b) => (b.clics || 0) - (a.clics || 0));
      
      case 'title-asc':
        // Alfabético A-Z
        return itemsToSort.sort((a, b) => a.titulo.localeCompare(b.titulo));
      
      default:
        return itemsToSort;
    }
  }, [filteredItems, sortBy]);

  // Calcular estadísticas (basado en items ordenados)
  const stats = React.useMemo(() => {
    const total = sortedItems.length;
    const activos = sortedItems.filter(i => i.estadoPublicacion === 'Publicado').length;
    const pausados = sortedItems.filter(i => i.estadoPublicacion === 'Pausado').length;
    const borradores = sortedItems.filter(i => i.estadoPublicacion === 'Borrador').length;
    const destacados = sortedItems.filter(i => i.featured).length;
    const totalVistas = sortedItems.reduce((sum, i) => sum + (i.vistas || 0), 0);
    const totalClics = sortedItems.reduce((sum, i) => sum + (i.clics || 0), 0);
    
    return { total, activos, pausados, borradores, destacados, totalVistas, totalClics };
  }, [sortedItems]);

  return (
    <PanelPageLayout
      header={{
        title: "Mis Publicaciones",
        description: "Gestiona, duplica o elimina tus publicaciones existentes.",
        actions: (
          <div className="flex items-center gap-2 flex-wrap w-full">
            {/* Búsqueda */}
            {!selectionMode && items.length > 0 && (
              <div className="flex-1 min-w-[180px]">
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  shape="rounded"
                  fieldSize="md"
                  leftIcon={<IconSearch size={18} stroke={1.5} />}
                />
              </div>
            )}
            
            {/* Filtros en línea */}
            {!selectionMode && items.length > 0 && (
              <>
                {/* Ordenar */}
                <div className="min-w-[140px]">
                  <Select
                    options={[
                      { label: "Más reciente", value: "date-desc" },
                      { label: "Más antiguo", value: "date-asc" },
                      { label: "Precio: Mayor", value: "price-desc" },
                      { label: "Precio: Menor", value: "price-asc" },
                      { label: "Más vistas", value: "views-desc" },
                      { label: "Más clics", value: "clicks-desc" },
                      { label: "Título: A-Z", value: "title-asc" }
                    ]}
                    value={sortBy}
                    onChange={(val) => setSortBy(String(val))}
                    placeholder="Ordenar"
                    shape="rounded"
                    size="md"
                  />
                </div>
                
                {/* Tipo */}
                <div className="min-w-[100px]">
                  <Select
                    options={[
                      { label: "Todos", value: "all" },
                      { label: "Venta", value: "sale" },
                      { label: "Arriendo", value: "rent" },
                      { label: "Subasta", value: "auction" }
                    ]}
                    value={filterType}
                    onChange={(val) => setFilterType(String(val))}
                    placeholder="Tipo"
                    shape="rounded"
                    size="md"
                  />
                </div>
                
                {/* Estado */}
                <div className="min-w-[110px]">
                  <Select
                    options={[
                      { label: "Todos", value: "all" },
                      { label: "Publicado", value: "Publicado" },
                      { label: "Pausado", value: "Pausado" },
                      { label: "Borrador", value: "Borrador" }
                    ]}
                    value={filterStatus}
                    onChange={(val) => setFilterStatus(String(val))}
                    placeholder="Estado"
                    shape="rounded"
                    size="md"
                  />
                </div>
                
                {/* Impulsado */}
                <div className="min-w-[100px]">
                  <Select
                    options={[
                      { label: "Todos", value: "all" },
                      { label: "Impulsado", value: "featured" },
                      { label: "Normal", value: "not-featured" }
                    ]}
                    value={filterFeatured}
                    onChange={(val) => setFilterFeatured(String(val))}
                    placeholder="Impulso"
                    shape="rounded"
                    size="md"
                  />
                </div>
                
                {/* Limpiar filtros */}
                {(searchQuery || filterType !== "all" || filterStatus !== "all" || filterFeatured !== "all" || sortBy !== "date-desc") && (
                  <CircleButton 
                    size={40} 
                    variant="default"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                      setFilterStatus("all");
                      setFilterFeatured("all");
                      setSortBy("date-desc");
                    }}
                    aria-label="Limpiar filtros"
                  >
                    <IconFilterX size={20} stroke={1.5} />
                  </CircleButton>
                )}
              </>
            )}
            
            {/* Botón modo selección */}
            {!selectionMode && items.length > 0 && (
              <CircleButton
                size={40}
                variant="default"
                onClick={toggleSelectionMode}
                aria-label="Modo selección"
              >
                <IconChecks size={20} stroke={1.5} />
              </CircleButton>
            )}
            
            {/* Botones de vista */}
            {!selectionMode && (
              <div className="flex gap-2">
                <CircleButton 
                  size={40} 
                  variant={view === 'grid' ? 'primary' : 'default'} 
                  onClick={()=>setView('grid')}
                  aria-label="Vista de cuadrícula"
                >
                  <IconLayoutGrid size={20} stroke={1.5} />
                </CircleButton>
                <CircleButton 
                  size={40} 
                  variant={view === 'list' ? 'primary' : 'default'} 
                  onClick={()=>setView('list')}
                  aria-label="Vista de lista"
                >
                  <IconLayoutList size={20} stroke={1.5} />
                </CircleButton>
              </div>
            )}
          </div>
        ),
        children: !loading && items.length > 0 && !selectionMode ? (
          <div className="flex justify-between items-center gap-3 w-full flex-wrap">
            {/* Total */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
              <IconCar className="text-primary" size={16} stroke={1.5} />
              <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Total</span>
              <span className="text-sm font-bold text-lighttext dark:text-darktext">{stats.total}</span>
            </div>
            
            {/* Activos */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
              <IconCircleCheck className="text-green-600 dark:text-green-400" size={16} stroke={1.5} />
              <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Activos</span>
              <span className="text-sm font-bold text-lighttext dark:text-darktext">{stats.activos}</span>
            </div>
            
            {/* Pausados */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
              <IconPlayerPause className="text-amber-600 dark:text-amber-400" size={16} stroke={1.5} />
              <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Pausados</span>
              <span className="text-sm font-bold text-lighttext dark:text-darktext">{stats.pausados}</span>
            </div>
            
            {/* Borradores */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
              <IconX className="text-gray-600 dark:text-gray-400" size={16} stroke={1.5} />
              <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Borradores</span>
              <span className="text-sm font-bold text-lighttext dark:text-darktext">{stats.borradores}</span>
            </div>
            
            {/* Impulsados */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
              <IconBolt className="text-primary" size={16} stroke={1.5} />
              <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Impulsados</span>
              <span className="text-sm font-bold text-lighttext dark:text-darktext">{stats.destacados}</span>
            </div>
            
            {/* Vistas */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
              <IconEyeCheck className="text-blue-600 dark:text-blue-400" size={16} stroke={1.5} />
              <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Vistas</span>
              <span className="text-sm font-bold text-lighttext dark:text-darktext">{stats.totalVistas}</span>
            </div>
            
            {/* Clics */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
              <IconSearch className="text-primary" size={16} stroke={1.5} />
              <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Clics</span>
              <span className="text-sm font-bold text-lighttext dark:text-darktext">{stats.totalClics}</span>
            </div>
          </div>
        ) : undefined
      }}
    >
      {/* Barra de acciones en lote */}
      {selectionMode && (
        <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Info de selección */}
            <div className="flex items-center gap-3">
              <Button
                variant="neutral"
                size="sm"
                shape="rounded"
                onClick={toggleSelectionMode}
                className="inline-flex items-center gap-1.5"
              >
                <IconX size={16} stroke={2} />
                Cancelar
              </Button>
              
              {selectedIds.size > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20">
                    <span className="text-sm font-semibold text-primary">{selectedIds.size}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    seleccionada{selectedIds.size > 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona las publicaciones para aplicar acciones
                </span>
              )}
              
              {sortedItems.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {selectedIds.size === sortedItems.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              )}
            </div>

            {/* Acciones */}
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkChangeStatus('Publicado')}
                  disabled={bulkActionLoading}
                >
                  Publicar
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkChangeStatus('Pausado')}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center gap-1.5"
                >
                  <IconPlayerPause size={14} />
                  Pausar
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkChangeStatus('Borrador')}
                  disabled={bulkActionLoading}
                >
                  Borrador
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkToggleFeatured(true)}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center gap-1.5"
                >
                  <IconStarFilled size={14} />
                  Impulsar
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkToggleFeatured(false)}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center gap-1.5"
                >
                  <IconStar size={14} />
                  Quitar Impulso
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  shape="rounded"
                  onClick={bulkDelete}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center gap-1.5"
                >
                  <IconTrash size={14} />
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-8 text-center">
          <div className="text-gray-600 dark:text-gray-300">Cargando publicaciones...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-12 text-center">
          {/* Icono decorativo */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 mb-6">
            <IconCar size={48} stroke={1.5} className="text-primary" />
          </div>
          
          {/* Título */}
          <h3 className="text-2xl font-semibold text-black dark:text-white mb-2">
            No tienes publicaciones aún
          </h3>
          
          {/* Descripción */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Empieza a publicar tus vehículos y llega a miles de compradores interesados. 
            ¡Es rápido y fácil!
          </p>
          
          {/* Botón de acción */}
          <Button 
            variant="primary" 
            size="lg"
            onClick={()=>location.href='/panel/nueva-publicacion'}
            className="inline-flex items-center gap-2"
          >
            <IconPlus size={20} stroke={2} />
            Crear primera publicación
          </Button>
          
          {/* Tips */}
          <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              💡 <strong>Tip:</strong> Las publicaciones con más fotos y detalles obtienen hasta 3x más vistas
            </p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-12 text-center">
          {/* Icono decorativo */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 mb-6">
            <IconSearch size={48} stroke={1.5} className="text-gray-400 dark:text-gray-500" />
          </div>
          
          {/* Título */}
          <h3 className="text-2xl font-semibold text-black dark:text-white mb-2">
            No se encontraron publicaciones
          </h3>
          
          {/* Descripción */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            No hay publicaciones que coincidan con los filtros aplicados. 
            Intenta ajustar los criterios de búsqueda.
          </p>
          
          {/* Filtros activos */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                <IconSearch size={14} />
                "{searchQuery}"
              </span>
            )}
            {filterType !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                Tipo: {filterType === "sale" ? "Venta" : filterType === "rent" ? "Arriendo" : "Subasta"}
              </span>
            )}
            {filterStatus !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                Estado: {filterStatus}
              </span>
            )}
            {filterFeatured !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                {filterFeatured === "featured" ? "Solo destacados" : "No destacados"}
              </span>
            )}
          </div>
          
          {/* Botón de acción */}
          <Button 
            variant="neutral" 
            size="md" 
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
              setFilterStatus("all");
              setFilterFeatured("all");
            }}
            className="inline-flex items-center gap-2"
          >
            <IconFilterX size={18} stroke={2} />
            Limpiar todos los filtros
          </Button>
        </div>
      ) : !mounted || view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sortedItems.map((i) => (
            <div 
              key={i.id} 
              className={`relative transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} 
                         ${selectedIds.has(i.id) ? 'scale-[0.98]' : ''}`}
              onClick={() => selectionMode && toggleSelectItem(i.id)}
            >
              <div className={`${selectionMode ? 'pointer-events-none' : ''} ${selectedIds.has(i.id) ? 'opacity-75' : ''} transition-opacity`}>
                <AdminVehicleCard
                  vehicle={i}
                  layout="vertical"
                  userId={user?.id}
                  onView={(id: string) => window.location.href = `/vehiculo/${id}`}
                  onEdit={(id: string) => editarVehiculo(id)}
                  onDuplicate={(id: string) => duplicar(id)}
                  onDelete={(id: string) => confirmarEliminar(id, i.titulo)}
                  onChangeStatus={(id: string, newStatus: 'Publicado' | 'Pausado' | 'Borrador') => cambiarEstadoIndividual(id, newStatus)}
                  onBoost={(id: string) => impulsarPublicacion(id)}
                />
              </div>
              {selectionMode && (
                <div className="absolute top-3 left-3 z-50 pointer-events-none">
                  <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all shadow-xl
                                  ${selectedIds.has(i.id) 
                                    ? 'bg-primary border-primary scale-110' 
                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary'}`}
                  >
                    {selectedIds.has(i.id) && (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((i) => (
            <div 
              key={i.id} 
              className={`relative transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} 
                         ${selectedIds.has(i.id) ? 'scale-[0.99]' : ''}`}
              onClick={() => selectionMode && toggleSelectItem(i.id)}
            >
              <div className={`${selectionMode ? 'pointer-events-none' : ''} ${selectedIds.has(i.id) ? 'opacity-75' : ''} transition-opacity`}>
                <AdminVehicleCard
                  vehicle={i}
                  layout="horizontal"
                  userId={user?.id}
                  onView={(id: string) => window.location.href = `/vehiculo/${id}`}
                  onEdit={(id: string) => editarVehiculo(id)}
                  onDuplicate={(id: string) => duplicar(id)}
                  onDelete={(id: string) => confirmarEliminar(id, i.titulo)}
                  onChangeStatus={(id: string, newStatus: 'Publicado' | 'Pausado' | 'Borrador') => cambiarEstadoIndividual(id, newStatus)}
                  onBoost={(id: string) => impulsarPublicacion(id)}
                />
              </div>
              {selectionMode && (
                <div className="absolute top-4 left-4 z-50 pointer-events-none">
                  <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all shadow-xl
                                  ${selectedIds.has(i.id) 
                                    ? 'bg-primary border-primary scale-110' 
                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary'}`}
                  >
                    {selectedIds.has(i.id) && (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {modalMounted && deleteModalOpen && vehicleToDelete && createPortal(
        <>
          {/* Overlay con blur */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
            style={{ zIndex: 99999, animation: 'fadeIn 0.2s ease-out' }}
            onClick={() => {
              setDeleteModalOpen(false);
              setVehicleToDelete(null);
            }}
          />
          
          {/* Modal centrado */}
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 100000 }}
          >
            <div 
              className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-modal max-w-md w-full pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: 'modalSlideUp 0.3s ease-out' }}
            >
              {/* Header con gradiente rojo */}
              <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-6 py-6">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setVehicleToDelete(null);
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Icono de advertencia */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white text-center">
                  ¿Eliminar publicación?
                </h3>
              </div>

              {/* Contenido */}
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-2 text-center">
                  Estás a punto de eliminar la publicación:
                </p>
                <p className="text-lg font-bold text-black dark:text-white text-center mb-4 px-4 py-3 bg-lightbg dark:bg-darkbg rounded-xl">
                  {vehicleToDelete.titulo}
                </p>
                <div className="flex items-center gap-2 justify-center mb-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Esta acción no se puede deshacer</span>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <Button
                    variant="neutral"
                    size="md"
                    shape="rounded"
                    className="flex-1"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setVehicleToDelete(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    shape="rounded"
                    className="flex-1 !bg-red-600 hover:!bg-red-700 active:!bg-red-800"
                    onClick={eliminar}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </PanelPageLayout>
  );
}
