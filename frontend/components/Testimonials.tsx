'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, Loader2 } from 'lucide-react';
import api from '@/lib/api';

const defaultTestimonials = [
  {
    name: 'Meera Rajesh',
    role: 'Software Engineer',
    city: 'Bengaluru',
    text: 'bSafe gave me confidence to commute late at night. When I felt unsafe near my apartment, I tapped SOS and a volunteer reached me in under 4 minutes. This platform is a lifesaver.',
    rating: 5,
    initials: 'MR',
  },
  {
    name: 'Kavya Nair',
    role: 'College Student',
    city: 'Kochi',
    text: 'As a student who travels alone, bSafe is my safety net. The live location sharing with my parents gives them peace of mind, and the nearby safe zones feature is incredibly useful.',
    rating: 5,
    initials: 'KN',
  },
  {
    name: 'Pooja Verma',
    role: 'Nurse',
    city: 'Delhi',
    text: 'After a scary experience during a night shift commute, a colleague recommended bSafe. The one-click SOS and verified volunteer network make me feel protected every day.',
    rating: 5,
    initials: 'PV',
  },
  {
    name: 'Anjali Deshmukh',
    role: 'Freelance Designer',
    city: 'Pune',
    text: 'I was skeptical at first, but the response time is incredible. When I triggered an alert, the volunteer was there in minutes. The emergency contacts notification feature is brilliant.',
    rating: 4,
    initials: 'AD',
  },
];

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState(defaultTestimonials);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await api.getPublicTestimonials();
        if (data && data.length > 0) {
          setTestimonials(data);
        }
      } catch (err) {
        console.error('Failed to fetch testimonials:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section id="testimonials" className="relative py-24 bg-[#0F0D1A]">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-brand-600/10 rounded-full blur-[150px] -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-600/10 border border-brand-500/20 text-brand-300 text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Trusted by{' '}
            <span className="gradient-text">Women Everywhere</span>
          </h2>
        </div>

        {/* Testimonial carousel */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          ) : testimonials.length > 0 ? (
            <>
              <div className="relative p-8 sm:p-12 rounded-3xl bg-white/5 border border-white/10">
                {/* Quote icon */}
                <Quote className="w-12 h-12 text-brand-500/30 mb-6" />

                {/* Content */}
                <p className="text-lg sm:text-xl text-gray-300 leading-relaxed mb-8 min-h-[120px]">
                  &ldquo;{testimonials[current].text}&rdquo;
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < testimonials[current].rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
                    />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold">
                    {testimonials[current].initials}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{testimonials[current].name}</p>
                    <p className="text-gray-400 text-sm">{testimonials[current].role} • {testimonials[current].city}</p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 sm:-left-6">
                  <button
                    onClick={prev}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-6">
                  <button
                    onClick={next}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrent(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index === current ? 'bg-brand-500 w-8' : 'bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400">No testimonials yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
