// siren.js — the alarm, its five stages, lockdown, and the score.
// The alarm climbs when Rook is seen and falls when the gallery is calm.
// The score is the take: loot, a time bonus, a ghost bonus for staying
// quiet, and a clean-vault bonus for never tripping a laser.

export function alarmStage(v) {
  if (v >= 100) return 'LOCKDOWN';
  if (v >= 85) return 'CRITICAL';
  if (v >= 60) return 'HUNTED';
  if (v >= 30) return 'WARY';
  return 'CALM';
}

export function stepAlarm(world, dt) {
  if (!world.anySees && !world.camSees) {
    world.alarm = Math.max(0, world.alarm - 1.5 * dt);
  }
  if (world.alarm >= 100 && world.lockdownT <= 0) {
    world.lockdownT = 8;
    world.banner = 'LOCKDOWN — THE EXIT IS SEALED';
    world.bannerT = 3;
    world.tones.alarmTick();
  }
  if (world.lockdownT > 0) {
    world.lockdownT -= dt;
    world.alarm = 100;
    if (world.lockdownT <= 0) world.alarm = 85;
  }
  world.maxAlarm = Math.max(world.maxAlarm, world.alarm);
}

/** The full score breakdown for the win screen (and the rank). */
export function scoreOf(world) {
  const r = world.rook;
  const star = r.starTaken ? 5000 : 0;
  const crown = r.crownTaken ? 8000 : 0;
  const arts = r.artifactValue;
  const elapsed = Math.max(0, Math.floor(world.time - world.startTime));
  const timeBonus = Math.max(0, 3000 - 10 * elapsed);
  const ghost = world.maxAlarm <= 50 ? 1500 : 0;
  const clean = r.crownTaken && !world.mansion.lasers.tripped ? 1000 : 0;
  const total = star + crown + arts + timeBonus + ghost + clean;
  const rank =
    total >= 16000
      ? 'GHOST LEGEND'
      : total >= 12000
        ? 'MASTER THIEF'
        : total >= 9000
          ? 'CLEAN GETAWAY'
          : total >= 6000
            ? 'SMOOTH OPERATOR'
            : 'LOUD BUT RICH';
  return {
    star,
    crown,
    arts,
    artCount: r.artifactsTaken,
    timeBonus,
    elapsed,
    ghost,
    clean,
    total,
    rank,
  };
}
