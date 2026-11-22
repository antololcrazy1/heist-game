// The Gilded Hour v2 — the watchers: five patrolling guards, three sweeping
// cameras, and the laser gate in the vault. A watcher only raises the alarm
// while it can actually see Rook: inside its cone, in range, with a clear
// line of sight, and not hidden by smoke. The cone is always drawn, and a
// guard needs a beat of clear sight before it breaks into a chase, so being
// seen is fair — and the "?" above a guard's head tells you it is close.

import { ALARM, GUARD, GUARD_PATROLS, VISION } from './config.js';
import { clearSight, distance, angleDiff, angleTo, pointSegmentDistance, segmentThroughSmoke, slideCircle } from './geometry.js';
import { sightBlockers } from './level.js';

export function canSee(watcher, range, halfAngle, thief, level) {
  const dist = distance(watcher.x, watcher.y, thief.x, thief.y);
  const seenRange = thief.sneaking ? range * 0.55 : range;
  if (dist > seenRange) return false;
  const angle = angleTo(watcher.x, watcher.y, thief.x, thief.y);
  if (Math.abs(angleDiff(angle, watcher.angle)) > halfAngle) return false;
  if (!clearSight(watcher.x, watcher.y, thief.x, thief.y, sightBlockers(level))) return false;
  for (const smoke of level.smokes) {
    if (segmentThroughSmoke(watcher.x, watcher.y, thief.x, thief.y, smoke)) return false;
  }
  return true;
}

export function buildGuards() {
  return GUARD_PATROLS.map((patrol) => {
    const start = patrol.waypoints[0];
    return {
      name: patrol.name,
      x: start.x,
      y: start.y,
      angle: Math.PI / 2,
      speed: patrol.speed,
      waypoints: patrol.waypoints,
      waypointIndex: 1,
      state: 'patrol', // patrol | investigate | chase | search
      pauseTimer: 0,
      sweepPhase: 0,
      seen: 0,
      lastSeen: null,
      loseSightTimer: 0,
      searchTimer: 0,
      target: null,
      targetTimer: 0,
    };
  });
}

function walkToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const step = Math.min(dist, speed * dt);
  const next = slideCircle(guard.x, guard.y, GUARD.radius, (dx / dist) * step, (dy / dist) * step, sightBlockers(level));
  guard.x = next.x;
  guard.y = next.y;
  guard.angle = Math.atan2(dy, dx);
}

// One guard, one frame. Returns true while it is actively hunting Rook.
export function updateGuard(guard, dt, thief, level) {
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
    if (guard.seen > 0.55) {
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
      walkToward(guard, target.x, target.y, guard.speed, dt, level);
      const after = distance(guard.x, guard.y, target.x, target.y);
      if (after < 8 || after > before - 0.02) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = GUARD.waypointPause;
        guard.sweepPhase = 0;
      }
    }
  } else if (guard.state === 'investigate') {
    if (!guard.target) {
      guard.state = 'patrol';
    } else {
      walkToward(guard, guard.target.x, guard.target.y, GUARD.investigateSpeed, dt, level);
      guard.targetTimer -= dt;
      if (distance(guard.x, guard.y, guard.target.x, guard.target.y) < 24 || guard.targetTimer <= 0) {
        guard.target = null;
        guard.state = 'patrol';
        guard.pauseTimer = 1;
      }
    }
    if (guard.seen > 0.55) guard.state = 'chase';
  } else if (guard.state === 'chase') {
    const goal = guard.lastSeen || { x: thief.x, y: thief.y };
    walkToward(guard, goal.x, goal.y, GUARD.chaseSpeed, dt, level);
  } else if (guard.state === 'search') {
    guard.searchTimer -= dt;
    if (guard.lastSeen) {
      walkToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.investigateSpeed, dt, level);
    }
    guard.sweepPhase += dt;
    guard.angle += Math.sin(guard.sweepPhase * 2.2) * GUARD.sweepArc * dt * 1.6;
    if (guard.searchTimer <= 0) {
      guard.state = 'patrol';
      guard.lastSeen = null;
      guard.pauseTimer = 0.6;
    }
    if (guard.seen > 0.55) guard.state = 'chase';
  }

  return guard.state === 'chase';
}

// A coin clink pulls the nearest guards over to look. A loud noise (the
// vault drill, a laser trip) pulls every guard that is not already chasing.
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

export function pingGuards(guards, x, y) {
  for (const guard of guards) {
    if (guard.state === 'chase') continue;
    guard.target = { x, y };
    guard.targetTimer = 6;
  }
}

// Cameras sweep on their own clock. Returns true while any camera sees Rook.
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

// The laser gate: each beam slides up and down across the vault approach.
// Returns the beam Rook just tripped, or null. A tripped beam goes dark for
// three seconds so one crossing cannot chain-trip.
export function updateLasers(level, dt, thief, time) {
  let tripped = null;
  for (const beam of level.lasers) {
    beam.y = beam.baseY + Math.sin(time * beam.speed + beam.phase) * beam.amp;
    if (time < beam.cooldownUntil) continue;
    const gap = pointSegmentDistance(thief.x, thief.y, beam.x1, beam.y, beam.x2, beam.y);
    if (gap < 10) {
      beam.cooldownUntil = time + 3;
      tripped = beam;
    }
  }
  return tripped;
}

// How fast the alarm climbs this frame, from every watcher that sees Rook.
export function alarmPressure(guards, seenByCamera) {
  let pressure = 0;
  for (const guard of guards) {
    if (guard.seen > 0) pressure += ALARM.guardRise * Math.min(1, guard.seen * 2);
  }
  if (seenByCamera) pressure += ALARM.cameraRise;
  return pressure;
}
