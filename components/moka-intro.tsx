"use client";

import { useState, type CSSProperties } from "react";

const INK = "#3a2c1a";
const YELLOW = "#ffd93d";
const ORANGE = "#ff9a2e";
const ORANGE_DARK = "#f0801a";

// One 7-second sequence: rise from the portal, flex, spawn a burger, eat it (crumbs), glasses drop on.
// The base styles ARE the final pose, so reduced-motion users just see Moka with his glasses on.
const CSS = `
.mi-hand-l { transform-origin: 30px 82px; }
.mi-hand-r { transform-origin: 90px 82px; }
.mi-burger { transform-origin: 90px 72px; opacity: 0; }
.mi-bill { transform-origin: 60px 69px; }
.mi-crumb { opacity: 0; }
.mi-spark { opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .mi-rise { animation: mi-rise 7s ease-out both; }
  .mi-hand-l { animation: mi-hl 7s ease-in-out both; }
  .mi-hand-r { animation: mi-hr 7s ease-in-out both; }
  .mi-burger { animation: mi-burger 7s ease-in-out both; }
  .mi-glasses { animation: mi-glasses 7s ease-out both; }
  .mi-spark { animation: mi-spark 7s linear both; }
  .mi-bill { animation: mi-chew 0.34s ease-in-out 3.5s 6; }
  .mi-crumb { animation: mi-fall 1.2s ease-in both; }
}
@keyframes mi-rise {
  0% { transform: translateY(70px); } 16% { transform: translateY(-7px); } 19%, 100% { transform: translateY(0); }
}
@keyframes mi-hl {
  0%, 19% { transform: translate(0, 0) rotate(0); }
  23% { transform: translate(-4px, -30px) rotate(-35deg); }
  26% { transform: translate(-4px, -25px) rotate(-18deg); }
  29% { transform: translate(-4px, -31px) rotate(-38deg); }
  32% { transform: translate(-4px, -26px) rotate(-20deg); }
  36%, 100% { transform: translate(0, 0) rotate(0); }
}
@keyframes mi-spark {
  0%, 22% { opacity: 0; } 24% { opacity: 1; } 27% { opacity: 0; } 29% { opacity: 1; } 33%, 100% { opacity: 0; }
}
@keyframes mi-hr {
  0%, 37% { transform: translate(0, 0); } 40% { transform: translate(0, -6px); } 43% { transform: translate(0, 0); }
  50% { transform: translate(-24px, -10px); } 54% { transform: translate(-22px, -9px); }
  58% { transform: translate(-24px, -10px); } 64% { transform: translate(-22px, -9px); }
  68%, 73% { transform: translate(-24px, -10px); }
  78%, 87% { transform: translate(0, 0) rotate(0); }
  91% { transform: translate(-16px, -30px) rotate(-10deg); }
  94% { transform: translate(-18px, -31px) rotate(-6deg); }
  98%, 100% { transform: translate(0, 0) rotate(0); }
}
@keyframes mi-burger {
  0%, 36% { transform: scale(0); opacity: 0; }
  39% { transform: scale(1.3); opacity: 1; } 42%, 50% { transform: scale(1); opacity: 1; }
  52%, 59% { transform: scale(0.72); opacity: 1; } 62%, 68% { transform: scale(0.45); opacity: 1; }
  71% { transform: scale(0.18); opacity: 1; } 74%, 100% { transform: scale(0); opacity: 0; }
}
@keyframes mi-glasses {
  0%, 79% { opacity: 0; transform: translateY(-46px) rotate(-8deg); }
  81% { opacity: 1; } 86% { transform: translateY(5px) rotate(2deg); } 89% { transform: translateY(-2px) rotate(0); }
  91%, 100% { opacity: 1; transform: translateY(0) rotate(0); }
}
@keyframes mi-chew { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
@keyframes mi-fall {
  0% { opacity: 0; transform: translate(0, 0) rotate(0); }
  10% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx), 100px) rotate(200deg); }
}
`;

const CRUMBS: { x: number; y: number; r: number; dx: string; delay: string; color: string }[] = [
  { x: 58, y: 76, r: 2.2, dx: "-14px", delay: "3.6s", color: "#f5a548" },
  { x: 66, y: 77, r: 1.7, dx: "10px", delay: "3.7s", color: "#c98a3a" },
  { x: 62, y: 76, r: 2.4, dx: "-6px", delay: "4.3s", color: "#f5a548" },
  { x: 68, y: 75, r: 1.8, dx: "16px", delay: "4.4s", color: "#7cc06a" },
  { x: 56, y: 77, r: 2, dx: "-18px", delay: "4.95s", color: "#c98a3a" },
  { x: 64, y: 77, r: 1.6, dx: "6px", delay: "5.05s", color: "#f5a548" },
];

