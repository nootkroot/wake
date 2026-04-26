import { getMockSubmissions } from "@/lib/submissions";
import HeroPanel from "@/components/landing/HeroPanel";
import CardScroller from "@/components/landing/CardScroller";
import CityBackdrop from "@/components/landing/CityBackdrop";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function Page() {
  const submissions = getMockSubmissions();

  return (
    <main className="fixed inset-0 z-40 h-screen w-screen overflow-hidden bg-black text-white">
      <CityBackdrop />
      
      <div className="grid h-full w-full grid-cols-2">
        <div className="pointer-events-none z-[45] overflow-x-visible overflow-y-hidden">
          <div className="pointer-events-auto h-full">
            <HeroPanel />
          </div>
        </div>
        <div className="relative z-20 h-full overflow-hidden">
          <SiteHeader showBrand={false} />
          <div className="absolute inset-0">
            <CardScroller submissions={submissions} />
          </div>
        </div>
      </div>
    </main>
  );
}
