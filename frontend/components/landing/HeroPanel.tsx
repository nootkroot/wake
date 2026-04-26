import Link from 'next/link';
import { FIGMA_ASSETS } from '@/lib/figma-assets';

export default function HeroPanel() {
  return (
    <div className="relative w-full h-full">
      {/* Hero blur background image */}
      <img
        src={FIGMA_ASSETS.heroBlur}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" 
        style={{
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full px-14 pt-20 pb-12 flex flex-col justify-between max-w-[640px]">
        {/* Logo block */}
        <div>
          <img
            src={FIGMA_ASSETS.roundSun}
            alt=""
            className="w-[420px] h-auto mb-1"
          />
          <h1 className="fnt-display text-[140px] font-bold leading-[0.85] tracking-tighter text-white -mt-2">
            WAKE
          </h1>
          <p className="fnt-med  text-s tracking-[0.16em] text-white text-right pr-1 mt-3 max-w-[420px]">
            LET OUR VOICES RISE
          </p>
        </div>

        {/* Divider + bottom row */}
        <div>
          <div className="border-t-2 border-dashed border-white w-[88%] mb-12" />

          <div className="fnt-med font-bold grid grid-cols-[1fr_auto] gap-x-12 gap-y-12 items-start">
            {/* Top row */}
            <p className="text-2xl tracking-[0.08em] leading-tight text-white">
              TALK ABOUT YOUR<br />CITY&apos;S ISSUES.
            </p>
            <Link
              href="/issues/new"
              className="flex items-center justify-center w-56 h-16 rounded-full bg-[#1e1e1e] border border-white text-white text-sm tracking-[0.15em] font-medium hover:bg-[#2a2a2a]"
            >
              REPORT AN ISSUE
            </Link>

            {/* Bottom row */}
            <p className="text-2xl tracking-[0.08em] leading-tight text-white/60 text-right">
              FIND OUT YOUR<br />CITIZENS&apos; VIEWS.
            </p>
            <Link
              href="/legislation"
              className="flex items-center justify-center w-56 h-16 rounded-full bg-[#433650] border border-white text-white text-sm tracking-[0.15em] font-medium hover:bg-[#5a4a6f]"
            >
              ANALYZE QUESTIONS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
