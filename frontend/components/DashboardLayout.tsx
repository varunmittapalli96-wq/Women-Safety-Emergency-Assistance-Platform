'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Menu, X, LogOut, User, Bell, AlertTriangle,
  MapPin, Users, BarChart3, ShieldCheck,
  Heart, Radio, Clock, Home, ChevronRight, Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export interface NavItem {
  label: string;
  icon: ReactNode;
  href: string;
  tab: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  user: [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, href: '/dashboard/user', tab: 'dashboard' },
    { label: 'SOS Emergency', icon: <AlertTriangle className="w-5 h-5" />, href: '/dashboard/user?tab=sos', tab: 'sos' },
    { label: 'Emergency Contacts', icon: <Heart className="w-5 h-5" />, href: '/dashboard/user?tab=contacts', tab: 'contacts' },
    { label: 'Alert History', icon: <Clock className="w-5 h-5" />, href: '/dashboard/user?tab=history', tab: 'history' },
    { label: 'Safety Profile', icon: <ShieldCheck className="w-5 h-5" />, href: '/dashboard/user?tab=profile', tab: 'profile' },
    { label: 'Safe Zones', icon: <MapPin className="w-5 h-5" />, href: '/dashboard/user?tab=zones', tab: 'zones' },
  ],
  volunteer: [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, href: '/dashboard/volunteer', tab: 'dashboard' },
    { label: 'Nearby Alerts', icon: <Radio className="w-5 h-5" />, href: '/dashboard/volunteer?tab=alerts', tab: 'alerts' },
    { label: 'Response History', icon: <Clock className="w-5 h-5" />, href: '/dashboard/volunteer?tab=history', tab: 'history' },
    { label: 'My Profile', icon: <User className="w-5 h-5" />, href: '/dashboard/volunteer?tab=profile', tab: 'profile' },
    { label: 'Statistics', icon: <BarChart3 className="w-5 h-5" />, href: '/dashboard/volunteer?tab=stats', tab: 'stats' },
  ],
  admin: [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, href: '/dashboard/admin', tab: 'dashboard' },
    { label: 'Incident Reports', icon: <Activity className="w-5 h-5" />, href: '/dashboard/admin?tab=reports', tab: 'reports' },
    { label: 'Verify Volunteers', icon: <ShieldCheck className="w-5 h-5" />, href: '/dashboard/admin?tab=verify', tab: 'verify' },
    { label: 'All Alerts', icon: <AlertTriangle className="w-5 h-5" />, href: '/dashboard/admin?tab=alerts', tab: 'alerts' },
    { label: 'Users', icon: <Users className="w-5 h-5" />, href: '/dashboard/admin?tab=users', tab: 'users' },
    { label: 'Safety Zones', icon: <MapPin className="w-5 h-5" />, href: '/dashboard/admin?tab=zones', tab: 'zones' },
  ],
};

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const role = user?.role || 'user';
  const items = NAV_ITEMS[role] || NAV_ITEMS.user;

  // Track active tab state reactively
  const [internalTab, setInternalTab] = useState<string>(activeTab || 'dashboard');

  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab);
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      setInternalTab(t || 'dashboard');
    }
  }, [activeTab]);

  const effectiveTab = activeTab || internalTab;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    setSidebarOpen(false);
    const targetPath = item.href.split('?')[0];
    const isCurrentPage = pathname === targetPath;

    if (isCurrentPage && onTabChange) {
      e.preventDefault();
      onTabChange(item.tab);
      window.history.pushState(null, '', item.href);
      setInternalTab(item.tab);
    }
  };

  const isItemActive = (item: NavItem) => {
    const targetPath = item.href.split('?')[0];
    const isCurrentPage = pathname === targetPath;
    if (!isCurrentPage) return false;
    return item.tab === effectiveTab;
  };

  const roleColors: Record<string, string> = {
    user: 'from-brand-500 to-brand-600',
    volunteer: 'from-accent-500 to-accent-600',
    admin: 'from-emerald-500 to-emerald-600',
  };

  const roleBadge: Record<string, string> = {
    user: 'bg-brand-500/20 text-brand-300',
    volunteer: 'bg-accent-500/20 text-accent-300',
    admin: 'bg-emerald-500/20 text-emerald-300',
  };

  return (
    <div className="min-h-screen bg-[#0F0D1A] flex">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0a0916] border-r border-white/5 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[role]} flex items-center justify-center shadow-lg`}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              b<span className="gradient-text">Safe</span>
            </span>
          </Link>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User info */}
        <div 
          onClick={() => onTabChange?.('profile')}
          className="p-4 mx-4 mt-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
          title="Click to view profile"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-white font-bold text-sm`}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.name || 'User'}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${roleBadge[role]}`}>
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  active
                    ? `bg-gradient-to-r ${roleColors[role]} text-white shadow-lg shadow-black/20 font-semibold`
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                <ChevronRight className={`w-4 h-4 ml-auto transition-all ${active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'}`} />
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-[#0F0D1A]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden lg:block">
              <h2 className="text-white font-semibold">
                {role === 'user' && 'Safety Dashboard'}
                {role === 'volunteer' && 'Volunteer Dashboard'}
                {role === 'admin' && 'Admin Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => onTabChange?.('alerts')}
                className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 border-2 border-[#0F0D1A] text-[9px] text-white flex items-center justify-center font-bold">
                  2
                </span>
              </button>
              <div 
                onClick={() => onTabChange?.('profile')}
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-white font-bold text-sm cursor-pointer`}
                title="Profile"
              >
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
