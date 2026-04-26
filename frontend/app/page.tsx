import { getMockSubmissions } from "@/lib/submissions";
import HeroPanel from "@/components/landing/HeroPanel";
import CardScroller from "@/components/landing/CardScroller";
import CityBackdrop from "@/components/landing/CityBackdrop";
import { LandingHeader } from "@/components/landing/LandingHeader";

export default function Page() {
  const submissions = getMockSubmissions();

  return (
    <main className="fixed inset-0 z-40 h-screen w-screen overflow-hidden bg-black text-white">
      <CityBackdrop />

      {/* Fixed strip + right-half nav (z below hero so sun / WAKE sit on top on the left) */}
      <LandingHeader />

      <div className="pointer-events-none absolute inset-y-0 left-0 z-[45] w-1/2 overflow-x-visible overflow-y-hidden">
        <div className="pointer-events-auto h-full">
          <HeroPanel />
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 z-20 w-1/2 pt-[5.5rem]">
        <CardScroller submissions={submissions} />
      </div>
    </main>
  );
}
