'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, ShieldCheck, Clock, Heart, Activity } from 'lucide-react';
import api, { PublicStats } from '@/lib/api';

interface StatItem {
  id: string;
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      prevTargetRef.current = 0;
      return;
    }

    const start = prevTargetRef.current;
    prevTargetRef.current = target;
    const duration = 1000;
    const steps = 30;
    const diff = target - start;
    if (diff === 0) {
      setCount(target);
      return;
    }

    const increment = diff / steps;
    let currentStep = 0;
    let currentVal = start;

    const timer = setInterval(() => {
      currentStep++;
      currentVal += increment;
      if (currentStep >= steps) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.round(currentVal));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  // Format suffix dynamically based on target magnitude
  const dynamicSuffix = suffix === '+' 
    ? (target >= 1000 ? '+' : '') 
    : suffix;

  return (
    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
      {count.toLocaleString()}{dynamicSuffix}
    </div>
  );
}

export default function Stats() {
  const [statsData, setStatsData] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const data = await api.getPublicStats();
        if (isMounted) {
          setStatsData(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // 5s real-time live sync
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const stats: StatItem[] = [
    {
      id: 'users',
      icon: <Users className="w-6 h-6" />,
      value: statsData ? (statsData.womenProtected > 0 ? statsData.womenProtected : statsData.allUsersCount) : 0,
      suffix: '+',
      label: 'Women Protected',
      color: 'from-brand-500 to-brand-600',
    },
    {
      id: 'alerts',
      icon: <ShieldCheck className="w-6 h-6" />,
      value: statsData?.alertsResolved ?? 0,
      suffix: '+',
      label: 'Alerts Resolved',
      color: 'from-accent-500 to-accent-600',
    },
    {
      id: 'time',
      icon: <Clock className="w-6 h-6" />,
      value: statsData?.avgResponseTimeMins ?? 2,
      suffix: ' min',
      label: 'Avg Response Time',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 'vols',
      icon: <Heart className="w-6 h-6" />,
      value: statsData?.verifiedVolunteers ?? 0,
      suffix: '+',
      label: 'Verified Volunteers',
      color: 'from-amber-500 to-amber-600',
    },
  ];

  return (
    <section className="relative py-20 bg-[#0F0D1A] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Live status badge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-300 tracking-wide uppercase flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              Live Platform Metrics
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="relative group text-center p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <span className="text-white">{stat.icon}</span>
              </div>
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              <p className="text-gray-400 mt-2 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
