// geom.js — small geometry helpers shared by the heist modules.
// Nothing here knows about the game; it is pure math on points and rects.

/** Clamp a number into [lo, hi]. */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Distance between two points. */
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Angle from (ax, ay) toward (bx, by). */
export const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

/** Smallest signed difference between two angles, in (-PI, PI]. */
export const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
};

/** Whether point (x, y) lies inside rect {x, y, w, h}. */
export const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Whether two rects overlap. */
export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Push a circle (px, py, radius r) out of a rect it overlaps.
 * Returns the corrected [x, y]; the input is untouched when there is no overlap.
 */
export function pushCircleOutOfRect(px, py, r, rect) {
  const cx = clamp(px, rect.x, rect.x + rect.w);
  const cy = clamp(py, rect.y, rect.y + rect.h);
  const dx = px - cx;
  const dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return [px, py];
  if (d2 === 0) {
    // Center is inside the rect: push out along the smallest penetration axis.
    const left = px - rect.x;
    const right = rect.x + rect.w - px;
    const top = py - rect.y;
    const bottom = rect.y + rect.h - py;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return [rect.x - r, py];
    if (m === right) return [rect.x + rect.w + r, py];
    if (m === top) return [px, rect.y - r];
    return [px, rect.y + rect.h + r];
  }
  const d = Math.sqrt(d2);
  return [cx + (dx / d) * r, cy + (dy / d) * r];
}

function segSeg(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Whether the segment (x1,y1)-(x2,y2) touches rect. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (inRect(x1, y1, rect) || inRect(x2, y2, rect)) return true;
  const { x, y, w, h } = rect;
  return (
    segSeg(x1, y1, x2, y2, x, y, x + w, y) ||
    segSeg(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segSeg(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segSeg(x1, y1, x2, y2, x, y + h, x, y)
  );
}
