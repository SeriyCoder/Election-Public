/** Deterministic mulberry32 generator for reproducible property tests. */
export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(
  next: () => number,
  min: number,
  max: number,
): number {
  return min + Math.floor(next() * (max - min + 1));
}

/** Splits `total` units into `count` non-negative integer parts. */
export function randomParts(
  next: () => number,
  count: number,
  total: number,
): number[] {
  const cuts = Array.from({ length: count - 1 }, () =>
    randomInt(next, 0, total),
  );
  cuts.sort((a, b) => a - b);
  const parts: number[] = [];
  let previous = 0;
  for (const cut of cuts) {
    parts.push(cut - previous);
    previous = cut;
  }
  parts.push(total - previous);
  return parts;
}

/** Formats `units` millionths as an exact decimal string. */
export function millionths(units: number): string {
  const whole = Math.floor(units / 1_000_000);
  const fraction = String(units % 1_000_000).padStart(6, '0');
  return `${whole}.${fraction}`;
}
