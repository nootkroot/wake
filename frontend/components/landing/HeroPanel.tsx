/* eslint-disable @next/next/no-img-element */
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
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-items-center px-[clamp(1rem,4vw,4rem)]">
        {/* Logo block */}
        <div className="ml-auto flex h-[clamp(16rem,60vh,40rem)] flex-col items-end justify-center">
          <div className="relative z-[1] mb-[clamp(0.35rem,0.9vw,0.75rem)] h-[clamp(3.5rem,8.5vw,6.5rem)] w-[clamp(8.5rem,20vw,13rem)]">
            <img
              src={FIGMA_ASSETS.roundSun}
              alt=""
              className="block h-full w-full object-contain"
            />
          </div>
          <img
            src="/assets/WAKE.svg"
            alt="WAKE"
            className="block h-[clamp(5.5rem,14vw,12rem)]"
          />
          <p className="helvetica-medium mt-[clamp(0.5rem,1vw,0.9rem)] max-h-[10vh] pr-1 text-right text-[clamp(0.7rem,1.25vw,1.125rem)] font-bold tracking-[0.1em] text-white">
            LET OUR VOICES RISE
          </p>
        </div>

        {/* Divider + bottom row */}
        <div>
          <div className="mt-[clamp(0.75rem,1.8vw,1.5rem)] mb-[clamp(1.25rem,3.2vw,3rem)] w-full border-t-2 border-dashed border-white" />

          <div className="grid grid-cols-2 w-full items-start justify-items-end h-full">
            {/* Top row */}
            <div className="helvetica-medium flex h-[60%] w-full flex-col items-start justify-between text-[clamp(0.9rem,1.4vw,1.25rem)] font-bold">
              <p className="tracking-[0.08em] leading-tight text-white">
                TALK ABOUT YOUR<br />CITY&apos;S ISSUES.
              </p>
              <p className="tracking-[0.08em] leading-tight w-full text-white/60 text-right">
                LEARN ABOUT YOUR<br />CONSTITUENTS&apos; VIEWS.
              </p>
            </div>

            {/* Bottom row */}
            <div className="helvetica-thin flex h-full flex-col items-end justify-self-end gap-y-[clamp(0.5rem,1.2vw,1rem)] text-white">
              <Link
                href="/issues"
                className="flex h-[clamp(2.3rem,5vw,3.5rem)] w-[clamp(8.75rem,18vw,12rem)] items-center justify-center rounded-full border border-white bg-[#1e1e1e] text-[clamp(0.62rem,1vw,0.9rem)] tracking-[0.03em] hover:bg-[#2a2a2a]"
              >
                REPORT AN ISSUE
              </Link>        
              <Link
                href="/legislation"
                className="flex h-[clamp(2.3rem,5vw,3.5rem)] w-[clamp(8.75rem,18vw,12rem)] items-center justify-center rounded-full border border-white bg-[#433650] text-[clamp(0.62rem,1vw,0.9rem)] tracking-[0.03em] hover:bg-[#5a4a6f]"
              >
                ANALYZE QUESTIONS
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
