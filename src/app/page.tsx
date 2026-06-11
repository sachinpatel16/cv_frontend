import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Navbar />
      <HeroSection />
      <FeatureGrid />
    </div>
  );
}
