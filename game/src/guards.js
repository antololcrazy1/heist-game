// The Gilded Hour — the people and machines watching the gallery: patrolling
// guards with vision cones and sweeping wall cameras. A watcher only raises
// the alarm while it can actually see the thief: inside its cone, in range,
// with a clear line of sight, and not hidden by smoke. Being seen is fair:
// the cone is always drawn, and a guard needs a beat of clear sight before
// it breaks into a chase.

import { ALARM, GUARD, GUARD_PATROLS, VISION } from './config.js';
import { hasLineOfSight, moveCircle, segmentThroughSmoke } from './level.js';

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Can this watcher see the thief right now? Smoke between them blinds it.
export function canSee(watcher, range, halfAngle, thief, level) {
  const dist = distance(watcher.x, watcher.y, thief.x, thief.y);
  const seenRange = thief.sneaking ? range * 0.55 : range;
  if (dist > seenRange) return false;
  const angle = angleTo(watcher.x, watcher.y, thief.x, thief.y);
  if (Math.abs(angleDifference(angle, watcher.angle)) > halfAngle) return false;
  if (!hasLineOfSight(watcher.x, watcher.y, thief.x, thief.y, level)) return false;
  for (const smoke of level.smokes) {
    if (segmentThroughSmoke(watcher.x, watcher.y, thief.x, thief.y, smoke)) return false;
  }
  return true;
}

export function createGuards() {
  return GUARD_PATROLS.map((patrol) => {
    const start = patrol.waypoints[0];
    return {
      name: patrol.name,
      x: start.x,
      y: start.y,
      angle: Math.PI / 2,
      waypoints: patrol.waypoints,
      waypointIndex: 1,
      state: 'patrol', // patrol | investigate | chase | search
      pauseTimer: 0,
      sweepPhase: 0,
      seen: 0, // seconds of clear sight accumulated
      lastSeen: null,
      loseSightTimer: 0,
      searchTimer: 0,
      target: null, // a coin or a noise to investigate
      targetTimer: 0,
    };
  });
}

function moveToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const step = Math.min(dist, speed * dt);
  const next = moveCircle(guard.x, guard.y, GUARD.radius, (dx / dist) * step, (dy / dist) * step, level);
  guard.x = next.x;
  guard.y = next.y;
  guard.angle = Math.atan2(dy, dx);
}

// One guard, one frame. Returns 'chase' while it is actively hunting, which
// the game uses for the tension in the HUD and the alarm hum.
export function updateGuard(guard, dt, thief, level, time) {
  // A parked guard is a frozen watcher for a staged shot: it holds its cone
  // and never sees, chases or moves.
  if (guard.parked) return false;
  const sees = canSee(guard, VISION.guardRange, VISION.guardHalfAngle, thief, level);
  if (sees) {
    guard.seen = Math.min(VISION.spottedAt, guard.seen + VISION.guardSeeRate * dt);
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.loseSightTimer = 0;
  } else {
    guard.seen = Math.max(0, guard.seen - dt * 0.8);
    if (guard.state === 'chase') {
      guard.loseSightTimer += dt;
      if (guard.loseSightTimer > GUARD.loseSightAfter) {
        guard.state = 'search';
        guard.searchTimer = GUARD.searchSeconds;
      }
    }
  }

  if (guard.state === 'patrol') {
    if (guard.seen >= GUARD.chaseAfter * VISION.guardSeeRate * 0.4 && guard.seen > 0.35) {
      guard.state = 'chase';
    } else if (guard.target) {
      guard.state = 'investigate';
    } else if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      guard.sweepPhase += dt;
      guard.angle += Math.sin(guard.sweepPhase * 2.4) * GUARD.sweepArc * dt * 1.4;
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      const before = distance(guard.x, guard.y, target.x, target.y);
      moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, level);
      const after = distance(guard.x, guard.y, target.x, target.y);
      // Arrived, or stuck against something: move on to the next waypoint.
      if (after < 8 || after > before - 0.02) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = GUARD.waypointPause;
        guard.sweepPhase = 0;
      }
    }
  } else if (guard.state === 'investigate') {
    const target = guard.target;
    if (!target) {
      guard.state = 'patrol';
    } else {
      moveToward(guard, target.x, target.y, GUARD.investigateSpeed, dt, level);
      guard.targetTimer -= dt;
      if (distance(guard.x, guard.y, target.x, target.y) < 24 || guard.targetTimer <= 0) {
        guard.target = null;
        guard.state = 'patrol';
        guard.pauseTimer = 1;
      }
    }
    if (guard.seen > 0.35) guard.state = 'chase';
  } else if (guard.state === 'chase') {
    const goal = guard.lastSeen || { x: thief.x, y: thief.y };
    moveToward(guard, goal.x, goal.y, GUARD.chaseSpeed, dt, level);
  } else if (guard.state === 'search') {
    guard.searchTimer -= dt;
    if (guard.lastSeen) {
      moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.investigateSpeed, dt, level);
    }
    guard.sweepPhase += dt;
    guard.angle += Math.sin(guard.sweepPhase * 2.2) * GUARD.sweepArc * dt * 1.6;
    if (guard.searchTimer <= 0) {
      guard.state = 'patrol';
      guard.lastSeen = null;
      guard.pauseTimer = 0.6;
    }
    if (guard.seen > 0.35) guard.state = 'chase';
  }

  return guard.state === 'chase';
}

// A coin clink or a loud noise pulls the nearest guards to look at a spot.
export function distractGuards(guards, x, y, radius) {
  let pulled = 0;
  for (const guard of guards) {
    if (guard.state === 'chase') continue;
    if (distance(guard.x, guard.y, x, y) < radius) {
      guard.target = { x, y };
      guard.targetTimer = 4;
      pulled += 1;
    }
  }
  return pulled;
}

// Cameras sweep on their own clock. Returns true while any camera sees the thief.
export function updateCameras(level, dt, thief, time) {
  let seenByCamera = false;
  for (const camera of level.cameras) {
    if (time < camera.offlineUntil) continue;
    camera.angle = camera.baseAngle + Math.sin(time * camera.speed) * camera.sweep;
    if (canSee(camera, VISION.cameraRange, VISION.cameraHalfAngle, thief, level)) {
      seenByCamera = true;
    }
  }
  return seenByCamera;
}

// How fast the alarm climbs this frame, from every watcher that sees the thief.
export function alarmPressure(guards, seenByCamera) {
  let pressure = 0;
  for (const guard of guards) {
    if (guard.seen > 0) pressure += ALARM.guardRise * Math.min(1, guard.seen * 2);
  }
  if (seenByCamera) pressure += ALARM.cameraRise;
  return pressure;
}
