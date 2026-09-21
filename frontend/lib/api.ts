const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'volunteer' | 'admin';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  isVerified?: boolean;
  googleId?: string;
  authProvider?: 'LOCAL' | 'GOOGLE' | 'BOTH';
  avatar?: string;
  verificationReason?: string;
  verificationReviewedAt?: string;
  profile?: {
    organization?: string;
    skills?: string[];
    experience?: number;
    bio?: string;
    rating?: number;
    totalRatings?: number;
    totalAssists?: number;
  };
  safetyProfile?: {
    bloodGroup?: string;
    medicalConditions?: string;
    emergencyNote?: string;
  };
  location?: {
    coordinates: [number, number];
    address?: string;
  };
  isAvailable?: boolean;
}

export interface EmergencyContact {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
  isActive: boolean;
  notificationPreference: 'SMS' | 'EMAIL' | 'SMS_AND_EMAIL';
  createdAt: string;
}

export interface Alert {
  _id: string;
  userId: User | string;
  responderId?: User | string;
  alertType: 'sos' | 'medical' | 'fire' | 'harassment' | 'other';
  description?: string;
  locationStatus: 'LIVE' | 'STATIC' | 'UNAVAILABLE' | 'LAST_KNOWN';
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address?: string;
  };
  status: 'active' | 'accepted' | 'en_route' | 'arrived' | 'assisting' | 'resolved' | 'cancelled' | 'closed';
  statusHistory: Array<{ status: string; note: string; timestamp: Date }>;
  createdAt: Date;
  acceptedAt?: Date;
  enRouteAt?: Date;
  arrivedAt?: Date;
  assistingAt?: Date;
  resolvedAt?: Date;
}

export interface NotificationModel {
  _id: string;
  recipientUserId: string;
  alertId: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  metadata?: any;
  createdAt: Date;
}

export interface SafetyZone {
  _id: string;
  name: string;
  type: 'SAFE_ZONE' | 'POLICE_STATION' | 'HOSPITAL' | 'WOMEN_HELP_CENTER' | 'SHELTER' | 'CAMPUS_SECURITY' | 'SUPPORT_CENTER' | 'OTHER' | string;
  description?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address: string;
  };
  address?: string;
  phone?: string;
  operatingHours?: string;
  isActive: boolean;
  distanceMeters?: number; // Added via $geoNear aggregation
  createdAt: Date;
}

export interface VolunteerStats {
  totalAssists: number;
  rating: number;
  totalRatings: number;
  totalResponses: number;
  resolvedCount: number;
  isAvailable: boolean;
}

