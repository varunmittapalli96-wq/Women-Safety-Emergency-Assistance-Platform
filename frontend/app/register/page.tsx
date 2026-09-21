'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';
import GoogleButton from '@/components/GoogleButton';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: searchParams.get('role') || 'user',
    organization: '',
    skills: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
      };
      if (form.role === 'volunteer') {
        data.organization = form.organization;
        data.skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean);
      }
      await register(data);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">Create Your Account</h1>
        <p className="text-gray-400">Join the bSafe safety network</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Role selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">I want to</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'user' })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                form.role === 'user'
                  ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              🛡️ Get Protected
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'volunteer' })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                form.role === 'volunteer'
                  ? 'bg-accent-600/20 border-accent-500 text-accent-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              💪 Volunteer
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
          <input
            id="register-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
          <input
            id="register-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
          <input
            id="register-phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            placeholder="+91 98765 43210"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors pr-12"
              placeholder="Min 6 characters"
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

        {/* Volunteer-specific fields */}
        {form.role === 'volunteer' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Organization</label>
              <input
                id="register-organization"
                type="text"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
                placeholder="NGO or organization name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Skills (comma separated)</label>
              <input
                id="register-skills"
                type="text"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
                placeholder="first_aid, counseling, self_defense"
              />
            </div>
          </>
        )}

        <Button type="submit" variant={form.role === 'volunteer' ? 'secondary' : 'primary'} size="lg" className="w-full" disabled={loading}>
          <UserPlus className="w-5 h-5" />
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#151221] px-3 text-gray-400 font-medium tracking-wider">
              Or sign up with
            </span>
          </div>
        </div>

        {/* Google Authentication Button */}
        <GoogleButton label="Sign up with Google" disabled={loading} onError={setError} />

        <p className="text-center text-gray-400 text-sm pt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#0F0D1A] flex items-center justify-center px-4 py-12">
      {/* Background effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-600/15 rounded-full blur-[120px]" />

      <Suspense fallback={<div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin relative z-10" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
