'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How does the SOS alert work?',
    answer: 'When you tap the SOS button, the platform instantly captures your GPS location and sends an emergency alert to nearby verified volunteers, support teams, and your pre-set emergency contacts. The alert includes your live location, safety profile, and the type of emergency.',
  },
  {
    question: 'Who are the volunteers and how are they verified?',
    answer: 'Volunteers are community members, NGO workers, and support team members who register on the platform. Each volunteer undergoes identity verification, and admins review their profiles before they can respond to alerts. Only verified volunteers receive emergency notifications.',
  },
  {
    question: 'Is my personal information safe?',
    answer: 'Absolutely. Your data is encrypted and secured with industry-standard protocols. Your location is only shared during active emergencies with responders and your chosen emergency contacts. We never share your data with third parties.',
  },
  {
    question: 'What happens after I trigger an SOS alert?',
    answer: 'Nearby verified volunteers are instantly notified. A volunteer accepts the alert and begins moving to your location. You can track their approach in real-time. The alert stays active until it\'s resolved or you cancel it. Your emergency contacts are also notified.',
  },
  {
    question: 'Can I use the platform without triggering an alert?',
    answer: 'Yes! You can use bSafe to view nearby safe zones (police stations, hospitals, safe houses), manage your emergency contacts, update your safety profile, and browse safety resources — all without triggering any alerts.',
  },
  {
    question: 'How can I become a volunteer?',
    answer: 'Register as a volunteer on bSafe, provide your organization details and skills, and submit for verification. Once our admin team verifies your identity, you\'ll start receiving nearby emergency alerts and can begin helping women in your community.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 bg-[#0F0D1A]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-600/10 border border-accent-500/20 text-accent-300 text-sm font-medium mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Frequently Asked{' '}
            <span className="gradient-text">Questions</span>
          </h2>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all duration-300 hover:border-white/20"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="text-white font-semibold pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180 text-brand-400' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96 pb-6' : 'max-h-0'
                }`}
              >
                <p className="px-6 text-gray-400 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
