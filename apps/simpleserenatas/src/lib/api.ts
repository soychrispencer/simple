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
  requests: Array<{
    id: string;
    clientName: string;
    address: string;
    dateTime: string;
    status: string;
    price: string;
    urgency?: string;
  }>;
}

interface RequestResponse {
  ok: boolean;
  request?: {
    id: string;
    clientName: string;
    address: string;
    dateTime: string;
    status: string;
    price: string;
  };
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
    captainId?: string;
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

interface MusicianProfileResponse {
  ok: boolean;
  profile?: {
    id: string;
    instrument: string;
    experience: number;
    bio?: string;
    isAvailable: boolean;
    availableNow: boolean;
  };
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
  list: (params?: { status?: string; urgency?: string; dateFrom?: string; dateTo?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.urgency) query.append('urgency', params.urgency);
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    return fetchApi<RequestsListResponse>(`/requests?${query}`);
  },
  
  get: (id: string) => fetchApi<RequestResponse>(`/requests/${id}`),
  
  create: (data: {
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    address: string;
    dateTime: string;
    price: number;
    occasion?: string;
    message?: string;
    urgency?: string;
  }) => fetchApi('/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: Partial<{
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    address: string;
    dateTime: string;
    price: number;
    occasion: string;
    message: string;
    urgency: string;
  }>) => 
    fetchApi(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  cancel: (id: string, reason?: string) => 
    fetchApi(`/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  
  getAvailable: () => fetchApi<RequestsListResponse>('/requests/available/for-musician'),
  
  getUrgent: () => fetchApi<RequestsListResponse>('/requests/urgent/list'),
  
  findMatches: (id: string) => fetchApi(`/requests/${id}/matches`),
};

// Groups API
export const groupsApi = {
  list: (params?: { status?: string; date?: string; captainId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    if (params?.captainId) query.append('captainId', params.captainId);
    return fetchApi<GroupsListResponse>(`/groups?${query}`);
  },
  
  get: (id: string) => fetchApi<GroupResponse>(`/groups/${id}`),
  
  create: (data: { name: string; date: string; serenataIds?: string[] }) => 
    fetchApi('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: Partial<{ name: string; captainId: string; status: string }>) => 
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
