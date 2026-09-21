'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, MapPin, Shield, Heart, Clock, Plus, Trash2,
  Phone, Edit3, Save, X, Radio, ShieldCheck, Building, ChevronRight,
  Activity, CheckCircle,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';
import { api, Alert, EmergencyContact, SafetyZone, STATUS_LABELS, STATUS_COLORS, ALERT_TYPE_LABELS, ZONE_TYPE_LABELS } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import LiveEmergencyMap from '@/components/LiveEmergencyMap';
import dynamic from 'next/dynamic';
import { Button, Badge, Card } from '@/components/ui';

const SafetyResourcesMap = dynamic(() => import('@/components/SafetyResourcesMap'), { ssr: false });

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<Alert[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [selectedHistoryAlert, setSelectedHistoryAlert] = useState<Alert | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tab & Resource filters
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [nearbyZones, setNearbyZones] = useState<any[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<{
    name: string;
    phone: string;
    relationship: string;
    email: string;
    isPrimary: boolean;
    isActive: boolean;
    notificationPreference: 'SMS' | 'EMAIL' | 'SMS_AND_EMAIL';
  }>({ 
    name: '', 
    phone: '', 
    relationship: '', 
    email: '', 
    isPrimary: false, 
    isActive: true, 
    notificationPreference: 'SMS_AND_EMAIL' 
  });

  // Safety profile form
  const [profileForm, setProfileForm] = useState({ bloodGroup: '', medicalConditions: '', emergencyNote: '' });
  const [editingProfile, setEditingProfile] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [alertsData, contactsData, zonesData, historyData] = await Promise.all([
        api.getAlerts(),
        api.getContacts(),
        api.getSafetyZones(),
        api.getAlertHistory(historyPage, 10),
      ]);
      setAlerts(alertsData);
      setContacts(contactsData);
      setZones(zonesData);
      setHistoryAlerts(historyData.alerts);
      setHistoryTotalPages(historyData.totalPages);
      const active = alertsData.find((a) => ['active', 'accepted', 'en_route', 'arrived', 'assisting'].includes(a.status));
      setActiveAlert(active || null);
    } catch {
      /* ignore */
    }
  }, [historyPage]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'user') { router.push('/dashboard'); return; }
    loadData();
    if (user.safetyProfile) {
      setProfileForm({
        bloodGroup: user.safetyProfile.bloodGroup || '',
        medicalConditions: user.safetyProfile.medicalConditions || '',
        emergencyNote: user.safetyProfile.emergencyNote || '',
      });
    }
  }, [user, authLoading, router, loadData]);

  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
    const href = newTab === 'dashboard' ? '/dashboard/user' : `/dashboard/user?tab=${newTab}`;
    if (typeof window !== 'undefined' && (window.location.pathname + window.location.search) !== href) {
      window.history.pushState(null, '', href);
    }
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t) setTab(t);
      else setTab('dashboard');
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const startLocationTracking = useCallback((alertId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    }

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to real-time location server');
    });

    socket.on('notification:new', (notification) => {
      setSuccess(`${notification.title}: ${notification.message}`);
      
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(notification.title || 'bSafe Update', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }

      if (notification.type.startsWith('RESPONSE_') || notification.type === 'SOS_RESOLVED') {
        loadData(); // Re-fetch all data to grab new responder details / status
      }
    });
    
    socket.on('response:status:update', (data) => {
      if (activeAlert && data.alertId === activeAlert._id) {
        setActiveAlert(prev => prev ? { 
          ...prev, 
          status: data.status,
          responderId: data.responder || prev.responderId
        } : null);
      }
    });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        socket.emit('sos:location:update', {
          alertId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        
        setActiveAlert((prev) => {
          if (prev && prev.locationStatus !== 'LIVE') {
            return { ...prev, locationStatus: 'LIVE' };
          }
          return prev;
        });
      },
      (err) => console.error('Location watch error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    watchIdRef.current = watchId;
  }, [activeAlert, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, [stopLocationTracking]);

  // Restart tracking if we reload and have an active alert
  useEffect(() => {
    if (activeAlert && ['active', 'acknowledged', 'responding', 'accepted', 'en_route', 'arrived', 'assisting'].includes(activeAlert.status) && !socketRef.current) {
      startLocationTracking(activeAlert._id);
    } else if (!activeAlert) {
      stopLocationTracking();
    }
  }, [activeAlert, startLocationTracking, stopLocationTracking]);

  const triggerSOS = async () => {
    setSosLoading(true);
    setError('');
    try {
      let coords: [number, number] | undefined = undefined;
      let locationStatus = 'UNAVAILABLE';
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
        );
        coords = [pos.coords.longitude, pos.coords.latitude];
        locationStatus = 'LIVE';
      } catch (geoErr) {
        console.warn('Geolocation failed or denied, checking for last known location', geoErr);
        if (user?.location?.coordinates && user.location.coordinates.length === 2) {
          coords = user.location.coordinates as [number, number];
          locationStatus = 'LAST_KNOWN';
        }
      }

      const alertPayload: Record<string, any> = {
        alertType: 'sos',
        description: 'Emergency SOS triggered',
        locationStatus,
      };

      if (coords) {
        alertPayload.location = {
          coordinates: coords,
          address: 'Current location',
        };
      }

      const alert = await api.createAlert(alertPayload);
      setActiveAlert(alert);
      setSuccess('🚨 SOS Alert sent! Help is on the way.');
      await loadData();
      startLocationTracking(alert._id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send SOS. Please try again.');
    } finally {
      setSosLoading(false);
    }
  };

  const cancelAlert = async () => {
    if (!activeAlert) return;
    try {
      await api.updateAlertStatus(activeAlert._id, { status: 'cancelled', note: 'Cancelled by user' });
      setActiveAlert(null);
      stopLocationTracking();
      setSuccess('Alert cancelled.');
      await loadData();
    } catch {
      /* ignore */
    }
  };

  const saveContact = async () => {
    try {
      if (editContactId) {
        await api.updateContact(editContactId, contactForm);
      } else {
        await api.addContact(contactForm);
      }
      setShowContactForm(false);
      setContactForm({ 
        name: '', 
        phone: '', 
        relationship: '', 
        email: '', 
        isPrimary: false, 
        isActive: true, 
        notificationPreference: 'SMS_AND_EMAIL' 
      });
      setEditContactId(null);
      setSuccess(editContactId ? 'Contact updated!' : 'Contact added!');
      const data = await api.getContacts();
      setContacts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await api.deleteContact(id);
      setContacts(contacts.filter((c) => c._id !== id));
      setSuccess('Contact deleted.');
    } catch {
      /* ignore */
    }
  };

  const saveProfile = async () => {
    try {
      await api.updateProfile({ safetyProfile: profileForm } as never);
      setEditingProfile(false);
      setSuccess('Safety profile updated!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  // Fetch Nearby Resources when "zones" tab is selected
  useEffect(() => {
    if (tab === 'zones') {
      const fetchNearby = async () => {
        setZonesLoading(true);
        setError('');
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
          );
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          const nearby = await api.getNearbySafetyZones(pos.coords.longitude, pos.coords.latitude);
          setNearbyZones(nearby);
        } catch (err: any) {
          setError(err.code === 1 ? 'Location permission is required to find nearby resources.' : 'Your current location could not be determined.');
        } finally {
          setZonesLoading(false);
        }
      };
      fetchNearby();
    }
  }, [tab]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0F0D1A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout activeTab={tab} onTabChange={handleTabChange}>
      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'dashboard', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
          { id: 'sos', label: 'SOS Emergency', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'contacts', label: 'Contacts', icon: <Heart className="w-4 h-4" /> },
          { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
          { id: 'profile', label: 'Safety Profile', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'zones', label: 'Safe Zones', icon: <MapPin className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ========= OVERVIEW TAB ========= */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Active Alert Banner or Safety Hero */}
          {activeAlert ? (
            <div className="p-6 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h4 className="text-white font-bold text-lg">Emergency SOS Active</h4>
                    <Badge variant={STATUS_COLORS[activeAlert.status]}>{STATUS_LABELS[activeAlert.status] || activeAlert.status}</Badge>
                  </div>
                  <p className="text-gray-300 text-sm">
                    {activeAlert.responderId ? 'A verified volunteer has responded and is on the way.' : 'Notifying nearby verified volunteers & your emergency contacts.'}
                  </p>
                </div>
              </div>
              <Button variant="primary" onClick={() => handleTabChange('sos')} className="whitespace-nowrap flex-shrink-0">
                Track Live SOS <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-brand-900/40 via-[#151226] to-brand-900/20 border border-brand-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
                  <CheckCircle className="w-3.5 h-3.5" /> Safety Network Active & Ready
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Welcome Back, {user?.name || 'User'}</h3>
                <p className="text-gray-300 text-sm max-w-xl leading-relaxed">
                  bSafe 24/7 emergency response is monitoring your location. In any urgent situation, trigger the SOS button for immediate volunteer assistance.
                </p>
              </div>
              <button
                onClick={() => handleTabChange('sos')}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold shadow-xl shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap flex-shrink-0"
              >
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <span>Open SOS Panic Center</span>
              </button>
            </div>
          )}

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => handleTabChange('contacts')}
              className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contacts</span>
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Heart className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{contacts.length}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                {contacts.length > 0 ? (
                  <span className="text-emerald-400">● {contacts.filter(c => c.isActive).length} active</span>
                ) : (
                  <span className="text-amber-400">● Add trusted contacts</span>
                )}
              </p>
            </div>

            <div 
              onClick={() => handleTabChange('zones')}
              className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Safe Zones</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{zones.length}</p>
              <p className="text-xs text-gray-400 mt-1">Police, hospitals, shelters</p>
            </div>

            <div 
              onClick={() => handleTabChange('history')}
              className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alert History</span>
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{historyAlerts.length}</p>
              <p className="text-xs text-gray-400 mt-1">Past emergency events</p>
            </div>

            <div 
              onClick={() => handleTabChange('profile')}
              className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Safety Profile</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{user?.safetyProfile?.bloodGroup || 'Ready'}</p>
              <p className="text-xs text-gray-400 mt-1">Medical info & notes</p>
            </div>
          </div>

          {/* Quick Action Hub */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 flex flex-col justify-between" hover={true}>
              <div>
                <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">Emergency Contacts</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Add loved ones or friends who will immediately be notified with your live GPS location when you tap SOS.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleTabChange('contacts')} className="w-full">
                Manage Contacts ({contacts.length})
              </Button>
            </Card>

            <Card className="p-6 flex flex-col justify-between" hover={true}>
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">Safe Zones & Resources</h4>
                <p className="text-gray-400 text-sm mb-4">
                  View certified police stations, 24/7 hospitals, and verified women shelters near your current location.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleTabChange('zones')} className="w-full">
                View Safe Zones ({zones.length})
              </Button>
            </Card>

            <Card className="p-6 flex flex-col justify-between" hover={true}>
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">Safety Profile</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Keep your blood group, medical allergies, and emergency guidelines up-to-date for first responders.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleTabChange('profile')} className="w-full">
                Edit Safety Profile
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* ========= SOS TAB ========= */}
      {tab === 'sos' && (
        <div className="flex flex-col items-center">
          {activeAlert ? (
            <Card className="w-full max-w-lg p-8 text-center" hover={false}>
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Radio className="w-10 h-10 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Alert Active</h3>
              <Badge variant={STATUS_COLORS[activeAlert.status]}>{STATUS_LABELS[activeAlert.status]}</Badge>
              
              {(!activeAlert.locationStatus || activeAlert.locationStatus === 'LIVE') && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/30 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Location sharing: ACTIVE
                </div>
              )}
              {activeAlert.locationStatus === 'LAST_KNOWN' && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-sm border border-amber-500/30 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Location sharing: LIMITED (Using last known location)
                </div>
              )}
              {activeAlert.locationStatus === 'UNAVAILABLE' && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm border border-red-500/30 font-medium">
                  <X className="w-4 h-4" />
                  Location unavailable (Enable location services)
                </div>
              )}

              <p className="text-gray-400 mt-4 text-sm">
                {activeAlert.responderId
                  ? 'A volunteer is responding to your alert. Stay calm and stay in a safe area.'
                  : 'Looking for nearby volunteers... Your location is being shared.'}
              </p>
              
              <div className="mt-4 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <p className="text-brand-400 text-sm font-medium flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Emergency contacts notified
                </p>
                <p className="text-gray-500 text-xs mt-1">SMS provider is currently disabled. Delivery intended via secure channels.</p>
              </div>

              {activeAlert.responderId && typeof activeAlert.responderId === 'object' && (
                <div className="mt-6 text-left border border-white/10 rounded-xl overflow-hidden bg-white/5">
                  <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                    <p className="text-gray-300 text-xs uppercase font-bold tracking-wider">Responder Info</p>
                    <Badge variant={STATUS_COLORS[activeAlert.status]}>{STATUS_LABELS[activeAlert.status] || activeAlert.status}</Badge>
                  </div>
                  <div className="p-4">
                    <p className="text-white font-medium text-lg">{(activeAlert.responderId as { name: string }).name}</p>
                    
                    <div className="mt-4 flex flex-col gap-2 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                      {['accepted', 'en_route', 'arrived', 'assisting'].map((step, idx) => {
                        const statusWeights: Record<string, number> = { 'active': 0, 'accepted': 1, 'en_route': 2, 'arrived': 3, 'assisting': 4, 'resolved': 5 };
                        const currentWeight = statusWeights[activeAlert.status] || 0;
                        const stepWeight = statusWeights[step] || 0;
                        
                        const isPast = currentWeight > stepWeight;
                        const isCurrent = currentWeight === stepWeight;
                        const isFuture = currentWeight < stepWeight;
                        
                        return (
                          <div key={step} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active`}>
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 bg-[#0F0D1A] z-10 
                              ${isPast ? 'border-brand-500 text-brand-500' : isCurrent ? 'border-amber-400 text-amber-400 animate-pulse' : 'border-white/20 text-transparent'}`}>
                              {(isPast || isCurrent) && <div className="w-2 h-2 rounded-full bg-current" />}
                            </div>
                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-2 rounded-lg ml-2 md:ml-0 md:mr-2">
                              <p className={`text-sm font-semibold ${isPast || isCurrent ? 'text-white' : 'text-gray-500'}`}>
                                {STATUS_LABELS[step]}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <Button variant="outline" size="lg" className="mt-6" onClick={cancelAlert}>
                Cancel Alert
              </Button>
            </Card>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 mb-8 text-lg">Tap the button below in case of emergency</p>

              {/* SOS Button */}
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="absolute w-72 h-72 rounded-full border-2 border-brand-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute w-60 h-60 rounded-full border-2 border-brand-500/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                <div className="absolute w-48 h-48 rounded-full border border-brand-500/40 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />

                <button
                  onClick={triggerSOS}
                  disabled={sosLoading}
                  className="relative z-10 w-40 h-40 rounded-full bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex flex-col items-center justify-center shadow-2xl shadow-brand-600/50 animate-sos-pulse hover:scale-105 transition-transform disabled:opacity-70"
                >
                  <AlertTriangle className="w-12 h-12 text-white mb-1" />
                  <span className="text-white text-2xl font-black tracking-wider">SOS</span>
                  <span className="text-brand-200 text-[10px] uppercase tracking-widest mt-0.5">
                    {sosLoading ? 'Sending...' : 'Tap for Help'}
                  </span>
                </button>
              </div>

              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Your GPS location will be shared with nearby volunteers and your emergency contacts immediately.
              </p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-2xl font-bold text-white">{contacts.length}</p>
                  <p className="text-gray-400 text-xs mt-1">Contacts</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-2xl font-bold text-white">{alerts.length}</p>
                  <p className="text-gray-400 text-xs mt-1">Past Alerts</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-2xl font-bold text-white">{zones.length}</p>
                  <p className="text-gray-400 text-xs mt-1">Safe Zones</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========= CONTACTS TAB ========= */}
      {tab === 'contacts' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Emergency Contacts</h3>
            <Button variant="primary" size="sm" onClick={() => { 
              setShowContactForm(true); 
              setEditContactId(null); 
              setContactForm({ name: '', phone: '', relationship: '', email: '', isPrimary: false, isActive: true, notificationPreference: 'SMS_AND_EMAIL' }); 
            }}>
              <Plus className="w-4 h-4" /> Add Contact
            </Button>
          </div>

          {/* Contact form modal */}
          {showContactForm && (
            <Card className="p-6 mb-6" hover={false}>
              <h4 className="text-white font-semibold mb-4">{editContactId ? 'Edit Contact' : 'Add New Contact'}</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Full Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors" />
                <input placeholder="Phone Number" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors" />
                <input placeholder="Email (Optional)" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors" />
                <input placeholder="Relationship (Mother, Friend, etc.)" value={contactForm.relationship} onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors" />
                
                <select value={contactForm.notificationPreference} onChange={(e) => setContactForm({ ...contactForm, notificationPreference: e.target.value as 'SMS' | 'EMAIL' | 'SMS_AND_EMAIL' })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-500 transition-colors">
                  <option value="SMS_AND_EMAIL" className="bg-gray-900">SMS & Email</option>
                  <option value="SMS" className="bg-gray-900">SMS Only</option>
                  <option value="EMAIL" className="bg-gray-900">Email Only</option>
                </select>

                <div className="flex gap-4 px-4 py-3">
                  <label className="flex items-center gap-2 text-gray-300 text-sm">
                    <input type="checkbox" checked={contactForm.isPrimary} onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })} className="rounded bg-transparent border-white/20" />
                    Primary Contact
                  </label>
                  <label className="flex items-center gap-2 text-gray-300 text-sm">
                    <input type="checkbox" checked={contactForm.isActive} onChange={(e) => setContactForm({ ...contactForm, isActive: e.target.checked })} className="rounded bg-transparent border-white/20" />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="primary" size="sm" onClick={saveContact}><Save className="w-4 h-4" /> Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowContactForm(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </Card>
          )}

          {/* Contacts list */}
          <div className="space-y-3">
            {contacts.length === 0 && (
              <p className="text-gray-500 text-center py-10">No emergency contacts yet. Add your first contact above.</p>
            )}
            {contacts.map((contact) => (
              <div key={contact._id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{contact.name}</p>
                      {contact.isPrimary && <Badge variant="bg-brand-500/20 text-brand-300">Primary</Badge>}
                      {!contact.isActive && <Badge variant="bg-gray-500/20 text-gray-400">Inactive</Badge>}
                    </div>
                    <p className="text-gray-400 text-sm">{contact.relationship} • {contact.phone} {contact.email ? `• ${contact.email}` : ''}</p>
                    <p className="text-gray-500 text-xs mt-1">Notifications: {contact.notificationPreference.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { 
                    setEditContactId(contact._id); 
                    setContactForm({ 
                      name: contact.name, 
                      phone: contact.phone, 
                      relationship: contact.relationship, 
                      email: contact.email || '',
                      isPrimary: contact.isPrimary,
                      isActive: contact.isActive !== undefined ? contact.isActive : true,
                      notificationPreference: contact.notificationPreference || 'SMS_AND_EMAIL'
                    }); 
                    setShowContactForm(true); 
                  }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteContact(contact._id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========= HISTORY TAB ========= */}
      {tab === 'history' && (
        <div>
          <h3 className="text-xl font-bold text-white mb-6">Emergency Alert History</h3>
          
          {selectedHistoryAlert ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <h4 className="text-lg font-bold text-white">Incident Details</h4>
                <Button variant="ghost" size="sm" onClick={() => setSelectedHistoryAlert(null)}>
                  <X className="w-4 h-4" /> Close
                </Button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Emergency Type</p>
                  <p className="text-white font-medium capitalize">{ALERT_TYPE_LABELS[selectedHistoryAlert.alertType] || selectedHistoryAlert.alertType}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Created At</p>
                    <p className="text-white font-medium">{new Date(selectedHistoryAlert.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Final Status</p>
                    <Badge variant={STATUS_COLORS[selectedHistoryAlert.status]}>{STATUS_LABELS[selectedHistoryAlert.status] || selectedHistoryAlert.status}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-1">Location</p>
                  <p className="text-white font-medium">
                    {selectedHistoryAlert.location?.address || 
                     (selectedHistoryAlert.location?.coordinates ? 
                       `${selectedHistoryAlert.location.coordinates[1].toFixed(6)}, ${selectedHistoryAlert.location.coordinates[0].toFixed(6)}` 
                       : 'Location unavailable')}
                  </p>
                </div>

                {selectedHistoryAlert.responderId && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-6">
                    <h5 className="text-white font-semibold mb-4">Response Information</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Responder</span>
                        <span className="text-white">{(selectedHistoryAlert.responderId as { name: string }).name}</span>
                      </div>
                      
                      {selectedHistoryAlert.acceptedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Accepted At</span>
                          <span className="text-white">{new Date(selectedHistoryAlert.acceptedAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                      
                      {selectedHistoryAlert.arrivedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Arrived At</span>
                          <span className="text-white">{new Date(selectedHistoryAlert.arrivedAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                      
                      {selectedHistoryAlert.resolvedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Resolved At</span>
                          <span className="text-white">{new Date(selectedHistoryAlert.resolvedAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                      
                      {selectedHistoryAlert.acceptedAt && selectedHistoryAlert.resolvedAt && (
                        <div className="flex justify-between pt-3 border-t border-white/10">
                          <span className="text-brand-400 font-medium">Response Duration</span>
                          <span className="text-white font-medium">
                            {Math.round((new Date(selectedHistoryAlert.resolvedAt).getTime() - new Date(selectedHistoryAlert.createdAt).getTime()) / 60000)} minutes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <>
              {historyAlerts.length === 0 && (
                <p className="text-gray-500 text-center py-10">No alerts yet. Your alert history will appear here.</p>
              )}
              <div className="space-y-3">
                {historyAlerts.map((alert) => (
                  <div key={alert._id} onClick={() => setSelectedHistoryAlert(alert)} className="cursor-pointer p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 mt-0.5">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium">{ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}</p>
                            <Badge variant={STATUS_COLORS[alert.status]}>{STATUS_LABELS[alert.status]}</Badge>
                          </div>
                          <p className="text-gray-400 text-sm">{alert.description || 'Emergency alert triggered'}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.createdAt).toLocaleString()}</span>
                            {alert.location?.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.location.address}</span>}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
              
              {historyTotalPages > 1 && (
                <div className="flex justify-center gap-4 mt-8">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-gray-400 text-sm flex items-center">
                    Page {historyPage} of {historyTotalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========= SAFETY PROFILE TAB ========= */}
      {tab === 'profile' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Safety Profile</h3>
            {!editingProfile && (
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                <Edit3 className="w-4 h-4" /> Edit
              </Button>
            )}
          </div>

          <Card className="p-6" hover={false}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Blood Group</label>
                {editingProfile ? (
                  <select value={profileForm.bloodGroup} onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-500 transition-colors">
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => <option key={g} value={g} className="bg-gray-900">{g}</option>)}
                  </select>
                ) : (
                  <p className="text-white font-medium">{profileForm.bloodGroup || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Medical Conditions</label>
                {editingProfile ? (
                  <textarea value={profileForm.medicalConditions} onChange={(e) => setProfileForm({ ...profileForm, medicalConditions: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors resize-none" rows={3} placeholder="e.g., Asthma, Diabetes, Allergies..." />
                ) : (
                  <p className="text-white">{profileForm.medicalConditions || 'None specified'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Emergency Note</label>
                {editingProfile ? (
                  <textarea value={profileForm.emergencyNote} onChange={(e) => setProfileForm({ ...profileForm, emergencyNote: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors resize-none" rows={3} placeholder="Any special instructions for responders..." />
                ) : (
                  <p className="text-white">{profileForm.emergencyNote || 'None'}</p>
                )}
              </div>

              {editingProfile && (
                <div className="flex gap-3">
                  <Button variant="primary" size="sm" onClick={saveProfile}><Save className="w-4 h-4" /> Save Profile</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)}><X className="w-4 h-4" /> Cancel</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========= NEARBY SAFETY RESOURCES TAB ========= */}
      {tab === 'zones' && (
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-white">Nearby Safety Resources</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
              {['ALL', 'SAFE_ZONE', 'POLICE_STATION', 'HOSPITAL', 'WOMEN_HELP_CENTER', 'SHELTER', 'CAMPUS_SECURITY', 'SUPPORT_CENTER'].map(filterType => (
                <button
                  key={filterType}
                  onClick={() => setZoneFilter(filterType)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    zoneFilter === filterType 
                      ? 'bg-brand-500 text-white' 
                      : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {filterType.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3"><AlertTriangle className="w-5 h-5 shrink-0" /><p className="text-sm">{error}</p></div>}
          {zonesLoading && <div className="h-64 flex items-center justify-center"><p className="text-gray-400 animate-pulse">Scanning for nearby resources...</p></div>}

          {!zonesLoading && !error && userLocation && (
            <div className="space-y-6">
              <SafetyResourcesMap 
                userLatitude={userLocation.lat} 
                userLongitude={userLocation.lng} 
                resources={nearbyZones.filter(z => zoneFilter === 'ALL' || z.type === zoneFilter)} 
              />

              {nearbyZones.filter(z => zoneFilter === 'ALL' || z.type === zoneFilter).length === 0 ? (
                <p className="text-gray-500 text-center py-10">No safety resources found nearby matching the selected filter.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearbyZones.filter(z => zoneFilter === 'ALL' || z.type === zoneFilter).map((zone) => (
                    <div key={zone._id} className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-brand-500/20 text-brand-400">
                          <Building className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{zone.name}</p>
                          <Badge variant="bg-white/10 text-gray-300" className="mt-1 mb-2">{zone.type.replace(/_/g, ' ')}</Badge>
                          
                          {zone.distanceMeters !== undefined && (
                            <p className="text-emerald-400 text-xs font-semibold mb-2">{(zone.distanceMeters / 1000).toFixed(2)} km away</p>
                          )}
                          
                          <p className="text-gray-400 text-sm flex items-start gap-1">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="truncate block">{zone.location.address}</span>
                          </p>
                          {zone.phone && (
                            <p className="text-brand-400 text-sm mt-1 flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{zone.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
