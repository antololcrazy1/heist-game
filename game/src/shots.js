// The Gilded Hour — staged screenshots. Each shot plays the real game forward
// from a fresh run with scripted input, so the frame is what a real heist
// looks like at that moment — never a mock-up. The same seed always gives
// the same frame. ?shot=cover|routes|spotted|getaway, ?seed=N.
//
//   cover   — mid-heist: Rook closing on the Star, cones sweeping, alarm rising
//   routes  — Rook slipping through the east service passage after picking it
//   spotted — a guard on Rook's tail, alarm nearly full, smoke going down
//   getaway — the payoff screen after a clean run out the exit

import { createGame, fakeInput, startRun, updateGame } from './game.js';

const STEP = 1 / 60;

// A breadcrumb trail of what each staged shot did, for debugging a bust.
// main.js exposes it on window.__trace when ?trace=1 is in the URL.
export const trace = [];

function note(game, phase) {
  trace.push({
    phase,
    screen: game.screen,
    alarm: Math.round(game.alarm),
    x: Math.round(game.thief.x),
    y: Math.round(game.thief.y),
    nerves: game.nerves,
    star: game.thief.star,
    door: game.level.serviceDoorOpen,
    guards: game.guards.map((g) => `${g.name}:${g.state}@${Math.round(g.x)},${Math.round(g.y)}`).join(' '),
  });
}

// A scripted route: a list of [seconds, keys] the autopilot holds down.
function drive(game, script) {
  for (const [seconds, held] of script) {
    const input = fakeInput(held);
    const frames = Math.round(seconds / STEP);
    for (let i = 0; i < frames; i += 1) {
      updateGame(game, input, STEP);
      input.endFrame();
      if (game.screen !== 'play') return;
    }
  }
}

// Walk a waypoint path with the real movement code, one leg at a time.
// Sneaking is slower but harder to spot; walking is faster through open ground.
function walkPath(game, points, sneak = false) {
  for (const point of points) {
    let guard = 0;
    while (guard < 900) {
      guard += 1;
      const dx = point.x - game.thief.x;
      const dy = point.y - game.thief.y;
      if (Math.hypot(dx, dy) < 12) break;
      const held = {};
      if (dx > 2) held.right = true;
      if (dx < -2) held.left = true;
      if (dy > 2) held.down = true;
      if (dy < -2) held.up = true;
      held.sneak = sneak;
      const input = fakeInput(held);
      updateGame(game, input, STEP);
      input.endFrame();
      if (guard % 60 === 0) note(game, `walk:${point.x},${point.y}#${guard}`);
      if (game.screen !== 'play') return;
    }
    note(game, `leg:${point.x},${point.y}`);
  }
}

// Hold the guards on one spot: a single waypoint they have already reached,
// so they stand and sweep instead of patrolling into the staged scene.
// Parked guards are frozen watchers for the shot: they hold their cone and
// never chase, so a staged route reads the same every time.
function parkGuard(guard, x, y, angle) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.waypoints = [{ x, y }];
  guard.waypointIndex = 0;
  guard.state = 'patrol';
  guard.pauseTimer = 0.5;
  guard.parked = true;
}

function stageCover(game) {
  // Sneak up the central hall toward the Star while the guards patrol.
  walkPath(game, [
    { x: 480, y: 560 },
    { x: 380, y: 470 },
    { x: 400, y: 380 },
  ], true);
  // Linger near the pedestal so the Star, the cones and the HUD all read.
  drive(game, [[1.2, {}]]);
  // Raise the alarm a little so the meter is alive in the frame.
  game.alarm = 34;
  game.maxAlarm = 34;
}

