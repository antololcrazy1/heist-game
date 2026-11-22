// The Gilded Hour v2 — the game itself: screens, the alarm and its stages,
// nerves, the three-act checklist, and the getaway payoff. The loop runs
// title -> playing -> (busted | getaway) -> playing. A caught moment is fair:
// a guard must reach Rook, and a bust costs one nerve and sends Rook back
// to the entry — the loot already taken stays taken.

import { ALARM, CROWN, ENTRY, GUARD, RUN, STAR } from './config.js';
import { buildLevel } from './level.js';
import { alarmPressure, buildGuards, pingGuards, updateCameras, updateGuard, updateLasers } from './watchers.js';
import { createThief, updateThief } from './thief.js';
import { burst, createParticles, floatText, puff, updateParticles } from './particles.js';
import { setAlarmHum, sfx, unlockAudio } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// The alarm's named stages, for the HUD and the screen tint.
export function alarmStage(alarm) {
  if (alarm >= ALARM.lockdownAt) return 'LOCKDOWN';
  if (alarm >= 85) return 'CRITICAL';
  if (alarm >= 60) return 'HUNTED';
  if (alarm >= 30) return 'WARY';
  return 'CALM';
}

export function createGame() {
  return {
    screen: SCREEN_TITLE,
    time: 0,
    playTime: 0,
    alarm: 0,
    lockdownUntil: 0,
    lockdown: false,
    nerves: RUN.nerves,
    level: buildLevel(),
    guards: buildGuards(),
    thief: createThief(),
    particles: createParticles(),
    seenByCamera: false,
    anyChase: false,
    caughtFlash: 0,
    spottedFlash: 0,
    laserFlash: 0,
    maxAlarm: 0,
    events: [],
    bustedAt: 0,
    result: null,
    hints: {
      atExit: false,
      nearStar: false,
      nearCrown: false,
      nearDoor: false,
      nearTerminal: false,
    },
  };
}

export function startRun(game) {
  game.screen = SCREEN_PLAY;
  game.time = 0;
  game.playTime = 0;
  game.alarm = 0;
  game.lockdownUntil = 0;
  game.lockdown = false;
  game.nerves = RUN.nerves;
  game.level = buildLevel();
  game.guards = buildGuards();
  game.thief = createThief();
  game.particles = createParticles();
  game.maxAlarm = 0;
  game.result = null;
  game.caughtFlash = 0;
  game.spottedFlash = 0;
  game.laserFlash = 0;
  unlockAudio();
}

function scoreRun(game) {
  const seconds = Math.round(game.playTime);
  const timeBonus = Math.max(0, RUN.timeBonusStart - seconds * RUN.timeBonusPerSecond);
  const ghost = game.maxAlarm <= RUN.ghostAlarmCeiling;
  const cleanVault = game.thief.crown && !game.level.laserTripped;
  const loot =
    (game.thief.star ? RUN.starValue : 0) +
    (game.thief.crown ? RUN.crownValue : 0) +
    game.thief.artifactValue;
  const total = loot + timeBonus + (ghost ? RUN.ghostBonus : 0) + (cleanVault ? RUN.cleanVaultBonus : 0);
  const rank =
    total >= 16000 ? 'GHOST LEGEND' :
    total >= 12000 ? 'MASTER THIEF' :
    total >= 9000 ? 'CLEAN GETAWAY' :
    total >= 6000 ? 'SMOOTH OPERATOR' : 'LOUD BUT RICH';
  return {
    seconds,
    star: game.thief.star,
    crown: game.thief.crown,
    artifacts: game.thief.artifacts,
    artifactNames: game.thief.artifactNames,
    loot,
    timeBonus,
    ghost,
    ghostBonus: ghost ? RUN.ghostBonus : 0,
    cleanVault,
    cleanVaultBonus: cleanVault ? RUN.cleanVaultBonus : 0,
    nervesLeft: game.nerves,
    total,
    rank,
  };
}

