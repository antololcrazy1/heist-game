// The Gilded Hour v2 — the night itself: what is solid, what blocks sight,
// and the live state of the doors, cameras, lasers and loot. A fresh level
// is built for every run; nothing here draws anything.

import {
  ARTIFACTS,
  CAMERAS,
  COVER,
  CROWN,
  EXIT_DOOR,
  LASERS,
  SERVICE_DOOR,
  STAR,
  WALLS,
} from './config.js';

export function buildLevel() {
  return {
    serviceDoorOpen: false,
    terminalUsed: false,
    starTaken: false,
    crownTaken: false,
    laserTripped: false,
    cameras: CAMERAS.map((camera) => ({ ...camera, angle: camera.baseAngle, offlineUntil: 0 })),
    lasers: LASERS.map((beam) => ({ ...beam, y: beam.baseY, cooldownUntil: 0 })),
    artifacts: ARTIFACTS.map((item) => ({ ...item, taken: false })),
    smokes: [],
    coins: [],
  };
}

// Every solid rect right now: walls, cover, both pedestals, a shut door.
export function solidRects(level) {
  const rects = [...WALLS, ...COVER, STAR.pedestal, CROWN.pedestal];
  if (!level.serviceDoorOpen) rects.push(SERVICE_DOOR);
  return rects;
}

// Sight is blocked by exactly the solid things.
export function sightBlockers(level) {
  return solidRects(level);
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

export function crownPedestal() {
  return CROWN.pedestal;
}
