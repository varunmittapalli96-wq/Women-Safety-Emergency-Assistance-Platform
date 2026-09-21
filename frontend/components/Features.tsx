'use client';

import { Shield, MapPin, UserCheck, Navigation, Clock, Phone } from 'lucide-react';

const features = [
  {
    icon: <Shield className="w-7 h-7" />,
    title: 'One-Click SOS',
    description: 'Trigger an emergency alert instantly with a single tap. No fumbling through menus — just press and help is on the way.',
    color: 'from-brand-500 to-brand-600',
    glow: 'group-hover:shadow-brand-500/20',
  },
  {
    icon: <MapPin className="w-7 h-7" />,
    title: 'Live Location Sharing',
    description: 'Your real-time location is shared with responders and emergency contacts automatically during an active alert.',
    color: 'from-emerald-500 to-emerald-600',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  {
    icon: <UserCheck className="w-7 h-7" />,
    title: 'Verified Volunteers',
    description: 'Every volunteer and support team member is verified and trained. Trust the people who respond to your call.',
    color: 'from-accent-500 to-accent-600',
    glow: 'group-hover:shadow-accent-500/20',
  },
  {
    icon: <Navigation className="w-7 h-7" />,
    title: 'Nearby Safe Zones',
    description: 'Locate police stations, hospitals, and safe houses near you. Know your safe havens wherever you go.',
    color: 'from-blue-500 to-blue-600',
    glow: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: <Clock className="w-7 h-7" />,
    title: 'Alert History',
    description: 'Track all past alerts with timestamps, responder details, and resolution status for complete transparency.',
    color: 'from-amber-500 to-amber-600',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: <Phone className="w-7 h-7" />,
    title: 'Emergency Contacts',
    description: 'Add trusted contacts who are notified instantly when you trigger an SOS. Your safety net, always ready.',
    color: 'from-pink-500 to-pink-600',
    glow: 'group-hover:shadow-pink-500/20',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 bg-[#0F0D1A]">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/5 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-600/10 border border-accent-500/20 text-accent-300 text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything You Need to{' '}
            <span className="gradient-text">Stay Safe</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A comprehensive safety toolkit designed for real emergencies, with features that work when every second matters.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${feature.glow} animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-white">{feature.icon}</span>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover accent line */}
              <div className={`absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r ${feature.color} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-full`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
