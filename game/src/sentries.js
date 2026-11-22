// sentries.js — the five guards. Each one walks a route, grows suspicious
// when Rook crosses its vision cone, chases when it is sure, and searches
// the last place it saw Rook when the trail goes cold.

import { moveCircle, clearSight } from './mansion.js';
import { angDiff, angTo, clamp, dist } from './geom.js';
import { catchRook } from './rook.js';

const CONE_RANGE = 190;
const CONE_HALF = 0.55;

export function makeSentries(mansion) {
  return Object.entries(mansion.routes).map(([name, pts]) => ({
    name,
    pts,
    wp: 1,
    x: pts[0][0],
    y: pts[0][1],
    angle: 0,
    state: 'patrol',
    suspicion: 0,
    lastSeen: null,
    loseT: 0,
    searchT: 0,
    wander: null,
    coinTarget: null,
    coinT: 0,
    r: 13,
  }));
}

/** Whether this guard can see Rook right now (cone, distance, line of sight). */
export function guardSees(world, g) {
  const rook = world.rook;
  if (rook.invuln > 0) return false;
  for (const c of rook.smokeClouds) {
    if (dist(g.x, g.y, c.x, c.y) < 70) return false;
  }
  const d = dist(g.x, g.y, rook.x, rook.y);
  if (d > CONE_RANGE) return false;
  if (Math.abs(angDiff(angTo(g.x, g.y, rook.x, rook.y), g.angle)) > CONE_HALF) return false;
  return clearSight(world.mansion, g.x, g.y, rook.x, rook.y);
}

function walkTo(world, g, tx, ty, speed, dt) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 4) return true;
  const vx = ((tx - g.x) / d) * speed * dt;
  const vy = ((ty - g.y) / d) * speed * dt;
  const [nx, ny] = moveCircle(world.mansion, g.x, g.y, vx, vy, g.r);
  g.angle = angTo(g.x, g.y, nx, ny);
  g.x = clamp(nx, 12, world.mansion.w - 12);
  g.y = clamp(ny, 12, world.mansion.h - 12);
  return d < 8;
}

export function stepSentries(world, dt) {
  const rook = world.rook;
  // The level turns the screws: faster guards, sharper senses.
  const gs = world.levelCfg ? world.levelCfg.guardSpeed : 1;
  const ar = world.levelCfg ? world.levelCfg.alarmRate : 1;
  for (const g of world.guards) {
    const sees = guardSees(world, g);
    const d = dist(g.x, g.y, rook.x, rook.y);

    // A thrown coin pulls a patrolling guard over to look.
    if (g.state === 'patrol' || g.state === 'suspicious') {
      for (const c of rook.coinDrops) {
        if (dist(g.x, g.y, c.x, c.y) < 260) {
          g.coinTarget = c;
          g.coinT = 3;
          g.state = 'search';
          g.searchT = 3;
          break;
        }
      }
    }

    if (sees) {
      let rate = d < 120 ? 55 : 30;
      if (rook.sneaking) rate *= 0.5;
      else if (rook.moving) rate *= 1.5;
      g.suspicion = Math.min(100, g.suspicion + rate * ar * dt);
      // Being watched is itself loud: the alarm climbs while a guard sees Rook.
      world.alarm = Math.min(100, world.alarm + 3 * ar * dt);
      g.lastSeen = { x: rook.x, y: rook.y };
      g.loseT = 0;
      if (g.suspicion >= 100 && g.state !== 'chase') {
        g.state = 'chase';
        world.tones.spotted();
        if (!world.bannerT) {
          world.banner = 'SPOTTED! — BREAK LINE OF SIGHT';
          world.bannerT = 2;
        }
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - 25 * dt);
      if (g.state === 'chase') {
        g.loseT += dt;
        if (g.loseT > 3) {
          g.state = 'search';
          g.searchT = 4;
        }
      } else if (g.state === 'suspicious' && g.suspicion < 20) {
        g.state = 'patrol';
      }
    }

    // During lockdown every guard hunts Rook's position.
    if (world.lockdownT > 0) {
      g.state = 'chase';
      g.lastSeen = { x: rook.x, y: rook.y };
    }

    if (g.state === 'patrol') {
      if (world.callToVault > 0) {
        walkTo(world, g, 845, 230, 90 * gs, dt);
      } else {
        const target = g.pts[g.wp];
        if (walkTo(world, g, target[0], target[1], 55 * gs, dt)) {
          g.wp = (g.wp + 1) % g.pts.length;
        }
      }
    } else if (g.state === 'suspicious') {
      if (g.lastSeen) walkTo(world, g, g.lastSeen.x, g.lastSeen.y, 75 * gs, dt);
    } else if (g.state === 'chase') {
      const tx = g.lastSeen ? g.lastSeen.x : rook.x;
      const ty = g.lastSeen ? g.lastSeen.y : rook.y;
      walkTo(world, g, tx, ty, 125 * gs, dt);
      if (d < 24 && rook.invuln <= 0) {
        catchRook(world);
        return;
      }
    } else if (g.state === 'search') {
      g.searchT -= dt;
      if (g.coinTarget && g.coinT > 0) {
        g.coinT -= dt;
        walkTo(world, g, g.coinTarget.x, g.coinTarget.y, 80 * gs, dt);
        if (g.coinT <= 0) g.coinTarget = null;
      } else if (g.lastSeen) {
        if (walkTo(world, g, g.lastSeen.x, g.lastSeen.y, 60 * gs, dt) && !g.wander) {
          g.wander = {
            x: clamp(g.lastSeen.x + (Math.random() * 200 - 100), 20, world.mansion.w - 20),
            y: clamp(g.lastSeen.y + (Math.random() * 200 - 100), 20, world.mansion.h - 20),
          };
        }
        if (g.wander) walkTo(world, g, g.wander.x, g.wander.y, 60 * gs, dt);
      }
      if (g.searchT <= 0) {
        g.state = 'patrol';
        g.wander = null;
        g.suspicion = 0;
      }
    }

    // A guard that only half-saw Rook hovers in "suspicious".
    if (g.state === 'patrol' && g.suspicion >= 35) g.state = 'suspicious';
  }
}
