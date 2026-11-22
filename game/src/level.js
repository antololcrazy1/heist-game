// The Gilded Hour — the gallery itself: walls, cover, doors, cameras and
// loot, plus the geometry the game needs: circle-vs-rect movement and
// segment-vs-rect line of sight (a cone only sees what no wall or cover hides).

import {
  ARTIFACTS,
  CAMERAS,
  COVER,
  EXIT_DOOR,
  FIELD,
  SERVICE_DOOR,
  STAR,
  WALLS,
} from './config.js';

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

// Every solid rect the thief and the guards collide with right now.
export function solidRects(level) {
  const rects = [...WALLS, ...COVER, STAR.pedestal];
  if (!level.serviceDoorOpen) rects.push(SERVICE_DOOR);
  return rects;
}

// Every rect that blocks sight (walls, cover, the Star pedestal, a shut door).
export function sightBlockers(level) {
  return solidRects(level);
}

// Move a circle by (dx, dy), sliding along anything solid. Returns the new
// position; each axis is resolved on its own so the thief slides along walls.
export function moveCircle(x, y, radius, dx, dy, level) {
  const rects = solidRects(level);
  let nx = x + dx;
  for (const rect of rects) {
    if (circleHitsRect(nx, y, radius, rect)) {
      nx = dx > 0 ? rect.x - radius : rect.x + rect.w + radius;
    }
  }
  let ny = y + dy;
  for (const rect of rects) {
    if (circleHitsRect(nx, ny, radius, rect)) {
      ny = dy > 0 ? rect.y - radius : rect.y + rect.h + radius;
    }
  }
  nx = Math.max(FIELD.x + radius, Math.min(FIELD.x + FIELD.width - radius, nx));
  ny = Math.max(FIELD.y + radius, Math.min(FIELD.y + FIELD.height - radius, ny));
  return { x: nx, y: ny };
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: does the segment cross the rect?
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

// True when nothing solid stands between two points.
export function hasLineOfSight(x1, y1, x2, y2, level) {
  for (const rect of sightBlockers(level)) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

// True when the segment passes through a smoke cloud (vision dies in smoke).
export function segmentThroughSmoke(x1, y1, x2, y2, smoke) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return false;
  let t = ((smoke.x - x1) * dx + (smoke.y - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  const ddx = smoke.x - px;
  const ddy = smoke.y - py;
  return ddx * ddx + ddy * ddy < smoke.radius * smoke.radius;
}

export function createLevel() {
  return {
    serviceDoorOpen: false,
    // Cameras carry their own sweep phase and EMP timer.
    cameras: CAMERAS.map((camera) => ({ ...camera, angle: camera.baseAngle, offlineUntil: 0 })),
    artifacts: ARTIFACTS.map((item) => ({ ...item, taken: false })),
    starTaken: false,
    smokes: [],
    coins: [],
  };
}

export function exitDoorRect() {
  return EXIT_DOOR;
}

export function serviceDoorRect() {
  return SERVICE_DOOR;
}

export function starPedestal() {
  return STAR.pedestal;
}
