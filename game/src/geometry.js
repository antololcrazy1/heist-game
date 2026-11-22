// The Gilded Hour v2 — geometry: the maths of moving, hiding and seeing.
// Circles slide along rectangles, sight is a segment that solid things can
// block, and a laser is a segment Rook must keep away from. Nothing here
// knows about the game; it only answers geometry questions.

import { FIELD } from './config.js';

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleHitsRect(cx, cy, radius, rect) {
  const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < radius * radius;
}

// Slide a circle by (dx, dy) through solid rects. Each axis is resolved on
// its own, so a walker glides along a wall instead of sticking to it.
export function slideCircle(x, y, radius, dx, dy, solids) {
  let nx = x + dx;
  for (const rect of solids) {
    if (circleHitsRect(nx, y, radius, rect)) {
      nx = dx > 0 ? rect.x - radius : rect.x + rect.w + radius;
    }
  }
  let ny = y + dy;
  for (const rect of solids) {
    if (circleHitsRect(nx, ny, radius, rect)) {
      ny = dy > 0 ? rect.y - radius : rect.y + rect.h + radius;
    }
  }
  nx = Math.max(FIELD.x + radius, Math.min(FIELD.x + FIELD.width - radius, nx));
  ny = Math.max(FIELD.y + radius, Math.min(FIELD.y + FIELD.height - radius, ny));
  return { x: nx, y: ny };
}

// Slab test: does the segment (x1,y1)-(x2,y2) cross this rectangle?
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const axes = [
    [dx, x1, rect.x, rect.x + rect.w],
    [dy, y1, rect.y, rect.y + rect.h],
  ];
  for (const [d, origin, low, high] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (origin < low || origin > high) return false;
    } else {
      let t1 = (low - origin) / d;
      let t2 = (high - origin) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

// True when no solid rect stands between the two points.
export function clearSight(x1, y1, x2, y2, blockers) {
  for (const rect of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

// Distance from a point to a segment — how close Rook is to a laser beam.
export function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

// True when the segment passes through a smoke cloud: vision dies in smoke.
export function segmentThroughSmoke(x1, y1, x2, y2, smoke) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return false;
  let t = ((smoke.x - x1) * dx + (smoke.y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  const ddx = smoke.x - px;
  const ddy = smoke.y - py;
  return ddx * ddx + ddy * ddy < smoke.radius * smoke.radius;
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}
