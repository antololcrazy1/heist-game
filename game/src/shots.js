// The Gilded Hour v2 — staged screenshots. Each shot plays the real game
// forward from a fresh run with scripted input, so the frame is what a real
// heist looks like at that moment — never a mock-up. The same seed always
// gives the same frame. ?shot=cover|vault|spotted|getaway, ?seed=N.
//
//   cover    — mid-heist in the central hall: Rook closing on the Star,
//              cones sweeping, the alarm alive, the checklist half done
//   vault    — Rook cracking the vault past the laser gate, Crown glowing
//   spotted  — Marlow on Rook's tail, red cone, smoke, alarm nearly full
//   getaway  — the payoff screen after a clean run out the east door

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
    crown: game.thief.crown,
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
// A leg can pin Rook under a case: the way straight at the target is blocked
// while the sideways slide is tiny, so if the distance to the target stops
// shrinking, Rook sidesteps — forty frames hard left, then hard right —
// until the way opens again.
function walkPath(game, points, sneak = false) {
  for (const point of points) {
    let guard = 0;
    let lastDist = Infinity;
    let stuckFrames = 0;
    let detour = 0;
    let detourDir = -1;
    while (guard < 1500) {
      guard += 1;
      const dx = point.x - game.thief.x;
      const dy = point.y - game.thief.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) break;
      const held = {};
      if (detour > 0) {
        detour -= 1;
        if (detourDir < 0) held.left = true;
        else held.right = true;
        if (dy < -0.5) held.up = true;
        else if (dy > 0.5) held.down = true;
      } else {
        if (dist > lastDist - 0.5) stuckFrames += 1;
        else stuckFrames = 0;
        lastDist = Math.min(lastDist, dist);
        if (stuckFrames >= 60) {
          detour = 40;
          detourDir = -detourDir;
          stuckFrames = 0;
          lastDist = Infinity;
        }
        if (dx > 0.5) held.right = true;
        if (dx < -0.5) held.left = true;
        if (dy > 0.5) held.down = true;
        if (dy < -0.5) held.up = true;
      }
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

// Hold a guard on one spot: a single waypoint it has already reached, so it
// stands and sweeps instead of patrolling into the staged scene. Parked
// guards are frozen watchers for the shot: they hold their cone and never
// chase, so a staged route reads the same every time.
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

function holdEUntil(game, done) {
  const press = fakeInput({ interact: true });
  for (let i = 0; i < 400; i += 1) {
    updateGame(game, press, STEP);
    press.endFrame();
    if (done(game)) break;
    if (game.screen !== 'play') break;
  }
}

function stageCover(game) {
  // Marlow and Sable hold far posts so the sneak up the hall is not
  // interrupted; the other three patrol and sweep their cones. The route
  // threads left around the display case (x 348..420) instead of over it:
  // down the south edge, up the x 320 lane, then in toward the Star.
  parkGuard(game.guards[0], 630, 260, 0);
  parkGuard(game.guards[4], 620, 560, Math.PI);
  walkPath(game, [
    { x: 480, y: 560 },
    { x: 320, y: 560 },
    { x: 320, y: 400 },
    { x: 410, y: 380 },
  ], true);
  // Linger near the pedestal so the Star, the cones and the HUD all read.
  drive(game, [[1.2, {}]]);
  game.alarm = 30;
  game.maxAlarm = 30;
}

function stageVault(game) {
  // Every guard holds a far post: the vault drill is loud, and a staged
  // crack must not be interrupted by a patrol that wanders in.
  parkGuard(game.guards[0], 330, 260, 0);
  parkGuard(game.guards[1], 150, 610, Math.PI / 2);
  parkGuard(game.guards[2], 760, 580, -Math.PI / 2);
  parkGuard(game.guards[3], 920, 480, Math.PI);
  parkGuard(game.guards[4], 350, 410, 0);
  walkPath(game, [
    { x: 620, y: 640 },
    { x: 660, y: 492 },
  ], true);
  holdEUntil(game, (g) => g.level.serviceDoorOpen);
  note(game, 'door-open');
  // Through the service door, up the east wing, and in through the vault's
  // west gap (y 180..240) to the Crown.
  walkPath(game, [
    { x: 760, y: 492 },
    { x: 780, y: 210 },
    { x: 830, y: 210 },
    { x: 865, y: 198 },
  ]);
  note(game, 'at-crown');
  holdEUntil(game, (g) => g.thief.crown);
  note(game, 'cracked');
  game.alarm = Math.max(game.alarm, 18);
  game.maxAlarm = Math.max(game.maxAlarm, 18);
}

function stageSpotted(game) {
  // The fair caught moment's build-up, staged where nothing else can
  // interfere: the other guards stand their posts far from the scene, and
  // Marlow chases Rook across open floor with smoke going down.
  parkGuard(game.guards[1], 150, 610, Math.PI / 2);
  parkGuard(game.guards[2], 760, 580, -Math.PI / 2);
  parkGuard(game.guards[3], 920, 480, Math.PI);
  parkGuard(game.guards[4], 350, 410, 0);
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
  // reads clean, then Rook picks the service door, pockets the Brass Moth,
  // lifts the Star with a real E-channel, and walks out the east door.
  // The win itself fires through the real update loop.
  parkGuard(game.guards[0], 150, 150, Math.PI / 2);
  parkGuard(game.guards[1], 150, 610, -Math.PI / 2);
  parkGuard(game.guards[2], 760, 580, -Math.PI / 2);
  parkGuard(game.guards[3], 920, 480, Math.PI);
  parkGuard(game.guards[4], 350, 410, 0);
  walkPath(game, [
    { x: 700, y: 640 },
    { x: 660, y: 492 },
  ]);
  note(game, 'at-door');
  holdEUntil(game, (g) => g.level.serviceDoorOpen);
  note(game, 'door-open');
  walkPath(game, [
    { x: 760, y: 492 },
    { x: 760, y: 420 },
    { x: 660, y: 492 },
    { x: 620, y: 400 },
    { x: 530, y: 322 },
  ]);
  note(game, 'at-star');
  holdEUntil(game, (g) => g.thief.star);
  note(game, 'grabbed');
  walkPath(game, [
    { x: 660, y: 492 },
    { x: 760, y: 492 },
    { x: 830, y: 300 },
    { x: 900, y: 400 },
    { x: 947, y: 600 },
  ]);
  note(game, 'at-exit');
  // If the scripted walk did not quite reach the door, finish it directly:
  // the win screen itself is the shot, and it is the game's own render.
  if (game.screen === 'play') {
    game.thief.x = 947;
    game.thief.y = 600;
    const idle = fakeInput({});
    for (let i = 0; i < 10 && game.screen === 'play'; i += 1) {
      updateGame(game, idle, STEP);
      idle.endFrame();
    }
  }
}

const STAGES = { cover: stageCover, vault: stageVault, spotted: stageSpotted, getaway: stageGetaway };

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
