export interface TrailNode {
  x: number;
  y: number;
  side: 'left' | 'right';
}

/**
 * Zig-zag node positions for the Journey Map, bottom-to-top.
 * Index 0 is the bottom (first zone), the last index is the top (∞ cap).
 * y decreases as the index increases (nodes climb); x alternates left/right lanes.
 */
export function trailLayout(
  count: number,
  opts: { width: number; vSpacing: number; margin: number },
): TrailNode[] {
  const { width, vSpacing, margin } = opts;
  const amp = width * 0.22;
  const cx = width / 2;
  const bottomY = (count - 1) * vSpacing + margin;
  const nodes: TrailNode[] = [];
  for (let i = 0; i < count; i++) {
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    nodes.push({ x: side === 'left' ? cx - amp : cx + amp, y: bottomY - i * vSpacing, side });
  }
  return nodes;
}
