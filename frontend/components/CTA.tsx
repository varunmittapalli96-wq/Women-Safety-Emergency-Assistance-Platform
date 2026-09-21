'use client';

import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from './ui';

export default function CTA() {
  return (
    <section className="relative py-24 bg-[#0F0D1A] overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-600/10 via-accent-600/10 to-brand-600/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[150px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Shield icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-600 mb-8 shadow-2xl shadow-brand-600/30">
          <Shield className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Don&apos;t Wait Until It&apos;s Too Late.{' '}
          <span className="gradient-text">Get Protected Today.</span>
        </h2>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          Join thousands of women who feel safer every day with bSafe. Set up your profile in 2 minutes and never feel vulnerable again.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button variant="primary" size="xl">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/register?role=volunteer">
            <Button variant="secondary" size="xl">
              Become a Volunteer
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
