'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function DashboardRouter() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    switch (user.role) {
      case 'admin':
        router.push('/dashboard/admin');
        break;
      case 'volunteer':
        router.push('/dashboard/volunteer');
        break;
      default:
        router.push('/dashboard/user');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#0F0D1A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
