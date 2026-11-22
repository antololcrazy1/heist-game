// drills.js — the game's own self-test (10 checks) and the staged scenes
// for the four screenshots. The drills build a fresh world per check and
// drive it through the same update step the player uses, so a pass means
// the real game does it.

import { buildMansion } from './mansion.js';
import { makeRook, pressInteract } from './rook.js';
import { makeSentries } from './sentries.js';
import { makeDefenses, camerasDown } from './defenses.js';
import { makeTones } from './tones.js';
import { updateWorld, startGame } from './sim.js';
import { scoreOf } from './siren.js';

function freshWorld() {
  const mansion = buildMansion();
  return {
    mansion,
    rook: makeRook(mansion),
    guards: makeSentries(mansion),
    defenses: makeDefenses(mansion),
    tones: makeTones(),
    state: 'title',
    time: 0,
    startTime: 0,
    alarm: 0,
    maxAlarm: 0,
    lockdownT: 0,
    camsOff: 0,
    empTimer: 0,
    laserOff: 0,
    laserCooldown: 0,
    callToVault: 0,
    anySees: false,
    camSees: false,
    banner: null,
    bannerT: 0,
    shake: 0,
    result: null,
    drillResults: null,
  };
}

const IDLE = { x: 0, y: 0, sneak: false, holdE: false };

function tick(world, seconds, input) {
  const steps = Math.max(1, Math.round(seconds / 0.05));
  for (let i = 0; i < steps; i++) updateWorld(world, 0.05, input || IDLE);
}

/** Run the 10 checks. Returns [{name, ok}] in order. */
export function runDrills() {
  const results = [];
  const check = (name, fn) => {
    try {
      results.push({ name, ok: !!fn() });
    } catch (e) {
      results.push({ name, ok: false });
    }
  };

  check('Title shows', () => {
    const w = freshWorld();
    return w.state === 'title';
  });

  check('Enter starts the run', () => {
    const w = freshWorld();
    startGame(w);
    return w.state === 'play';
  });

  check('Keyboard moves Rook', () => {
    const w = freshWorld();
    startGame(w);
    const x0 = w.rook.x;
    tick(w, 0.6, { x: 1, y: 0, sneak: false, holdE: false });
    return w.rook.x > x0 + 20;
  });

  check('E takes the Aurora Star', () => {
    const w = freshWorld();
    startGame(w);
    w.rook.x = w.mansion.star.x;
    w.rook.y = w.mansion.star.y + 10;
    pressInteract(w);
    return w.mansion.star.taken && w.rook.starTaken && w.rook.loot >= 5000;
  });

  check('Guard vision raises the alarm', () => {
    const w = freshWorld();
    startGame(w);
    const g = w.guards[0];
    // Walk the guard straight down at Rook so the cone stays on Rook.
    g.pts = [
      [480, 200],
      [480, 400],
    ];
    g.wp = 1;
    g.x = 480;
    g.y = 200;
    g.angle = Math.PI / 2;
    g.state = 'patrol';
    w.rook.x = 480;
    w.rook.y = 300;
    w.rook.invuln = 0;
    tick(w, 2);
    return w.alarm > 4;
  });

  check('E cracks the vault and takes the Crown', () => {
    const w = freshWorld();
    startGame(w);
    w.rook.x = w.mansion.crown.x;
    w.rook.y = w.mansion.crown.y + 10;
    pressInteract(w);
    return w.mansion.crown.taken && w.rook.crownTaken && w.rook.loot >= 8000;
  });

  check('Laser raises the alarm', () => {
    const w = freshWorld();
    startGame(w);
    w.mansion.lasers.phase = -0.18;
    w.rook.x = 836;
    w.rook.y = 225;
    tick(w, 0.15);
    return w.mansion.lasers.tripped && w.alarm >= 25;
  });

  check('Hack terminal kills the cameras', () => {
    const w = freshWorld();
    startGame(w);
    w.rook.x = w.mansion.terminal.x;
    w.rook.y = w.mansion.terminal.y + 10;
    tick(w, 2.3, { x: 0, y: 0, sneak: false, holdE: true });
    return w.mansion.terminal.used && camerasDown(w);
  });

  check('Exit with the Star wins', () => {
    const w = freshWorld();
    startGame(w);
    w.rook.x = w.mansion.star.x;
    w.rook.y = w.mansion.star.y + 10;
    pressInteract(w);
    w.rook.x = 945;
    w.rook.y = 330;
    tick(w, 0.1);
    return w.state === 'won';
  });

  check('Win screen carries the score', () => {
    const w = freshWorld();
    startGame(w);
    w.rook.x = w.mansion.star.x;
    w.rook.y = w.mansion.star.y + 10;
    pressInteract(w);
    w.rook.x = 945;
    w.rook.y = 330;
    tick(w, 0.1);
    const s = w.result || scoreOf(w);
    return w.state === 'won' && s.total >= 5000 && typeof s.rank === 'string' && s.rank.length > 0;
  });

  return results;
}

