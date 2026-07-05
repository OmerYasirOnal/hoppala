export interface Zone {
  key: string;
  meters: number;
  top: [number, number, number];
  bottom: [number, number, number];
}

// Boundaries in meters (score units). Exponential-ish spacing: early zones close (quick wins),
// later zones far (aspirational). Palettes are tuned live; hue direction per the spec.
export const ZONES: Zone[] = [
  { key: 'meadow', meters: 0, top: [86, 180, 120], bottom: [34, 110, 74] },
  { key: 'sky', meters: 100, top: [90, 150, 230], bottom: [40, 90, 170] },
  { key: 'clouds', meters: 250, top: [158, 166, 224], bottom: [92, 104, 182] },
  { key: 'dawn', meters: 450, top: [232, 142, 120], bottom: [92, 58, 110] },
  { key: 'aurora', meters: 700, top: [58, 202, 168], bottom: [20, 92, 112] },
  { key: 'strato', meters: 1100, top: [40, 72, 142], bottom: [16, 26, 70] },
  { key: 'space', meters: 1700, top: [16, 20, 50], bottom: [4, 6, 20] },
  { key: 'cosmos', meters: 2500, top: [42, 20, 72], bottom: [10, 4, 24] },
];

/** Highest zone whose lower boundary is <= meters, clamped to [0, ZONES.length-1]. */
export function zoneIndexAt(meters: number): number {
  let i = 0;
  for (let j = 0; j < ZONES.length; j++) {
    if (meters >= ZONES[j]!.meters) i = j;
    else break;
  }
  return i;
}

/** 0..1 within the current zone toward the next boundary; 1 once in the last zone. */
export function zoneProgress(meters: number): number {
  const i = zoneIndexAt(meters);
  if (i >= ZONES.length - 1) return 1;
  const lo = ZONES[i]!.meters;
  const hi = ZONES[i + 1]!.meters;
  return Math.min(1, Math.max(0, (meters - lo) / (hi - lo)));
}
