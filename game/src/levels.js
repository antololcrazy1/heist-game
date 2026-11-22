// levels.js — the ten levels of The Gilded Hour. One table, ten rungs:
// each level turns the screws a little tighter — more guards, faster
// guards, more cameras, more laser beams, a sharper alarm, and fewer
// tools to get out of trouble. Level 1 is a gentle first job; level 10
// is the whole gallery hunting one thief. Winning a level unlocks the
// next one; the unlock is kept in localStorage so it survives a reload.

export const LEVEL_COUNT = 10;

export const LEVELS = [
  { n: 1, name: 'FIRST JOB', guards: 3, guardSpeed: 0.85, cameras: 2, lasers: 2, laserSpeed: 1.0, alarmRate: 0.8, artifacts: 5, smoke: 3, emp: 3, coins: 4, nerves: 4 },
  { n: 2, name: 'WARM-UP', guards: 4, guardSpeed: 0.9, cameras: 2, lasers: 2, laserSpeed: 1.1, alarmRate: 0.9, artifacts: 6, smoke: 3, emp: 3, coins: 4, nerves: 4 },
  { n: 3, name: 'EARLY BIRD', guards: 4, guardSpeed: 0.95, cameras: 3, lasers: 2, laserSpeed: 1.2, alarmRate: 1.0, artifacts: 6, smoke: 3, emp: 2, coins: 3, nerves: 3 },
  { n: 4, name: 'SECOND STORY', guards: 5, guardSpeed: 1.0, cameras: 3, lasers: 3, laserSpeed: 1.25, alarmRate: 1.0, artifacts: 7, smoke: 2, emp: 2, coins: 3, nerves: 3 },
  { n: 5, name: 'HIGH STAKES', guards: 5, guardSpeed: 1.05, cameras: 3, lasers: 3, laserSpeed: 1.35, alarmRate: 1.1, artifacts: 7, smoke: 2, emp: 2, coins: 3, nerves: 3 },
  { n: 6, name: 'TIGHT SHIP', guards: 6, guardSpeed: 1.1, cameras: 4, lasers: 3, laserSpeed: 1.45, alarmRate: 1.15, artifacts: 8, smoke: 2, emp: 2, coins: 3, nerves: 3 },
  { n: 7, name: 'LOCKED DOWN', guards: 6, guardSpeed: 1.15, cameras: 4, lasers: 4, laserSpeed: 1.55, alarmRate: 1.2, artifacts: 8, smoke: 2, emp: 1, coins: 2, nerves: 3 },
  { n: 8, name: 'NO MERCY', guards: 7, guardSpeed: 1.2, cameras: 5, lasers: 4, laserSpeed: 1.65, alarmRate: 1.3, artifacts: 9, smoke: 1, emp: 1, coins: 2, nerves: 2 },
  { n: 9, name: 'GHOST PROTOCOL', guards: 7, guardSpeed: 1.3, cameras: 5, lasers: 4, laserSpeed: 1.75, alarmRate: 1.4, artifacts: 9, smoke: 1, emp: 1, coins: 2, nerves: 2 },
  { n: 10, name: 'THE LAST JOB', guards: 8, guardSpeed: 1.35, cameras: 5, lasers: 4, laserSpeed: 1.85, alarmRate: 1.5, artifacts: 10, smoke: 1, emp: 1, coins: 2, nerves: 2 },
];

/** The config for level n (clamped to 1..10). */
export function getLevel(n) {
  const i = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(n) || 1)) - 1;
  return LEVELS[i];
}

const UNLOCK_KEY = 'gilded-hour-unlocked';

/** Highest level the player has unlocked (1 when nothing is saved). */
export function loadUnlocked() {
  try {
    const v = Number(localStorage.getItem(UNLOCK_KEY));
    return v >= 1 && v <= LEVEL_COUNT ? v : 1;
  } catch (e) {
    return 1;
  }
}

/** Remember that level n is unlocked (never below 1, never above 10). */
export function saveUnlocked(n) {
  try {
    localStorage.setItem(UNLOCK_KEY, String(Math.max(1, Math.min(LEVEL_COUNT, n))));
  } catch (e) {
    // No storage (private mode, file://): progression just lasts the session.
  }
}

// --- level select boxes on the title screen (canvas is 960x720) ---
export const BOX_W = 120;
export const BOX_H = 44;
export const BOX_GAP = 12;
export const BOX_Y0 = 335;

/** Screen rect of level n's box (two rows of five). */
export function levelBoxRect(n) {
  const col = (n - 1) % 5;
  const row = Math.floor((n - 1) / 5);
  const totalW = 5 * BOX_W + 4 * BOX_GAP;
  const x0 = (960 - totalW) / 2;
  return { x: x0 + col * (BOX_W + BOX_GAP), y: BOX_Y0 + row * (BOX_H + BOX_GAP), w: BOX_W, h: BOX_H };
}

/** Which level's box the point (x, y) is inside, or null. */
export function levelAtPoint(x, y) {
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const r = levelBoxRect(n);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return n;
  }
  return null;
}

/** One-line summary of a level's difficulty, for the title screen. */
export function levelSummary(cfg) {
  return `LV ${cfg.n} ${cfg.name} — ${cfg.guards} guards · ${cfg.cameras} cameras · ${cfg.lasers} lasers · alarm x${cfg.alarmRate.toFixed(1)}`;
}