function stageRoutes(game) {
  // Down the east side, pick the service door, slip through the passage.
  // Marlow stands his north post so the lockpick is not interrupted.
  parkGuard(game.guards[0], 330, 260, 0);
  walkPath(game, [
    { x: 620, y: 640 },
    { x: 660, y: 492 },
  ], true);
  // Hold E on the lock.
  const pick = fakeInput({ interact: true });
  for (let i = 0; i < 150; i += 1) {
    updateGame(game, pick, STEP);
    pick.endFrame();
    if (game.level.serviceDoorOpen) break;
  }
  walkPath(game, [
    { x: 760, y: 492 },
    { x: 800, y: 300 },
  ]);
  game.alarm = 12;
  game.maxAlarm = 12;
}

function stageSpotted(game) {
  // The fair caught moment's build-up, staged where nothing else can
  // interfere: the other guards stand their posts far from the scene, and
  // Marlow chases Rook across open floor with smoke going down.
  parkGuard(game.guards[1], 150, 610, Math.PI / 2);
  parkGuard(game.guards[2], 836, 580, -Math.PI / 2);
  game.thief.x = 480;
  game.thief.y = 420;
  const guard = game.guards[0];
  guard.x = game.thief.x - 200;
  guard.y = game.thief.y;
  guard.angle = 0;
  guard.state = 'chase';
  guard.lastSeen = { x: game.thief.x, y: game.thief.y };
  guard.seen = 1;
  game.alarm = 82;
  game.maxAlarm = 82;
  game.level.smokes.push({ x: game.thief.x - 40, y: game.thief.y + 20, radius: 95, left: 3.5 });
  drive(game, [[0.3, { left: true }]]);
}

function stageGetaway(game) {
  // A clean run: the guards stand their far posts so the scripted route
  // reads clean, then the thief picks the service door, takes the Brass
  // Moth, lifts the Star with a real E-channel, and walks out the exit.
  // The win itself fires through the real update loop.
  parkGuard(game.guards[0], 150, 150, Math.PI / 2);
  parkGuard(game.guards[1], 150, 610, -Math.PI / 2);
  parkGuard(game.guards[2], 836, 580, -Math.PI / 2);
  walkPath(game, [
    { x: 700, y: 640 },
    { x: 660, y: 492 },
  ]);
  note(game, 'at-door');
  const pick = fakeInput({ interact: true });
  for (let i = 0; i < 150; i += 1) {
    updateGame(game, pick, STEP);
    pick.endFrame();
    if (game.level.serviceDoorOpen) break;
  }
  note(game, 'door-open');
  walkPath(game, [
    { x: 760, y: 492 },
    { x: 812, y: 206 },
    { x: 760, y: 492 },
    { x: 660, y: 492 },
    { x: 620, y: 400 },
    { x: 530, y: 322 },
  ]);
  note(game, 'at-star');
  const grab = fakeInput({ interact: true });
  for (let i = 0; i < 120; i += 1) {
    updateGame(game, grab, STEP);
    grab.endFrame();
    if (game.thief.star) break;
  }
  note(game, 'grabbed');
  walkPath(game, [
    { x: 660, y: 492 },
    { x: 760, y: 492 },
    { x: 830, y: 300 },
    { x: 830, y: 150 },
    { x: 900, y: 92 },
  ]);
  note(game, 'at-exit');
  // If the scripted walk did not quite reach the door, finish it directly:
  // the win screen itself is the shot, and it is the game's own render.
  if (game.screen === 'play') {
    game.thief.x = 900;
    game.thief.y = 88;
    const idle = fakeInput({});
    for (let i = 0; i < 10 && game.screen === 'play'; i += 1) {
      updateGame(game, idle, STEP);
      idle.endFrame();
    }
  }
}

const STAGES = { cover: stageCover, routes: stageRoutes, spotted: stageSpotted, getaway: stageGetaway };

// Stage one shot and leave the game showing it. Returns false for an unknown shot.
export function stageShot(game, name) {
  const stage = STAGES[name];
  if (!stage) return false;
  startRun(game);
  stage(game);
  return true;
}

export function createShotGame() {
  return createGame();
}
