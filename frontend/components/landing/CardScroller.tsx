'use client';

import { useEffect, useRef, useState } from 'react';
import type { Submission } from '@/lib/submissions';
import IssueCard from './IssueCard';

const CARD_HEIGHT   = 520;
const CARD_GAP      = 36;
const CARD_FULL     = CARD_HEIGHT + CARD_GAP;
const SCROLL_SPEED  = 1.0;
const MOUSE_PARALLAX_X = 14;
const MOUSE_PARALLAX_Y = 8;
const BLUR_STRIP_HEIGHT = 140;

export default function CardScroller({ submissions }: { submissions: Submission[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const N = submissions.length;
  const totalH = N * CARD_FULL;

  // Wheel-driven virtual scroll (page itself doesn't scroll — body has overflow:hidden)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScrollOffset(prev => prev + e.deltaY * SCROLL_SPEED);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Mouse position for parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMouse({ x, y });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Cards (positioned absolutely, wrapped via modulo) */}
      {submissions.map((sub, i) => {
        const baseY = i * CARD_FULL;
        // Wrap: keep apparent y in [0, totalH); shift down so cards naturally land in the visible area
        const wrapped = ((baseY - scrollOffset) % totalH + totalH) % totalH;
        // Anchor: the wrap point sits one full card-height above the viewport
        // so the snap from y=−CARD_FULL → y=totalH−CARD_FULL stays off-screen
        const y = wrapped - CARD_FULL + 80;

        // Mouse parallax: cards drift opposite to mouse, less than the bg
        const px = -mouse.x * MOUSE_PARALLAX_X;
        const py = -mouse.y * MOUSE_PARALLAX_Y;

        return (
          <div
            key={sub.id}
            className="absolute left-1/2 top-0"
            style={{
              transform: `translate(calc(-50% + ${px}px), ${y + py}px)`,
              willChange: 'transform',
            }}
          >
            <IssueCard submission={sub} />
          </div>
        );
      })}

      {/* Top blur strip — strongest at top edge, fades out toward middle */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-30"
        style={{
          height: `${BLUR_STRIP_HEIGHT}px`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 100%)',
        }}
      />

      {/* Bottom blur strip — strongest at bottom edge, fades out toward middle */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-30"
        style={{
          height: `${BLUR_STRIP_HEIGHT}px`,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          maskImage: 'linear-gradient(to top, black 0%, black 25%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, black 25%, transparent 100%)',
        }}
      />
    </div>
  );
}
