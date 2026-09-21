'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio, Clock, User, BarChart3, MapPin, Shield, Phone,
  CheckCircle, XCircle, AlertTriangle, Star, Activity, X, Save, Edit3, Heart,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';
import { api, Alert, VolunteerStats, STATUS_LABELS, STATUS_COLORS, ALERT_TYPE_LABELS } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, Badge, Card } from '@/components/ui';
import dynamic from 'next/dynamic';

const LiveEmergencyMap = dynamic(
  () => import('@/components/LiveEmergencyMap'),
  { ssr: false }
);

export default function VolunteerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [nearbyAlerts, setNearbyAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<Alert[]>([]);
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Notification System
  const [notifications, setNotifications] = useState<any[]>([]);
  const [browserNotificationPerm, setBrowserNotificationPerm] = useState(false);

  // Audio for SOS
  const playAlertSound = useCallback(() => {
    try {
      const audio = new Audio('/alert.mp3'); // Fallback if file doesn't exist won't break app
      audio.play().catch(() => {});
    } catch {}
  }, []);

  const socketRef = useRef<Socket | null>(null);
  const [liveLocations, setLiveLocations] = useState<Record<string, { lat: number, lng: number, timestamp: string }>>({});

  // Profile form
  const [profileForm, setProfileForm] = useState({ organization: '', skills: '', experience: '', bio: '' });
  const [editingProfile, setEditingProfile] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const [alertsData, historyData, statsData] = await Promise.all([
        api.getNearbyAlerts().catch(() => []),
        api.getVolunteerHistory(),
        api.getVolunteerStats(),
      ]);
      setNearbyAlerts(alertsData);
      setHistory(historyData);
      setStats(statsData);
      setIsAvailable(statsData.isAvailable);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'volunteer') { router.push('/dashboard'); return; }
    loadAlerts();
    if (user.profile) {
      setProfileForm({
        organization: user.profile.organization || '',
        skills: user.profile.skills?.join(', ') || '',
        experience: String(user.profile.experience || ''),
        bio: user.profile.bio || '',
      });
    }
  }, [user, authLoading, router, loadAlerts]);

  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
    const href = newTab === 'dashboard' ? '/dashboard/volunteer' : `/dashboard/volunteer?tab=${newTab}`;
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

  // Initialize Socket.IO connection & Notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user || user.role !== 'volunteer') return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setBrowserNotificationPerm(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => setBrowserNotificationPerm(perm === 'granted'));
      }
    }

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Connect to Socket.IO. We automatically join user:{id} room on backend.
    });

    // Listen for new targeted notifications
    socket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Play sound
      playAlertSound();

      // Show native browser notification if enabled
      if (browserNotificationPerm && document.hidden) {
        new Notification(notification.title || 'bSafe Notification', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
      
      // Toast or inline UI update
      setSuccess(`${notification.title}: ${notification.message}`);
      
      // Auto-refresh the alerts list to show the new SOS
      if (notification.type === 'SOS_ALERT') {
        loadAlerts();
      }
    });

    socket.on('sos:location:update', (data) => {
      setLiveLocations((prev) => ({
        ...prev,
        [data.alertId]: { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [user, browserNotificationPerm, loadAlerts, playAlertSound]);

  // Join alert rooms when nearby alerts are loaded
  useEffect(() => {
    if (!socketRef.current || !nearbyAlerts.length) return;
    nearbyAlerts.forEach(alert => {
      if (['active', 'acknowledged', 'responding'].includes(alert.status)) {
        socketRef.current?.emit('join:alert', alert._id);
      }
    });
  }, [nearbyAlerts]);

  const toggleAvailability = async () => {
    try {
      const result = await api.toggleAvailability();
      setIsAvailable(result.isAvailable);
      setSuccess(result.isAvailable ? 'You are now available for alerts' : 'You are now offline');
    } catch {
      /* ignore */
    }
  };

  const respondToAlert = async (alertId: string, action: 'accept' | 'decline') => {
    try {
      const data = await api.respondToAlert(alertId, action);
      if (action === 'accept') {
        setNearbyAlerts(nearbyAlerts.map(a => a._id === alertId ? data : a));
        setSuccess('Alert accepted! You are now the assigned responder.');
        
        // Start streaming location for this alert
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (socketRef.current) {
                socketRef.current.emit('sos:location:update', {
                  alertId,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });
              }
            },
            (err) => console.error('Location error:', err)
          );
        }
      } else {
        // Remove from list if declined
        setNearbyAlerts(nearbyAlerts.filter(a => a._id !== alertId));
        setSuccess('Alert declined.');
      }
      await loadAlerts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to respond to alert');
    }
  };

  const updateStatus = async (alertId: string, status: string) => {
    try {
      const updatedAlert = await api.updateResponseStatus(alertId, status);
      setNearbyAlerts(nearbyAlerts.map(a => a._id === alertId ? updatedAlert : a));
      setSuccess(`Status updated to ${STATUS_LABELS[status] || status}`);
      await loadAlerts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const saveProfile = async () => {
    try {
      await api.updateVolunteerProfile({
        organization: profileForm.organization,
        skills: profileForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        experience: parseInt(profileForm.experience) || 0,
        bio: profileForm.bio,
      });
      setEditingProfile(false);
      setSuccess('Profile updated!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0F0D1A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Volunteer not verified yet
  if (user.verificationStatus === 'PENDING' || !user.verificationStatus) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verification Pending</h2>
          <p className="text-gray-400 text-center max-w-md">
            Your volunteer account is waiting for admin approval. You&apos;ll be able to respond to alerts once verified.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (user.verificationStatus === 'REJECTED') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verification Rejected</h2>
          <p className="text-gray-400 text-center max-w-md">
            Your volunteer application was not approved. If you believe this is a mistake, please contact support.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (user.verificationStatus === 'SUSPENDED') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-500/20 flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Volunteer Account Suspended</h2>
          <p className="text-gray-400 text-center max-w-md">
            Your volunteer account is currently suspended. You are ineligible to receive emergency alerts.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab={tab} onTabChange={handleTabChange}>
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
          { id: 'alerts', label: 'Nearby Alerts', icon: <Radio className="w-4 h-4" /> },
          { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
          { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
          { id: 'stats', label: 'Statistics', icon: <BarChart3 className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-accent-600 to-accent-700 text-white shadow-lg'
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
        <div>
          {/* Availability toggle */}
          <Card className="p-6 mb-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-lg">Availability Status</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {isAvailable ? 'You are receiving nearby emergency alerts' : 'You are offline and won\'t receive alerts'}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`relative w-16 h-8 rounded-full transition-all duration-300 ${isAvailable ? 'bg-emerald-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${isAvailable ? 'left-9' : 'left-1'}`} />
              </button>
            </div>
          </Card>

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Assists', value: stats?.totalAssists || 0, icon: <Shield className="w-5 h-5" />, color: 'from-accent-500 to-accent-600' },
              { label: 'Rating', value: stats?.rating?.toFixed(1) || '0.0', icon: <Star className="w-5 h-5" />, color: 'from-amber-500 to-amber-600' },
              { label: 'Responses', value: stats?.totalResponses || 0, icon: <Radio className="w-5 h-5" />, color: 'from-brand-500 to-brand-600' },
              { label: 'Resolved', value: stats?.resolvedCount || 0, icon: <CheckCircle className="w-5 h-5" />, color: 'from-emerald-500 to-emerald-600' },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} mb-3`}>
                  <span className="text-white">{s.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-gray-400 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent nearby alerts preview */}
          <h4 className="text-white font-semibold mb-3">Recent Nearby Alerts</h4>
          {nearbyAlerts.length === 0 ? (
            <p className="text-gray-500 text-sm">No active alerts nearby. Check back later.</p>
          ) : (
            <div className="space-y-3">
              {nearbyAlerts.slice(0, 3).map((alert) => (
                <div key={alert._id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{ALERT_TYPE_LABELS[alert.alertType]}</p>
                      <p className="text-gray-400 text-xs">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_COLORS[alert.status]}>{STATUS_LABELS[alert.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========= NEARBY ALERTS TAB ========= */}
      {tab === 'alerts' && (
        <div>
          <h3 className="text-xl font-bold text-white mb-6">Nearby Emergency Alerts</h3>
          {nearbyAlerts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-gray-400">No active alerts nearby. All clear!</p>
            </div>
          )}
          <div className="space-y-4">
            {nearbyAlerts.map((alert) => {
              const alertUser = typeof alert.userId === 'object' ? alert.userId : null;
              const liveData = liveLocations[alert._id];
              return (
                <Card key={alert._id} className="p-6" hover={false}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-semibold">{ALERT_TYPE_LABELS[alert.alertType]}</p>
                          <Badge variant={STATUS_COLORS[alert.status]}>{STATUS_LABELS[alert.status]}</Badge>
                          {(liveData || alert.locationStatus === 'LIVE') && (
                            <Badge variant="bg-red-500/20 text-red-400 border border-red-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1.5 inline-block" />
                              LIVE
                            </Badge>
                          )}
                          {(!liveData && alert.locationStatus === 'LAST_KNOWN') && (
                            <Badge variant="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              LAST KNOWN
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{alert.description || 'Emergency assistance requested'}</p>
                        
                        <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5">
                          {alert.locationStatus !== 'UNAVAILABLE' && (liveData || alert.location?.coordinates) && (
                            <div className="mb-3 border border-white/10 rounded-xl overflow-hidden shadow-lg">
                              <LiveEmergencyMap
                                latitude={liveData ? liveData.lat : alert.location!.coordinates[1]}
                                longitude={liveData ? liveData.lng : alert.location!.coordinates[0]}
                                status={(liveData || alert.locationStatus === 'LIVE') ? 'LIVE' : 'LAST_KNOWN'}
                                timestamp={liveData ? new Date(liveData.timestamp).toLocaleTimeString() : new Date(alert.createdAt).toLocaleTimeString()}
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            {(liveData || alert.locationStatus === 'LIVE') ? (
                              <>
                                <MapPin className="w-4 h-4 text-red-400" />
                                <span>
                                  {liveData ? `${liveData.lat.toFixed(6)}, ${liveData.lng.toFixed(6)}` : alert.location?.coordinates ? `${alert.location.coordinates[1].toFixed(6)}, ${alert.location.coordinates[0].toFixed(6)}` : 'Live location'}
                                </span>
                              </>
                            ) : alert.locationStatus === 'UNAVAILABLE' ? (
                              <>
                                <X className="w-4 h-4 text-red-400" />
                                <span className="text-red-400">LOCATION UNAVAILABLE</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4 text-amber-400" />
                                <span>
                                  {alert.location?.coordinates ? `${alert.location.coordinates[1].toFixed(6)}, ${alert.location.coordinates[0].toFixed(6)}` : 'Last known location'}
                                </span>
                              </>
                            )}
                          </div>
                          {(liveData || alert.locationStatus === 'LIVE') && (
                            <p className="text-xs text-gray-500 mt-1.5 ml-6 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last updated: {liveData ? new Date(liveData.timestamp).toLocaleTimeString() : new Date(alert.createdAt).toLocaleTimeString()}
                            </p>
                          )}
                          {(!liveData && alert.locationStatus === 'LAST_KNOWN') && (
                            <p className="text-xs text-amber-500/70 mt-1.5 ml-6 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last known location: {new Date(alert.createdAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User info */}
                  {alertUser && (
                    <div className="p-3 rounded-xl bg-white/5 mb-4">
                      <p className="text-white text-sm font-medium">{(alertUser as { name: string }).name}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{(alertUser as { phone: string }).phone}</p>
                    </div>
                  )}

                  {/* Actions (State Machine) */}
                  <div className="flex flex-wrap gap-3">
                    {alert.status === 'active' && (!alert.responderId) && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => respondToAlert(alert._id, 'accept')}>
                          <CheckCircle className="w-4 h-4" /> Accept & Respond
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => respondToAlert(alert._id, 'decline')}>
                          <XCircle className="w-4 h-4" /> Decline
                        </Button>
                      </>
                    )}
                    
                    {/* If assigned to this volunteer */}
                    {alert.responderId && (typeof alert.responderId === 'string' ? alert.responderId === user._id : alert.responderId._id === user._id) && (
                      <>
                        {alert.status === 'accepted' && (
                          <Button variant="primary" size="sm" onClick={() => updateStatus(alert._id, 'en_route')}>
                            <Activity className="w-4 h-4" /> Start Response (En Route)
                          </Button>
                        )}
                        {alert.status === 'en_route' && (
                          <Button variant="primary" size="sm" onClick={() => updateStatus(alert._id, 'arrived')}>
                            <MapPin className="w-4 h-4" /> Mark Arrived
                          </Button>
                        )}
                        {alert.status === 'arrived' && (
                          <Button variant="primary" size="sm" onClick={() => updateStatus(alert._id, 'assisting')}>
                            <Heart className="w-4 h-4" /> Start Assisting
                          </Button>
                        )}
                        {alert.status === 'assisting' && (
                          <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus(alert._id, 'resolved')}>
                            <CheckCircle className="w-4 h-4" /> Resolve Emergency
                          </Button>
                        )}
                      </>
                    )}
                    
                    {/* If assigned to someone else (though should be filtered from backend, just in case) */}
                    {alert.responderId && (typeof alert.responderId === 'string' ? alert.responderId !== user._id : alert.responderId._id !== user._id) && (
                      <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
                        Assigned to another responder
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========= HISTORY TAB ========= */}
      {tab === 'history' && (
        <div>
          <h3 className="text-xl font-bold text-white mb-6">Response History</h3>
          {history.length === 0 && <p className="text-gray-500 text-center py-10">No response history yet.</p>}
          <div className="space-y-3">
            {history.map((alert) => (
              <div key={alert._id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {alert.status === 'resolved' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{ALERT_TYPE_LABELS[alert.alertType]}</p>
                      <p className="text-gray-400 text-xs">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_COLORS[alert.status]}>{STATUS_LABELS[alert.status]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========= PROFILE TAB ========= */}
      {tab === 'profile' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Volunteer Profile</h3>
            {!editingProfile && (
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                <Edit3 className="w-4 h-4" /> Edit
              </Button>
            )}
          </div>

          <Card className="p-6" hover={false}>
            <div className="space-y-5">
              {[
                { label: 'Organization', key: 'organization' as const, placeholder: 'Your NGO or organization' },
                { label: 'Skills (comma-separated)', key: 'skills' as const, placeholder: 'first_aid, counseling...' },
                { label: 'Years of Experience', key: 'experience' as const, placeholder: '0' },
                { label: 'Bio', key: 'bio' as const, placeholder: 'Tell us about yourself...' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                  {editingProfile ? (
                    field.key === 'bio' ? (
                      <textarea value={profileForm[field.key]} onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500 transition-colors resize-none" rows={3} placeholder={field.placeholder} />
                    ) : (
                      <input value={profileForm[field.key]} onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500 transition-colors" placeholder={field.placeholder} />
                    )
                  ) : (
                    <p className="text-white">{profileForm[field.key] || 'Not specified'}</p>
                  )}
                </div>
              ))}

              {editingProfile && (
                <div className="flex gap-3">
                  <Button variant="secondary" size="sm" onClick={saveProfile}><Save className="w-4 h-4" /> Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)}><X className="w-4 h-4" /> Cancel</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========= STATISTICS TAB ========= */}
      {tab === 'stats' && (
        <div>
          <h3 className="text-xl font-bold text-white mb-6">Your Statistics</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Assists', value: stats?.totalAssists || 0, icon: <Shield className="w-8 h-8" />, color: 'from-accent-500 to-accent-600', desc: 'Successfully resolved emergencies' },
              { label: 'Average Rating', value: `${stats?.rating?.toFixed(1) || '0.0'} / 5`, icon: <Star className="w-8 h-8" />, color: 'from-amber-500 to-amber-600', desc: `Based on ${stats?.totalRatings || 0} ratings` },
              { label: 'Total Responses', value: stats?.totalResponses || 0, icon: <Radio className="w-8 h-8" />, color: 'from-brand-500 to-brand-600', desc: 'Alerts you responded to' },
              { label: 'Resolved Cases', value: stats?.resolvedCount || 0, icon: <CheckCircle className="w-8 h-8" />, color: 'from-emerald-500 to-emerald-600', desc: 'Successfully closed incidents' },
              { label: 'Success Rate', value: stats?.totalResponses ? `${Math.round(((stats?.resolvedCount || 0) / stats.totalResponses) * 100)}%` : 'N/A', icon: <Activity className="w-8 h-8" />, color: 'from-blue-500 to-blue-600', desc: 'Resolution percentage' },
              { label: 'Status', value: isAvailable ? 'Online' : 'Offline', icon: <Activity className="w-8 h-8" />, color: isAvailable ? 'from-emerald-500 to-emerald-600' : 'from-gray-500 to-gray-600', desc: 'Current availability' },
            ].map((s) => (
              <Card key={s.label} className="p-6" hover={false}>
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} mb-4`}>
                  <span className="text-white">{s.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-white font-medium text-sm mt-1">{s.label}</p>
                <p className="text-gray-400 text-xs mt-1">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
