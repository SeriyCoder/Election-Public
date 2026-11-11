import type { ComponentChildren } from 'preact';
import type { Motif } from './book';

/**
 * Section 14.6 drawings, made for this project: one fixed picture per motif,
 * decorative only, with no lettering, emblem or party colour. Nothing here
 * reads the answers, so no drawing can pass for a result.
 */
export const MOTIF_NAMES: readonly Motif[] = [
  'menorah',
  'ballots',
  'people',
  'pie',
  'ballot-box',
  'calendar',
  'knesset',
  'threshold',
  'table',
  'coin',
];

/** The light palette: white, blue, palm green, coin metals, neutral people. */
const INK = {
  paper: '#ffffff',
  sky: '#dbeafe',
  light: '#93c5fd',
  blue: '#1d4ed8',
  navy: '#1e3a8a',
  line: '#94a3b8',
  mist: '#e2e8f0',
  gold: '#c9a227',
  flame: '#f59e0b',
  nickel: '#cfd4d9',
  rim: '#9aa3ab',
  relief: '#7b858f',
  stone: '#ece7df',
  shade: '#b9b1a6',
  glass: '#8ea3bd',
  wood: '#d9bf94',
  green: '#15803d',
  leaf: '#4d9a3f',
  trunk: '#9a7b56',
} as const;

/** Neutral tones for people: no figure stands for a party or an origin. */
const PEOPLE = ['#94a3b8', '#cbd5e1', '#a8a29e', '#d6d3d1', '#64748b'] as const;

const WIDTH = 240;
const HEIGHT = 180;