export interface PublicStats {
  totalUsers: number;
  womenProtected: number;
  allUsersCount: number;
  alertsResolved: number;
  verifiedVolunteers: number;
  emergencyContactsCount: number;
  totalAlerts: number;
  avgResponseTimeMins: number;
  recentUsers: Array<{
    name: string;
    initials: string;
    role: string;
  }>;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (body: Record<string, unknown>) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  googleLogin: (credential: string) =>
    request<{ user: User; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),
  getMe: () => request<User>('/auth/me'),
  updateProfile: (body: Partial<User>) =>
    request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Emergency Contacts
  getContacts: () => request<EmergencyContact[]>('/contacts'),
  addContact: (body: Partial<EmergencyContact>) =>
    request<EmergencyContact>('/contacts', { method: 'POST', body: JSON.stringify(body) }),
  updateContact: (id: string, body: Partial<EmergencyContact>) =>
    request<EmergencyContact>(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContact: (id: string) =>
    request<{ message: string }>(`/contacts/${id}`, { method: 'DELETE' }),

  // Alerts
  getAlertTypes: () => request<string[]>('/alerts/types'),
  getAlertHistory: (page = 1, limit = 10) => 
    request<{ alerts: Alert[]; totalPages: number; currentPage: number }>(`/alerts/history?page=${page}&limit=${limit}`),
  createAlert: (body: Record<string, unknown>) =>
    request<Alert>('/alerts', { method: 'POST', body: JSON.stringify(body) }),
  getAlerts: () => request<Alert[]>('/alerts'),
  getAlert: (id: string) => request<Alert>(`/alerts/${id}`),
  updateAlertStatus: (id: string, body: Record<string, unknown>) =>
    request<Alert>(`/alerts/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  updateAlertLocation: (id: string, coordinates: [number, number]) =>
    request<Alert>(`/alerts/${id}/location`, {
      method: 'PUT',
      body: JSON.stringify({ coordinates }),
    }),

  // Safety Zones (public)
  getSafetyZones: () => request<SafetyZone[]>('/safety-zones'),
  getNearbySafetyZones: (lng: number, lat: number) =>
    request<SafetyZone[]>(`/safety-zones/nearby?lng=${lng}&lat=${lat}`),

  // Notifications
  getUnreadNotifications: () => request<NotificationModel[]>('/notifications'),
  markNotificationAsRead: (id: string) => request<NotificationModel>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsAsRead: () => request<{ message: string }>('/notifications/read-all', { method: 'PUT' }),

  // Volunteers
  getNearbyAlerts: () => request<Alert[]>('/volunteers/alerts'),
  respondToAlert: (alertId: string, action: 'accept' | 'decline') =>
    request<Alert>(`/volunteers/respond/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    }),
  updateResponseStatus: (alertId: string, status: string) =>
    request<Alert>(`/volunteers/status/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  updateVolunteerProfile: (body: Record<string, unknown>) =>
    request<User>('/volunteers/profile', { method: 'PUT', body: JSON.stringify(body) }),
  updateVolunteerLocation: (coordinates: [number, number], address?: string) =>
    request<User>('/volunteers/location', {
      method: 'PUT',
      body: JSON.stringify({ coordinates, address }),
    }),
  toggleAvailability: () => request<{ isAvailable: boolean }>('/volunteers/availability', { method: 'PUT' }),
  getVolunteerHistory: () => request<Alert[]>('/volunteers/history'),
  getVolunteerStats: () => request<VolunteerStats>('/volunteers/stats'),

  // Admin
  getAdminDashboard: () => request<{
    stats: { totalUsers: number; totalVolunteers: number; pendingVolunteers: number; totalAlerts: number; activeAlerts: number; resolvedAlerts: number; totalSafetyZones: number };
    recentAlerts: Alert[];
  }>('/admin/dashboard'),
  
  getAdminAnalyticsOverview: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{
      totalUsers: number;
      totalVolunteers: number;
      monthlyActiveUsers: number;
      alertsInPeriod: number;
      activeAlerts: number;
      totalResolved: number;
      totalCancelled: number;
      avgResponseTimeMs: number | null;
      successfulAssistanceRate: number | null;
      volunteerResponseRate: number | null;
    }>(`/admin/analytics/overview${qs}`);
  },

  getAdminAnalyticsTrends: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{ _id: string; count: number }[]>(`/admin/analytics/trends${qs}`);
  },

  getAdminIncidentReports: (page = 1, limit = 20, startDate?: string, endDate?: string, status = 'all') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), status });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request<{ alerts: Alert[]; totalPages: number; currentPage: number; totalRecords: number }>(`/admin/reports/incidents?${params.toString()}`);
  },

  getAllUsers: () => request<User[]>('/admin/users'),
  getPendingVolunteers: () => request<User[]>('/admin/volunteers/pending'),
  approveVolunteer: (id: string) =>
    request<User>(`/admin/volunteers/${id}/verify`, { method: 'PUT' }),
  rejectVolunteer: (id: string) =>
    request<User>(`/admin/volunteers/${id}/reject`, { method: 'PUT' }),
  suspendVolunteer: (id: string) =>
    request<User>(`/admin/volunteers/${id}/suspend`, { method: 'PUT' }),
  getAllAlerts: () => request<Alert[]>('/admin/alerts'),
  resolveAlert: (id: string, body?: { status?: string; note?: string }) =>
    request<Alert>(`/admin/alerts/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(body || {}),
    }),
  getAdminSafetyZones: () => request<SafetyZone[]>('/admin/safety-zones'),
  adminCreateSafetyZone: (body: Record<string, unknown>) =>
    request<SafetyZone>('/admin/safety-zones', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateSafetyZone: (id: string, body: Record<string, unknown>) =>
    request<SafetyZone>(`/admin/safety-zones/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteSafetyZone: (id: string) =>
    request<{ message: string }>(`/admin/safety-zones/${id}`, { method: 'DELETE' }),

  // Public
  getPublicStats: () => request<PublicStats>('/public/stats'),
  getPublicTestimonials: () => request<{ name: string; role: string; city: string; text: string; rating: number; initials: string; }[]>('/public/testimonials'),
  submitPublicTestimonial: (body: { name: string; role: string; city: string; text: string; rating: number }) =>
    request<{ name: string; role: string; city: string; text: string; rating: number; initials: string; }>('/public/testimonials', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export default api;

export const ALERT_TYPE_LABELS: Record<string, string> = {
  sos: 'SOS Emergency',
  unsafe_area: 'Unsafe Area',
  harassment: 'Harassment',
  medical: 'Medical Emergency',
  other: 'Other',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  accepted: 'Accepted',
  en_route: 'En Route',
  arrived: 'Arrived',
  assisting: 'Assisting',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-red-100 text-red-800',
  accepted: 'bg-indigo-100 text-indigo-800',
  en_route: 'bg-blue-100 text-blue-800',
  arrived: 'bg-purple-100 text-purple-800',
  assisting: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const ZONE_TYPE_LABELS: Record<string, string> = {
  police_station: 'Police Station',
  hospital: 'Hospital',
  safe_house: 'Safe House',
  public_place: 'Public Place',
};
