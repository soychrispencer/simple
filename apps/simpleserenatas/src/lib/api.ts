import { API_BASE } from '@simple/config';

// API client for SimpleSerenatas

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// API Response Types
interface RequestsListResponse {
  ok: boolean;
  /** Coordinador: `GET /requests?assignedToMe=true` */
  serenatas?: Array<Record<string, unknown>>;
  /** Otros listados legacy */
  requests?: Array<Record<string, unknown>>;
}

interface RequestResponse {
  ok: boolean;
  request?: Record<string, unknown>;
  /** Detalle canónico tabla `serenatas` */
  serenata?: Record<string, unknown>;
}

interface GroupsListResponse {
  ok: boolean;
  groups: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
    members: number;
    serenatas: number;
  }>;
}

interface GroupResponse {
  ok: boolean;
  group?: {
    id: string;
    name: string;
    date: string;
    status: string;
    coordinatorId?: string;
  };
}

interface MusiciansListResponse {
  ok: boolean;
  musicians: Array<{
    id: string;
    name: string;
    instrument: string;
    available: boolean;
  }>;
}

/** Respuesta `GET/PATCH|POST …/musicians/me/profile`: campo `musician`; `profile` solo compat. legado. */
export interface MusicianMeProfilePayload {
  id: string;
  instrument: string;
  instruments?: string[];
  bio?: string;
  phone?: string;
  comuna?: string;
  region?: string;
  location?: string;
  isAvailable: boolean;
  availableNow: boolean;
  experience?: number | null;
  experienceYears?: number;
  rating?: number;
  avatarUrl?: string;
  name?: string;
  userId?: string;
}

interface MusicianProfileResponse {
  ok: boolean;
  musician?: MusicianMeProfilePayload;
  /** @deprecated Usar `musician`. */
  profile?: MusicianMeProfilePayload;
}

interface RoutesResponse {
  ok: boolean;
  route?: {
    id: string;
    groupId: string;
    status: string;
    waypoints: Array<{
      lat: number;
      lng: number;
      serenataId: string;
      address: string;
    }>;
  };
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}/api/serenatas${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await response.json();
  
  return {
    ok: data.ok,
    data: data.ok ? data : undefined,
    error: data.ok ? undefined : data.error,
  };
}

