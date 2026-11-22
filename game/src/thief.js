// The Gilded Hour — the thief. Rook moves with WASD or arrows, sneaks with
// Shift, grabs loot and picks locks by holding E, drops smoke with Q, fires
// the EMP with F, and tosses a coin with a mouse click. Every tool costs a
// use, so the player has to choose where to spend them.

import { ENTRY, EXIT_DOOR, SERVICE_DOOR, STAR, THIEF, TOOLS } from './config.js';
import { moveCircle } from './level.js';
import { distractGuards } from './guards.js';
import { sfx } from './audio.js';

export function createThief() {
  return {
    x: ENTRY.x,
    y: ENTRY.y,
    angle: -Math.PI / 2,
    sneaking: false,
    moving: false,
    stepTimer: 0,
    // Channel timers: grabbing the Star, picking the service door.
    channel: null, // { kind: 'star' | 'door', done: seconds, need: seconds }
    smoke: TOOLS.smoke.start,
    emp: TOOLS.emp.start,
    coins: TOOLS.coin.start,
    star: false,
    artifacts: 0,
    artifactNames: [],
  };
}

function nearDoor(thief) {
  const door = SERVICE_DOOR;
  const cx = door.x + door.w / 2;
  const cy = door.y + door.h / 2;
  return Math.hypot(thief.x - cx, thief.y - cy) < 78;
}

function nearStar(thief) {
  return Math.hypot(thief.x - STAR.x, thief.y - STAR.y) < 62;
}

function nearExit(thief) {
  return (
    thief.x > EXIT_DOOR.x - 6 &&
    thief.x < EXIT_DOOR.x + EXIT_DOOR.w + 6 &&
    thief.y < EXIT_DOOR.y + 30
  );
}

export function updateThief(thief, input, dt, level, guards, time, events) {
  const move = input.moveVector();
  const length = Math.hypot(move.x, move.y);
  thief.sneaking = input.sneaking();
  thief.moving = length > 0;

  // A channel (grab / lockpick) holds the thief still; moving breaks it.
  if (thief.channel && length > 0) {
    thief.channel = null;
    events.push({ type: 'channel-broken' });
  }

  if (length > 0) {
    const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    const nx = (move.x / length) * speed * dt;
    const ny = (move.y / length) * speed * dt;
    const next = moveCircle(thief.x, thief.y, THIEF.radius, nx, ny, level);
    thief.x = next.x;
    thief.y = next.y;
    thief.angle = Math.atan2(ny, nx);
    thief.stepTimer -= dt;
    if (thief.stepTimer <= 0) {
      thief.stepTimer = thief.sneaking ? 0.55 : 0.34;
      sfx.step();
    }
  }

  // Holding E near the Star grabs it; near the shut service door picks it.
  if (input.interacting() && !thief.channel) {
    if (!level.starTaken && nearStar(thief)) {
      thief.channel = { kind: 'star', done: 0, need: TOOLS.grabSeconds };
    } else if (!level.serviceDoorOpen && nearDoor(thief)) {
      thief.channel = { kind: 'door', done: 0, need: TOOLS.lockpickSeconds };
      sfx.lockpick();
    }
  }
  if (thief.channel) {
    if (!input.interacting()) {
      thief.channel = null;
      events.push({ type: 'channel-broken' });
    } else {
      thief.channel.done += dt;
      if (thief.channel.done >= thief.channel.need) {
        if (thief.channel.kind === 'star') {
          level.starTaken = true;
          thief.star = true;
          events.push({ type: 'star-taken' });
          sfx.star();
        } else {
          level.serviceDoorOpen = true;
          events.push({ type: 'door-opened' });
          sfx.doorOpen();
        }
        thief.channel = null;
      }
    }
  }

  // Q: smoke bomb at the thief's feet. F: EMP that blacks out the cameras.
  if (input.wasPressed('KeyQ')) {
    if (thief.smoke > 0) {
      thief.smoke -= 1;
      level.smokes.push({ x: thief.x, y: thief.y, radius: TOOLS.smoke.radius, left: TOOLS.smoke.seconds });
      events.push({ type: 'smoke' });
      sfx.smoke();
    } else {
      sfx.denied();
    }
  }
  if (input.wasPressed('KeyF')) {
    if (thief.emp > 0) {
      thief.emp -= 1;
      for (const camera of level.cameras) camera.offlineUntil = time + TOOLS.emp.seconds;
      events.push({ type: 'emp' });
      sfx.emp();
    } else {
      sfx.denied();
    }
  }

  // A mouse click tosses a coin there. The clink pulls nearby guards over.
  const click = input.mouseClick();
  if (click) {
    const dist = Math.hypot(click.x - thief.x, click.y - thief.y);
    if (thief.coins > 0 && dist <= TOOLS.coin.throwRange) {
      thief.coins -= 1;
      level.coins.push({ x: click.x, y: click.y, left: 6, rung: false });
      events.push({ type: 'coin-thrown', x: click.x, y: click.y });
      sfx.coin();
    } else {
      sfx.denied();
    }
  }

  // Coins ring once when they land, then keep luring for a few seconds.
  for (const coin of level.coins) {
    if (!coin.rung) {
      coin.rung = true;
      distractGuards(guards, coin.x, coin.y, TOOLS.coin.lureRadius);
      sfx.clink();
    }
  }

  // Bonus artefacts are picked up by walking over them.
  for (const item of level.artifacts) {
    if (!item.taken && Math.hypot(thief.x - item.x, thief.y - item.y) < 30) {
      item.taken = true;
      thief.artifacts += 1;
      thief.artifactNames.push(item.name);
      events.push({ type: 'artifact-taken', name: item.name });
      sfx.pickup();
    }
  }

  // Smoke fades; coins stop ringing after a while.
  for (const smoke of level.smokes) smoke.left -= dt;
  level.smokes = level.smokes.filter((smoke) => smoke.left > 0);
  for (const coin of level.coins) coin.left -= dt;
  level.coins = level.coins.filter((coin) => coin.left > 0);

  return {
    atExit: nearExit(thief),
    nearStar: !level.starTaken && nearStar(thief),
    nearDoor: !level.serviceDoorOpen && nearDoor(thief),
  };
}
