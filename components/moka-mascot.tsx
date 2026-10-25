// Moka: an original kawaii duckling mascot drawn as inline SVG.
// Render <MokaStyles /> once on any page that uses <MokaMascot />.
// While `eating`, a 9s loop plays: burger, shades, drink, repeat.

const INK = "#3a2c1a";
const YELLOW = "#ffd93d";
const ORANGE = "#ff9a2e";
const ORANGE_DARK = "#f0801a";

const CSS = `
.moka-eye { transform-box: fill-box; transform-origin: center; animation: moka-blink 4.2s ease-in-out infinite; }
.moka-food, .moka-drink { transform-origin: 0 0; }
.moka-drink, .moka-glasses, .moka-spark { opacity: 0; }
.moka-glasses, .moka-spark { transform-box: fill-box; transform-origin: center; }
.moka-liquid { transform-box: fill-box; transform-origin: 50% 100%; }
.moka-eating .moka-body { animation: moka-bob 0.72s ease-in-out infinite; }
.moka-eating .moka-bill-low { animation: moka-chew 9s ease-in-out infinite; }
.moka-eating .moka-food { animation: moka-meal 9s ease-in-out infinite; }
.moka-eating .moka-glasses { animation: moka-shades 9s ease-in-out infinite; }
.moka-eating .moka-drink { animation: moka-drink 9s ease-in-out infinite; }
.moka-eating .moka-liquid { animation: moka-liquid 9s ease-in-out infinite; }
.moka-eating .moka-spark { animation: moka-spark 9s ease-in-out infinite; }

@keyframes moka-blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@keyframes moka-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }

@keyframes moka-chew {
  0%, 5% { transform: translateY(0); }
  8% { transform: translateY(6px); }
  11% { transform: translateY(0); }
  13% { transform: translateY(5px); }
  15% { transform: translateY(0); }
  17% { transform: translateY(5px); }
  19% { transform: translateY(0); }
  22% { transform: translateY(6px); }
  25% { transform: translateY(0); }
  27% { transform: translateY(5px); }
  29% { transform: translateY(0); }
  31% { transform: translateY(5px); }
  33% { transform: translateY(0); }
  37% { transform: translateY(6px); }
  40% { transform: translateY(0); }
  42% { transform: translateY(5px); }
  44% { transform: translateY(0); }
  46% { transform: translateY(4px); }
  48%, 62% { transform: translateY(0); }
  64% { transform: translateY(3px); }
  66% { transform: translateY(0); }
  68% { transform: translateY(3px); }
  70%, 100% { transform: translateY(0); }
}

@keyframes moka-meal {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  6% { transform: translate(0, -26px) scale(1); opacity: 1; }
  11% { transform: translate(0, -26px) scale(0.8); opacity: 1; }
  17% { transform: translate(0, 0) scale(0.8); opacity: 1; }
  23% { transform: translate(0, -26px) scale(0.8); opacity: 1; }
  28% { transform: translate(0, -26px) scale(0.55); opacity: 1; }
  34% { transform: translate(0, 0) scale(0.55); opacity: 1; }
  38% { transform: translate(0, -26px) scale(0.55); opacity: 1; }
  42% { transform: translate(0, -26px) scale(0.25); opacity: 1; }
  46%, 94% { transform: translate(0, -12px) scale(0); opacity: 0; }
  100% { transform: translate(0, 0) scale(1); opacity: 1; }
}

@keyframes moka-shades {
  0%, 46% { opacity: 0; transform: translate(26px, -40px) rotate(-18deg) scale(0.6); }
  47% { opacity: 1; transform: translate(26px, -40px) rotate(-18deg) scale(0.6); }
  53% { opacity: 1; transform: translate(0, 3px) rotate(4deg) scale(1.05); }
  56%, 88% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
  93%, 100% { opacity: 0; transform: translate(-26px, -40px) rotate(18deg) scale(0.6); }
}

@keyframes moka-drink {
  0%, 50% { opacity: 0; transform: translate(0, 0) scale(0); }
  54% { opacity: 1; transform: translate(0, 0) scale(1.15); }
  57% { opacity: 1; transform: translate(0, 0) scale(1); }
  62%, 72% { opacity: 1; transform: translate(0, -24px) scale(1); }
  77%, 86% { opacity: 1; transform: translate(0, 0) scale(1); }
  90%, 100% { opacity: 0; transform: translate(0, 0) scale(0); }
}

@keyframes moka-liquid {
  0%, 62% { transform: scaleY(1); }
  72%, 90% { transform: scaleY(0.4); }
  91%, 100% { transform: scaleY(1); }
}

@keyframes moka-spark {
  0%, 50% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  54% { opacity: 1; transform: scale(1.1) rotate(20deg); }
  60%, 100% { opacity: 0; transform: scale(1.5) rotate(60deg); }
}

@media (prefers-reduced-motion: reduce) {
  .moka-eye,
  .moka-eating .moka-body,
  .moka-eating .moka-bill-low,
  .moka-eating .moka-food,
  .moka-eating .moka-glasses,
  .moka-eating .moka-drink,
  .moka-eating .moka-liquid,
  .moka-eating .moka-spark { animation: none; }
}
`;

export function MokaStyles() {
  return <style>{CSS}</style>;
}

function Foot() {
  return (
    <path
      d="M64 174 Q78 166 92 174 Q94 183 78 184 Q62 184 64 174Z"
      fill={ORANGE}
      stroke={INK}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  );
}

