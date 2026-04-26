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
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full px-[4rem] pt-12 flex flex-col justify-items-center max-w-[640px]">
        {/* Logo block */}
        <div className="ml-auto w-full mt-[5vh]">
          <img
            src={FIGMA_ASSETS.roundSun}
            alt=""
            className="relative z-[1] -mt-6 mb-2 block aspect-[2/1] h-auto object-contain md:-mt-10"
          />
          <img
            src="/assets/WAKE.svg"
            alt="WAKE"
            className="block w-full h-auto max-w-full"
          />
          <p className="helvetica-medium font-bold text-lg tracking-[0.1em] text-white text-right mt-3 w-full pr-1">
            LET OUR VOICES RISE
          </p>
        </div>

        {/* Divider + bottom row */}
        <div>
          <div className="border-t-2 border-dashed border-white w-[100%] mt-6 mb-12 " />

          <div className="grid grid-cols-2 w-full items-start justify-items-end h-full">
            {/* Top row */}
            <div className="helvetica-medium text-lg font-bold w-full flex flex-col items-start justify-between h-[60%]">
              <p className="tracking-[0.08em] leading-tight text-white">
                TALK ABOUT YOUR<br />CITY&apos;S ISSUES.
              </p>
              <p className="tracking-[0.08em] leading-tight w-full text-white/60 text-right">
                FIND OUT YOUR<br />CITIZENS&apos; VIEWS.
              </p>
            </div>

            {/* Bottom row */}
            <div className="flex flex-col gap-y-4 h-full items-end justify-self-end helvetica-thin text-white ">
              <Link
                href="/issues/new"
                className="flex items-center justify-center w-[12rem] h-[3.5rem] rounded-full bg-[#1e1e1e] border border-white hover:bg-[#2a2a2a]"
              >
                REPORT AN ISSUE
              </Link>        
              <Link
                href="/legislation"
                className="flex items-center justify-center w-[12rem] h-[3.5rem] rounded-full bg-[#433650] border border-white hover:bg-[#5a4a6f]"
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
