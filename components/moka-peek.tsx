const INK = "#3a2c1a";
const YELLOW = "#ffd93d";
const ORANGE = "#ff9a2e";

const CSS = `
@media (prefers-reduced-motion: no-preference) {
  .pk-bob { animation: pk-bob 3s ease-in-out infinite; }
}
@keyframes pk-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
`;

// A round porthole with Moka leaning over the rim, both hands gripping the outline.
// `tilt` turns his head (degrees); `looking` slides his eyes toward the left (the restaurant).
export function MokaPeek({ tilt = 0, looking = false, size = 76 }: { tilt?: number; looking?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false" className="block overflow-visible drop-shadow-lg">
      <style>{CSS}</style>
      <defs>
        <clipPath id="pk-clip">
          <circle cx="60" cy="76" r="38" />
          <rect x="-20" y="-30" width="160" height="106" />
        </clipPath>
      </defs>
      <circle cx="60" cy="76" r="38" fill="#2a1d12" stroke={ORANGE} strokeWidth="5" />
      <g clipPath="url(#pk-clip)">
        <g className="pk-bob">
          <g
            style={{
              transform: `rotate(${tilt}deg)`,
              transformOrigin: "60px 88px",
              transition: "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <path d="M57 28 C52 16 65 10 72 18 C66 17 64 23 66 29Z" fill={YELLOW} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="60" cy="54" r="27" fill={YELLOW} stroke={INK} strokeWidth="3" />
            <ellipse cx="42" cy="61" rx="6" ry="4" fill="#ff8fa3" opacity="0.55" />
            <ellipse cx="78" cy="61" rx="6" ry="4" fill="#ff8fa3" opacity="0.55" />
            <g className="moka-eye">
              <g style={{ transform: `translateX(${looking ? -2 : 0}px)`, transition: "transform 0.4s" }}>
                <ellipse cx="50" cy="52" rx="4" ry="5.5" fill="#1b1b1b" />
                <ellipse cx="70" cy="52" rx="4" ry="5.5" fill="#1b1b1b" />
                <circle cx="48.8" cy="49.8" r="1.5" fill="#fff" />
                <circle cx="68.8" cy="49.8" r="1.5" fill="#fff" />
              </g>
            </g>
            <path d="M48 62 Q60 52 72 62 Q60 70 48 62Z" fill={ORANGE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          </g>
        </g>
        {/* hands on the outline */}
        <ellipse cx="26" cy="58" rx="9" ry="6.5" transform="rotate(-30 26 58)" fill={YELLOW} stroke={INK} strokeWidth="2.5" />
        <ellipse cx="94" cy="58" rx="9" ry="6.5" transform="rotate(30 94 58)" fill={YELLOW} stroke={INK} strokeWidth="2.5" />
      </g>
    </svg>
  );
}