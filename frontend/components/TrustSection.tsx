'use client';

import { ShieldCheck, Lock, Zap } from 'lucide-react';

const trust = [
  {
    icon: <ShieldCheck className="w-8 h-8" />,
    title: 'Verified Responders',
    description: 'Every volunteer undergoes ID verification and background checks before joining the platform.',
  },
  {
    icon: <Lock className="w-8 h-8" />,
    title: 'End-to-End Encryption',
    description: 'Your personal data, location, and communications are encrypted and protected at all times.',
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Instant Alerts',
    description: 'Emergency alerts are delivered in under 3 seconds to all nearby responders and contacts.',
  },
];

export default function TrustSection() {
  return (
    <section className="relative py-20 bg-[#0F0D1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {trust.map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                {item.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
