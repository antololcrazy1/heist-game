// rook.js — Rook, the thief. Movement, sneaking, tools and every
// interaction with the gallery (loot, terminal, the locked door).
// It never decides what the guards do; it only moves and acts.

import { moveCircle } from './mansion.js';
import { clamp, dist } from './geom.js';

export function makeRook(mansion) {
  return {
    x: mansion.rookStart.x,
    y: mansion.rookStart.y,
    r: 13,
    facing: 0,
    moving: false,
    sneaking: false,
    nerves: 3,
    invuln: 0,
    smoke: 2,
    emp: 2,
    coins: 3,
    loot: 0,
    artifactValue: 0,
    artifactsTaken: 0,
    starTaken: false,
    crownTaken: false,
    smokeClouds: [],
    coinDrops: [],
    floaters: [],
    stepAcc: 0,
  };
}

/** A floating "+$900" style note that rises and fades. */
export function addFloater(rook, x, y, text, color) {
  rook.floaters.push({ x, y, text, color: color || '#f2c14e', t: 0 });
  if (rook.floaters.length > 12) rook.floaters.shift();
}

/**
 * One frame of the thief. input is {x, y, sneak, holdE} with x/y a
 * normalized move vector. Holding E works the terminal and the lockpick.
 */
export function stepRook(world, dt, input) {
  const rook = world.rook;
  const mansion = world.mansion;

  if (rook.invuln > 0) rook.invuln -= dt;
  for (const c of rook.smokeClouds) c.t -= dt;
  rook.smokeClouds = rook.smokeClouds.filter((c) => c.t > 0);
  for (const c of rook.coinDrops) c.t -= dt;
  rook.coinDrops = rook.coinDrops.filter((c) => c.t > 0);
  for (const f of rook.floaters) f.t += dt;
  rook.floaters = rook.floaters.filter((f) => f.t < 1.4);

  const speed = input.sneak ? 85 : 165;
  rook.sneaking = !!input.sneak;
  const len = Math.hypot(input.x, input.y);
  rook.moving = len > 0.05;
  if (rook.moving) {
    const nx = input.x / (len || 1);
    const ny = input.y / (len || 1);
    rook.facing = Math.atan2(ny, nx);
    const [px, py] = moveCircle(mansion, rook.x, rook.y, nx * speed * dt, ny * speed * dt, rook.r);
    rook.x = clamp(px, 12, 948);
    rook.y = clamp(py, 12, 644);
    rook.stepAcc += dt;
    if (rook.stepAcc > 0.34) {
      rook.stepAcc = 0;
      world.tones.step();
    }
  }

  // Hold-E work: the camera terminal and the locked east door.
  const nearTerminal = !mansion.terminal.used && dist(rook.x, rook.y, mansion.terminal.x, mansion.terminal.y) < 46;
  const nearDoor = mansion.eastDoor.locked && dist(rook.x, rook.y, 640, 330) < 48;
  if (input.holdE && (nearTerminal || nearDoor)) {
    const rate = dt / 2;
    if (nearTerminal) {
      mansion.terminal.progress += rate;
      if (mansion.terminal.progress >= 1) {
        mansion.terminal.used = true;
        mansion.terminal.progress = 0;
        world.camsOff = 20;
        world.tones.hack();
        addFloater(rook, rook.x, rook.y - 24, 'CAMERAS DOWN 20s', '#7fe3a8');
      }
    } else {
      mansion.eastDoor.pick += rate;
      if (mansion.eastDoor.pick >= 1) {
        mansion.eastDoor.locked = false;
        mansion.eastDoor.pick = 0;
        world.tones.hack();
        addFloater(rook, rook.x, rook.y - 24, 'DOOR OPEN', '#7fe3a8');
      }
    }
  } else {
    mansion.terminal.progress = 0;
    mansion.eastDoor.pick = 0;
  }
}

