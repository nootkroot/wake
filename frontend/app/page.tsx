import { getMockSubmissions } from '@/lib/submissions';
import TopNav        from '@/components/landing/TopNav';
import HeroPanel     from '@/components/landing/HeroPanel';
import CardScroller  from '@/components/landing/CardScroller';
import CityBackdrop  from '@/components/landing/CityBackdrop';

export default function Page() {
  const submissions = getMockSubmissions();

  return (
    <main className="fixed inset-0 z-40 w-screen h-screen overflow-hidden bg-black text-white">
      {/* Layer 0: city background, mouse-parallax */}
      <CityBackdrop />

      {/* Layer 10: left half — hero / logo / CTAs */}
      <div className="absolute inset-y-0 left-0 w-1/2 z-10">
        <HeroPanel />
      </div>

      {/* Layer 20: right half — scroll-cycling cards with parallax */}
      <div className="absolute inset-y-0 right-0 w-1/2 z-20">
        <CardScroller submissions={submissions} />
      </div>

      {/* Layer 40: top nav, fixed */}
      <TopNav />
    </main>
  );
}
