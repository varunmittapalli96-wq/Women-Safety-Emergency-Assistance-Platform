'use client';

import { AlertTriangle, HeartPulse, ShieldAlert, MapPinOff } from 'lucide-react';

const services = [
  {
    icon: <AlertTriangle className="w-10 h-10" />,
    title: 'SOS Emergency',
    description: 'Instant distress signal sent to nearby verified volunteers and emergency contacts with your live GPS location.',
    color: 'from-brand-500 to-brand-700',
    bg: 'bg-brand-500/10',
  },
  {
    icon: <HeartPulse className="w-10 h-10" />,
    title: 'Medical Emergency',
    description: 'Request medical assistance. Your safety profile with blood group and medical conditions is shared with responders.',
    color: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: <ShieldAlert className="w-10 h-10" />,
    title: 'Harassment Alert',
    description: 'Report harassment incidents instantly. Volunteers and support teams are dispatched to your exact location.',
    color: 'from-accent-500 to-accent-700',
    bg: 'bg-accent-500/10',
  },
  {
    icon: <MapPinOff className="w-10 h-10" />,
    title: 'Unsafe Area Alert',
    description: 'Mark and report unsafe areas to warn other users. Community-driven safety mapping for everyone.',
    color: 'from-amber-500 to-amber-700',
    bg: 'bg-amber-500/10',
  },
];

export default function Services() {
  return (
    <section id="services" className="relative py-24 bg-[#0F0D1A]">
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-600/10 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-4">
            Emergency Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Assistance For{' '}
            <span className="gradient-text">Every Situation</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Multiple alert types for different emergency scenarios, each triggering the right response.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative p-8 sm:p-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

              <div className="relative z-10 flex flex-col sm:flex-row gap-6">
                <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${service.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-white">{service.icon}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">{service.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
