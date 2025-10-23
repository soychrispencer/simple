"use client";

import React from "react";
import { useParams } from "next/navigation";
import { IconClock } from '@tabler/icons-react';
import { getPortadaUrl } from "@/lib/supabaseStorage";
import Image from 'next/image';
// IconMapPin, IconWorld eliminados (no uso directo tras refactor de ubicación)
import { useAuth } from "@/context/AuthContext";
// Tipos laxos temporales durante migración de autenticación
type AnyRecord = any;
// regiones, comunasPorRegion e IconDots eliminados (no uso)
import PublicReviews from '@/components/panel/perfil/PublicReviews';
import AddReviewForm from '@/components/panel/perfil/AddReviewForm';
import HeroProfileCard from '@/components/perfil/HeroProfileCard';
import { ScheduleList } from '@/components/perfil/ScheduleItem';
import SharePopover from '@/components/perfil/SharePopover';
import ContactModal from '@/components/ui/modal/ContactModal';
import UserFeaturedSlider from '@/components/slider/UserFeaturedSlider';
import UserVehiclesList from '@/components/vehicles/UserVehiclesList';
import AdvancedFiltersSidebar from "@/components/filters/AdvancedFiltersSidebar";
import { useListingFilters } from "@/hooks/useListingFilters";

// Eliminado ProfileOptionsMenu legacy en favor de SharePopover

