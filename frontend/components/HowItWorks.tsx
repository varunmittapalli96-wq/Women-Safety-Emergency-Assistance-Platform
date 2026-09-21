'use client';

import { UserPlus, Users, AlertTriangle, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: <UserPlus className="w-8 h-8" />,
    step: '01',
    title: 'Register & Setup',
    description: 'Create your account and complete your safety profile. Add blood group, medical info, and emergency notes.',
    color: 'from-brand-500 to-brand-600',
  },
  {
    icon: <Users className="w-8 h-8" />,
    step: '02',
    title: 'Add Emergency Contacts',
    description: 'Add trusted contacts — family, friends, or colleagues — who will be notified instantly during an emergency.',
    color: 'from-accent-500 to-accent-600',
  },
  {
    icon: <AlertTriangle className="w-8 h-8" />,
    step: '03',
    title: 'Tap SOS in Emergency',
    description: 'In danger? Tap the SOS button. Your live location is shared instantly with nearby volunteers and your contacts.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: <CheckCircle className="w-8 h-8" />,
    step: '04',
    title: 'Help Arrives Fast',
    description: 'Verified volunteers accept your alert and rush to your location. Track their response in real-time until you are safe.',
    color: 'from-emerald-500 to-emerald-600',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 bg-[#0F0D1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-600/10 border border-brand-500/20 text-brand-300 text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Safety in{' '}
            <span className="gradient-text">Four Simple Steps</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Designed for panic situations — minimal steps, maximum impact.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.step} className="relative group">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-[60%] w-[calc(100%-20%)] h-0.5 bg-gradient-to-r from-white/10 to-white/5" />
              )}

              <div className="text-center">
                {/* Step number */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-white">{step.icon}</span>
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0F0D1A] border-2 border-white/20 flex items-center justify-center text-xs font-bold text-white">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
