// canvas.js — everything the player sees: the gallery in warm golden-hour
// light, the guards' vision cones, the loot, the dense HUD, the minimap,
// the banners and the title / win / lose screens. It reads the world and
// never changes it.

import { alarmStage, scoreOf } from './siren.js';
import { laserBeams, camerasDown } from './defenses.js';
import { interactPrompt } from './rook.js';
import { clamp } from './geom.js';

const HUD_H = 64;
const GOLD = '#f2c14e';
const GOLD_DIM = '#8a6d2f';
const TEAL = '#4de3c2';

/** Deterministic dust motes (fixed positions, twinkle with time). */
const MOTES = [];
{
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 46; i++) MOTES.push({ x: rnd() * 960, y: rnd() * 656, r: 0.8 + rnd() * 1.6, p: rnd() * 6.28 });
}

function conePath(ctx, x, y, angle, half, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
}

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US');
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function drawCone(ctx, x, y, angle, half, range, fill, stroke) {
  conePath(ctx, x, y, angle, half, range);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawLootLabel(ctx, x, y, text) {
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c878';
  ctx.fillText(text, x, y);
}

export function drawWorld(ctx, world) {
  const W = 960;
  const H = 720;
  const mansion = world.mansion;
  const rook = world.rook;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e0b18';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake * 22, (Math.random() - 0.5) * world.shake * 22);
  }
  ctx.translate(0, HUD_H);

  // --- floor: dark marble tiles ---
  ctx.fillStyle = '#171226';
  ctx.fillRect(0, 0, 960, 656);
  ctx.strokeStyle = 'rgba(216,168,78,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 960; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 656);
    ctx.stroke();
  }
  for (let y = 0; y <= 656; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }
  // Warm golden-hour wash from the top.
  const wash = ctx.createLinearGradient(0, 0, 0, 656);
  wash.addColorStop(0, 'rgba(255,190,90,0.10)');
  wash.addColorStop(0.5, 'rgba(255,190,90,0.03)');
  wash.addColorStop(1, 'rgba(20,12,40,0.12)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 960, 656);

  // --- carpet runner through the central hall ---
  ctx.fillStyle = '#4d1822';
  ctx.fillRect(mansion.carpet.x, mansion.carpet.y, mansion.carpet.w, mansion.carpet.h);
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mansion.carpet.x, mansion.carpet.y, mansion.carpet.w, mansion.carpet.h);

  // --- chandelier light pools ---
  for (const ch of mansion.chandeliers) {
    const g = ctx.createRadialGradient(ch.x, ch.y, 4, ch.x, ch.y, 120);
    g.addColorStop(0, 'rgba(255,205,110,0.16)');
    g.addColorStop(1, 'rgba(255,205,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ch.x, ch.y, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(ch.x, ch.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- dust motes ---
  for (const m of MOTES) {
    const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(world.time * 0.7 + m.p));
    ctx.fillStyle = `rgba(255,220,150,${tw.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y + Math.sin(world.time * 0.3 + m.p) * 3, m.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- furniture ---
  for (const f of mansion.furniture) {
    if (f.kind === 'case') {
      ctx.fillStyle = 'rgba(20,16,32,0.9)';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = f.tint;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(f.x + 6, f.y + 6, f.w - 12, f.h - 12);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = GOLD_DIM;
      ctx.lineWidth = 2;
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(f.x + 8, f.y + 8, f.w - 16, 8);
    } else if (f.kind === 'bench') {
      ctx.fillStyle = '#8a2f35';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.strokeStyle = GOLD_DIM;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(f.x, f.y, f.w, f.h);
    } else {
      ctx.fillStyle = '#22442a';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = f.tint;
      ctx.beginPath();
      ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- vault pocket: gold frame, dark inside ---
  const v = mansion.vault;
  ctx.fillStyle = 'rgba(8,6,16,0.85)';
  ctx.fillRect(v.x, v.y, v.w, v.h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(v.x, v.y, v.w, v.h);

  // --- walls ---
  for (const w of mansion.walls) {
    ctx.fillStyle = '#2e2440';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = GOLD_DIM;
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }

  // --- east door (locked: gold bars; open: dark gap) ---
  const door = mansion.eastDoor;
  if (door.locked) {
    ctx.fillStyle = '#3a2c14';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(door.x, door.y, door.w, door.h);
    ctx.fillStyle = GOLD;
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(door.x + 8, 330);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('LOCKED - HOLD E', 0, 4);
    ctx.restore();
  }

  // --- exit: green glow in the east wall gap ---
  const ez = mansion.exitZone;
  const eg = ctx.createRadialGradient(ez.x + 13, ez.y + 30, 2, ez.x + 13, ez.y + 30, 46);
  eg.addColorStop(0, 'rgba(127,227,168,0.35)');
  eg.addColorStop(1, 'rgba(127,227,168,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(ez.x - 30, ez.y - 16, 86, 92);
  ctx.fillStyle = '#7fe3a8';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ez.x + 2, ez.y + 34);

  // --- camera terminal ---
  const term = mansion.terminal;
  ctx.fillStyle = '#12333a';
  ctx.fillRect(term.x - 18, term.y - 12, 36, 24);
  ctx.strokeStyle = term.used ? '#555' : '#59d8e8';
  ctx.lineWidth = 2;
  ctx.strokeRect(term.x - 18, term.y - 12, 36, 24);
  ctx.fillStyle = term.used ? '#777' : '#59d8e8';
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAM', term.x, term.y + 3);
  if (!term.used) {
    ctx.fillStyle = '#9fd8e8';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillText('CAM TERMINAL - HOLD E', term.x, term.y + 34);
  }

  // --- laser beams across the vault approach ---
  const beams = laserBeams(world);
  const lasersOff = world.laserOff > 0;
  for (const by of beams) {
    ctx.strokeStyle = lasersOff ? 'rgba(255,80,70,0.18)' : '#ff3b30';
    ctx.lineWidth = lasersOff ? 2 : 4;
    ctx.beginPath();
    ctx.moveTo(mansion.lasers.x0, by);
    ctx.lineTo(mansion.lasers.x1, by);
    ctx.stroke();
    if (!lasersOff) {
      ctx.strokeStyle = 'rgba(255,80,70,0.35)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(mansion.lasers.x0, by);
      ctx.lineTo(mansion.lasers.x1, by);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff6b5e';
    ctx.beginPath();
    ctx.arc(mansion.lasers.x0, by, 3, 0, Math.PI * 2);
    ctx.arc(mansion.lasers.x1, by, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- loot: star, crown, artifacts ---
  const tw = 0.6 + 0.4 * Math.sin(world.time * 3);
  if (!mansion.star.taken) {
    const sg = ctx.createRadialGradient(mansion.star.x, mansion.star.y, 2, mansion.star.x, mansion.star.y, 46);
    sg.addColorStop(0, `rgba(255,233,168,${(0.5 * tw).toFixed(3)})`);
    sg.addColorStop(1, 'rgba(255,233,168,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(mansion.star.x, mansion.star.y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(mansion.star.x, mansion.star.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = '#8a6d2f';
    ctx.fillRect(mansion.star.x - 16, mansion.star.y + 16, 32, 8);
    drawLootLabel(ctx, mansion.star.x, mansion.star.y + 38, 'AURORA STAR');
  }
  if (!mansion.crown.taken) {
    ctx.fillStyle = '#ffe9a8';
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mansion.crown.x - 14, mansion.crown.y + 8);
    ctx.lineTo(mansion.crown.x - 14, mansion.crown.y - 6);
    ctx.lineTo(mansion.crown.x - 7, mansion.crown.y + 2);
    ctx.lineTo(mansion.crown.x, mansion.crown.y - 10);
    ctx.lineTo(mansion.crown.x + 7, mansion.crown.y + 2);
    ctx.lineTo(mansion.crown.x + 14, mansion.crown.y - 6);
    ctx.lineTo(mansion.crown.x + 14, mansion.crown.y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8a6d2f';
    ctx.fillRect(mansion.crown.x - 16, mansion.crown.y + 12, 32, 8);
    drawLootLabel(ctx, mansion.crown.x, mansion.crown.y + 34, 'GILDED CROWN');
  }
  for (const a of mansion.artifacts) {
    if (a.taken) continue;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2c14';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', a.x, a.y + 3.5);
    drawLootLabel(ctx, a.x, a.y + 22, a.name);
  }

  // --- camera cones + mounts ---
  const camsDown = camerasDown(world);
  for (const cam of world.defenses.cameras) {
    drawCone(
      ctx, cam.x, cam.y, cam.angle, cam.half, cam.range,
      camsDown ? 'rgba(140,140,140,0.07)' : 'rgba(240,200,90,0.13)',
      camsDown ? 'rgba(140,140,140,0.35)' : 'rgba(240,200,90,0.45)',
    );
  }
  for (const cam of world.defenses.cameras) {
    ctx.fillStyle = camsDown ? '#777' : GOLD;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c878';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cam.id, cam.x + 9, cam.y - 6);
  }

  // --- guard cones + bodies ---
  for (const g of world.guards) {
    const chasing = g.state === 'chase';
    drawCone(
      ctx, g.x, g.y, g.angle, 0.55, 190,
      chasing ? 'rgba(255,90,70,0.20)' : 'rgba(240,190,80,0.15)',
      chasing ? 'rgba(255,90,70,0.55)' : 'rgba(240,190,80,0.45)',
    );
  }
  for (const g of world.guards) {
    ctx.fillStyle = '#7fb2ff';
    ctx.strokeStyle = '#1d2a44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 6, g.y + Math.sin(g.angle) * 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dfe6f2';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name.toUpperCase(), g.x, g.y - 19);
    if (g.state === 'suspicious') {
      ctx.fillStyle = GOLD;
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillText('?', g.x, g.y - 30);
    } else if (g.state === 'chase') {
      ctx.fillStyle = '#ff6b5e';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillText('!', g.x, g.y - 30);
    }
  }

  // --- coin drops ---
  for (const c of rook.coinDrops) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2c14';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- smoke clouds ---
  for (const c of rook.smokeClouds) {
    ctx.fillStyle = 'rgba(207,214,228,0.28)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 46, 0, Math.PI * 2);
    ctx.arc(c.x - 26, c.y + 12, 32, 0, Math.PI * 2);
    ctx.arc(c.x + 26, c.y - 8, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Rook ---
  const blink = rook.invuln > 0 && Math.floor(world.time * 10) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = TEAL;
    ctx.strokeStyle = '#0b3a32';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rook.x, rook.y, rook.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(rook.x + Math.cos(rook.facing) * 6, rook.y + Math.sin(rook.facing) * 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (rook.sneaking) {
      ctx.strokeStyle = 'rgba(77,227,194,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rook.x, rook.y, rook.r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- floating score text ---
  for (const f of rook.floaters) {
    ctx.globalAlpha = clamp(1.4 - f.t, 0, 1);
    ctx.fillStyle = f.color;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - f.t * 30);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // --- HUD bar ---
  ctx.fillStyle = 'rgba(16,12,28,0.94)';
  ctx.fillRect(0, 0, 960, HUD_H);
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H - 0.5);
  ctx.lineTo(960, HUD_H - 0.5);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = '700 19px Georgia, serif';
  ctx.fillText('THE GILDED HOUR', 16, 26);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = '#9a8a6a';
  const dot = (label, done, x) => {
    ctx.fillStyle = done ? GOLD : '#5a5268';
    ctx.beginPath();
    ctx.arc(x, 44, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = done ? '#e8c878' : '#7a7288';
    ctx.fillText(label, x + 8, 48);
  };
  dot('STAR', rook.starTaken, 18);
  dot('CROWN', rook.crownTaken, 96);
  dot('EXIT', world.state === 'won', 190);

  // Alarm bar (center).
  const stage = alarmStage(world.alarm);
  ctx.fillStyle = '#e8e2d2';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('ALARM', 330, 22);
  ctx.fillStyle = '#14101f';
  ctx.fillRect(392, 10, 220, 15);
  ctx.strokeStyle = '#5a5268';
  ctx.strokeRect(392, 10, 220, 15);
  const frac = world.alarm / 100;
  const grad = ctx.createLinearGradient(392, 0, 612, 0);
  grad.addColorStop(0, '#7fe3a8');
  grad.addColorStop(0.5, '#f2c14e');
  grad.addColorStop(1, '#ff5a4a');
  ctx.fillStyle = grad;
  ctx.fillRect(393, 11, 218 * frac, 13);
  ctx.fillStyle = '#fff';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(Math.round(world.alarm) + '%', 608, 21);
  ctx.textAlign = 'center';
  ctx.fillStyle = stage === 'LOCKDOWN' ? '#ff6b5e' : stage === 'CRITICAL' ? '#ff8a5e' : stage === 'CALM' ? '#7fe3a8' : GOLD;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText(stage, 502, 42);
  ctx.textAlign = 'left';

  // Tools, timer, nerves, loot (right).
  ctx.fillStyle = '#e8e2d2';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText(`SMOKE x${rook.smoke}   EMP x${rook.emp}   COIN x${rook.coins}`, 640, 20);
  ctx.fillStyle = '#9a8a6a';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(fmtTime(world.state === 'play' ? world.time - world.startTime : 0), 908, 20);
  ctx.fillStyle = '#e8e2d2';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('NERVES', 640, 42);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < rook.nerves ? '#ff5a4a' : '#3a3348';
    ctx.beginPath();
    ctx.arc(700 + i * 16, 38, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = GOLD;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('LOOT ' + fmtMoney(rook.loot), 800, 42);
  if (camsDown) {
    ctx.fillStyle = '#7fe3a8';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText('CAMERAS OFF', 640, 58);
  }

  // --- minimap (bottom-right) ---
  const mmX = 796;
  const mmY = 596;
  const mmW = 154;
  const mmH = 100;
  ctx.fillStyle = 'rgba(10,8,20,0.82)';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = GOLD_DIM;
  ctx.strokeRect(mmX, mmY, mmW, mmH);
  const sx = mmW / 960;
  const sy = mmH / 656;
  ctx.fillStyle = '#5a5268';
  for (const w of mansion.walls) ctx.fillRect(mmX + w.x * sx, mmY + w.y * sy, Math.max(1, w.w * sx), Math.max(1, w.h * sy));
  const mdot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mmX + x * sx, mmY + y * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (!mansion.star.taken) mdot(mansion.star.x, mansion.star.y, GOLD, 3);
  if (!mansion.crown.taken) mdot(mansion.crown.x, mansion.crown.y, GOLD, 3);
  for (const g of world.guards) mdot(g.x, g.y, '#7fb2ff', 2.5);
  for (const cam of world.defenses.cameras) mdot(cam.x, cam.y, GOLD, 2);
  mdot(mansion.exitZone.x + 13, mansion.exitZone.y + 30, '#7fe3a8', 3);
  mdot(rook.x, rook.y, TEAL, 3.5);

  // --- banner ---
  if (world.bannerT > 0 && world.banner) {
    ctx.globalAlpha = clamp(world.bannerT, 0, 1);
    ctx.fillStyle = world.banner.startsWith('LOCKDOWN') || world.banner.startsWith('SPOTTED') || world.banner.startsWith('CAUGHT') ? '#ff6b5e' : '#7fe3a8';
    ctx.font = '700 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.banner, 480, 130);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // --- hold-E prompt + objective toast ---
  const prompt = world.state === 'play' ? interactPrompt(world) : null;
  if (prompt) {
    ctx.fillStyle = '#e8e2d2';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(prompt.text, 480, 690);
    if (prompt.progress > 0) {
      ctx.fillStyle = '#14101f';
      ctx.fillRect(430, 696, 100, 6);
      ctx.fillStyle = TEAL;
      ctx.fillRect(430, 696, 100 * prompt.progress, 6);
    }
    ctx.textAlign = 'left';
  } else if (world.state === 'play' && rook.starTaken && !world.result) {
    ctx.fillStyle = '#9a8a6a';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GET TO THE EXIT — THE VAN IS WAITING', 480, 690);
    ctx.textAlign = 'left';
  }

  // --- overlays: title / win / lose / drills ---
  if (world.state === 'title') drawTitle(ctx, world);
  else if (world.state === 'won') drawEnd(ctx, world, true);
  else if (world.state === 'lost') drawEnd(ctx, world, false);
  if (world.drillResults) drawDrills(ctx, world);
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(10,8,20,0.82)';
  ctx.fillRect(0, 0, 960, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = '700 54px Georgia, serif';
  ctx.fillText('THE GILDED HOUR', 480, 210);
  ctx.fillStyle = '#e8e2d2';
  ctx.font = '400 18px Georgia, serif';
  ctx.fillText('Rook lifts the Aurora Star from the Marlow Gallery.', 480, 250);
  ctx.fillText('Five guards. Three cameras. One way out.', 480, 278);
  ctx.font = '400 15px system-ui, sans-serif';
  ctx.fillStyle = '#b8ac96';
  ctx.fillText('WASD / arrows — move      SHIFT — sneak      E — take / hold to hack & pick', 480, 340);
  ctx.fillText('Q — EMP      F — smoke      SPACE — toss a coin      M — mute', 480, 366);
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#fff';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('PRESS ENTER TO BEGIN', 480, 440);
  }
  ctx.fillStyle = '#7a7288';
  ctx.font = '400 13px system-ui, sans-serif';
  ctx.fillText('Steal the Star, crack the vault for the Crown, reach the east exit.', 480, 500);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, world, won) {
  const result = world.result || scoreOf(world);
  ctx.fillStyle = 'rgba(10,8,20,0.86)';
  ctx.fillRect(0, 0, 960, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7fe3a8' : '#ff6b5e';
  ctx.font = '700 46px Georgia, serif';
  ctx.fillText(won ? result.rank : 'CAUGHT', 480, 150);
  ctx.fillStyle = '#e8e2d2';
  ctx.font = '400 17px Georgia, serif';
  ctx.fillText(
    won ? 'Rook melts into the night. The van is already three streets away.' : 'The gallery keeps its gold tonight.',
    480,
    188,
  );
  const rows = [
    ['Aurora Star', result.star],
    ['Gilded Crown', result.crown],
    [`Bonus artefacts x${result.artCount}`, result.arts],
    [`Time bonus (${result.elapsed}s)`, result.timeBonus],
    ['Ghost bonus — alarm never passed 50', result.ghost],
    ['Clean vault bonus — no laser tripped', result.clean],
  ];
  ctx.font = '400 16px system-ui, sans-serif';
  let y = 250;
  for (const [label, value] of rows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8e2d2';
    ctx.fillText(label, 300, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = value > 0 ? GOLD : '#7a7288';
    ctx.fillText(fmtMoney(value), 660, y);
    y += 30;
  }
  ctx.strokeStyle = GOLD_DIM;
  ctx.beginPath();
  ctx.moveTo(300, y - 8);
  ctx.lineTo(660, y - 8);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('TOTAL TAKE', 300, y + 22);
  ctx.textAlign = 'right';
  ctx.fillText(fmtMoney(result.total), 660, y + 22);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e2d2';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText('RANK: ' + result.rank, 480, y + 62);
  ctx.fillStyle = '#b8ac96';
  ctx.font = '400 14px system-ui, sans-serif';
  ctx.fillText(`Nerves left: ${world.rook.nerves} — PRESS R TO ${won ? 'RUN IT AGAIN' : 'TRY AGAIN'}`, 480, y + 92);
  ctx.textAlign = 'left';
}

function drawDrills(ctx, world) {
  const r = world.drillResults;
  ctx.fillStyle = 'rgba(10,8,20,0.88)';
  ctx.fillRect(0, 0, 960, 720);
  ctx.textAlign = 'center';
  const passed = r.filter((d) => d.ok).length;
  ctx.fillStyle = passed === r.length ? '#7fe3a8' : '#ff6b5e';
  ctx.font = '700 34px Georgia, serif';
  ctx.fillText(`SELF-TEST ${passed}/${r.length}`, 480, 120);
  ctx.font = '400 16px system-ui, sans-serif';
  let y = 180;
  for (const d of r) {
    ctx.textAlign = 'left';
    ctx.fillStyle = d.ok ? '#7fe3a8' : '#ff6b5e';
    ctx.fillText(d.ok ? 'PASS' : 'FAIL', 300, y);
    ctx.fillStyle = '#e8e2d2';
    ctx.fillText(d.name, 370, y);
    y += 32;
  }
  ctx.textAlign = 'left';
}