export default function PublicProfilePage() {
  // Obtener usuario y cliente supabase una sola vez
  const { supabase } = useAuth();
  // Menú de opciones para compartir el perfil
  const { username } = useParams();
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showMenu, setShowMenu] = React.useState(false);
  const shareBtnRef = React.useRef<HTMLDivElement | null>(null);
  // Estado local para reseñas públicas
  const [reseñas, setReseñas] = React.useState<any[]>([]); // mantenemos nombre local hasta refactor UI
  // --- HORARIOS DE ATENCIÓN ---
  const [horarioSemanal, setHorarioSemanal] = React.useState<any[]>([]); // schedules weekly
  const [diasEspeciales, setDiasEspeciales] = React.useState<any[]>([]); // special schedules
  // loadingHorarios eliminado: se puede derivar de horarioSemanal/diasEspeciales vacíos + loading general si se necesitara

  // Estado para mostrar modales
  const [showHorarioModal, setShowHorarioModal] = React.useState(false);
  const [showReseñasModal, setShowReseñasModal] = React.useState(false);
  const [showAddReseñaModal, setShowAddReseñaModal] = React.useState(false);
  const [showContactModal, setShowContactModal] = React.useState(false);
  const [redes, setRedes] = React.useState<any>({});

  // Filtros para vehículos
  const { filters, update } = useListingFilters('');
  const [totalVehicles, setTotalVehicles] = React.useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    update({ [name]: value, page: 1 }, true);
  };

  const handleColorChange = (color: string) => {
    update({ color, page: 1 }, true);
  };

  const handleMultiChange = (changes: Record<string, any>) => {
    update({ ...changes, page: 1 }, true);
  };

  const handleSyncChange = (changes: Record<string, any>) => {
    update(changes, false); // No actualizar URL para sincronización
  };

  const handleClearFilters = () => {
    update({
      type_id: '',
      brand_id: '',
      model_id: '',
      body_type: '',
      region_id: '',
      commune_id: '',
      price_min: '',
      price_max: '',
      year_min: '',
      year_max: '',
      transmission: '',
      fuel_type: '',
      color: '',
      estado: '',
      page: 1
    }, true);
  };

  // Inicializar reseñas desde el perfil al cargar
  React.useEffect(() => {
    if (profile && profile.reseñas && Array.isArray(profile.reseñas)) {
      setReseñas(profile.reseñas);
    }
  }, [profile]);

  // Cargar reseñas (reviews) desde Supabase al cargar el perfil
  React.useEffect(() => {
    async function fetchReseñas() {
      if (!profile?.id) return;
      const { data, error } = await (supabase.from('reviews') as any)
        .select('id, rating, comment, created_at, user_id, profile_id')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        // Puedes mostrar el usuario como 'Anónimo' o buscar el nombre si lo deseas
        setReseñas((data as any[]).map((r: AnyRecord) => ({
          id: r.id,
          usuario: 'Anónimo',
          calificacion: r.rating,
          comentario: r.comment,
          fecha: r.created_at ? new Date(r.created_at).toLocaleDateString() : ''
        })));
      }
    }
    fetchReseñas();
  }, [profile?.id, supabase]);

  // Función para agregar reseña en Supabase
  async function handleAddReview(data: { calificacion: number; comentario: string }) {
    if (!profile?.id) return;
    // Si tienes usuario autenticado, puedes obtener el user_id
    let userId = null;
    try {
      const { data: authUser } = await supabase.auth.getUser();
      userId = authUser?.user?.id || null;
    } catch {}
    const { error } = await (supabase.from('reviews') as any)
      .insert({ profile_id: profile.id, user_id: userId, rating: data.calificacion, comment: data.comentario });
    if (!error) {
      // Refrescar reseñas
      const { data: nuevasReseñas } = await (supabase.from('reviews') as any)
        .select('id, rating, comment, created_at, user_id, profile_id')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
      if (Array.isArray(nuevasReseñas)) {
        setReseñas((nuevasReseñas as any[]).map((r: AnyRecord) => ({
          id: r.id,
          usuario: 'Anónimo',
          calificacion: r.rating,
          comentario: r.comment,
          fecha: r.created_at ? new Date(r.created_at).toLocaleDateString() : ''
        })));
      }
    }
  }

  React.useEffect(() => {
    async function fetchProfileAndIncrementVisits() {
      setLoading(true);
      setError("");
      // 1. Obtener el perfil con JOIN de comuna y región
      const { data, error } = await (supabase.from("profiles") as any)
        .select(`*, commune:commune_id(*), region:region_id(*), empresa:companies(*, commune:commune_id(*), region:region_id(*))`)
        .eq("username", username as any)
        .single();
      if (error || !data) {
        setError("Perfil no encontrado");
        setProfile(null);
      } else {
        setProfile(data);
        // 2. Incrementar visitas solo si el perfil existe
        await (supabase.from("profiles") as any)
          .update({ visits: (data.visits || 0) + 1 })
          .eq("id", data.id);
      }
      setLoading(false);
    }
    if (username) fetchProfileAndIncrementVisits();
  }, [username, supabase]);

  React.useEffect(() => {
    async function fetchHorarios() {
  // (loading horarios) indicador puntual ya no usado
      if (!profile?.id) return;
      // Horario semanal
      const { data: horarioData } = await supabase
        .from('schedules')
        .select('*')
        .eq('profile_id', profile.id);
      // Días especiales
      const { data: especialesData } = await supabase
        .from('special_schedules')
        .select('*')
        .eq('profile_id', profile.id)
        .order('date', { ascending: true });
      setHorarioSemanal(horarioData || []);
      setDiasEspeciales(especialesData || []);
  // fin carga horarios
    }
    if (profile?.id) fetchHorarios();
  }, [profile?.id, supabase]);

  // Consultar redes sociales al cargar el perfil
  React.useEffect(() => {
    async function fetchRedesSociales() {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (data) setRedes(data);
    }
    fetchRedesSociales();
  }, [profile?.id, supabase]);

  // Contar total de vehículos del usuario
  React.useEffect(() => {
    async function fetchTotalVehicles() {
      if (!profile?.id) return;
      const { count } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('visibility', 'normal')
        .eq('owner_id', profile.id);
      if (count !== null) {
        setTotalVehicles(count);
      }
    }
    fetchTotalVehicles();
  }, [profile?.id, supabase]);

  if (loading) return <div className="p-8 text-center">Cargando perfil...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  if (!profile) return null;

  const isEmpresa = profile.plan === "empresa" || profile.user_type === "company" || !!profile.empresa;
  const name = profile.public_name?.trim()
    || (isEmpresa ? (profile.empresa?.legal_name || "Empresa") : `${profile.first_name || ""} ${profile.last_name || ""}`.trim())
    || "Usuario";

  // Mostrar nombre de región y comuna desde la base de datos (JOIN)
  const regionLabel = profile.region?.name || "";
  const comunaLabel = profile.commune?.name || "";

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Determinar si el negocio está abierto
  const getAbiertoStatus = () => {
    if (profile.horario247) return true;
    
    const ahora = new Date();
    const diaSemana = diasSemana[ahora.getDay() === 0 ? 6 : ahora.getDay() - 1]; // Ajustar para que Domingo sea 6
    const hoyStr = ahora.toISOString().slice(0,10);
    
    // Buscar horario especial para hoy
    const especial = diasEspeciales.find(h => h.fecha === hoyStr);
    if (especial) {
      if (especial.cerrado) return false;
      if (especial.inicio && especial.fin) {
        const inicio = new Date(`${hoyStr}T${especial.inicio}`);
        const fin = new Date(`${hoyStr}T${especial.fin}`);
        return ahora >= inicio && ahora <= fin;
      }
    }
    
    // Buscar horario semanal
    const semanal = horarioSemanal.find(h => h.weekday === diaSemana);
    if (semanal && !semanal.closed && semanal.start_time && semanal.end_time) {
      const inicio = new Date(`${hoyStr}T${semanal.start_time}`);
      const fin = new Date(`${hoyStr}T${semanal.end_time}`);
      return ahora >= inicio && ahora <= fin;
    }
    
    return false;
  };
  
  const abierto = getAbiertoStatus();

  return (
    <>
      <div className="w-full px-4 md:px-8">
        {/* Hero Portada Modernizado */}
  <section className="relative w-full aspect-[32/10] md:aspect-[32/9] rounded-2xl overflow-hidden group shadow-token-lg">
          {/* Imagen */}
          {profile.cover_url ? (
            <Image
              src={profile.cover_url.startsWith('http') ? profile.cover_url : getPortadaUrl(supabase, profile.cover_url)}
              alt="Portada del perfil"
              fill
              /* Ajuste responsive: siempre ocupa ancho completo del viewport */
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-lg">Sin portada</div>
          )}
          {/* Tarjeta flotante HeroProfileCard */}
          {/* Tarjeta movida debajo: se deja portada limpia */}
        </section>
        {/* Tarjeta ahora debajo de la portada (no superpuesta) */}
        <div className="w-full mt-[10px]">
          <div className="w-full max-w-screen-2xl mx-auto">
            <HeroProfileCard
              profile={{...profile, _shareBtnRef: shareBtnRef}}
              name={name}
              onContact={() => setShowContactModal(true)}
              onShare={() => setShowMenu(!showMenu)}
              locationLabel={[
                profile.direccion || profile.empresa?.address,
                comunaLabel || (profile.empresa?.commune?.name),
                regionLabel || (profile.empresa?.region?.name)
              ].filter(Boolean).join(', ') || 'No especificada'}
              onOpenMaps={() => {
                const parts = [] as string[];
                const address = profile.direccion || profile.empresa?.address;
                const commune = comunaLabel || profile.empresa?.commune?.name;
                const region = regionLabel || profile.empresa?.region?.name;
                if (address) parts.push(address);
                if (commune) parts.push(commune);
                if (region) parts.push(region);
                const addr = parts.join(', ');
                if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`,'_blank');
              }}
              hasSchedule={!!horarioSemanal.length || profile.horario247}
              onOpenSchedule={() => setShowHorarioModal(true)}
              websiteLabel={(profile.website || profile.empresa?.website) || null}
              onOpenWebsite={() => {
                const raw = (profile.website || profile.empresa?.website);
                if (!raw) return;
                const url = raw.startsWith('http') ? raw : `https://${raw}`;
                window.open(url,'_blank');
              }}
              ratingValue={profile.rating ? Number(profile.rating) : 0}
              ratingTotal={reseñas.length}
              onOpenReviews={() => setShowReseñasModal(true)}
              onAddReview={() => setShowAddReseñaModal(true)}
              redes={redes}
              online={profile.online}
              abierto={abierto}
            />
          </div>
        </div>

        {/* Slider de vehículos impulsados del usuario */}
        {profile?.id && (
          <UserFeaturedSlider 
            userId={profile.id} 
            title="Vehículos Impulsados" 
            limit={3} 
          />
        )}

        {/* Lista de vehículos del vendedor */}
        {profile?.id && (
          <div className="w-full px-4 md:px-8">
            <div className="flex flex-col md:flex-row gap-8 max-w-[1400px] mx-auto pb-8">
              <div className="w-full md:w-64 flex-shrink-0">
                <AdvancedFiltersSidebar
                  filters={filters}
                  onChange={handleChange}
                  onColorChange={handleColorChange}
                  onMultiChange={handleMultiChange}
                  onSyncChange={handleSyncChange}
                  onClearFilters={handleClearFilters}
                />
              </div>
              <div className="flex-1">
                <UserVehiclesList
                  userId={profile.id}
                  title="Vehículos del Vendedor"
                  showFilters={false}
                  page={filters.page}
                  pageSize={filters.page_size}
                  onPageChange={(page) => update({ page }, true)}
                  total={totalVehicles}
                  sellerInfo={{
                    username: profile.username,
                    public_name: profile.public_name || profile.first_name + ' ' + profile.last_name,
                    avatar_url: profile.avatar_url,
                    email: profile.email,
                    phone: profile.phone,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Grilla secundaria eliminada: toda la información consolidada en la tarjeta principal */}
        {/* Segunda fila */}
        <div className="flex flex-row justify-between items-center w-full gap-4 mt-0">
          {/* Izquierda: (eliminada descripción y botones, ahora dentro de la tarjeta) */}
        </div>
      </div>
      {showHorarioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-horarios-title">
          <div className="relative w-full max-w-xl bg-lightcard dark:bg-darkcard rounded-2xl shadow-token-lg p-6 md:p-8 border border-lightborder/20 dark:border-darkborder/20 animate-fade-scale-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-base focus-ring"
              onClick={() => setShowHorarioModal(false)}
              aria-label="Cerrar modal de horarios"
              autoFocus
            >
              &times;
            </button>
            <h2 id="modal-horarios-title" className="text-xl font-semibold tracking-tight mb-5 flex items-center gap-2 text-lighttext dark:text-darktext">
              <IconClock size={22} /> Horarios de Atención
            </h2>
            <ScheduleList
              weekly={horarioSemanal as any}
              specials={diasEspeciales as any}
              diasSemana={diasSemana}
              is247={profile?.horario247}
            />
          </div>
        </div>
      )}
      {showReseñasModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-reseñas-title">
          <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-token-lg border border-lightborder/20 dark:border-darkborder/20 p-8 min-w-[400px] max-w-[600px] max-h-[90vh] overflow-hidden relative animate-scale-in origin-center">
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkborder/10 flex items-center justify-center transition-colors focus-ring z-10"
              onClick={() => setShowReseñasModal(false)}
              aria-label="Cerrar listado de opiniones"
              autoFocus
            >
              <span className="text-lighttext/60 dark:text-darktext/60 text-lg leading-none">×</span>
            </button>
            <div className="pr-12">
              <h2 id="modal-reseñas-title" className="text-2xl font-bold mb-6 flex items-center gap-3 text-lighttext dark:text-darktext">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-xl">★</span>
                </div>
                Opiniones
              </h2>
              <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-lightborder/30 dark:scrollbar-thumb-darkborder/30 scrollbar-track-transparent">
                <PublicReviews puntuacion={profile.rating ? Number(profile.rating) : 0} reseñas={reseñas} />
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddReseñaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-agregar-reseña-title">
          <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-token-lg border border-lightborder/20 dark:border-darkborder/20 p-8 min-w-[450px] max-w-[600px] max-h-[90vh] overflow-hidden relative animate-scale-in origin-center">
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkborder/10 flex items-center justify-center transition-colors focus-ring z-10"
              onClick={() => setShowAddReseñaModal(false)}
              aria-label="Cerrar formulario de opinión"
              autoFocus
            >
              <span className="text-lighttext/60 dark:text-darktext/60 text-lg leading-none">×</span>
            </button>
            <div className="pr-12">
              <h2 id="modal-agregar-reseña-title" className="text-2xl font-bold mb-6 flex items-center gap-3 text-lighttext dark:text-darktext">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-xl">✎</span>
                </div>
                Agregar opinión
              </h2>
              <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-lightborder/30 dark:scrollbar-thumb-darkborder/30 scrollbar-track-transparent">
                <AddReviewForm profileId={profile.id} onSubmit={async (data) => { await handleAddReview(data); setShowAddReseñaModal(false); }} />
              </div>
            </div>
          </div>
        </div>
      )}
  <SharePopover open={showMenu} onClose={() => setShowMenu(false)} anchorEl={shareBtnRef.current} username={username as string} />
  <ContactModal
    isOpen={showContactModal}
    onClose={() => setShowContactModal(false)}
    contactName={profile?.nombre || 'Usuario'}
    email={profile?.email}
    phone={profile?.telefono}
    whatsapp={redes?.whatsapp}
    contextType="profile"
  />
    </>
  );
}
