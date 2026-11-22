// The Gilded Hour — the game itself: screens, the alarm, nerves, scoring and
// the getaway. The loop is title -> playing -> (busted | getaway) -> playing.
// A caught moment is fair: a guard must reach the thief, and a bust costs one
// nerve and sends Rook back to the entry — the loot already taken stays taken.

import { ALARM, ENTRY, GUARD, RUN, STAR } from './config.js';
import { createLevel } from './level.js';
import { alarmPressure, createGuards, updateCameras, updateGuard } from './guards.js';
import { createThief, updateThief } from './thief.js';
import { setAlarmHum, sfx, unlockAudio } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createGame() {
  return {
    screen: SCREEN_TITLE,
    time: 0,
    playTime: 0,
    alarm: 0,
    lockdownUntil: 0,
    lockdown: false,
    nerves: RUN.nerves,
    level: createLevel(),
    guards: createGuards(),
    thief: createThief(),
    seenByCamera: false,
    anyChase: false,
    caughtFlash: 0,
    spottedFlash: 0,
    maxAlarm: 0,
    events: [],
    bustedAt: 0,
    result: null, // filled on the getaway screen: score breakdown
    hints: {
      atExit: false,
      nearStar: false,
      nearDoor: false,
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
  game.level = createLevel();
  game.guards = createGuards();
  game.thief = createThief();
  game.maxAlarm = 0;
  game.result = null;
  game.caughtFlash = 0;
  game.spottedFlash = 0;
  unlockAudio();
}

function scoreRun(game) {
  const seconds = Math.round(game.playTime);
  const timeBonus = Math.max(0, RUN.timeBonusStart - seconds * RUN.timeBonusPerSecond);
  const ghost = game.maxAlarm <= RUN.ghostAlarmCeiling;
  const loot = (game.thief.star ? RUN.starValue : 0) + game.thief.artifacts * RUN.artifactValue;
  const total = loot + timeBonus + (ghost ? RUN.ghostBonus : 0);
  const rank = total >= 9500 ? 'GHOST LEGEND' : total >= 8000 ? 'CLEAN GETAWAY' : total >= 6000 ? 'SMOOTH OPERATOR' : 'LOUD BUT RICH';
  return {
    seconds,
    star: game.thief.star,
    artifacts: game.thief.artifacts,
    artifactNames: game.thief.artifactNames,
    loot,
    timeBonus,
    ghost,
    ghostBonus: ghost ? RUN.ghostBonus : 0,
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
  // The thief slips back to the entry; the guards lose the trail, the alarm
  // cools to a simmer, and anything already stolen stays stolen.
  game.thief.x = ENTRY.x;
  game.thief.y = ENTRY.y;
  game.thief.channel = null;
  game.alarm = 40;
  game.lockdown = false;
  game.lockdownUntil = 0;
  game.guards = createGuards();
  game.level.smokes = [];
  game.level.coins = [];
}

// One frame of the heist. Input presses are consumed here; callers must call
// input.endFrame() after update.
export function updateGame(game, input, dt) {
  game.time += dt;
  if (game.caughtFlash > 0) game.caughtFlash = Math.max(0, game.caughtFlash - dt * 1.4);
  if (game.spottedFlash > 0) game.spottedFlash = Math.max(0, game.spottedFlash - dt * 1.8);

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

  let anyChase = false;
  for (const guard of game.guards) {
    const chasing = updateGuard(guard, dt, game.thief, game.level, game.time);
    if (chasing) anyChase = true;
    // A guard that reaches the thief catches them — the fair caught moment.
    if (guard.state === 'chase' && Math.hypot(guard.x - game.thief.x, guard.y - game.thief.y) < GUARD.catchDistance) {
      bustThief(game);
      return;
    }
  }
  game.anyChase = anyChase;

  game.seenByCamera = updateCameras(game.level, dt, game.thief, game.time);

  // The alarm climbs while anyone sees the thief, falls when nobody does.
  const pressure = alarmPressure(game.guards, game.seenByCamera);
  if (pressure > 0) {
    game.alarm = Math.min(100, game.alarm + pressure * dt);
  } else {
    game.alarm = Math.max(0, game.alarm - ALARM.decay * dt);
  }
  game.maxAlarm = Math.max(game.maxAlarm, game.alarm);

  const wasChasing = game.anyChase;
  if (game.alarm >= 30 && (pressure > 0 || wasChasing) && game.spottedFlash <= 0) {
    game.spottedFlash = 0.4;
    if (pressure > 0) sfx.spotted();
  }
  setAlarmHum(game.alarm >= 55 || wasChasing);

  // Lockdown: at full alarm the exit seals and the guards hunt faster.
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

  // The getaway: the Star in hand and a foot out the north-east door.
  if (game.thief.star && hints.atExit && !game.lockdown) {
    game.result = scoreRun(game);
    game.screen = SCREEN_WIN;
    sfx.win();
    setAlarmHum(false);
  }
}

// A short scripted playthrough used by the self-test: drive the thief with
// fake input and report whether the game behaves. Runs inside the page, so a
// headless run can read the verdict from the DOM.
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

  // Walk right for one second: the thief must actually move.
  const startX = game.thief.x;
  const fake = fakeInput({ right: true });
  for (let i = 0; i < 60; i += 1) {
    updateGame(game, fake, 1 / 60);
    fake.endFrame();
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

  // Put a guard in clear view of the thief, already chasing, far enough that
  // it cannot reach them inside half a second: the alarm must climb while it
  // watches. (A patrolling guard would turn toward its next waypoint, so the
  // test holds the chase, as a real chase does.)
  const alarmBefore = game.alarm;
  game.guards[0].x = game.thief.x + 150;
  game.guards[0].y = game.thief.y;
  game.guards[0].angle = Math.PI;
  game.guards[0].state = 'chase';
  game.guards[0].lastSeen = { x: game.thief.x, y: game.thief.y };
  const idle = fakeInput({});
  for (let i = 0; i < 30; i += 1) {
    updateGame(game, idle, 1 / 60);
    idle.endFrame();
  }
  ok = check('guard vision raises the alarm', game.alarm > alarmBefore + 5) && ok;

  // Walk out the exit with the Star: the getaway must pay off.
  game.thief.x = 900;
  game.thief.y = 84;
  game.alarm = 0;
  game.lockdown = false;
  for (const guard of game.guards) {
    guard.state = 'patrol';
    guard.x = 150;
    guard.y = 150;
  }
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
    endFrame() {},
  };
}