// Musicians API
export const musiciansApi = {
  list: (params?: { instrument?: string; available?: boolean; comuna?: string }) => {
    const query = new URLSearchParams();
    if (params?.instrument) query.append('instrument', params.instrument);
    if (params?.available) query.append('available', 'true');
    if (params?.comuna) query.append('comuna', params.comuna);
    return fetchApi<MusiciansListResponse>(`/musicians?${query}`);
  },
  
  get: (id: string) => fetchApi(`/musicians/${id}`),
  
  getMyProfile: () => fetchApi<MusicianProfileResponse>('/musicians/me/profile'),
  
  createProfile: (data: {
    instrument: string;
    experience?: number;
    bio?: string;
    comuna?: string;
    region?: string;
    lat?: number;
    lng?: number;
  }) => fetchApi('/musicians/me/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateProfile: (data: Partial<{
    instrument: string;
    experience: number;
    bio: string;
    comuna: string;
    region: string;
    lat: number;
    lng: number;
  }>) => fetchApi('/musicians/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  updateAvailability: (data: { isAvailable?: boolean; availableNow?: boolean }) => 
    fetchApi('/musicians/me/availability', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  searchNearby: (lat: number, lng: number, radius?: number, instrument?: string) => {
    const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (radius) query.append('radius', String(radius));
    if (instrument) query.append('instrument', instrument);
    return fetchApi(`/musicians/search/nearby?${query}`);
  },
};

// Requests API
export const requestsApi = {
  list: (params?: {
    status?: string;
    urgency?: string;
    dateFrom?: string;
    dateTo?: string;
    /** Serenatas asignadas al perfil coordinador (todas los estados). */
    assignedToMe?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.urgency) query.append('urgency', params.urgency);
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    if (params?.assignedToMe) query.append('assignedToMe', 'true');
    return fetchApi<RequestsListResponse>(`/requests?${query}`);
  },

  assignedByDay: (date: string) =>
    fetchApi<RequestsListResponse>(`/requests/my/assigned?date=${encodeURIComponent(date)}`),

  assignedByWeek: (week: string) =>
    fetchApi<RequestsListResponse>(`/requests/my/assigned?week=${encodeURIComponent(week)}`),

  get: (id: string) => fetchApi<RequestResponse>(`/requests/${id}`),

  /** Crea fila en `serenatas`: cliente de la plataforma o coordinador con captura directa. */
  create: (
    data: {
      clientName: string;
      clientPhone?: string;
      clientEmail?: string;
      eventDate: string;
      eventTime: string;
      duration?: number;
      address: string;
      city?: string;
      region?: string;
      price?: number;
      eventType?: string;
      recipientName?: string;
      recipientRelation?: string;
      message?: string;
      songRequests?: string[];
      source?: string;
      latitude?: number;
      longitude?: number;
      /** Coordinador registra trabajo propio; cliente final va en clientName/Phone. */
      capturedByCoordinator?: boolean;
    }
  ) =>
    fetchApi('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      clientName: string;
      clientPhone: string;
      clientEmail: string | null;
      eventType: string;
      eventDate: string;
      eventTime: string;
      duration: number;
      address: string;
      city: string | null;
      region: string | null;
      latitude: number | null;
      longitude: number | null;
      recipientName: string | null;
      recipientRelation: string | null;
      message: string | null;
      songRequests: string[];
      price: number | null;
    }>
  ) =>
    fetchApi(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  complete: (id: string) =>
    fetchApi(`/requests/${id}/complete`, {
      method: 'POST',
    }),

  cancel: (id: string, reason?: string) =>
    fetchApi(`/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** Líder de cuadrilla asigna una solicitud legacy a un grupo. */
  assignToGroup: (requestId: string, groupId: string) =>
    fetchApi(`/requests/${requestId}/assign-to-group`, {
      method: 'POST',
      body: JSON.stringify({ groupId }),
    }),
  
  getAvailable: () => fetchApi<RequestsListResponse>('/requests/available/for-musician'),
  
  getUrgent: () => fetchApi<RequestsListResponse>('/requests/urgent/list'),
  
  findMatches: (id: string) => fetchApi(`/requests/${id}/matches`),
};

export const coordinatorStatsApi = {
  get: () => fetchApi<{ ok: boolean; stats?: Record<string, unknown> }>('/stats/coordinator'),
};

// Groups API
export const groupsApi = {
  list: (params?: { status?: string; date?: string; coordinatorId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    if (params?.coordinatorId) query.append('coordinatorId', params.coordinatorId);
    return fetchApi<GroupsListResponse>(`/groups?${query}`);
  },
  
  get: (id: string) => fetchApi<GroupResponse>(`/groups/${id}`),
  
  create: (data: { name: string; date: string; serenataIds?: string[] }) => 
    fetchApi('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: Partial<{ name: string; coordinatorId: string; status: string }>) => 
    fetchApi(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  addMember: (groupId: string, musicianId: string, role: string) => 
    fetchApi(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ musicianId, role }),
    }),
  
  removeMember: (groupId: string, musicianId: string) => 
    fetchApi(`/groups/${groupId}/members/${musicianId}`, {
      method: 'DELETE',
    }),
  
  getSuggestions: (id: string) => fetchApi(`/groups/${id}/suggestions`),
  
  confirm: (id: string) => fetchApi(`/groups/${id}/confirm`, { method: 'POST' }),
};

// Routes API
export const routesApi = {
  get: (id: string) => fetchApi<RoutesResponse>(`/routes/${id}`),
  
  getForGroup: (groupId: string) => fetchApi<RoutesResponse>(`/routes/group/${groupId}`),
  
  create: (data: {
    groupId: string;
    date: string;
    waypoints: Array<{
      lat: number;
      lng: number;
      serenataId: string;
      address: string;
      estimatedTime: string;
    }>;
  }) => fetchApi('/routes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  optimize: (data: {
    serenataIds: string[];
    algorithm?: 'nearest_neighbor' | 'manual';
  }) => fetchApi('/routes/optimize', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  start: (id: string) => fetchApi(`/routes/${id}/start`, { method: 'POST' }),
  
  complete: (id: string) => fetchApi(`/routes/${id}/complete`, { method: 'POST' }),
  
  getStats: (id: string) => fetchApi(`/routes/${id}/stats`),
};