function Art({
  name,
  children,
}: {
  readonly name: Motif;
  readonly children: ComponentChildren;
}) {
  return (
    <svg
      class={`motif motif--${name}`}
      data-art={name}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A person: a round head over rounded shoulders, standing on `base`. */
function Person({
  x,
  base,
  height,
  tone,
}: {
  readonly x: number;
  readonly base: number;
  readonly height: number;
  readonly tone: string;
}) {
  const shoulders = base - height + 22;
  return (
    <g class="motif__person">
      <circle cx={x} cy={base - height + 8} r={9} fill={tone} />
      <path
        d={`M${x - 13} ${base} V${shoulders + 12} A13 13 0 0 1 ${x + 13} ${shoulders + 12} V${base} Z`}
        fill={tone}
      />
    </g>
  );
}

const MENORAH_CUPS = [60, 80, 100, 120, 140, 160, 180] as const;

function Menorah() {
  return (
    <>
      <path d="M92 164 H148 L138 150 H102 Z" fill={INK.gold} />
      <rect x={116} y={60} width={8} height={92} fill={INK.gold} />
      {[20, 40, 60].map((radius) => (
        <path
          key={radius}
          class="motif__stroke"
          d={`M${120 - radius} 60 A${radius} ${radius} 0 0 0 ${120 + radius} 60`}
          fill="none"
          stroke={INK.gold}
          stroke-width={7}
        />
      ))}
      {MENORAH_CUPS.map((x) => (
        <g key={x}>
          <rect x={x - 7} y={53} width={14} height={7} fill={INK.gold} />
          <path
            class="motif__flame"
            d={`M${x} 30 C${x + 7} 40 ${x + 6} 48 ${x} 51 C${x - 6} 48 ${x - 7} 40 ${x} 30 Z`}
            fill={INK.flame}
          />
        </g>
      ))}
    </>
  );
}

function Slip({ x, y, turn }: { x: number; y: number; turn: number }) {
  return (
    <g transform={`rotate(${turn} ${x + 36} ${y + 48})`}>
      <rect
        x={x}
        y={y}
        width={72}
        height={96}
        rx={5}
        fill={INK.paper}
        stroke={INK.line}
        stroke-width={2}
      />
      <rect
        x={x + 10}
        y={y + 12}
        width={14}
        height={14}
        rx={2}
        fill="none"
        stroke={INK.blue}
        stroke-width={2}
      />
      <path
        d={`M${x + 32} ${y + 19} H${x + 62} M${x + 10} ${y + 44} H${x + 62} M${x + 10} ${y + 58} H${x + 62} M${x + 10} ${y + 72} H${x + 44}`}
        stroke={INK.line}
        stroke-width={3}
        stroke-linecap="round"
      />
    </g>
  );
}

function Ballots() {
  return (
    <>
      <Slip x={36} y={52} turn={-14} />
      <Slip x={132} y={50} turn={12} />
      <Slip x={84} y={40} turn={0} />
    </>
  );
}

const CROWD = [
  [34, 64],
  [66, 78],
  [98, 70],
  [130, 84],
  [162, 66],
  [194, 76],
] as const;

function People() {
  return (
    <>
      <path d="M12 160 H228" stroke={INK.mist} stroke-width={4} />
      {CROWD.map(([x, height], index) => (
        <Person
          key={x}
          x={x + 8}
          base={158}
          height={height}
          tone={PEOPLE[index % PEOPLE.length] ?? INK.line}
        />
      ))}
    </>
  );
}

function Pie() {
  return (
    <>
      <circle cx={120} cy={92} r={64} fill={INK.mist} />
      <path
        d="M120 92 L120 28 A64 64 0 0 1 157.62 143.78 Z"
        fill={INK.blue}
        stroke={INK.paper}
        stroke-width={3}
      />
      <path
        d="M120 92 L157.62 143.78 A64 64 0 0 1 56 92 Z"
        fill={INK.light}
        stroke={INK.paper}
        stroke-width={3}
      />
      <path
        d="M120 92 L56 92 A64 64 0 0 1 120 28 Z"
        fill={INK.mist}
        stroke={INK.paper}
        stroke-width={3}
      />
    </>
  );
}

function BallotBox() {
  return (
    <>
      <path d="M8 160 H232" stroke={INK.mist} stroke-width={4} />
      <rect x={18} y={66} width={70} height={92} rx={6} fill={INK.sky} />
      <rect x={28} y={58} width={50} height={10} rx={3} fill={INK.light} />
      <rect x={42} y={61} width={22} height={4} rx={2} fill={INK.navy} />
      <rect
        class="motif__slip"
        x={44}
        y={28}
        width={18}
        height={34}
        rx={2}
        fill={INK.paper}
        stroke={INK.line}
        stroke-width={2}
      />
      <Person x={112} base={158} height={70} tone={PEOPLE[0]} />
      <Person x={142} base={158} height={78} tone={PEOPLE[2]} />
      <Person x={172} base={158} height={66} tone={PEOPLE[4]} />
      <Person x={212} base={158} height={60} tone={INK.mist} />
    </>
  );
}

const CALENDAR_DAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

function Calendar() {
  return (
    <>
      <rect
        x={52}
        y={36}
        width={136}
        height={128}
        rx={8}
        fill={INK.paper}
        stroke={INK.line}
        stroke-width={2}
      />
      <path
        d="M52 44 A8 8 0 0 1 60 36 H180 A8 8 0 0 1 188 44 V66 H52 Z"
        fill={INK.blue}
      />
      <rect x={82} y={26} width={8} height={22} rx={4} fill={INK.navy} />
      <rect x={150} y={26} width={8} height={22} rx={4} fill={INK.navy} />
      {CALENDAR_DAYS.map((day) => {
        const column = day % 4;
        const row = (day - column) / 4;
        return (
          <rect
            key={day}
            x={66 + column * 28}
            y={78 + row * 26}
            width={22}
            height={18}
            rx={3}
            fill={day === 6 ? INK.green : INK.mist}
          />
        );
      })}
      <path
        class="motif__page"
        d="M188 136 L188 164 L160 164 Z"
        fill={INK.sky}
        stroke={INK.line}
        stroke-width={2}
      />
    </>
  );
}

const PILLARS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function Knesset() {
  return (
    <>
      <path d="M6 156 H234" stroke={INK.mist} stroke-width={4} />
      <rect x={22} y={142} width={196} height={12} fill={INK.shade} />
      <rect x={34} y={70} width={172} height={72} fill={INK.glass} />
      <rect x={26} y={60} width={188} height={12} fill={INK.stone} />
      <rect x={26} y={70} width={188} height={3} fill={INK.shade} />
      {PILLARS.map((pillar) => (
        <rect
          key={pillar}
          x={38 + pillar * 18}
          y={73}
          width={8}
          height={69}
          fill={INK.stone}
        />
      ))}
      <rect x={34} y={138} width={172} height={4} fill={INK.stone} />
    </>
  );
}

const BARS = [104, 78, 54, 28, 16] as const;

function Threshold() {
  return (
    <>
      <path d="M20 158 H220" stroke={INK.line} stroke-width={3} />
      {BARS.map((height, index) => (
        <rect
          key={height}
          x={34 + index * 38}
          y={156 - height}
          width={26}
          height={height}
          rx={3}
          fill={height > 36 ? INK.light : INK.mist}
        />
      ))}
      <path
        class="motif__line"
        d="M20 120 H220"
        stroke={INK.blue}
        stroke-width={3}
        stroke-dasharray="10 7"
      />
    </>
  );
}

const SEATS = [
  [120, 48],
  [176, 62],
  [204, 100],
  [176, 138],
  [120, 152],
  [64, 138],
  [36, 100],
  [64, 62],
] as const;

function Table() {
  return (
    <>
      {SEATS.map(([x, y], index) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={13}
          fill={PEOPLE[index % PEOPLE.length] ?? INK.line}
        />
      ))}
      <ellipse cx={120} cy={100} rx={70} ry={36} fill={INK.wood} />
      <ellipse
        cx={120}
        cy={100}
        rx={56}
        ry={26}
        fill="none"
        stroke={INK.paper}
        stroke-width={2}
      />
    </>
  );
}

function CoinFace({
  x,
  side,
  children,
}: {
  readonly x: number;
  readonly side: 'lily' | 'one';
  readonly children: ComponentChildren;
}) {
  return (
    <g class="motif__side" data-side={side}>
      <circle cx={x} cy={90} r={54} fill={INK.rim} />
      <circle cx={x} cy={90} r={47} fill={INK.nickel} />
      <circle
        cx={x}
        cy={90}
        r={42}
        fill="none"
        stroke={INK.rim}
        stroke-width={1.5}
      />
      {children}
    </g>
  );
}

function Coin() {
  return (
    <>
      <CoinFace x={64} side="lily">
        <path
          d="M64 56 C73 70 73 88 64 100 C55 88 55 70 64 56 Z"
          fill={INK.relief}
        />
        <path
          d="M60 98 C44 96 38 80 44 66 C48 80 54 90 60 98 Z"
          fill={INK.relief}
        />
        <path
          d="M68 98 C84 96 90 80 84 66 C80 80 74 90 68 98 Z"
          fill={INK.relief}
        />
        <rect x={51} y={100} width={26} height={6} rx={2} fill={INK.relief} />
        <path d="M56 106 H72 L64 122 Z" fill={INK.relief} />
      </CoinFace>
      <CoinFace x={176} side="one">
        <path
          d="M171 66 L183 60 V114 H191 V121 H165 V114 H174 V73 L166 77 Z"
          fill={INK.relief}
        />
        <path
          d="M146 72 V108 M153 68 V112 M160 72 V108"
          stroke={INK.relief}
          stroke-width={3}
          stroke-linecap="round"
        />
      </CoinFace>
    </>
  );
}

const DRAWINGS: Readonly<Record<Motif, () => preact.JSX.Element>> = {
  menorah: Menorah,
  ballots: Ballots,
  people: People,
  pie: Pie,
  'ballot-box': BallotBox,
  calendar: Calendar,
  knesset: Knesset,
  threshold: Threshold,
  table: Table,
  coin: Coin,
};

/** The decorative drawing of one motif. */
export function MotifArt({ name }: { readonly name: Motif }) {
  const Drawing = DRAWINGS[name];
  return (
    <Art name={name}>
      <Drawing />
    </Art>
  );
}

/** One leaf from the crown: out along one curve, back along another. */
type Leaf = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const CROWN = [50, 84] as const;

const LEAVES: readonly Leaf[] = [
  [30, 70, 12, 74, 2, 92, 18, 80, 34, 80],
  [40, 62, 24, 54, 6, 58, 26, 62, 38, 70],
  [48, 62, 52, 48, 60, 38, 56, 52, 54, 68],
  [56, 60, 70, 50, 90, 52, 72, 60, 60, 70],
  [70, 74, 88, 78, 98, 96, 82, 84, 66, 82],
];

const PALMS_WIDTH = 320;
const PALMS_HEIGHT = 200;

function Palm({ end }: { readonly end: boolean }) {
  const x = (value: number) => (end ? PALMS_WIDTH - value : value);
  const [cx, cy] = CROWN;
  return (
    <g class="palm" data-palm={end ? 'end' : 'start'}>
      <path
        d={`M${x(26)} ${PALMS_HEIGHT} C${x(30)} 160 ${x(38)} 120 ${x(cx)} ${cy}`}
        fill="none"
        stroke={INK.trunk}
        stroke-width={7}
        stroke-linecap="round"
      />
      {LEAVES.map(([a, b, c, d, e, f, g, h, i, j], index) => (
        <path
          key={index}
          class="palm__leaf"
          d={`M${x(cx)} ${cy} C${x(a)} ${b} ${x(c)} ${d} ${x(e)} ${f} C${x(g)} ${h} ${x(i)} ${j} ${x(cx)} ${cy} Z`}
          fill={index % 2 === 0 ? INK.green : INK.leaf}
        />
      ))}
    </g>
  );
}

/** The two palms that frame the opening and review drawings. */
export function Palms() {
  return (
    <svg
      class="book__palms"
      data-palms
      viewBox={`0 0 ${PALMS_WIDTH} ${PALMS_HEIGHT}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <Palm end={false} />
      <Palm end />
    </svg>
  );
}