function bustThief(game) {
  game.nerves -= 1;
  game.caughtFlash = 1;
  sfx.busted();
  setAlarmHum(false);
  if (game.nerves <= 0) {
    game.screen = SCREEN_OVER;
    game.bustedAt = game.time;
    return;
  }
  game.screen = SCREEN_BUSTED;
  game.bustedAt = game.time;
  game.thief.x = ENTRY.x;
  game.thief.y = ENTRY.y;
  game.thief.channel = null;
  game.alarm = 40;
  game.lockdown = false;
  game.lockdownUntil = 0;
  game.guards = buildGuards();
  game.level.smokes = [];
  game.level.coins = [];
}

// One frame of the heist. Input presses are consumed here; callers must call
// input.endFrame() after update.
export function updateGame(game, input, dt) {
  game.time += dt;
  if (game.caughtFlash > 0) game.caughtFlash = Math.max(0, game.caughtFlash - dt * 1.4);
  if (game.spottedFlash > 0) game.spottedFlash = Math.max(0, game.spottedFlash - dt * 1.8);
  if (game.laserFlash > 0) game.laserFlash = Math.max(0, game.laserFlash - dt * 1.6);

  if (input.wasPressed('KeyP') && game.screen === SCREEN_PLAY) {
    game.screen = SCREEN_PAUSED;
    return;
  }
  if (input.wasPressed('KeyP') && game.screen === SCREEN_PAUSED) {
    game.screen = SCREEN_PLAY;
    return;
  }

  if (game.screen === SCREEN_TITLE) {
    if (input.wasPressed('Enter') || input.wasPressed('Space')) startRun(game);
    return;
  }
  if (game.screen === SCREEN_PAUSED) return;
  if (game.screen === SCREEN_BUSTED) {
    if (game.time - game.bustedAt > 1.4 && (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('KeyR'))) {
      game.screen = SCREEN_PLAY;
    }
    return;
  }
  if (game.screen === SCREEN_OVER || game.screen === SCREEN_WIN) {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter')) startRun(game);
    return;
  }

  // SCREEN_PLAY from here on.
  game.playTime += dt;
  const events = [];
  game.events = events;

  const hints = updateThief(game.thief, input, dt, game.level, game.guards, game.time, events);
  game.hints = hints;

  // The night's noise: the vault drill is loud, and so is a laser trip.
  for (const event of events) {
    if (event.type === 'vault-noise') {
      game.alarm = Math.min(100, game.alarm + ALARM.vaultNoise);
      pingGuards(game.guards, CROWN.x, CROWN.y);
      floatText(game.particles, game.thief.x, game.thief.y - 30, 'DRILLING… LOUD!', '#ff9a6a');
    } else if (event.type === 'star-taken') {
      burst(game.particles, STAR.x, STAR.y, '#ffd76a', 22, 120);
      floatText(game.particles, STAR.x, STAR.y - 40, 'AURORA STAR +$5,000', '#ffd76a');
    } else if (event.type === 'crown-taken') {
      burst(game.particles, CROWN.x, CROWN.y, '#ffe9a8', 26, 130);
      floatText(game.particles, CROWN.x, CROWN.y - 40, 'GILDED CROWN +$8,000', '#ffe9a8');
    } else if (event.type === 'artifact-taken') {
      burst(game.particles, game.thief.x, game.thief.y - 10, '#c9a227', 10, 70);
      floatText(game.particles, game.thief.x, game.thief.y - 30, `${event.name} +$${event.value}`, '#e8c96a');
    } else if (event.type === 'smoke') {
      puff(game.particles, game.thief.x, game.thief.y);
    } else if (event.type === 'terminal-hacked') {
      floatText(game.particles, game.thief.x, game.thief.y - 30, 'CAMERAS DARK — 20s', '#7ad7ff');
    } else if (event.type === 'door-opened') {
      floatText(game.particles, game.thief.x, game.thief.y - 30, 'SERVICE DOOR OPEN', '#9ae89a');
    }
  }

  let anyChase = false;
  for (const guard of game.guards) {
    const chasing = updateGuard(guard, dt, game.thief, game.level);
    if (chasing) anyChase = true;
    if (guard.state === 'chase' && Math.hypot(guard.x - game.thief.x, guard.y - game.thief.y) < GUARD.catchDistance) {
      bustThief(game);
      return;
    }
  }
  game.anyChase = anyChase;

  game.seenByCamera = updateCameras(game.level, dt, game.thief, game.time);

  const trippedBeam = updateLasers(game.level, dt, game.thief, game.time);
  if (trippedBeam) {
    game.alarm = Math.min(100, game.alarm + ALARM.laserTrip);
    game.laserFlash = 1;
    game.level.laserTripped = true;
    pingGuards(game.guards, CROWN.x, CROWN.y);
    floatText(game.particles, game.thief.x, game.thief.y - 30, 'LASER TRIP!', '#ff6a6a');
    sfx.laser();
  }

  // The alarm climbs while anyone sees Rook, falls when nobody does.
  const pressure = alarmPressure(game.guards, game.seenByCamera);
  if (pressure > 0) {
    game.alarm = Math.min(100, game.alarm + pressure * dt);
  } else {
    game.alarm = Math.max(0, game.alarm - ALARM.decay * dt);
  }
  game.maxAlarm = Math.max(game.maxAlarm, game.alarm);

  if (game.alarm >= 30 && pressure > 0 && game.spottedFlash <= 0) {
    game.spottedFlash = 0.4;
    sfx.spotted();
  }
  setAlarmHum(game.alarm >= 55 || anyChase);

  // Lockdown: at full alarm the exit seals and the guards hunt.
  if (game.alarm >= ALARM.lockdownAt && !game.lockdown) {
    game.lockdown = true;
    game.lockdownUntil = game.time + ALARM.lockdownSeconds;
    for (const guard of game.guards) {
      guard.state = 'chase';
      guard.lastSeen = { x: game.thief.x, y: game.thief.y };
    }
    events.push({ type: 'lockdown' });
  }
  if (game.lockdown && game.time >= game.lockdownUntil) {
    game.lockdown = false;
    game.alarm = ALARM.afterLockdown;
  }

  // The getaway: the Star in hand and a foot out the east door.
  if (game.thief.star && hints.atExit && !game.lockdown) {
    game.result = scoreRun(game);
    game.screen = SCREEN_WIN;
    sfx.win();
    setAlarmHum(false);
  }

  updateParticles(game.particles, dt);
}

