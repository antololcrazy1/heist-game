// mansion.js — the Marlow Gallery: one floor, three wings, one vault.
// This file only describes the place. It never draws anything and never
// decides what the player or the guards do; other modules ask it whether
// a step is blocked and whether a look is blocked.

import { inRect, pushCircleOutOfRect, segmentHitsRect } from './geom.js';

/** The gallery's size in its own coordinates (the renderer adds the HUD offset). */
export const GALLERY_W = 960;
export const GALLERY_H = 656;

/**
 * Build the gallery layout. Everything is plain data so the renderer,
 * the player, the guards and the cameras all read the same place.
 */
export function buildMansion() {
  return {
    w: GALLERY_W,
    h: GALLERY_H,

    // Sight-blocking walls: outer shell, two partitions, the vault pocket.
    walls: [
      { x: 0, y: 0, w: 960, h: 10 },
      { x: 0, y: 646, w: 960, h: 10 },
      { x: 0, y: 0, w: 10, h: 656 },
      { x: 950, y: 0, w: 10, h: 300 },
      { x: 950, y: 360, w: 10, h: 296 },
      { x: 292, y: 0, w: 16, h: 280 },
      { x: 292, y: 380, w: 16, h: 276 },
      { x: 632, y: 0, w: 16, h: 280 },
      { x: 632, y: 380, w: 16, h: 276 },
      { x: 796, y: 56, w: 154, h: 10 },
      { x: 796, y: 56, w: 10, h: 140 },
      { x: 796, y: 186, w: 34, h: 10 },
      { x: 870, y: 186, w: 80, h: 10 },
    ],

    // The locked east door: a wall segment while it is locked, open air after.
    eastDoor: { x: 632, y: 280, w: 16, h: 100, locked: true, pick: 0 },

    // Low furniture: blocks walking, never blocks a look (display cases are glass).
    furniture: [
      { x: 140, y: 140, w: 90, h: 50, kind: 'case', tint: '#c96a4a' },
      { x: 150, y: 480, w: 90, h: 50, kind: 'case', tint: '#7a5fd0' },
      { x: 360, y: 120, w: 80, h: 44, kind: 'case', tint: '#4a7a5f' },
      { x: 560, y: 520, w: 80, h: 44, kind: 'case', tint: '#c9a44a' },
      { x: 700, y: 120, w: 80, h: 44, kind: 'case', tint: '#4a6a9a' },
      { x: 880, y: 420, w: 90, h: 50, kind: 'case', tint: '#c94a6a' },
      { x: 430, y: 430, w: 70, h: 26, kind: 'bench', tint: '#8a2f35' },
      { x: 720, y: 300, w: 70, h: 26, kind: 'bench', tint: '#8a2f35' },
      { x: 60, y: 600, w: 26, h: 26, kind: 'plant', tint: '#3f7a44' },
      { x: 920, y: 600, w: 26, h: 26, kind: 'plant', tint: '#3f7a44' },
      { x: 60, y: 60, w: 26, h: 26, kind: 'plant', tint: '#3f7a44' },
      { x: 700, y: 60, w: 26, h: 26, kind: 'plant', tint: '#3f7a44' },
    ],

    carpet: { x: 330, y: 300, w: 280, h: 60 },
    chandeliers: [
      { x: 480, y: 150 },
      { x: 480, y: 500 },
      { x: 800, y: 300 },
    ],

    exitZone: { x: 934, y: 300, w: 26, h: 60 },
    rookStart: { x: 40, y: 328 },

    star: { x: 480, y: 260, taken: false },
    crown: { x: 885, y: 120, taken: false },
    artifacts: [
      { name: 'JADE FOX', x: 185, y: 215, value: 900, taken: false },
      { name: 'IVORY OWL', x: 195, y: 460, value: 700, taken: false },
      { name: 'OPAL SERPENT', x: 400, y: 600, value: 1100, taken: false },
      { name: 'SILVER HARE', x: 600, y: 175, value: 800, taken: false },
      { name: 'BRASS MOTH', x: 770, y: 470, value: 600, taken: false },
      { name: 'CRIMSON MASK', x: 905, y: 478, value: 1200, taken: false },
    ],

    terminal: { x: 120, y: 330, used: false, progress: 0 },

    // The vault pocket (top-right) and the laser corridor below its mouth.
    vault: { x: 796, y: 56, w: 154, h: 140, mouthX0: 830, mouthX1: 870 },
    lasers: {
      x0: 812,
      x1: 860,
      yTop: 200,
      yBot: 260,
      tripped: false,
      phase: 0,
    },

    cameras: [
      { id: 'CAM 1', x: 330, y: 80, base: Math.PI / 2, sweep: 0.9, range: 230, half: 0.5, angle: Math.PI / 2 },
      { id: 'CAM 2', x: 700, y: 600, base: -Math.PI / 2, sweep: 0.8, range: 230, half: 0.5, angle: -Math.PI / 2 },
      { id: 'CAM 3', x: 880, y: 55, base: Math.PI / 2, sweep: 0.7, range: 230, half: 0.5, angle: Math.PI / 2 },
    ],

    routes: {
      Marlow: [
        [380, 200],
        [580, 200],
        [580, 480],
        [380, 480],
      ],
      Bex: [
        [90, 120],
        [220, 120],
        [220, 540],
        [90, 540],
      ],
      Odo: [
        [700, 420],
        [900, 420],
        [900, 600],
        [700, 600],
      ],
      Vex: [
        [700, 240],
        [820, 240],
        [820, 360],
        [700, 360],
      ],
      Sable: [
        [480, 320],
        [620, 320],
        [620, 520],
        [480, 520],
      ],
    },
  };
}

/** Every rect that blocks walking right now (walls, furniture, a locked door). */
export function solids(mansion) {
  const list = mansion.walls.concat(mansion.furniture);
  if (mansion.eastDoor.locked) list.push(mansion.eastDoor);
  return list;
}

/** Every rect that blocks a look right now (walls and a locked door). */
export function sightWalls(mansion) {
  if (mansion.eastDoor.locked) return mansion.walls.concat([mansion.eastDoor]);
  return mansion.walls;
}

/** Whether a circle at (x, y) with radius r overlaps anything solid. */
export function hitsSolid(mansion, x, y, r) {
  for (const s of solids(mansion)) {
    const [nx, ny] = pushCircleOutOfRect(x, y, r, s);
    if (nx !== x || ny !== y) return true;
  }
  return false;
}

/**
 * Move a circle by (dx, dy) with axis separation so it slides along walls
 * instead of sticking. Returns the new [x, y].
 */
export function moveCircle(mansion, x, y, dx, dy, r) {
  let nx = x + dx;
  for (const s of solids(mansion)) {
    [nx, y] = pushCircleOutOfRect(nx, y, r, s);
  }
  let ny = y + dy;
  for (const s of solids(mansion)) {
    [nx, ny] = pushCircleOutOfRect(nx, ny, r, s);
  }
  return [nx, ny];
}

/** Whether the straight look from (x1, y1) to (x2, y2) is clear of walls. */
export function clearSight(mansion, x1, y1, x2, y2) {
  for (const w of sightWalls(mansion)) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  }
  return true;
}

/** Whether point (x, y) is inside a rect. */
export function pointIn(x, y, rect) {
  return inRect(x, y, rect);
}
