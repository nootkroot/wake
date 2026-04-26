'use client';

import { useEffect, useState } from 'react';
import { FIGMA_ASSETS } from '@/lib/figma-assets';

const PARALLAX_PX = 10; // max ± offset from mouse
const ZOOM = 1.18; // bg slightly larger than container so translation doesn't reveal edges
const BASE_Y_OFFSET_PX = 400; // permanent downward shift
const OVERSCAN_PX = 520; // extra image bleed to avoid revealing edges when shifted
const SPRING = 0.14; // pull toward target each frame
const DAMPING = 0.78; // velocity damping for smoother glide

export default function CityBackdrop() {
  const [m, setM] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };

    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1; // -1 .. 1
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      target.x = x;
      target.y = y;
    };

    let rafId = 0;
    const animate = () => {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;

      vel.x = (vel.x + dx * SPRING) * DAMPING;
      vel.y = (vel.y + dy * SPRING) * DAMPING;
      pos.x += vel.x;
      pos.y += vel.y;

      setM({ x: pos.x, y: pos.y });
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    window.addEventListener('mousemove', handler);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handler);
    };
  }, []);

  // Background moves opposite to mouse → feels like the camera is panning.
  const tx = -m.x * PARALLAX_PX;
  const ty = BASE_Y_OFFSET_PX - m.y * PARALLAX_PX;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <img
        src={FIGMA_ASSETS.neonBgCity}
        alt=""
        className="absolute left-0 w-full object-cover object-bottom select-none"
        style={{
          top: -OVERSCAN_PX,
          height: `calc(100% + ${OVERSCAN_PX * 2}px)`,
          transform: `scale(${ZOOM}) translate(${tx}px, ${ty}px)`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