function Wings() {
  return (
    <>
      <ellipse
        cx="-24"
        cy="4"
        rx="12"
        ry="8"
        transform="rotate(-20 -24 4)"
        fill={YELLOW}
        stroke={INK}
        strokeWidth="2.5"
      />
      <ellipse
        cx="24"
        cy="4"
        rx="12"
        ry="8"
        transform="rotate(20 24 4)"
        fill={YELLOW}
        stroke={INK}
        strokeWidth="2.5"
      />
    </>
  );
}

// Positioned by a wrapper <g>, so the CSS animation never fights a transform attribute.
function Spark({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="moka-spark"
        d="M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3Z"
        fill="#fff6a8"
        stroke={INK}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </g>
  );
}

type Props = {
  variant?: "head" | "full";
  eating?: boolean;
  size?: number;
  className?: string;
};

export function MokaMascot({
  variant = "head",
  eating = false,
  size = 32,
  className = "",
}: Props) {
  const full = variant === "full";

  return (
    <svg
      viewBox={full ? "0 0 200 200" : "44 32 112 112"}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`${eating ? "moka-eating" : ""} ${className}`}
    >
      {full && (
        <>
          <ellipse cx="100" cy="187" rx="58" ry="6" fill="#000000" opacity="0.12" />
          <Foot />
          <g transform="translate(200 0) scale(-1 1)">
            <Foot />
          </g>
        </>
      )}

      <g className="moka-body">
        {/* head tuft (drawn first so the body outline covers its base) */}
        <path
          d="M97 55 C92 42 105 34 113 42 C106 41 104 48 107 55Z"
          fill={YELLOW}
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* round body */}
        <path
          d="M100 50 C146 50 164 84 164 118 C164 152 140 172 100 172 C60 172 36 152 36 118 C36 84 54 50 100 50Z"
          fill={YELLOW}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse cx="100" cy="142" rx="34" ry="24" fill="#ffe97a" opacity="0.75" />

        {/* cheeks */}
        <ellipse cx="62" cy="113" rx="9" ry="5.5" fill="#ff8fa3" opacity="0.55" />
        <ellipse cx="138" cy="113" rx="9" ry="5.5" fill="#ff8fa3" opacity="0.55" />

        {/* eyes */}
        <g className="moka-eye">
          <ellipse cx="78" cy="98" rx="5.5" ry="7.5" fill="#1b1b1b" />
          <ellipse cx="122" cy="98" rx="5.5" ry="7.5" fill="#1b1b1b" />
          <circle cx="76.2" cy="95" r="2" fill="#ffffff" />
          <circle cx="120.2" cy="95" r="2" fill="#ffffff" />
        </g>

        {/* sunglasses: hidden until the eating loop brings them in */}
        <g className="moka-glasses">
          <rect x="64" y="89" width="28" height="19" rx="8" fill="#1b1b1b" stroke={INK} strokeWidth="2" />
          <rect x="108" y="89" width="28" height="19" rx="8" fill="#1b1b1b" stroke={INK} strokeWidth="2" />
          <path d="M92 95 Q100 90 108 95" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M64 94 L54 91" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M136 94 L146 91" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M70 94 L76 94" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M114 94 L120 94" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </g>

        {/* beak: inside of the mouth, lower bill (chews), upper bill */}
        <ellipse cx="100" cy="119" rx="12" ry="5" fill="#8a2f2f" />
        <g className="moka-bill-low">
          <path
            d="M83 115 Q100 136 117 115 Q100 121 83 115Z"
            fill={ORANGE_DARK}
            stroke={INK}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
        <path
          d="M78 113 Q100 96 122 113 Q100 124 78 113Z"
          fill={ORANGE}
          stroke={INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </g>

      {/* burger held in both little wings */}
      {full && (
        <g transform="translate(100 150)">
          <g className="moka-food">
            <g transform="scale(1.25)">
              <path
                d="M-13 -2 Q-13 -14 0 -14 Q13 -14 13 -2Z"
                fill="#f5a548"
                stroke={INK}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <ellipse cx="-5" cy="-9" rx="1.3" ry="0.8" fill="#fff3d6" />
              <ellipse cx="2" cy="-11" rx="1.3" ry="0.8" fill="#fff3d6" />
              <ellipse cx="6" cy="-7" rx="1.3" ry="0.8" fill="#fff3d6" />
              <path
                d="M-14 -2 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0"
                fill="none"
                stroke="#7cc06a"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <rect x="-13" y="1" width="26" height="6" rx="3" fill="#6b4226" stroke={INK} strokeWidth="1.4" />
              <path
                d="M-13 9 H13 Q13 15 0 15 Q-13 15 -13 9Z"
                fill="#f5a548"
                stroke={INK}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </g>
            <Wings />
          </g>
        </g>
      )}

      {/* the drink: summoned after the burger, only in the full variant */}
      {full && (
        <g transform="translate(100 150)">
          <Spark x={-30} y={-14} s={1} />
          <Spark x={31} y={-8} s={0.8} />
          <Spark x={4} y={-34} s={0.9} />

          <g className="moka-drink">
            {/* straw: dark outline first, colour on top */}
            <path d="M4 -17 L4 -21 L-3 -23" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 -17 L4 -21 L-3 -23" fill="none" stroke="#ff4d6d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            {/* cup */}
            <path d="M-11 -14 L11 -14 L8.5 14 Q0 17 -8.5 14Z" fill="#ffffff" opacity="0.92" />
            <path className="moka-liquid" d="M-9.6 -6 L9.6 -6 L8 12.5 Q0 15 -8 12.5Z" fill="#ff6b81" />
            <path d="M-11 -14 L11 -14 L8.5 14 Q0 17 -8.5 14Z" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <rect x="-12.5" y="-17" width="25" height="4" rx="2" fill="#ff8fa3" stroke={INK} strokeWidth="2" />
            <Wings />
          </g>
        </g>
      )}
    </svg>
  );
}