/** What the hold-E prompt should say right now, or null. */
export function interactPrompt(world) {
  const rook = world.rook;
  const mansion = world.mansion;
  if (!mansion.terminal.used && dist(rook.x, rook.y, mansion.terminal.x, mansion.terminal.y) < 46) {
    return { text: 'HOLD E — HACK CAMERAS', progress: mansion.terminal.progress };
  }
  if (mansion.eastDoor.locked && dist(rook.x, rook.y, 640, 330) < 48) {
    return { text: 'HOLD E — LOCKPICK (2s)', progress: mansion.eastDoor.pick };
  }
  return null;
}

/** E pressed once: grab whatever loot is in reach. Returns true when taken. */
export function pressInteract(world) {
  const rook = world.rook;
  const mansion = world.mansion;
  if (!mansion.star.taken && dist(rook.x, rook.y, mansion.star.x, mansion.star.y) < 40) {
    mansion.star.taken = true;
    rook.starTaken = true;
    rook.loot += 5000;
    world.tones.pickup();
    addFloater(rook, mansion.star.x, mansion.star.y - 20, 'AURORA STAR +$5,000', '#ffe9a8');
    return true;
  }
  if (!mansion.crown.taken && dist(rook.x, rook.y, mansion.crown.x, mansion.crown.y) < 40) {
    mansion.crown.taken = true;
    rook.crownTaken = true;
    rook.loot += 8000;
    world.tones.pickup();
    addFloater(rook, mansion.crown.x, mansion.crown.y - 20, 'GILDED CROWN +$8,000', '#ffe9a8');
    return true;
  }
  for (const a of mansion.artifacts) {
    if (!a.taken && dist(rook.x, rook.y, a.x, a.y) < 38) {
      a.taken = true;
      rook.artifactsTaken++;
      rook.artifactValue += a.value;
      rook.loot += a.value;
      world.tones.pickup();
      addFloater(rook, a.x, a.y - 20, `${a.name} +$${a.value.toLocaleString('en-US')}`, '#f2c14e');
      return true;
    }
  }
  return false;
}

/** F: throw a smoke cloud at Rook's feet. */
export function useSmoke(world) {
  const rook = world.rook;
  if (rook.smoke <= 0) return false;
  rook.smoke--;
  rook.smokeClouds.push({ x: rook.x, y: rook.y, t: 6 });
  world.tones.smoke();
  addFloater(rook, rook.x, rook.y - 24, 'SMOKE', '#cfd6e4');
  return true;
}

/** Q: EMP burst — cameras and lasers down for a while. */
export function useEmp(world) {
  const rook = world.rook;
  if (rook.emp <= 0) return false;
  rook.emp--;
  world.empTimer = 12;
  world.laserOff = 8;
  world.tones.emp();
  addFloater(rook, rook.x, rook.y - 24, 'EMP — EYES DOWN', '#7fe3a8');
  return true;
}

/** Space: toss a coin ahead; nearby guards go look at it. */
export function useCoin(world) {
  const rook = world.rook;
  if (rook.coins <= 0) return false;
  rook.coins--;
  const cx = clamp(rook.x + Math.cos(rook.facing) * 70, 20, 940);
  const cy = clamp(rook.y + Math.sin(rook.facing) * 70, 20, 636);
  rook.coinDrops.push({ x: cx, y: cy, t: 4 });
  world.tones.coin();
  return true;
}

/** A guard caught Rook: lose a nerve, restart at the west door, keep the loot. */
export function catchRook(world) {
  const rook = world.rook;
  rook.nerves--;
  world.tones.caught();
  world.banner = 'CAUGHT! — BACK TO THE DOOR';
  world.bannerT = 2.2;
  world.shake = 0.35;
  if (rook.nerves <= 0) {
    world.state = 'lost';
    world.tones.lose();
    return;
  }
  rook.x = world.mansion.rookStart.x;
  rook.y = world.mansion.rookStart.y;
  rook.invuln = 2.5;
  rook.smokeClouds = [];
  world.alarm = Math.min(100, world.alarm + 10);
  for (const g of world.guards) {
    g.state = 'patrol';
    g.suspicion = 0;
    g.lastSeen = null;
  }
}
