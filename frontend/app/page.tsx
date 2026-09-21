import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import TrustSection from '@/components/TrustSection';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Services from '@/components/Services';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="bg-[#0F0D1A]">
      <Navbar />
      <Hero />
      <Stats />
      <TrustSection />
      <Features />
      <HowItWorks />
      <Services />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