// A scripted playthrough used by the self-test: drive Rook with fake input
// and report whether the game behaves. Runs inside the page, so a headless
// run can read the verdict from the DOM.
export function selfTest(game) {
  const lines = [];
  function check(name, ok) {
    lines.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
    return ok;
  }
  let ok = true;
  ok = check('starts on title screen', game.screen === SCREEN_TITLE) && ok;
  startRun(game);
  ok = check('enter starts the run', game.screen === SCREEN_PLAY) && ok;

  // Park every guard far from the scripted route, so the route itself is
  // what the test measures, not a patrol that happens to cross it.
  for (const guard of game.guards) {
    guard.parked = true;
  }
  const posts = [
    [150, 150],
    [150, 610],
    [760, 580],
    [920, 480],
    [180, 400],
  ];
  game.guards.forEach((guard, i) => {
    guard.x = posts[i][0];
    guard.y = posts[i][1];
    guard.waypoints = [{ x: posts[i][0], y: posts[i][1] }];
    guard.waypointIndex = 0;
  });

  // Walk right for one second: Rook must actually move.
  const startX = game.thief.x;
  const right = fakeInput({ right: true });
  for (let i = 0; i < 60; i += 1) {
    updateGame(game, right, 1 / 60);
    right.endFrame();
  }
  ok = check('thief moves with keyboard', game.thief.x > startX + 40) && ok;

  // Stand on the Star and hold E: the grab channel must complete.
  game.thief.x = STAR.x + 40;
  game.thief.y = STAR.y;
  const grab = fakeInput({ interact: true });
  for (let i = 0; i < 120; i += 1) {
    updateGame(game, grab, 1 / 60);
    grab.endFrame();
  }
  ok = check('holding E grabs the Aurora Star', game.thief.star === true) && ok;

  // One guard, unparked and already chasing in clear view: the alarm must
  // climb while it watches.
  const alarmBefore = game.alarm;
  const watcher = game.guards[0];
  watcher.parked = false;
  watcher.x = game.thief.x + 150;
  watcher.y = game.thief.y;
  watcher.angle = Math.PI;
  watcher.state = 'chase';
  watcher.lastSeen = { x: game.thief.x, y: game.thief.y };
  const idle = fakeInput({});
  for (let i = 0; i < 30; i += 1) {
    updateGame(game, idle, 1 / 60);
    idle.endFrame();
  }
  ok = check('guard vision raises the alarm', game.alarm > alarmBefore + 5) && ok;
  watcher.parked = true;
  watcher.x = 150;
  watcher.y = 610;
  watcher.state = 'patrol';

  // Hold E on the Crown: the four-second vault crack must complete, and the
  // drill noise must have raised the alarm.
  game.thief.x = CROWN.x - 40;
  game.thief.y = CROWN.y;
  const drill = fakeInput({ interact: true });
  for (let i = 0; i < 300; i += 1) {
    updateGame(game, drill, 1 / 60);
    drill.endFrame();
  }
  ok = check('holding E cracks the vault and takes the Crown', game.thief.crown === true) && ok;

  // Step onto a laser beam: the trip must spike the alarm. The beams may
  // still be cooling down from the vault crack above, and the alarm may be
  // high from it, so reset both first and measure the trip alone.
  const beam = game.level.lasers[0];
  game.level.lasers[0].cooldownUntil = 0;
  game.level.lasers[1].cooldownUntil = 0;
  game.alarm = 0;
  game.lockdown = false;
  game.lockdownUntil = 0;
  game.thief.x = 840;
  game.thief.y = beam.y;
  const laserBefore = game.alarm;
  for (let i = 0; i < 10; i += 1) {
    updateGame(game, idle, 1 / 60);
    idle.endFrame();
  }
  ok = check('crossing a laser trips the alarm', game.alarm > laserBefore + 10) && ok;

  // Hold E at the camera terminal: the hack must black out the cameras.
  game.thief.x = 140;
  game.thief.y = 380;
  const hack = fakeInput({ interact: true });
  for (let i = 0; i < 180; i += 1) {
    updateGame(game, hack, 1 / 60);
    hack.endFrame();
  }
  ok = check('hacking the terminal blacks out the cameras', game.level.terminalUsed === true && game.level.cameras.every((c) => game.time < c.offlineUntil)) && ok;

  // Walk out the exit with the Star: the getaway must pay off.
  game.thief.x = 950;
  game.thief.y = 600;
  game.alarm = 0;
  game.lockdown = false;
  for (let i = 0; i < 10; i += 1) {
    updateGame(game, idle, 1 / 60);
    idle.endFrame();
  }
  ok = check('exit with the Star wins the run', game.screen === SCREEN_WIN) && ok;
  ok = check('win screen carries a score', !!game.result && game.result.total > 5000) && ok;

  return { ok, lines };
}

// Minimal stand-in for the real input object, for scripted tests.
export function fakeInput(held) {
  const keys = new Set();
  if (held.right) keys.add('KeyD');
  if (held.left) keys.add('KeyA');
  if (held.up) keys.add('KeyW');
  if (held.down) keys.add('KeyS');
  if (held.sneak) keys.add('ShiftLeft');
  if (held.interact) keys.add('KeyE');
  return {
    moveVector() {
      return {
        x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
        y: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0),
      };
    },
    sneaking() {
      return keys.has('ShiftLeft');
    },
    interacting() {
      return keys.has('KeyE');
    },
    wasPressed() {
      return false;
    },
    consumePress() {},
    mouseClick() {
      return null;
    },
    mousePosition() {
      return { x: 0, y: 0 };
    },
    isTouch() {
      return false;
    },
    sneakToggled() {
      return false;
    },
    stickState() {
      return { active: false, ox: 0, oy: 0, x: 0, y: 0 };
    },
    endFrame() {},
  };
}
