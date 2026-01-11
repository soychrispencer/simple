"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { getPortadaUrl, getAvatarUrl } from "@/lib/supabaseStorage";
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
import { ContactModal, Modal } from '@simple/ui';
import UserFeaturedSlider from '@/components/slider/UserFeaturedSlider';
import UserVehiclesList from '@/components/vehicles/UserVehiclesList';
import AdvancedFiltersSidebar from "@/components/filters/AdvancedFiltersSidebar";
import { useListingFilters } from "@/hooks/useListingFilters";

// Eliminado ProfileOptionsMenu legacy en favor de SharePopover

export default function PublicProfilePage() {
  // Obtener usuario y cliente supabase una sola vez
  const { supabase, user, profile: authProfile } = useAuth();
  // Menú de opciones para compartir el perfil
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showMenu, setShowMenu] = React.useState(false);
  const [shareAnchor, setShareAnchor] = React.useState<HTMLElement | null>(null);
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

  const [listingContact, setListingContact] = React.useState<{
    id: string | null;
    title: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  } | null>(null);

  // Filtros para vehículos
  const { filters, update } = useListingFilters('');
  const [totalVehicles, setTotalVehicles] = React.useState(0);
  const viewerPlanKey = String((authProfile as any)?.plan_key ?? 'free');
  const allowBoostOnPublicPage = viewerPlanKey !== 'free';
  const avatarUrl = profile?.avatar_url
    ? profile.avatar_url.startsWith('http')
      ? profile.avatar_url
      : getAvatarUrl(supabase, profile.avatar_url)
    : '';

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

  const handleApplyFilters = () => {
    update({}, true);
  };

  const handleShareToggle = () => {
    setShareAnchor(shareBtnRef.current);
    setShowMenu((value) => !value);
  };

  const handleShareClose = () => {
    setShowMenu(false);
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
        .select('id, rating, comment, created_at, reviewer_id, reviewed_profile_id')
        .eq('reviewed_profile_id', profile.id)
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
      .insert({ reviewed_profile_id: profile.id, reviewer_id: userId, rating: data.calificacion, comment: data.comentario });
    if (!error) {
      // Refrescar reseñas
      const { data: nuevasReseñas } = await (supabase.from('reviews') as any)
        .select('id, rating, comment, created_at, reviewer_id, reviewed_profile_id')
        .eq('reviewed_profile_id', profile.id)
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
      const rawParam = Array.isArray(username) ? username[0] : (username as any);
      const param = typeof rawParam === 'string' ? rawParam.trim() : '';

      const baseSelect = `*, commune:commune_id(*), region:region_id(*), company:company_id(*, commune:commune_id(*), region:region_id(*))`;
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const placeholderRe = /^u-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

      let data: any = null;
      let fetchError: any = null;

      // 1) Buscar por slug
      {
        const res = await (supabase.from("public_profiles") as any)
          .select(baseSelect)
          .eq("slug", param)
          .maybeSingle();
        data = res?.data ?? null;
        fetchError = res?.error ?? null;
      }

      // 2) Fallback: si viene un id o placeholder u-<uuid>, buscar por owner_profile_id
      if (!data) {
        const maybeUserId = placeholderRe.test(param) ? param.match(placeholderRe)?.[1] : (uuidRe.test(param) ? param : null);
        if (maybeUserId) {
          const res = await (supabase.from("public_profiles") as any)
            .select(baseSelect)
            .eq("owner_profile_id", maybeUserId)
            .order('created_at', { ascending: false })
            .maybeSingle();
          data = res?.data ?? null;
          fetchError = res?.error ?? null;
          // Si encontramos un slug real, normalizamos la URL
          if (data?.slug && data.slug !== param) {
            router.replace(`/perfil/${data.slug}`);
          }
        }
      }

      if (fetchError || !data) {
        setError("Perfil no encontrado");
        setProfile(null);
      } else {
        setProfile(data);
        await (supabase.from("public_profiles") as any)
          .update({ visits: (data.visits || 0) + 1 })
          .eq("id", data.id);
      }
      setLoading(false);
    }
    if (username) fetchProfileAndIncrementVisits();
  }, [username, supabase, router]);

  React.useEffect(() => {
    if (!profile) {
      setHorarioSemanal([]);
      setDiasEspeciales([]);
      setRedes({});
      setListingContact(null);
      return;
    }

    setRedes({
      facebook: profile.facebook,
      instagram: profile.instagram,
      linkedin: profile.linkedin,
      tiktok: profile.tiktok,
      twitter: profile.twitter,
      youtube: profile.youtube,
      whatsapp: profile.whatsapp,
      whatsapp_type: profile.whatsapp_type,
    });

    async function fetchSchedules() {
      if (!profile.id) return;
      const [{ data: weekly }, { data: specials }] = await Promise.all([
        supabase.from('schedules').select('*').eq('public_profile_id', profile.id),
        supabase.from('special_schedules').select('*').eq('public_profile_id', profile.id).order('date', { ascending: true }),
      ]);

      const WEEKDAY_MAP: Record<string, string> = {
        monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles', thursday: 'jueves', friday: 'viernes', saturday: 'sábado', sunday: 'domingo',
        lunes: 'lunes', martes: 'martes', miércoles: 'miércoles', jueves: 'jueves', viernes: 'viernes', sábado: 'sábado', domingo: 'domingo'
      };
      const weeklyMapped = Array.isArray(weekly)
        ? weekly.map((h: any) => ({
            id: h.id,
            dia: WEEKDAY_MAP[h.weekday?.toLowerCase()] || h.weekday,
            inicio: h.start_time || null,
            fin: h.end_time || null,
            cerrado: !!h.closed,
          }))
        : [];
      setHorarioSemanal(weeklyMapped);

      const specialsMapped = Array.isArray(specials)
        ? specials.map((e: any) => ({
            id: e.id,
            fecha: e.date,
            inicio: e.start_time || null,
            fin: e.end_time || null,
            cerrado: !!e.closed,
          }))
        : [];
      setDiasEspeciales(specialsMapped);
    }

    fetchSchedules();
  }, [profile, supabase]);

  // Fallback público: tomar contacto desde el último aviso publicado del usuario/perfil.
  // Esto explica por qué en detalle de vehículo aparecen datos que el perfil público puede no tener configurados.
  React.useEffect(() => {
    async function fetchListingContact() {
      if (!profile?.id && !profile?.owner_profile_id) {
        setListingContact(null);
        return;
      }

      try {
        let q = (supabase.from('listings') as any)
          .select('id, title, contact_email, contact_phone, contact_whatsapp')
          .eq('status', 'published')
          .neq('visibility', 'hidden')
          .order('created_at', { ascending: false })
          .limit(1);

        if (profile?.id) {
          q = q.eq('public_profile_id', profile.id);
        } else if (profile?.owner_profile_id) {
          q = q.eq('user_id', profile.owner_profile_id);
        }

        const { data, error } = await q;
        if (error) {
          setListingContact(null);
          return;
        }

        const row = Array.isArray(data) ? data[0] : null;
        setListingContact({
          id: row?.id ?? null,
          title: row?.title ?? null,
          email: row?.contact_email ?? null,
          phone: row?.contact_phone ?? null,
          whatsapp: row?.contact_whatsapp ?? null,
        });
      } catch {
        setListingContact(null);
      }
    }

    void fetchListingContact();
  }, [profile?.id, profile?.owner_profile_id, supabase]);

  // Contar total de vehículos del usuario
  const profileId = profile?.id;
  const ownerId = (profile as any)?.owner_profile_id as string | undefined;

  React.useEffect(() => {
    async function fetchTotalVehicles() {
      if (!profileId) return;
      let query = supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .neq('visibility', 'hidden');

      // Preferimos el vínculo por perfil público cuando está bien seteado;
      // como fallback, contamos por el dueño (user_id) para no mostrar 0 si hay data histórica.
      if (ownerId) {
        query = query.or(`public_profile_id.eq.${profileId},user_id.eq.${ownerId}`);
      } else {
        query = query.eq('public_profile_id', profileId);
      }

      const { count } = await query;
      if (count !== null) {
        setTotalVehicles(count);
      }
    }
    fetchTotalVehicles();
  }, [profileId, ownerId, supabase]);

  if (loading) return <div className="p-8 text-center">Cargando perfil...</div>;
  if (error) return <div className="p-8 text-center text-[var(--color-danger)]">{error}</div>;

  if (!profile) return null;

  const useCompany = !!profile.company;
  const company = useCompany ? profile.company : null;

  const name = profile.public_name?.trim()
    || (useCompany ? (company?.legal_name || company?.name || company?.public_name || "Mi Negocio") : `${profile.first_name || ""} ${profile.last_name || ""}`.trim())
    || "Mi Negocio";

  // Mostrar nombre de región y comuna desde la base de datos (JOIN)
  const regionLabel = useCompany ? (company?.region?.name || "") : (profile.region?.name || "");
  const comunaLabel = useCompany ? (company?.commune?.name || "") : (profile.commune?.name || "");

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const horario247 = Boolean((profile as any)?.horario247 || (profile as any)?.preferences?.horario247);

  // Determinar si el negocio está abierto
  const getAbiertoStatus = () => {
    const ahora = new Date();
    const diaSemana = diasSemana[ahora.getDay() === 0 ? 6 : ahora.getDay() - 1]; // Ajustar para que Domingo sea 6
    const diaSemanaKey = diaSemana.toLowerCase();

    // IMPORTANTE: usar fecha local (no UTC) para evitar desfases de día/hora.
    const hoyStr = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

    const makeLocalDateTime = (dateStr: string, timeStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const [hh, mm] = timeStr.split(':').map(Number);
      return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
    };
    
    // Buscar horario especial para hoy
    const especial = diasEspeciales.find(h => h.fecha === hoyStr);
    if (especial) {
      if (especial.cerrado) return false;
      if (especial.inicio && especial.fin) {
        const inicio = makeLocalDateTime(hoyStr, especial.inicio);
        const fin = makeLocalDateTime(hoyStr, especial.fin);
        return ahora >= inicio && ahora <= fin;
      }
    }

    // 24/7: abierto siempre, salvo que exista un horario especial que cierre hoy.
    if (horario247) return true;
    
    // Buscar horario semanal
    const semanal = horarioSemanal.find(h => (h.dia || h.weekday || '').toLowerCase() === diaSemanaKey);
    if (semanal && !semanal.cerrado && semanal.inicio && semanal.fin) {
      const inicio = makeLocalDateTime(hoyStr, semanal.inicio);
      const fin = makeLocalDateTime(hoyStr, semanal.fin);
      return ahora >= inicio && ahora <= fin;
    }
    
    return false;
  };
  
  const abierto = getAbiertoStatus();

  const billingData = (company?.billing_data as any) || {};
  const locationLabel = [
    useCompany ? (company?.address_legal || company?.address) : (profile.address || profile.direccion),
    comunaLabel,
    regionLabel,
  ]
    .filter(Boolean)
    .join(', ') || 'No especificada';

  const websiteValue = profile.website || null;

  const contactEmail = useCompany
    ? (profile.contact_email || company?.email || company?.billing_email || profile.email || null)
    : (profile.contact_email || profile.email || null);

  const contactPhone = useCompany
    ? (company?.phone || profile.contact_phone || profile.phone || profile.telefono || company?.billing_phone || null)
    : (profile.contact_phone || profile.phone || profile.telefono || null);

  const whatsappValue = useCompany
    ? ((billingData.whatsapp as string) || profile.whatsapp || null)
    : (profile.whatsapp || null);

  const resolvedContactEmail = contactEmail || listingContact?.email || null;
  const resolvedContactPhone = contactPhone || listingContact?.phone || null;
  const resolvedWhatsapp = whatsappValue || listingContact?.whatsapp || redes?.whatsapp || null;

  const contactName =
    (useCompany ? (billingData.contact_name as string) : null)
    || (useCompany ? company?.legal_name : profile.public_name)
    || name
    || 'Contacto';

  const receiverId = (profile as any)?.owner_profile_id as string | undefined;
  const isOwnProfile = Boolean(user?.id && receiverId && user.id === receiverId);
  const canSendDirectMessage = Boolean(supabase && user?.id && receiverId && listingContact?.id && !isOwnProfile);
  const messageDisabledHint = !user?.id
    ? 'Debes iniciar sesión para enviar un mensaje.'
    : !receiverId
      ? 'No se pudo resolver el destinatario.'
      : isOwnProfile
        ? 'No puedes enviarte mensajes a ti mismo.'
        : !listingContact?.id
          ? 'Este perfil no tiene publicaciones para asociar un mensaje.'
          : undefined;

  const onSendDirectMessage = async (content: string) => {
    if (!supabase || !user?.id) {
      throw new Error('Debes iniciar sesión para enviar un mensaje.');
    }
    if (!receiverId) {
      throw new Error('No se pudo resolver el destinatario.');
    }
    if (receiverId === user.id) {
      throw new Error('No puedes enviarte mensajes a ti mismo.');
    }
    if (!listingContact?.id) {
      throw new Error('No se encontró una publicación para asociar el mensaje.');
    }

    let DOMPurify: any = null;
    try {
      DOMPurify = require('isomorphic-dompurify');
    } catch {}
    const sanitized = DOMPurify ? DOMPurify.sanitize(content) : content;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      listing_id: listingContact.id,
      subject: listingContact.title || `Perfil: ${name}`,
      content: sanitized,
      is_read: false,
    });
    if (error) throw error;
  };

  return (
    <>
      <div className="w-full px-4 md:px-8">
          {/* Hero Portada Modernizado */}
        <section className="relative w-full aspect-[32/10] md:aspect-[32/9] overflow-hidden group card-surface shadow-card" style={{ borderRadius: 'var(--card-radius)' }}>
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
            <div className="absolute inset-0 flex items-center justify-center text-lighttext/60 dark:text-darktext/60 text-lg">Sin portada</div>
          )}
          {/* Tarjeta flotante HeroProfileCard */}
          {/* Tarjeta movida debajo: se deja portada limpia */}
        </section>
        {/* Tarjeta ahora debajo de la portada (no superpuesta) */}
        <div className="w-full mt-[10px]">
          <div className="w-full max-w-screen-2xl mx-auto">
            <HeroProfileCard
              profile={{ ...profile, avatar_url: avatarUrl }}
              name={name}
              onContact={() => setShowContactModal(true)}
              onShare={handleShareToggle}
              locationLabel={locationLabel}
              onOpenMaps={() => {
                const parts = [] as string[];
                const address = useCompany ? (company?.address_legal || company?.address) : (profile.address || profile.direccion);
                const commune = useCompany ? (company?.commune?.name || comunaLabel) : comunaLabel;
                const region = useCompany ? (company?.region?.name || regionLabel) : regionLabel;
                if (address) parts.push(address);
                if (commune) parts.push(commune);
                if (region) parts.push(region);
                const addr = parts.join(', ');
                if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`,'_blank');
              }}
              hasSchedule={!!horarioSemanal.length || horario247}
              onOpenSchedule={() => setShowHorarioModal(true)}
              websiteLabel={websiteValue}
              onOpenWebsite={() => {
                const raw = websiteValue;
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
              shareButtonRef={shareBtnRef}
            />
          </div>
        </div>

        {/* Slider de vehículos impulsados del usuario */}
        {profile?.id && (
          <UserFeaturedSlider 
            userId={(profile.owner_profile_id || profile.id) as any} 
            title="Vehículos Impulsados" 
            limit={3}
            allowBoost={allowBoostOnPublicPage}
          />
        )}

        {/* Lista de vehículos del vendedor */}
        {profile?.id && (
          <div className="w-full mt-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="w-full md:w-64 flex-shrink-0">
                <AdvancedFiltersSidebar
                  filters={filters}
                  onChange={handleChange}
                  onColorChange={handleColorChange}
                  onMultiChange={handleMultiChange}
                  onSyncChange={handleSyncChange}
                  onClearFilters={handleClearFilters}
                  onApplyFilters={handleApplyFilters}
                />
              </div>
              <div className="flex-1 min-w-0">
                <UserVehiclesList
                  userId={profile.owner_profile_id}
                  publicProfileId={profile.id}
                  title="Vehículos del Vendedor"
                  showFilters={false}
                  allowBoost={allowBoostOnPublicPage}
                  page={filters.page}
                  pageSize={filters.page_size}
                  onPageChange={(page) => update({ page }, true)}
                  total={totalVehicles}
                  sellerInfo={{
                    username: (profile.username || profile.slug || '') as string,
                    public_name: name,
                    avatar_url: avatarUrl,
                    email: useCompany ? contactEmail : (profile.email || profile.contact_email || null),
                    phone: contactPhone,
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

      <Modal
        open={showHorarioModal}
        onClose={() => setShowHorarioModal(false)}
        title="Horarios de Atención"
        maxWidth="max-w-xl"
        contentClassName="p-0"
      >
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <ScheduleList
            weekly={horarioSemanal as any}
            specials={diasEspeciales as any}
            diasSemana={diasSemana}
            is247={horario247}
          />
        </div>
      </Modal>

      <Modal
        open={showReseñasModal}
        onClose={() => setShowReseñasModal(false)}
        title="Opiniones"
        maxWidth="max-w-2xl"
        contentClassName="p-0"
      >
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <PublicReviews puntuacion={profile.rating ? Number(profile.rating) : 0} reseñas={reseñas} />
        </div>
      </Modal>

      <Modal
        open={showAddReseñaModal}
        onClose={() => setShowAddReseñaModal(false)}
        title="Agregar opinión"
        maxWidth="max-w-2xl"
        contentClassName="p-0"
      >
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <AddReviewForm
            profileId={profile.id}
            onSubmit={async (data) => {
              await handleAddReview(data);
              setShowAddReseñaModal(false);
            }}
          />
        </div>
      </Modal>

      <SharePopover open={showMenu} onClose={handleShareClose} anchorEl={shareAnchor} username={username as string} />
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        contactName={contactName}
        email={resolvedContactEmail || undefined}
        phone={resolvedContactPhone || undefined}
        whatsapp={resolvedWhatsapp || undefined}
        contextType="profile"
        contextTitle={name}
        onSendMessage={onSendDirectMessage}
        canSendMessage={canSendDirectMessage}
        messageDisabledHint={messageDisabledHint}
      />
    </>
  );
}





