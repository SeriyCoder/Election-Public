const COLORS = [
  '#1D4ED8',
  '#D97706',
  '#0F766E',
  '#B4533A',
  '#1E3A8A',
  '#C27803',
  '#167A70',
  '#A84432',
] as const;

interface PersonProps {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly angle: number;
  readonly skin: string;
  readonly coat: string;
  readonly headwear:
    'none' | 'kippah' | 'hat' | 'headscarf' | 'keffiyeh' | 'turban';
}

function Person({ x, y, scale, angle, skin, coat, headwear }: PersonProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <circle cx="0" cy="-19" r="11" fill={skin} />
      <path d="M-15 24v-20c0-12 7-18 15-18s15 6 15 18v20z" fill={coat} />
      <path
        d="M-12 2-23 18M12 2 23 18"
        fill="none"
        stroke={skin}
        stroke-linecap="round"
        stroke-width="7"
      />
      {headwear === 'kippah' && (
        <path d="M-9-25Q0-34 9-25L7-23H-7Z" fill="#172554" />
      )}
      {headwear === 'hat' && (
        <>
          <path d="M-13-27h26v7h-26z" fill="#172554" />
          <path d="M-9-27v-8h18v8" fill="#172554" />
        </>
      )}
      {headwear === 'headscarf' && (
        <path d="M-13-21c1-15 25-15 26 0l-5 14h-16z" fill="#0F766E" />
      )}
      {headwear === 'keffiyeh' && (
        <>
          <path d="M-14-21q14-16 28 0l-4 12h-20z" fill="#f8fafc" />
          <path
            d="M-8-27 9-20M-12-21 8-13M-2-31 13-24"
            stroke="#1E3A8A"
            stroke-width="2"
          />
        </>
      )}
      {headwear === 'turban' && (
        <path
          d="M-12-24c3-13 23-13 24 0-4-3-19-3-24 0Z"
          fill="#f1f5f9"
          stroke="#1E3A8A"
          stroke-width="2"
        />
      )}
    </g>
  );
}

/** A decorative, original SVG: no external resources or interpreted data. */
export function WelcomeArt() {
  return (
    <svg
      class="welcome-art"
      data-welcome-art
      viewBox="0 0 420 260"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="welcome-sun" cx="50%" cy="40%" r="60%">
          <stop offset="0" stop-color="#fde68a" />
          <stop offset="0.7" stop-color="#f59e0b" />
          <stop offset="1" stop-color="#d97706" />
        </radialGradient>
      </defs>
      <g opacity="0.28" fill="#fbbf24">
        <path d="M210 18 230 72h-40z" />
        <path d="m337 52-36 32-18-34z" />
        <path d="M402 130 345 147l2-38z" />
        <path d="m337 208-54-58 34-18z" />
        <path d="m210 242-20-54h40z" />
        <path d="m83 208 54-58-34-18z" />
        <path d="m18 130 57 17-2-38z" />
        <path d="M83 52 119 84l18-34z" />
      </g>
      <circle cx="210" cy="130" r="63" fill="url(#welcome-sun)" />
      <circle cx="210" cy="130" r="44" fill="#fff7d6" opacity="0.72" />
      <path
        d="M166 130c22-24 66-24 88 0-22 24-66 24-88 0Z"
        fill="#1D4ED8"
        opacity="0.9"
      />
      <circle cx="210" cy="130" r="10" fill="#fffaf0" />
      <Person
        x={210}
        y={52}
        scale={0.72}
        angle={0}
        skin="#d79a6b"
        coat={COLORS[0]}
        headwear="none"
      />
      <Person
        x={290}
        y={70}
        scale={0.72}
        angle={28}
        skin="#c98958"
        coat={COLORS[1]}
        headwear="kippah"
      />
      <Person
        x={355}
        y={132}
        scale={0.72}
        angle={73}
        skin="#e0aa78"
        coat={COLORS[2]}
        headwear="hat"
      />
      <Person
        x={288}
        y={205}
        scale={0.72}
        angle={150}
        skin="#6f422f"
        coat={COLORS[3]}
        headwear="none"
      />
      <Person
        x={210}
        y={226}
        scale={0.72}
        angle={180}
        skin="#b8754d"
        coat={COLORS[4]}
        headwear="headscarf"
      />
      <Person
        x={132}
        y={205}
        scale={0.72}
        angle={-150}
        skin="#8b5135"
        coat={COLORS[5]}
        headwear="keffiyeh"
      />
      <Person
        x={65}
        y={132}
        scale={0.72}
        angle={-73}
        skin="#d99b69"
        coat={COLORS[6]}
        headwear="turban"
      />
      <Person
        x={130}
        y={70}
        scale={0.72}
        angle={-28}
        skin="#633826"
        coat={COLORS[7]}
        headwear="none"
      />
    </svg>
  );
}
