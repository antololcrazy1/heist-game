// The Gilded Hour v2 — tuning and the Marlow Gallery after dark.
// Rook's night has three acts in one building: lift the Aurora Star from the
// central hall, crack the vault in the east wing (past a laser gate), then
// slip out the east door. The gallery is split into three wings by two
// divider walls: the west corridor (camera terminal, two artefacts), the
// guarded central hall (the Star), and the east wing (the vault, the exit).
// All positions are canvas pixels; the playfield is the strip under the HUD.

export const VIEW = { width: 960, height: 720 };
export const HUD_HEIGHT = 72;
export const FIELD = { x: 0, y: HUD_HEIGHT, width: 960, height: 720 - HUD_HEIGHT };

// Rook.
export const THIEF = {
  radius: 13,
  walkSpeed: 175,
  sneakSpeed: 95,
  // Sneaking halves how far a watcher can spot Rook.
  sneakSpotFactor: 0.55,
};

// Sight: a watcher only counts while Rook is inside its cone, in range,
// with nothing solid between them, and not hidden by smoke.
export const VISION = {
  guardRange: 230,
  guardHalfAngle: 0.6,
  cameraRange: 270,
  cameraHalfAngle: 0.5,
  guardSeeRate: 1.35,
  cameraSeeRate: 0.9,
  spottedAt: 1,
};

// The alarm meter (0..100) and its stages. At 100 the gallery locks down:
// the exit seals and every guard hunts.
export const ALARM = {
  guardRise: 26,
  cameraRise: 15,
  decay: 7,
  lockdownAt: 100,
  lockdownSeconds: 8,
  afterLockdown: 55,
  laserTrip: 25,
  vaultNoise: 12,
};

// Guards. Each patrols its own beat; a guard that has stared at Rook long
// enough breaks into a chase, and one that loses the trail searches the spot.
export const GUARD = {
  radius: 13,
  patrolSpeed: 64,
  chaseSpeed: 135,
  investigateSpeed: 100,
  chaseAfter: 0.55,
  loseSightAfter: 2.6,
  searchSeconds: 4,
  catchDistance: 26,
  waypointPause: 1.4,
  sweepArc: 0.7,
};

// Tools. Every use is spent; nothing restocks mid-heist.
export const TOOLS = {
  smoke: { start: 2, radius: 95, seconds: 4 },
  emp: { start: 2, seconds: 8 },
  coin: { start: 3, throwRange: 280, lureRadius: 210 },
  lockpickSeconds: 2.0,
  grabSeconds: 1.2,
  vaultSeconds: 4.0,
  terminalSeconds: 2.0,
  terminalOfflineSeconds: 20,
};

// The run: nerves, loot values, and the getaway payoff.
export const RUN = {
  nerves: 3,
  starValue: 5000,
  crownValue: 8000,
  timeBonusStart: 3000,
  timeBonusPerSecond: 10,
  ghostBonus: 1500,
  ghostAlarmCeiling: 50,
  cleanVaultBonus: 1000,
};

// Divider walls. The west one leaves an open doorway (y 372..452); the east
// one leaves the locked service door (y 452..532).
export const WALLS = [
  { x: 250, y: 72, w: 24, h: 300 },
  { x: 250, y: 452, w: 24, h: 268 },
  { x: 686, y: 72, w: 24, h: 380 },
  { x: 686, y: 532, w: 24, h: 188 },
  // Vault room: west wall with an entrance gap (y 180..240), south wall.
  { x: 800, y: 96, w: 12, h: 84 },
  { x: 800, y: 240, w: 12, h: 60 },
  { x: 800, y: 288, w: 144, h: 12 },
];

export const SERVICE_DOOR = { x: 686, y: 452, w: 24, h: 80 };

// The getaway: a side door in the east wall, south end.
export const EXIT_DOOR = { x: 946, y: 560, w: 14, h: 80 };

// Low cover: display cases, benches, planters. Solid, and they block sight.
export const COVER = [
  { x: 348, y: 196, w: 72, h: 34, kind: 'case' },
  { x: 540, y: 196, w: 72, h: 34, kind: 'case' },
  { x: 348, y: 470, w: 72, h: 34, kind: 'case' },
  { x: 540, y: 470, w: 72, h: 34, kind: 'case' },
  { x: 428, y: 168, w: 104, h: 22, kind: 'bench' },
  { x: 428, y: 522, w: 104, h: 22, kind: 'bench' },
  { x: 92, y: 340, w: 44, h: 44, kind: 'planter' },
  { x: 764, y: 620, w: 44, h: 44, kind: 'planter' },
  { x: 860, y: 120, w: 44, h: 44, kind: 'planter' },
  { x: 60, y: 250, w: 56, h: 30, kind: 'case' },
  { x: 60, y: 480, w: 56, h: 30, kind: 'case' },
];

