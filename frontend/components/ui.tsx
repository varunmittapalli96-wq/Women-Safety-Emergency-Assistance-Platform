'use client';

import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function Button({ children, variant = 'primary', size = 'md', className = '', onClick, disabled, type = 'button' }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-700 hover:to-brand-800 focus:ring-brand-500 shadow-lg shadow-brand-600/25 hover:shadow-xl hover:shadow-brand-600/40 hover:-translate-y-0.5',
    secondary: 'bg-gradient-to-r from-accent-600 to-accent-700 text-white hover:from-accent-700 hover:to-accent-800 focus:ring-accent-500 shadow-lg shadow-accent-600/25 hover:shadow-xl hover:shadow-accent-600/40 hover:-translate-y-0.5',
    outline: 'border-2 border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white focus:ring-brand-500',
    ghost: 'text-gray-300 hover:text-white hover:bg-white/10 focus:ring-white/20',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-600/25',
  };
  const sizes: Record<string, string> = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-2.5 text-sm gap-2',
    lg: 'px-8 py-3 text-base gap-2',
    xl: 'px-10 py-4 text-lg gap-3',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: string;
  className?: string;
}

export function Badge({ children, variant = 'bg-brand-100 text-brand-800', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variant} ${className}`}>
      {children}
    </span>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm ${hover ? 'hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl' : ''} transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}
