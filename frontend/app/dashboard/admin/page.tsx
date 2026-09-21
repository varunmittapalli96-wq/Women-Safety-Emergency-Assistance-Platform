'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Shield, AlertTriangle, MapPin, ShieldCheck, Clock,
  CheckCircle, XCircle, X, Plus, Save, Trash2, Building, BarChart3,
  Activity, Phone, Mail, Edit3,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { io, Socket } from 'socket.io-client';
import api, { User, Alert, SafetyZone, STATUS_LABELS, STATUS_COLORS, ALERT_TYPE_LABELS, ZONE_TYPE_LABELS } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge, Button, Card } from '@/components/ui';
import dynamic from 'next/dynamic';

const AdminMapPicker = dynamic(() => import('@/components/AdminMapPicker'), { ssr: false });

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [dashData, setDashData] = useState<{ stats: Record<string, number>; recentAlerts: Alert[] } | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [volunteers, setVolunteers] = useState<User[]>([]);
  const [volFilter, setVolFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'>('PENDING');
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [safetyZones, setSafetyZones] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Analytics & Reports State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<{ _id: string; count: number }[]>([]);
  const [reportAlerts, setReportAlerts] = useState<Alert[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  
  // Filters
  const [dateRange, setDateRange] = useState('this_month'); // 'today', 'last_7', 'last_30', 'this_month'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportStatus, setReportStatus] = useState('all');

  // Safety zone form
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneForm, setZoneForm] = useState({ 
    name: '', type: 'SAFE_ZONE', address: '', phone: '', lng: '', lat: '', description: '', operatingHours: '' 
  });

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.getAdminDashboard();
      setDashData(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/dashboard'); return; }
    loadDashboard();
  }, [user, authLoading, router, loadDashboard]);

  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
    const href = newTab === 'dashboard' ? '/dashboard/admin' : `/dashboard/admin?tab=${newTab}`;
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

  const loadTab = useCallback(async (t: string) => {
    try {
      // Calculate date filters for analytics
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();
      
      if (dateRange === 'today') {
        startDate = new Date(now.setHours(0,0,0,0)).toISOString();
        endDate = new Date(now.setHours(23,59,59,999)).toISOString();
      } else if (dateRange === 'last_7') {
        startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
      } else if (dateRange === 'last_30') {
        startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
      } else if (dateRange === 'custom' && customStart && customEnd) {
        startDate = new Date(customStart).toISOString();
        endDate = new Date(customEnd).toISOString();
      }

      if (t === 'dashboard' || t === 'analytics') {
        const [overview, trends] = await Promise.all([
          api.getAdminAnalyticsOverview(startDate, endDate),
          api.getAdminAnalyticsTrends(startDate, endDate)
        ]);
        setAnalyticsData(overview);
        setTrendsData(trends);
      } else if (t === 'reports') {
        const data = await api.getAdminIncidentReports(reportPage, 20, startDate, endDate, reportStatus);
        setReportAlerts(data.alerts);
        setReportTotalPages(data.totalPages);
      } else if (t === 'verify') {
        const data = await api.getAllUsers();
        setVolunteers(data.filter(u => u.role === 'volunteer'));
      } else if (t === 'users') {
        const data = await api.getAllUsers();
        setAllUsers(data);
      } else if (t === 'zones') {
        const data = await api.getAdminSafetyZones();
        setSafetyZones(data);
      }
    } catch {
      /* ignore */
    }
  }, [dateRange, customStart, customEnd, reportPage, reportStatus]);

  useEffect(() => {
    if (user?.role === 'admin') loadTab(tab);
  }, [tab, user, loadTab]);

  const approveVolunteer = async (id: string) => {
    try {
      const updated = await api.approveVolunteer(id);
      setVolunteers(volunteers.map(v => v._id === id ? updated : v));
      setSuccess('Volunteer verified successfully!');
      await loadDashboard();
    } catch {
      setError('Failed to verify volunteer');
    }
  };

  const rejectVolunteer = async (id: string) => {
    try {
      const updated = await api.rejectVolunteer(id);
      setVolunteers(volunteers.map(v => v._id === id ? updated : v));
      setSuccess('Volunteer rejected.');
      await loadDashboard();
    } catch {
      setError('Failed to reject volunteer');
    }
  };

  const suspendVolunteer = async (id: string) => {
    try {
      const updated = await api.suspendVolunteer(id);
      setVolunteers(volunteers.map(v => v._id === id ? updated : v));
      setSuccess('Volunteer suspended.');
      await loadDashboard();
    } catch {
      setError('Failed to suspend volunteer');
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await api.resolveAlert(id, { status: 'resolved', note: 'Resolved by admin' });
      setSuccess('Alert resolved.');
      await loadTab('alerts');
      await loadDashboard();
    } catch {
      setError('Failed to resolve alert');
    }
  };

  const createZone = async () => {
    try {
      if (!zoneForm.name || !zoneForm.type || !zoneForm.lng || !zoneForm.lat) {
        throw new Error('Please fill all required fields');
      }
      
      const lng = parseFloat(zoneForm.lng);
      const lat = parseFloat(zoneForm.lat);
      if (isNaN(lng) || isNaN(lat)) {
        throw new Error('Invalid coordinates');
      }

      await api.adminCreateSafetyZone({
        name: zoneForm.name,
        type: zoneForm.type,
        location: { coordinates: [lng, lat], address: zoneForm.address },
        phone: zoneForm.phone,
        description: zoneForm.description,
        operatingHours: zoneForm.operatingHours
      });
      setShowZoneForm(false);
      setZoneForm({ name: '', type: 'SAFE_ZONE', address: '', phone: '', lng: '', lat: '', description: '', operatingHours: '' });
      setSuccess('Safety zone created!');
      await loadTab('zones');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create zone');
    }
  };

  const deleteZone = async (id: string) => {
    try {
      await api.adminDeleteSafetyZone(id);
      setSafetyZones(safetyZones.filter((z) => z._id !== id));
      setSuccess('Safety zone deleted.');
    } catch {
      setError('Failed to delete zone');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0F0D1A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = dashData?.stats || {};

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
          { id: 'dashboard', label: 'Analytics Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'reports', label: 'Incident Reports', icon: <Activity className="w-4 h-4" /> },
          { id: 'verify', label: 'Volunteers', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'alerts', label: 'All Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
          { id: 'zones', label: 'Safety Zones', icon: <MapPin className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg'
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
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h3 className="text-xl font-bold text-white">Platform Analytics</h3>
            
            <div className="flex gap-2">
              <select 
                className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="today" className="bg-gray-900">Today</option>
                <option value="last_7" className="bg-gray-900">Last 7 Days</option>
                <option value="last_30" className="bg-gray-900">Last 30 Days</option>
                <option value="this_month" className="bg-gray-900">This Month</option>
                <option value="custom" className="bg-gray-900">Custom Range</option>
              </select>
              
              {dateRange === 'custom' && (
                <>
                  <input type="date" className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <input type="date" className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </>
              )}
            </div>
          </div>

          {analyticsData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-white">{analyticsData.totalUsers}</p>
                  <p className="text-xs text-gray-500 mt-2">Lifetime Registered</p>
                </div>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Monthly Active Users</p>
                  <p className="text-2xl font-bold text-brand-400">{analyticsData.monthlyActiveUsers}</p>
                  <p className="text-xs text-gray-500 mt-2">Active in period</p>
                </div>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Total Volunteers</p>
                  <p className="text-2xl font-bold text-white">{analyticsData.totalVolunteers}</p>
                  <p className="text-xs text-gray-500 mt-2">Verified Responders</p>
                </div>
                <div className="p-5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                  <p className="text-brand-300 text-sm mb-1">Active Emergencies</p>
                  <p className="text-2xl font-bold text-brand-400">{analyticsData.activeAlerts}</p>
                  <p className="text-xs text-brand-300/50 mt-2">Currently live right now</p>
                </div>
              </div>

              <h4 className="text-lg font-bold text-white mb-4 mt-8 border-b border-white/10 pb-2">Emergency Response Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Alerts Triggered</p>
                  <p className="text-2xl font-bold text-white">{analyticsData.alertsInPeriod}</p>
                </div>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Avg Response Time</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {analyticsData.avgResponseTimeMs ? `${Math.round(analyticsData.avgResponseTimeMs / 60000)}m ${Math.round((analyticsData.avgResponseTimeMs % 60000) / 1000)}s` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Creation → Accepted</p>
                </div>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Successful Assistance Rate</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {analyticsData.successfulAssistanceRate !== null ? `${analyticsData.successfulAssistanceRate.toFixed(1)}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Resolved / Responded</p>
                </div>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Volunteer Response Rate</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {analyticsData.volunteerResponseRate !== null ? `${analyticsData.volunteerResponseRate.toFixed(1)}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Alerts Accepted / Total</p>
                </div>
              </div>

              {trendsData.length > 0 && (
                <>
                  <h4 className="text-lg font-bold text-white mb-4 mt-8 border-b border-white/10 pb-2">Incident Trend (Period)</h4>
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10 h-64 flex items-end justify-between gap-1">
                    {trendsData.map((t, idx) => {
                      const maxCount = Math.max(...trendsData.map(d => d.count), 1);
                      const heightPct = (t.count / maxCount) * 100;
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 group relative">
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                            {t._id}: {t.count} alerts
                          </div>
                          <div className="w-full bg-brand-500/80 hover:bg-brand-400 rounded-t-sm transition-all" style={{ height: `${heightPct}%`, minHeight: '4px' }} />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ========= VOLUNTEERS TAB ========= */}
      {tab === 'verify' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-white">
              Manage Volunteers
            </h3>
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 overflow-x-auto">
              {['ALL', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map(f => (
                <button
                  key={f}
                  onClick={() => setVolFilter(f as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${volFilter === f ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {volunteers.filter(v => volFilter === 'ALL' || v.verificationStatus === volFilter).length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">No volunteers found for this status.</p>
            </div>
          )}

          <div className="space-y-4">
            {volunteers
              .filter(v => volFilter === 'ALL' || v.verificationStatus === volFilter)
              .map((vol) => (
              <Card key={vol._id} className="p-6" hover={false}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 font-bold">
                      {vol.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{vol.name}</p>
                        <Badge variant={
                          vol.verificationStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' :
                          vol.verificationStatus === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                          vol.verificationStatus === 'SUSPENDED' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-amber-500/20 text-amber-400'
                        }>{vol.verificationStatus || 'PENDING'}</Badge>
                      </div>
                      <p className="text-gray-400 text-sm flex items-center gap-1 mt-1"><Mail className="w-3 h-3" />{vol.email}</p>
                      <p className="text-gray-400 text-sm flex items-center gap-1"><Phone className="w-3 h-3" />{vol.phone}</p>
                      {vol.profile?.organization && <p className="text-accent-300 text-sm mt-1">{vol.profile.organization}</p>}
                      {vol.profile?.skills && vol.profile.skills.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {vol.profile.skills.map((skill) => (
                            <Badge key={skill} variant="bg-white/10 text-gray-300">{skill}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col shrink-0">
                    {vol.verificationStatus === 'PENDING' && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => approveVolunteer(vol._id)}>
                          <CheckCircle className="w-4 h-4" /> Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => rejectVolunteer(vol._id)}>
                          <XCircle className="w-4 h-4" /> Reject
                        </Button>
                      </>
                    )}
                    {vol.verificationStatus === 'VERIFIED' && (
                      <Button variant="outline" size="sm" onClick={() => suspendVolunteer(vol._id)}>
                        <Activity className="w-4 h-4" /> Suspend
                      </Button>
                    )}
                    {vol.verificationStatus === 'REJECTED' && (
                      <Button variant="outline" size="sm" onClick={() => approveVolunteer(vol._id)}>
                        <CheckCircle className="w-4 h-4" /> Review & Approve
                      </Button>
                    )}
                    {vol.verificationStatus === 'SUSPENDED' && (
                      <Button variant="primary" size="sm" onClick={() => approveVolunteer(vol._id)}>
                        <ShieldCheck className="w-4 h-4" /> Reinstate
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========= ALL ALERTS TAB ========= */}
      {tab === 'alerts' && (
        <div>
          <h3 className="text-xl font-bold text-white mb-6">All Emergency Alerts</h3>
          {allAlerts.length === 0 && <p className="text-gray-500 text-center py-10">No alerts found.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Type</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">User</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Date</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allAlerts.map((alert) => {
                  const alertUser = typeof alert.userId === 'object' ? alert.userId : null;
                  return (
                    <tr key={alert._id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 text-white text-sm">{ALERT_TYPE_LABELS[alert.alertType]}</td>
                      <td className="py-4 text-gray-300 text-sm">{alertUser ? (alertUser as { name: string }).name : 'N/A'}</td>
                      <td className="py-4"><Badge variant={STATUS_COLORS[alert.status]}>{STATUS_LABELS[alert.status]}</Badge></td>
                      <td className="py-4 text-gray-400 text-sm">{new Date(alert.createdAt).toLocaleDateString()}</td>
                      <td className="py-4">
                        {['active', 'acknowledged', 'responding'].includes(alert.status) && (
                          <Button variant="primary" size="sm" onClick={() => resolveAlert(alert._id)}>Resolve</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========= USERS TAB ========= */}
      {tab === 'users' && (
        <div>
          <h3 className="text-xl font-bold text-white mb-6">All Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Name</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Email</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Role</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Verified</th>
                  <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${u.role === 'admin' ? 'bg-emerald-500' : u.role === 'volunteer' ? 'bg-accent-500' : 'bg-brand-500'}`}>
                          {u.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-400 text-sm">{u.email}</td>
                    <td className="py-4">
                      <Badge variant={u.role === 'admin' ? 'bg-emerald-500/20 text-emerald-300' : u.role === 'volunteer' ? 'bg-accent-500/20 text-accent-300' : 'bg-brand-500/20 text-brand-300'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-4">
                      {u.isVerified ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-500" />
                      )}
                    </td>
                    <td className="py-4 text-gray-400 text-sm">{new Date(u._id.substring(0, 8)).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========= SAFETY ZONES TAB ========= */}
      {tab === 'zones' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Safety Zones</h3>
            <Button variant="primary" size="sm" onClick={() => setShowZoneForm(true)}>
              <Plus className="w-4 h-4" /> Add Zone
            </Button>
          </div>

          {/* Zone form */}
          {showZoneForm && (
            <Card className="p-6 mb-6" hover={false}>
              <h4 className="text-white font-semibold mb-4">Add New Safety Zone</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Zone Name *" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors" />
                <select value={zoneForm.type} onChange={(e) => setZoneForm({ ...zoneForm, type: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500 transition-colors">
                  <option value="SAFE_ZONE" className="bg-gray-900">Safe Zone</option>
                  <option value="POLICE_STATION" className="bg-gray-900">Police Station</option>
                  <option value="HOSPITAL" className="bg-gray-900">Hospital</option>
                  <option value="WOMEN_HELP_CENTER" className="bg-gray-900">Women Help Center</option>
                  <option value="SHELTER" className="bg-gray-900">Shelter</option>
                  <option value="CAMPUS_SECURITY" className="bg-gray-900">Campus Security</option>
                  <option value="SUPPORT_CENTER" className="bg-gray-900">Support Center</option>
                  <option value="OTHER" className="bg-gray-900">Other</option>
                </select>
                <input placeholder="Address *" value={zoneForm.address} onChange={(e) => setZoneForm({ ...zoneForm, address: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors" />
                <input placeholder="Phone" value={zoneForm.phone} onChange={(e) => setZoneForm({ ...zoneForm, phone: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors" />
                
                <div className="sm:col-span-2">
                  <AdminMapPicker 
                    latitude={parseFloat(zoneForm.lat) || 0}
                    longitude={parseFloat(zoneForm.lng) || 0}
                    onChange={(lat, lng) => setZoneForm({ ...zoneForm, lat: lat.toString(), lng: lng.toString() })}
                  />
                </div>

                <input placeholder="Longitude (e.g. 77.5946) *" value={zoneForm.lng} onChange={(e) => setZoneForm({ ...zoneForm, lng: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors" />
                <input placeholder="Latitude (e.g. 12.9716) *" value={zoneForm.lat} onChange={(e) => setZoneForm({ ...zoneForm, lat: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors" />
                
                <input placeholder="Description (Optional)" value={zoneForm.description} onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors" />
                <input placeholder="Operating Hours (Optional)" value={zoneForm.operatingHours} onChange={(e) => setZoneForm({ ...zoneForm, operatingHours: e.target.value })} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="primary" size="sm" onClick={createZone}><Save className="w-4 h-4" /> Save Zone</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowZoneForm(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </Card>
          )}

          {/* Zones list */}
          <div className="grid sm:grid-cols-2 gap-4">
            {safetyZones.map((zone) => (
              <div key={zone._id} className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-500/20 text-brand-400">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{zone.name}</p>
                      <Badge variant="bg-white/10 text-gray-300" className="mt-1">{zone.type}</Badge>
                      <p className="text-gray-400 text-sm mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{zone.location.address}</p>
                      {zone.phone && <p className="text-brand-400 text-sm mt-1 flex items-center gap-1"><Phone className="w-3 h-3" />{zone.phone}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteZone(zone._id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
