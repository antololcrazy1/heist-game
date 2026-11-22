// The Gilded Hour — tuning constants and the Marlow Gallery floor plan.
// One room, three ways through it: the guarded central hall, the camera-watched
// west corridor, and the locked east service passage. All coordinates are in
// canvas space; the playfield is the strip below the HUD bar.

export const VIEW = { width: 960, height: 720 };
export const HUD_HEIGHT = 72;
export const FIELD = { x: 0, y: HUD_HEIGHT, width: 960, height: 720 - HUD_HEIGHT };

// The thief.
export const THIEF = {
  radius: 13,
  walkSpeed: 168,
  sneakSpeed: 92,
  // A sneaking thief is harder to spot: guards and cameras see half as far.
  sneakSpotFactor: 0.55,
};

// Vision.
export const VISION = {
  guardRange: 225,
  guardHalfAngle: 0.61, // ~35 degrees each side
  cameraRange: 265,
  cameraHalfAngle: 0.52,
  // How fast "seen" builds while the thief is inside a cone, per second.
  guardSeeRate: 1.35,
  cameraSeeRate: 0.9,
  // The thief is fully spotted once seen reaches 1.
  spottedAt: 1,
};

// The alarm meter (0..100). It climbs while anyone sees the thief and falls
// back when nobody does. At 100 the gallery locks down.
export const ALARM = {
  guardRise: 26,
  cameraRise: 15,
  decay: 7,
  lockdownAt: 100,
  lockdownSeconds: 8,
  afterLockdown: 55,
};

// Guards.
export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  chaseSpeed: 132,
  investigateSpeed: 96,
  // Seconds of clear sight before a guard breaks into a chase.
  chaseAfter: 0.55,
  // Seconds of no sight before a chasing guard gives up and searches.
  loseSightAfter: 2.6,
  searchSeconds: 4,
  // A guard that gets this close to the thief catches them.
  catchDistance: 26,
  waypointPause: 1.4,
  sweepArc: 0.7,
};

// Tools. Each one costs a use; there is no way to buy more mid-heist.
export const TOOLS = {
  smoke: { start: 2, radius: 95, seconds: 4 },
  emp: { start: 1, seconds: 8 },
  coin: { start: 3, throwRange: 280, lureRadius: 210 },
  lockpickSeconds: 2.0,
  grabSeconds: 1.2,
};

// The run.
export const RUN = {
  nerves: 3,
  starValue: 5000,
  artifactValue: 750,
  timeBonusStart: 3000,
  timeBonusPerSecond: 10,
  ghostBonus: 1500,
  ghostAlarmCeiling: 50,
};

// Walls and cover. A rect is { x, y, w, h }. Walls block movement and sight;
// cover blocks movement and sight too, but is low furniture the thief hides
// behind. The two divider walls split the gallery into three routes.
export const WALLS = [
  // West divider, top half (gap y 372..452 is the west doorway).
  { x: 250, y: 72, w: 24, h: 300 },
  // West divider, bottom half.
  { x: 250, y: 452, w: 24, h: 268 },
  // East divider, top half (gap y 452..532 is the locked service door).
  { x: 686, y: 72, w: 24, h: 380 },
  // East divider, bottom half.
  { x: 686, y: 532, w: 24, h: 188 },
];

// The locked service door fills the east gap until it is lockpicked.
export const SERVICE_DOOR = { x: 686, y: 452, w: 24, h: 80 };

// The getaway exit: a door in the top wall, north-east corner.
export const EXIT_DOOR = { x: 856, y: 72, w: 88, h: 14 };

// Low cover: display cases, benches, planters. They block sight and movement.
export const COVER = [
  { x: 348, y: 196, w: 72, h: 34, kind: 'case' },
  { x: 540, y: 196, w: 72, h: 34, kind: 'case' },
  { x: 348, y: 470, w: 72, h: 34, kind: 'case' },
  { x: 540, y: 470, w: 72, h: 34, kind: 'case' },
  { x: 428, y: 168, w: 104, h: 22, kind: 'bench' },
  { x: 428, y: 522, w: 104, h: 22, kind: 'bench' },
  { x: 92, y: 340, w: 44, h: 44, kind: 'planter' },
  { x: 764, y: 620, w: 44, h: 44, kind: 'planter' },
  { x: 764, y: 120, w: 44, h: 44, kind: 'planter' },
];

// The loot target: the Aurora Star on its pedestal in the middle of the hall.
export const STAR = { x: 480, y: 322, pedestal: { x: 456, y: 298, w: 48, h: 48 } };

// Bonus loot: three small artefacts tucked off the main route.
export const ARTIFACTS = [
  { x: 150, y: 200, name: 'Jade Fox' },
  { x: 150, y: 566, name: 'Ivory Owl' },
  { x: 812, y: 196, name: 'Brass Moth' },
];

// Where the thief slips in.
export const ENTRY = { x: 480, y: 688 };

// Guard patrols. Each guard walks its waypoints in order, pauses and sweeps
// at each one, then loops. Facing is derived from movement and the sweep.
export const GUARD_PATROLS = [
  {
    name: 'Marlow',
    waypoints: [
      { x: 330, y: 260 },
      { x: 630, y: 260 },
      { x: 630, y: 440 },
      { x: 330, y: 440 },
    ],
  },
  {
    name: 'Bex',
    waypoints: [
      { x: 150, y: 150 },
      { x: 150, y: 610 },
    ],
  },
  {
    name: 'Odo',
    waypoints: [
      { x: 836, y: 150 },
      { x: 836, y: 580 },
    ],
  },
];

// Wall cameras. Each sweeps its cone back and forth around baseAngle.
export const CAMERAS = [
  { x: 262, y: 96, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.55, name: 'CAM 1' },
  { x: 698, y: 696, baseAngle: -Math.PI / 2, sweep: 0.8, speed: 0.45, name: 'CAM 2' },
];

// Paintings on the walls, for the gallery look. Pure decoration.
export const PAINTINGS = [
  { x: 60, y: 84, w: 120, h: 54, hue: '#b3543f' },
  { x: 780, y: 84, w: 60, h: 54, hue: '#3f6db3' },
  { x: 300, y: 84, w: 90, h: 44, hue: '#7a9a4d' },
  { x: 570, y: 84, w: 90, h: 44, hue: '#c9a227' },
  { x: 60, y: 652, w: 120, h: 54, hue: '#6d4db3' },
  { x: 780, y: 652, w: 120, h: 54, hue: '#b33f7a' },
];

// A tiny deterministic RNG so staged screenshots always look the same.
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
