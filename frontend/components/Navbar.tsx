'use client';

import { useState } from 'react';
import { Shield, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:shadow-brand-600/50 transition-shadow">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              b<span className="gradient-text">Safe</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">How It Works</a>
            <a href="#services" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Services</a>
            <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Testimonials</a>
            <a href="#faq" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">FAQ</a>
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-white/10 animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" className="block text-gray-300 hover:text-white py-2 font-medium" onClick={() => setOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-gray-300 hover:text-white py-2 font-medium" onClick={() => setOpen(false)}>How It Works</a>
            <a href="#services" className="block text-gray-300 hover:text-white py-2 font-medium" onClick={() => setOpen(false)}>Services</a>
            <a href="#testimonials" className="block text-gray-300 hover:text-white py-2 font-medium" onClick={() => setOpen(false)}>Testimonials</a>
            <a href="#faq" className="block text-gray-300 hover:text-white py-2 font-medium" onClick={() => setOpen(false)}>FAQ</a>
            <div className="flex gap-3 pt-3 border-t border-white/10">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">Log In</Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
