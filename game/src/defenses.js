// defenses.js — the gallery's electronic defenses: the three sweeping
// cameras and the two sliding laser beams that guard the vault mouth.
// Cameras raise the alarm when they see Rook; a laser trip raises it
// by 25 at once and calls every guard to the vault.

import { clearSight } from './mansion.js';
import { angDiff, angTo, dist } from './geom.js';
import { addFloater } from './rook.js';

export function makeDefenses(mansion) {
  return {
    cameras: mansion.cameras.map((c, i) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      base: c.base,
      sweep: c.sweep,
      range: c.range,
      half: c.half,
      angle: c.base,
      phase: i * 1.7,
    })),
  };
}

/** Whether the cameras are down right now (hacked terminal or EMP). */
export function camerasDown(world) {
  return world.camsOff > 0 || world.empTimer > 0;
}

/** Whether one camera sees Rook (cone, distance, line of sight). */
export function camSees(world, cam) {
  const rook = world.rook;
  if (rook.invuln > 0) return false;
  for (const c of rook.smokeClouds) {
    if (dist(cam.x, cam.y, c.x, c.y) < 70) return false;
  }
  const d = dist(cam.x, cam.y, rook.x, rook.y);
  if (d > cam.range) return false;
  if (Math.abs(angDiff(angTo(cam.x, cam.y, rook.x, rook.y), cam.angle)) > cam.half) return false;
  return clearSight(world.mansion, cam.x, cam.y, rook.x, rook.y);
}

/** The two laser beams' heights this frame (they slide across the corridor). */
export function laserBeams(world) {
  const l = world.mansion.lasers;
  const mid = (l.yTop + l.yBot) / 2;
  const amp = (l.yBot - l.yTop) / 2;
  return [mid + amp * Math.sin(l.phase), mid + amp * Math.sin(l.phase + Math.PI)];
}

export function stepDefenses(world, dt) {
  const l = world.mansion.lasers;
  l.phase += dt * 1.4;

  // Cameras sweep and watch.
  world.camSees = false;
  for (const cam of world.defenses.cameras) {
    cam.angle = cam.base + cam.sweep * Math.sin(world.time * 0.5 + cam.phase);
    if (!camerasDown(world) && camSees(world, cam)) {
      world.camSees = true;
      world.alarm = Math.min(100, world.alarm + 10 * dt);
    }
  }

  // Lasers: a touch trips the alarm and calls the guards to the vault.
  if (world.laserOff > 0 || world.laserCooldown > 0) return;
  const rook = world.rook;
  if (rook.x > l.x0 - 14 && rook.x < l.x1 + 14) {
    for (const by of laserBeams(world)) {
      if (Math.abs(rook.y - by) < 13) {
        l.tripped = true;
        world.alarm = Math.min(100, world.alarm + 25);
        world.callToVault = 6;
        world.laserCooldown = 1.5;
        world.tones.zap();
        world.shake = 0.3;
        addFloater(rook, rook.x, rook.y - 24, 'LASER TRIPPED! +25', '#ff6b5e');
        break;
      }
    }
  }
}