export function MokaIntro({ size = 112 }: { size?: number }) {
  const [run, setRun] = useState(0);

  return (
    <button
      type="button"
      onClick={() => setRun((n) => n + 1)}
      aria-label="Replay Moka's entrance"
      className="relative z-10 shrink-0 rounded-full"
    >
      <style>{CSS}</style>
      <svg
        key={run}
        viewBox="0 0 120 120"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        className="block overflow-visible"
      >
        <defs>
          <clipPath id="mi-clip">
            <circle cx="60" cy="88" r="32" />
            <rect x="-40" y="-40" width="200" height="128" />
          </clipPath>
        </defs>

        {/* the portal */}
        <circle cx="60" cy="88" r="32" fill="#2a1d12" stroke={ORANGE} strokeWidth="5" />

        <g clipPath="url(#mi-clip)">
          <g className="mi-rise">
            <path d="M57 34 C52 22 65 16 72 24 C66 23 64 29 66 35Z" fill={YELLOW} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="60" cy="62" r="30" fill={YELLOW} stroke={INK} strokeWidth="3" />
            <ellipse cx="38" cy="68" rx="7" ry="4.5" fill="#ff8fa3" opacity="0.55" />
            <ellipse cx="82" cy="68" rx="7" ry="4.5" fill="#ff8fa3" opacity="0.55" />
            <g className="moka-eye">
              <ellipse cx="49" cy="58" rx="4.5" ry="6" fill="#1b1b1b" />
              <ellipse cx="71" cy="58" rx="4.5" ry="6" fill="#1b1b1b" />
              <circle cx="47.6" cy="55.6" r="1.6" fill="#fff" />
              <circle cx="69.6" cy="55.6" r="1.6" fill="#fff" />
            </g>
            <ellipse cx="60" cy="71" rx="9" ry="4" fill="#8a2f2f" />
            <g className="mi-bill">
              <path d="M50 69 Q60 83 70 69 Q60 73 50 69Z" fill={ORANGE_DARK} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
            </g>
            <path d="M46 67 Q60 56 74 67 Q60 75 46 67Z" fill={ORANGE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

            {/* glasses */}
            <g className="mi-glasses">
              <rect x="36" y="50" width="22" height="15" rx="6" fill="#1b1b1b" stroke={INK} strokeWidth="2" />
              <rect x="62" y="50" width="22" height="15" rx="6" fill="#1b1b1b" stroke={INK} strokeWidth="2" />
              <path d="M58 55 Q60 52 62 55" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M36 55 L29 52" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M84 55 L91 52" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M40 55 L45 55" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <path d="M66 55 L71 55" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </g>

            {/* left arm: flexes */}
            <g className="mi-spark" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 54 l-6 -4" />
              <path d="M12 62 l-7 0" />
              <path d="M16 46 l-3 -6" />
            </g>
            <g className="mi-hand-l">
              <ellipse cx="30" cy="82" rx="9" ry="7" fill={YELLOW} stroke={INK} strokeWidth="2.5" />
            </g>

            {/* right arm: holds the burger */}
            <g className="mi-hand-r">
              <g className="mi-burger">
                <g transform="translate(90 72) scale(0.9)">
                  <path d="M-13 -2 Q-13 -14 0 -14 Q13 -14 13 -2Z" fill="#f5a548" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
                  <ellipse cx="-5" cy="-9" rx="1.3" ry="0.8" fill="#fff3d6" />
                  <ellipse cx="2" cy="-11" rx="1.3" ry="0.8" fill="#fff3d6" />
                  <ellipse cx="6" cy="-7" rx="1.3" ry="0.8" fill="#fff3d6" />
                  <path d="M-14 -2 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0" fill="none" stroke="#7cc06a" strokeWidth="3" strokeLinecap="round" />
                  <rect x="-13" y="1" width="26" height="6" rx="3" fill="#6b4226" stroke={INK} strokeWidth="1.4" />
                  <path d="M-13 9 H13 Q13 15 0 15 Q-13 15 -13 9Z" fill="#f5a548" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
                </g>
              </g>
              <ellipse cx="90" cy="82" rx="9" ry="7" fill={YELLOW} stroke={INK} strokeWidth="2.5" />
            </g>
          </g>
        </g>

        {/* front rim of the portal */}
        <path d="M28 88 A32 32 0 0 0 92 88" fill="none" stroke={ORANGE} strokeWidth="5" strokeLinecap="round" />

        {/* crumbs fall out of the frame, toward the form */}
        {CRUMBS.map((c, i) => (
          <circle
            key={i}
            className="mi-crumb"
            cx={c.x}
            cy={c.y}
            r={c.r}
            fill={c.color}
            style={{ "--dx": c.dx, animationDelay: c.delay } as CSSProperties}
          />
        ))}
      </svg>
    </button>
  );
}