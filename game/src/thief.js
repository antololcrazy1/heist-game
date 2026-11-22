// The Gilded Hour v2 — Rook. Moves with WASD or arrows (or the touch stick),
// sneaks with Shift, and holds E to work: lift the Star, pick the service
// door, crack the vault, hack the camera terminal. Q drops smoke, F fires
// the EMP, a click tosses a coin. Every tool costs a use, and every channel
// holds Rook still — moving breaks it.

import { CROWN, ENTRY, EXIT_DOOR, SERVICE_DOOR, STAR, TERMINAL, THIEF, TOOLS } from './config.js';
import { slideCircle } from './geometry.js';
import { solidRects } from './level.js';
import { distractGuards } from './watchers.js';
import { sfx } from './audio.js';

export function createThief() {
  return {
    x: ENTRY.x,
    y: ENTRY.y,
    angle: -Math.PI / 2,
    sneaking: false,
    moving: false,
    stepTimer: 0,
    channel: null, // { kind: 'star' | 'door' | 'vault' | 'terminal', done, need }
    smoke: TOOLS.smoke.start,
    emp: TOOLS.emp.start,
    coins: TOOLS.coin.start,
    star: false,
    crown: false,
    artifacts: 0,
    artifactNames: [],
    artifactValue: 0,
  };
}

function nearDoor(thief) {
  const cx = SERVICE_DOOR.x + SERVICE_DOOR.w / 2;
  const cy = SERVICE_DOOR.y + SERVICE_DOOR.h / 2;
  return Math.hypot(thief.x - cx, thief.y - cy) < 78;
}

function nearStar(thief) {
  return Math.hypot(thief.x - STAR.x, thief.y - STAR.y) < 62;
}

function nearCrown(thief) {
  return Math.hypot(thief.x - CROWN.x, thief.y - CROWN.y) < 58;
}

function nearTerminal(thief) {
  return Math.hypot(thief.x - TERMINAL.x, thief.y - TERMINAL.y) < TERMINAL.radius + 30;
}

function nearExit(thief) {
  return thief.x > EXIT_DOOR.x - 24 && thief.y > EXIT_DOOR.y - 6 && thief.y < EXIT_DOOR.y + EXIT_DOOR.h + 6;
}

export function updateThief(thief, input, dt, level, guards, time, events) {
  const move = input.moveVector();
  const length = Math.hypot(move.x, move.y);
  thief.sneaking = input.sneaking();
  thief.moving = length > 0;

  if (thief.channel && length > 0) {
    thief.channel = null;
    events.push({ type: 'channel-broken' });
  }

  if (length > 0) {
    const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    const nx = (move.x / length) * speed * dt;
    const ny = (move.y / length) * speed * dt;
    const next = slideCircle(thief.x, thief.y, THIEF.radius, nx, ny, solidRects(level));
    thief.x = next.x;
    thief.y = next.y;
    thief.angle = Math.atan2(ny, nx);
    thief.stepTimer -= dt;
    if (thief.stepTimer <= 0) {
      thief.stepTimer = thief.sneaking ? 0.55 : 0.34;
      sfx.step();
    }
  }

  // Holding E starts a channel at the nearest job: the Star, the Crown, the
  // service door, or the camera terminal. The vault drill is loud: starting
  // it raises the alarm and every guard turns toward the vault.
  if (input.interacting() && !thief.channel) {
    if (!level.starTaken && nearStar(thief)) {
      thief.channel = { kind: 'star', done: 0, need: TOOLS.grabSeconds };
    } else if (!level.crownTaken && nearCrown(thief)) {
      thief.channel = { kind: 'vault', done: 0, need: TOOLS.vaultSeconds };
      events.push({ type: 'vault-noise' });
      sfx.crack();
    } else if (!level.serviceDoorOpen && nearDoor(thief)) {
      thief.channel = { kind: 'door', done: 0, need: TOOLS.lockpickSeconds };
      sfx.lockpick();
    } else if (!level.terminalUsed && nearTerminal(thief)) {
      thief.channel = { kind: 'terminal', done: 0, need: TOOLS.terminalSeconds };
      sfx.hack();
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
        } else if (thief.channel.kind === 'vault') {
          level.crownTaken = true;
          thief.crown = true;
          events.push({ type: 'crown-taken' });
          sfx.crown();
        } else if (thief.channel.kind === 'door') {
          level.serviceDoorOpen = true;
          events.push({ type: 'door-opened' });
          sfx.doorOpen();
        } else if (thief.channel.kind === 'terminal') {
          level.terminalUsed = true;
          for (const camera of level.cameras) camera.offlineUntil = time + TOOLS.terminalOfflineSeconds;
          events.push({ type: 'terminal-hacked' });
          sfx.hack();
        }
        thief.channel = null;
      }
    }
  }

  // Q: smoke bomb at Rook's feet. F: EMP that blacks out the cameras.
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

  // Bonus artefacts are pocketed by walking over them.
  for (const item of level.artifacts) {
    if (!item.taken && Math.hypot(thief.x - item.x, thief.y - item.y) < 30) {
      item.taken = true;
      thief.artifacts += 1;
      thief.artifactNames.push(item.name);
      thief.artifactValue += item.value;
      events.push({ type: 'artifact-taken', name: item.name, value: item.value });
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
    nearCrown: !level.crownTaken && nearCrown(thief),
    nearDoor: !level.serviceDoorOpen && nearDoor(thief),
    nearTerminal: !level.terminalUsed && nearTerminal(thief),
  };
}
