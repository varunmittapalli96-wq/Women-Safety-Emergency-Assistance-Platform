'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';
import GoogleButton from '@/components/GoogleButton';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">
            b<span className="gradient-text">Safe</span>
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">Welcome Back</h1>
        <p className="text-gray-400">Log in to access your safety dashboard</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-5 shadow-2xl">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
          <input
            id="login-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors pr-12"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          <LogIn className="w-5 h-5" />
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#151221] px-3 text-gray-400 font-medium tracking-wider">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Authentication Button */}
        <GoogleButton disabled={loading} onError={setError} />

        <p className="text-center text-gray-400 text-sm pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0F0D1A] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-600/15 rounded-full blur-[120px]" />

      <Suspense fallback={<div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
