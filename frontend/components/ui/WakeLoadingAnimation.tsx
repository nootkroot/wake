'use client';

import React, { useEffect, useRef } from 'react';

interface WakeLoadingAnimationProps {
  /** Set to false to play the exit animation. */
  isLoading?: boolean;
  /** Fires when the entrance animation finishes. */
  onEntranceComplete?: () => void;
  /** Fires when the exit animation finishes. */
  onExitComplete?: () => void;
}

const RAY_COUNT     = 5;
const FAN_RANGE     = 180;                           // upper semicircle
const SPACING       = FAN_RANGE / RAY_COUNT;         // 36° between rays
const ORBIT_R       = 150;                           // px from sun pivot
const ROT_SPEED     = 9;                             // °/s
const FADE_BAND     = 14;                            // ° band for horizon fade
const BOB_AMP       = 5;                             // ± px radial wobble
const BOB_PERIOD_MS = 1800;
const ENTER_DUR_MS  = 1400;
const EXIT_DUR_MS   = 1050;

export default function WakeLoadingAnimation({
  isLoading = true,
  onEntranceComplete,
  onExitComplete,
}: WakeLoadingAnimationProps) {
  const rayRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Continuous ray orbit — runs forever, regardless of entrance/exit.
  useEffect(() => {
    const baseAngles = Array.from({ length: RAY_COUNT }, (_, i) => i * SPACING);
    let rotation = 0;
    let lastT = 0;
    let rafId = 0;

    const frame = (t: number) => {
      if (lastT === 0) lastT = t;
      const dt = (t - lastT) / 1000;
      lastT = t;

      rotation = (rotation + ROT_SPEED * dt) % FAN_RANGE;

      rayRefs.current.forEach((ray, i) => {
        if (!ray) return;
        const angle = (baseAngles[i] + rotation) % FAN_RANGE;
        const rad = (angle * Math.PI) / 180;

        const phase = (t / BOB_PERIOD_MS) * Math.PI * 2 + i * ((Math.PI * 2) / RAY_COUNT);
        const r = ORBIT_R + Math.sin(phase) * BOB_AMP;

        const x = Math.cos(rad) * r;
        const y = -Math.sin(rad) * r;

        let opacity = 1;
        if (angle < FADE_BAND)                  opacity = angle / FADE_BAND;
        else if (angle > FAN_RANGE - FADE_BAND) opacity = (FAN_RANGE - angle) / FADE_BAND;

        ray.style.transform = `translate(${x}px, ${y}px) rotate(${90 - angle}deg)`;
        ray.style.opacity = opacity.toFixed(3);
      });

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Fire entrance/exit callbacks on the right schedule.
  useEffect(() => {
    if (isLoading) {
      const id = setTimeout(() => onEntranceComplete?.(), ENTER_DUR_MS + 100);
      return () => clearTimeout(id);
    } else {
      const id = setTimeout(() => onExitComplete?.(), EXIT_DUR_MS);
      return () => clearTimeout(id);
    }
  }, [isLoading, onEntranceComplete, onExitComplete]);

  return (
    <>
      <style>{`
        .wake-stage {
          position: relative;
          width: 720px;
          height: 560px;
          --grad-from: #FFE374;
          --grad-to:   #FFA14E;
          --grad: linear-gradient(135deg, var(--grad-from) 0%, var(--grad-to) 100%);
          --enter-dur: ${ENTER_DUR_MS}ms;
          --exit-dur:  ${EXIT_DUR_MS}ms;
          --enter-ease: cubic-bezier(0.34, 1.56, 0.64, 1);
          --exit-ease:  cubic-bezier(0.36, 0, 0.66, -0.56);
          font-family: 'Novecento Wide DemiBold', 'Novecento sans wide', 'Big Shoulders Display', sans-serif;
        }
        .wake-upper, .wake-lower {
          position: absolute; left: 0; right: 0;
          overflow: hidden;
        }
        .wake-upper { top: 0;   height: 50%; }
        .wake-lower { top: 50%; height: 50%; }

        .wake-rise {
          position: absolute; bottom: 0; left: 50%;
          transform: translateX(-50%) translateY(100%);
        }
        .wake-fall {
          position: absolute; top: 0; left: 50%;
          transform: translateX(-50%) translateY(-100%);
          text-align: center;
        }
        .wake-stage[data-loading="true"] .wake-rise {
          animation: wakeRise var(--enter-dur) var(--enter-ease) 0.1s forwards;
        }
        .wake-stage[data-loading="true"] .wake-fall {
          animation: wakeFall var(--enter-dur) var(--enter-ease) 0.1s forwards;
        }
        .wake-stage[data-loading="false"] .wake-rise {
          animation: wakeRiseExit var(--exit-dur) var(--exit-ease) forwards;
        }
        .wake-stage[data-loading="false"] .wake-fall {
          animation: wakeFallExit var(--exit-dur) var(--exit-ease) forwards;
        }
        @keyframes wakeRise     { to { transform: translateX(-50%) translateY(0); } }
        @keyframes wakeFall     { to { transform: translateX(-50%) translateY(0); } }
        @keyframes wakeRiseExit {
          from { transform: translateX(-50%) translateY(0); }
          to   { transform: translateX(-50%) translateY(100%); }
        }
        @keyframes wakeFallExit {
          from { transform: translateX(-50%) translateY(0); }
          to   { transform: translateX(-50%) translateY(-100%); }
        }

        .wake-sun-system {
          position: relative;
          width: 460px;
          height: 280px;
        }
        .wake-sun {
          position: absolute; left: 50%; bottom: 0;
          width: 220px; height: 110px;
          border-radius: 220px 220px 0 0;
          background: var(--grad);
          transform: translateX(-50%);
          transform-origin: 50% 100%;
          animation: wakeSunPulse 2.6s ease-in-out infinite;
          animation-delay: var(--enter-dur);
        }
        @keyframes wakeSunPulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50%      { transform: translateX(-50%) scale(1.05); }
        }

        .wake-rays { position: absolute; left: 50%; bottom: 0; width: 0; height: 0; }
        .wake-ray {
          position: absolute;
          width: 30px; height: 96px;
          margin-left: -15px;
          margin-top: -48px;
          border-radius: 15px;
          background: var(--grad);
          will-change: transform, opacity;
        }

        .wake-text {
          font-size: 168px;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 0.9;
          background: var(--grad);
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
          padding-top: 12px;
          animation: wakeTextPulse 2.6s ease-in-out infinite;
          animation-delay: var(--enter-dur);
        }
        @keyframes wakeTextPulse {
          0%, 100% { filter: brightness(1)    saturate(1); }
          50%      { filter: brightness(1.15) saturate(1.1); }
        }

        .wake-subtitle {
          margin-top: 16px;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: #fff;
        }
      `}</style>

      <div className="wake-stage" data-loading={isLoading ? 'true' : 'false'}>
        <div className="wake-upper">
          <div className="wake-rise">
            <div className="wake-sun-system">
              <div className="wake-sun" />
              <div className="wake-rays">
                {Array.from({ length: RAY_COUNT }, (_, i) => (
                  <div
                    key={i}
                    className="wake-ray"
                    ref={(el) => { rayRefs.current[i] = el; }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="wake-lower">
          <div className="wake-fall">
            <div className="wake-text">WAKE</div>
            <div className="wake-subtitle">LET OUR VOICES RISE</div>
          </div>
        </div>
      </div>
    </>
  );
}
