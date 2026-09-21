'use client';

import { useState, useEffect } from 'react';
import { Shield, MapPin, Radio } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui';
import { api, PublicStats } from '@/lib/api';

export default function Hero() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const data = await api.getPublicStats();
        if (isMounted) setStats(data);
      } catch (err) {
        console.error('Failed to load hero stats:', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // 5s real-time polling
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0F0D1A]">
      {/* Gradient background orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-600/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[150px]" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-600/10 border border-brand-500/20 mb-6 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-brand-300 text-sm font-medium">Emergency Assistance at Your Fingertips</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-6 animate-slide-up">
              Your Safety,{' '}
              <span className="gradient-text">Our Priority</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8 animate-slide-up stagger-2">
              One-click SOS alerts, real-time location sharing, and instant connection to verified volunteers. Because every second counts when you need help.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up stagger-3">
              <Link href="/register">
                <Button variant="primary" size="xl">
                  <Shield className="w-5 h-5" />
                  Get Protected Now
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="xl">
                  Learn How It Works
                </Button>
              </a>
            </div>

            {/* Trust indicators with real user initials & live user count */}
            <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start animate-slide-up stagger-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {stats && stats.recentUsers && stats.recentUsers.length > 0 ? (
                    stats.recentUsers.slice(0, 4).map((user, i) => (
                      <div
                        key={i}
                        title={`${user.name} (${user.role})`}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-500 border-2 border-[#0F0D1A] flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform hover:scale-110"
                      >
                        {user.initials}
                      </div>
                    ))
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-600 border-2 border-[#0F0D1A] flex items-center justify-center text-white text-xs font-bold">
                      •
                    </div>
                  )}
                </div>
                <span className="text-gray-400 text-sm">
                  <span className="text-white font-semibold">
                    {stats ? (stats.womenProtected > 0 ? stats.womenProtected : stats.allUsersCount) : '...'}
                  </span>{' '}
                  users protected
                </span>
              </div>
            </div>
          </div>

          {/* Right — SOS button showcase */}
          <div className="flex justify-center lg:justify-end animate-fade-in stagger-3">
            <div className="relative">
              {/* Phone mockup */}
              <div className="w-72 sm:w-80 h-[520px] sm:h-[560px] rounded-[3rem] bg-gradient-to-b from-gray-800 to-gray-900 border border-white/10 p-3 shadow-2xl shadow-brand-600/10">
                <div className="w-full h-full rounded-[2.25rem] bg-[#0F0D1A] flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Status bar mockup */}
                  <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-8 pt-4">
                    <span className="text-gray-500 text-xs font-medium">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-2 rounded-sm bg-gray-500" />
                      <div className="w-1.5 h-2 rounded-sm bg-gray-600" />
                    </div>
                  </div>

                  {/* App header */}
                  <div className="absolute top-12 left-0 right-0 text-center">
                    <p className="text-gray-400 text-sm font-medium">bSafe Emergency</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 text-xs">Location active</span>
                    </div>
                  </div>

                  {/* SOS Button */}
                  <div className="relative flex items-center justify-center">
                    {/* Pulse rings */}
                    <div className="absolute w-44 h-44 rounded-full border-2 border-brand-500/30 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute w-36 h-36 rounded-full border-2 border-brand-500/40 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                    <div className="absolute w-28 h-28 rounded-full border border-brand-500/50 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />

                    {/* Main SOS button */}
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex items-center justify-center shadow-2xl shadow-brand-600/50 animate-sos-pulse cursor-pointer relative z-10">
                      <div className="text-center">
                        <span className="text-white text-3xl font-black tracking-wider block">SOS</span>
                        <span className="text-brand-200 text-[10px] font-medium uppercase tracking-widest">Tap for Help</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="absolute bottom-16 left-0 right-0 px-6">
                    <div className="flex justify-center gap-6">
                      {[
                        { icon: <Radio className="w-4 h-4" />, label: 'Alert' },
                        { icon: <MapPin className="w-4 h-4" />, label: 'Share' },
                        { icon: <Shield className="w-4 h-4" />, label: 'Safe' },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-400">
                            {item.icon}
                          </div>
                          <span className="text-gray-500 text-[10px]">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-gray-700" />
                </div>
              </div>

              {/* Floating notification cards with real database counts */}
              <div className="absolute -top-4 -left-8 sm:-left-16 glass rounded-2xl p-3 shadow-xl animate-float max-w-[200px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">Volunteer Nearby</p>
                    <p className="text-gray-400 text-[10px]">
                      {stats && stats.verifiedVolunteers > 0
                        ? `${stats.verifiedVolunteers} verified • Responding`
                        : '0.5 km away • Responding'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-8 sm:-right-16 glass rounded-2xl p-3 shadow-xl animate-float max-w-[200px]" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">Location Shared</p>
                    <p className="text-gray-400 text-[10px]">
                      {stats && stats.emergencyContactsCount > 0
                        ? `With ${stats.emergencyContactsCount} emergency contacts`
                        : 'With emergency contacts'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0F0D1A] to-transparent" />
    </section>
  );
}