/** Set the live world up as one of the four screenshot scenes (frozen). */
export function stageScene(world, name) {
  const m = world.mansion;
  const setGuard = (i, x, y, angle, state) => {
    const g = world.guards[i];
    g.x = x;
    g.y = y;
    g.angle = angle;
    if (state) g.state = state;
    g.suspicion = state === 'chase' ? 100 : 0;
    if (state === 'chase') g.lastSeen = { x: world.rook.x, y: world.rook.y };
  };

  if (name === 'cover') {
    world.state = 'play';
    world.time = 6;
    world.startTime = 0;
    world.alarm = 30;
    world.maxAlarm = 30;
    world.rook.x = 430;
    world.rook.y = 380;
    world.rook.facing = Math.PI / 4;
    m.lasers.phase = 0.6;
    setGuard(0, 560, 250, 2.6);
    setGuard(1, 200, 520, -1.2);
    setGuard(2, 700, 540, -2.2);
    setGuard(3, 880, 480, 2.8);
    setGuard(4, 500, 480, -1.9);
  } else if (name === 'vault') {
    world.state = 'play';
    world.time = 12;
    world.startTime = 0;
    world.alarm = 31;
    world.maxAlarm = 31;
    m.crown.taken = true;
    world.rook.crownTaken = true;
    m.artifacts[0].taken = true;
    world.rook.artifactsTaken = 1;
    world.rook.artifactValue = 900;
    world.rook.loot = 8900;
    world.rook.x = 880;
    world.rook.y = 240;
    world.rook.facing = -Math.PI / 2;
    m.lasers.phase = 0.6;
    setGuard(0, 380, 260, 0.4);
    setGuard(1, 200, 600, 1.4);
    setGuard(2, 760, 560, -1.6);
    setGuard(3, 880, 480, 2.8);
    setGuard(4, 430, 400, -0.6);
  } else if (name === 'spotted') {
    world.state = 'play';
    world.time = 0;
    world.startTime = 0;
    world.alarm = 90;
    world.maxAlarm = 90;
    world.rook.x = 430;
    world.rook.y = 380;
    world.rook.facing = 0.6;
    world.rook.smokeClouds.push({ x: 430, y: 380, t: 6 });
    world.banner = 'SPOTTED - BREAK LINE OF SIGHT!';
    world.bannerT = 999;
    setGuard(0, 395, 415, 0.3, 'chase');
    setGuard(4, 475, 440, 2.8, 'chase');
    setGuard(1, 200, 520, -1.2);
    setGuard(2, 700, 540, -2.2);
    setGuard(3, 880, 480, 2.8);
  } else if (name === 'getaway') {
    world.state = 'won';
    world.time = 61;
    world.startTime = 0;
    world.alarm = 0;
    world.maxAlarm = 40;
    m.star.taken = true;
    world.rook.starTaken = true;
    m.artifacts[0].taken = true;
    world.rook.artifactsTaken = 1;
    world.rook.artifactValue = 900;
    world.rook.loot = 5900;
    world.rook.nerves = 3;
    world.result = {
      star: 5000,
      crown: 0,
      arts: 900,
      artCount: 1,
      timeBonus: 2390,
      elapsed: 61,
      ghost: 1500,
      clean: 0,
      total: 9790,
      rank: 'CLEAN GETAWAY',
    };
  }
}
