'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

interface GoogleButtonProps {
  label?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export default function GoogleButton({
  label = 'Continue with Google',
  disabled,
  onError,
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await loginWithGoogle(idToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const fbErr = err as { code?: string; message?: string; response?: { data?: { message?: string } } };
      
      // If user closed popup or cancelled, do not display an aggressive error
      if (
        fbErr?.code === 'auth/popup-closed-by-user' ||
        fbErr?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }

      let userFriendlyMsg = 'Google sign-in failed. Please try again.';
      if (fbErr?.code === 'auth/popup-blocked') {
        userFriendlyMsg = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (fbErr?.response?.data?.message) {
        userFriendlyMsg = fbErr.response.data.message;
      } else if (fbErr?.message) {
        userFriendlyMsg = fbErr.message;
      }

      if (onError) {
        onError(userFriendlyMsg);
      } else {
        alert(userFriendlyMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 bg-white hover:bg-gray-100 text-gray-800 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed group border border-gray-200"
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 mr-3 text-gray-600 animate-spin" />
          <span>Signing in with Google...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-3 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="font-semibold">{label}</span>
        </>
      )}
    </button>
  );
}
