/**
 * Calculate the midpoint along a path at 50% of the total path length.
 * For a polyline defined by an array of points, this finds the point that
 * splits the path into two equal-length halves.
 */
export function pathMidpoint(pts: Array<{ x: number; y: number }>): { mx: number; my: number } {
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segLens.push(len);
    totalLen += len;
  }
  const halfLen = totalLen / 2;
  let accum = 0;
  let midX = (pts[0].x + pts[pts.length - 1].x) / 2;
  let midY = (pts[0].y + pts[pts.length - 1].y) / 2;
  for (let i = 0; i < segLens.length; i++) {
    if (accum + segLens[i] >= halfLen) {
      const t = (halfLen - accum) / segLens[i];
      midX = pts[i].x + t * (pts[i + 1].x - pts[i].x);
      midY = pts[i].y + t * (pts[i + 1].y - pts[i].y);
      break;
    }
    accum += segLens[i];
  }
  return { mx: midX, my: midY };
}
