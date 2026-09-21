'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Shield, Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthToken } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Verifying your Google session...');

  useEffect(() => {
    const processCallback = async () => {
      const error = searchParams.get('error');
      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      const token = searchParams.get('token');
      if (!token) {
        router.replace('/login?error=Authentication%20session%20missing.%20Please%20try%20again.');
        return;
      }

      try {
        setStatusMessage('Loading your safety profile...');
        const user = await setAuthToken(token);

        // Redirect based on verified user role
        if (user.role === 'admin') {
          router.replace('/dashboard/admin');
        } else if (user.role === 'volunteer') {
          router.replace('/dashboard/volunteer');
        } else {
          router.replace('/dashboard/user');
        }
      } catch (err: unknown) {
        console.error('OAuth callback processing error:', err);
        const message = err instanceof Error ? err.message : 'Failed to finalize authentication';
        router.replace(`/login?error=${encodeURIComponent(message)}`);
      }
    };

    processCallback();
  }, [router, searchParams, setAuthToken]);

  return (
    <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 max-w-sm w-full mx-4 shadow-2xl backdrop-blur-md">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-600/30">
        <Shield className="w-8 h-8 text-white" />
      </div>
      <div className="flex items-center justify-center gap-3 mb-4">
        <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
        <h2 className="text-lg font-bold text-white">Completing Sign-In</h2>
      </div>
      <p className="text-gray-400 text-sm">{statusMessage}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#0F0D1A] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-600/15 rounded-full blur-[120px]" />
      <Suspense
        fallback={
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading authentication...</p>
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