// The Aurora Star, on its pedestal in the middle of the central hall.
export const STAR = { x: 480, y: 322, pedestal: { x: 456, y: 298, w: 48, h: 48 } };

// The Gilded Crown, locked in the vault.
export const CROWN = { x: 905, y: 198, pedestal: { x: 883, y: 176, w: 44, h: 44 } };

// The camera terminal in the west corridor: hack it and every camera goes
// dark for a while. One use only.
export const TERMINAL = { x: 140, y: 380, radius: 34 };

// Bonus loot, each with its own value. Walking over one pockets it.
export const ARTIFACTS = [
  { x: 150, y: 200, name: 'Jade Fox', value: 750 },
  { x: 150, y: 566, name: 'Ivory Owl', value: 750 },
  { x: 760, y: 420, name: 'Brass Moth', value: 900 },
  { x: 350, y: 600, name: 'Opal Serpent', value: 600 },
  { x: 610, y: 140, name: 'Silver Hare', value: 600 },
  { x: 900, y: 500, name: 'Crimson Mask', value: 1200 },
];

export const ENTRY = { x: 480, y: 688 };

// Guard beats. Facing follows movement and the sweep at each waypoint.
export const GUARD_PATROLS = [
  {
    name: 'Marlow',
    speed: 66,
    waypoints: [
      { x: 330, y: 260 },
      { x: 630, y: 260 },
      { x: 630, y: 440 },
      { x: 330, y: 440 },
    ],
  },
  {
    name: 'Bex',
    speed: 58,
    waypoints: [
      { x: 150, y: 150 },
      { x: 150, y: 610 },
    ],
  },
  {
    name: 'Odo',
    speed: 62,
    waypoints: [
      { x: 760, y: 150 },
      { x: 760, y: 580 },
    ],
  },
  {
    name: 'Vex',
    speed: 60,
    waypoints: [
      { x: 760, y: 340 },
      { x: 920, y: 340 },
      { x: 920, y: 480 },
      { x: 760, y: 480 },
    ],
  },
  {
    name: 'Sable',
    speed: 70,
    waypoints: [
      { x: 350, y: 410 },
      { x: 180, y: 400 },
      { x: 350, y: 410 },
      { x: 620, y: 560 },
      { x: 480, y: 200 },
    ],
  },
];

// Wall cameras. Each sweeps its cone around baseAngle on its own clock.
export const CAMERAS = [
  { x: 262, y: 96, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.55, name: 'CAM 1' },
  { x: 698, y: 696, baseAngle: -Math.PI / 2, sweep: 0.8, speed: 0.45, name: 'CAM 2' },
  { x: 880, y: 96, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.6, name: 'CAM 3' },
];

// The laser gate inside the vault: two beams that slide up and down across
// the entrance corridor to the Crown (x 812..860). Past x 860 the Crown's
// pocket is safe, so the crack itself is a test of timing on the way in.
export const LASERS = [
  { x1: 812, x2: 860, baseY: 190, amp: 42, phase: 0, speed: 0.9 },
  { x1: 812, x2: 860, baseY: 230, amp: 42, phase: Math.PI, speed: 0.9 },
];

// Paintings on the walls, pure decoration, gold frames and all.
export const PAINTINGS = [
  { x: 60, y: 84, w: 120, h: 54, hue: '#b3543f' },
  { x: 780, y: 84, w: 60, h: 54, hue: '#3f6db3' },
  { x: 300, y: 84, w: 90, h: 44, hue: '#7a9a4d' },
  { x: 570, y: 84, w: 90, h: 44, hue: '#c9a227' },
  { x: 60, y: 652, w: 120, h: 54, hue: '#6d4db3' },
  { x: 780, y: 652, w: 120, h: 54, hue: '#b33f7a' },
  { x: 300, y: 652, w: 90, h: 44, hue: '#4db3a8' },
  { x: 570, y: 652, w: 90, h: 44, hue: '#b3893f' },
];

// Warm lamp pools on the floor, for the night-gallery look.
export const LAMPS = [
  { x: 240, y: 160 },
  { x: 720, y: 160 },
  { x: 240, y: 580 },
  { x: 720, y: 580 },
  { x: 480, y: 120 },
];

// Deterministic RNG so staged screenshots always look the same.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
