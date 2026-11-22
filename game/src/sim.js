// sim.js — one frame of the simulation: timers, the thief, the guards,
// the defenses, the alarm and the win check. The renderer and the drills
// both step the world through here so the game they test is the game
// the player plays.

import { stepRook } from './rook.js';
import { stepSentries, guardSees } from './sentries.js';
import { stepDefenses, camSees, camerasDown } from './defenses.js';
import { stepAlarm, scoreOf } from './siren.js';

/** Start a run: play begins now, the clock starts, audio unlocks. */
export function startGame(world) {
  world.state = 'play';
  world.startTime = world.time;
  world.tones.unlock();
}

/** One frame. input is {x, y, sneak, holdE} with x/y a normalized vector. */
export function updateWorld(world, dt, input) {
  world.time += dt;
  if (world.bannerT > 0) world.bannerT -= dt;
  if (world.shake > 0) world.shake -= dt;
  if (world.camsOff > 0) world.camsOff -= dt;
  if (world.empTimer > 0) world.empTimer -= dt;
  if (world.laserOff > 0) world.laserOff -= dt;
  if (world.laserCooldown > 0) world.laserCooldown -= dt;
  if (world.callToVault > 0) world.callToVault -= dt;

  stepRook(world, dt, input);
  stepSentries(world, dt);
  stepDefenses(world, dt);

  world.anySees =
    world.guards.some((g) => guardSees(world, g)) ||
    (!camerasDown(world) && world.defenses.cameras.some((c) => camSees(world, c)));
  stepAlarm(world, dt);

  // The east exit, reached with the Star while the gallery is not locked down.
  const ez = world.mansion.exitZone;
  const r = world.rook;
  if (
    world.state === 'play' &&
    r.starTaken &&
    r.x > ez.x - 6 &&
    r.x < ez.x + ez.w + 6 &&
    r.y > ez.y &&
    r.y < ez.y + ez.h &&
    world.lockdownT <= 0
  ) {
    world.state = 'won';
    world.result = scoreOf(world);
    world.tones.win();
  }
}
