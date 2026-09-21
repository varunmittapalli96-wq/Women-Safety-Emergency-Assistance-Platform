'use client';

import { Shield, Heart } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative bg-[#0a0916] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 py-16">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                b<span className="gradient-text">Safe</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Empowering women with instant emergency assistance, real-time location sharing, and a trusted network of verified volunteers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {['Features', 'How It Works', 'Services', 'Testimonials', 'FAQ'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(/\s/g, '-')}`}
                    className="text-gray-400 hover:text-brand-400 transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              {['Help Center', 'Safety Tips', 'Report Issue', 'Contact Us', 'Privacy Policy'].map((link) => (
                <li key={link}>
                  <span className="text-gray-400 hover:text-brand-400 transition-colors text-sm cursor-pointer">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency */}
          <div>
            <h4 className="text-white font-semibold mb-4">Emergency Numbers</h4>
            <ul className="space-y-3">
              <li className="text-gray-400 text-sm">Women Helpline: <span className="text-brand-400 font-semibold">181</span></li>
              <li className="text-gray-400 text-sm">Police: <span className="text-brand-400 font-semibold">100</span></li>
              <li className="text-gray-400 text-sm">Ambulance: <span className="text-brand-400 font-semibold">108</span></li>
              <li className="text-gray-400 text-sm">Domestic Violence: <span className="text-brand-400 font-semibold">1091</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} bSafe. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-brand-500 fill-brand-500" /> for women&apos;s safety
          </p>
        </div>
      </div>
    </footer>
  );
}
