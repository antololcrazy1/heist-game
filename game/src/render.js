// The Gilded Hour — everything the player sees, drawn on one canvas: the
// night gallery with its paintings and spotlights, the guards and their
// vision cones, the cameras, the Aurora Star, and the HUD with the alarm
// meter, loot, tools, nerves and the clock. Safe cover, danger and loot are
// colour-coded at a glance: gold for loot, red for danger, teal for the thief.

import { ALARM, CAMERAS, COVER, EXIT_DOOR, FIELD, PAINTINGS, SERVICE_DOOR, STAR, TOOLS, VIEW, VISION, WALLS } from './config.js';
import { SCREEN_BUSTED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_TITLE, SCREEN_WIN } from './game.js';

const GOLD = '#e8b64c';
const RED = '#e5484d';
const TEAL = '#3fd2c0';
const INK = '#0d0b16';

function conePath(ctx, x, y, angle, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, halfAngle, range, colour) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = colour;
  conePath(ctx, x, y, angle, halfAngle, range);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx, time) {
  ctx.fillStyle = '#17131f';
  ctx.fillRect(0, FIELD.y, FIELD.width, FIELD.height);
  // Marble tiles.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD.y);
    ctx.lineTo(x, FIELD.y + FIELD.height);
    ctx.stroke();
  }
  for (let y = FIELD.y; y <= FIELD.y + FIELD.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
    ctx.stroke();
  }
  // Warm pools of light under the ceiling spots, gently breathing.
  const spots = [
    { x: 480, y: 322, r: 190 },
    { x: 150, y: 300, r: 130 },
    { x: 812, y: 380, r: 130 },
    { x: 480, y: 620, r: 150 },
  ];
  for (const spot of spots) {
    const pulse = 0.05 + 0.012 * Math.sin(time * 0.9 + spot.x);
    const gradient = ctx.createRadialGradient(spot.x, spot.y, 10, spot.x, spot.y, spot.r);
    gradient.addColorStop(0, `rgba(232,182,76,${pulse + 0.05})`);
    gradient.addColorStop(1, 'rgba(232,182,76,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(spot.x - spot.r, spot.y - spot.r, spot.r * 2, spot.r * 2);
  }
  // Dust motes drifting in the light.
  ctx.fillStyle = 'rgba(232,200,120,0.35)';
  for (let i = 0; i < 24; i += 1) {
    const mx = ((i * 173.3 + time * 6) % 960);
    const my = FIELD.y + ((i * 97.7 + time * 3) % FIELD.height);
    ctx.fillRect(mx, my, 2, 2);
  }
}

function drawPaintings(ctx) {
  for (const painting of PAINTINGS) {
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(painting.x - 4, painting.y - 4, painting.w + 8, painting.h + 8);
    ctx.fillStyle = painting.hue;
    ctx.fillRect(painting.x, painting.y, painting.w, painting.h);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(painting.x + 8, painting.y + 8, painting.w - 30, painting.h - 24);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.strokeRect(painting.x - 4, painting.y - 4, painting.w + 8, painting.h + 8);
  }
}

function drawWallsAndCover(ctx) {
  for (const wall of WALLS) {
    ctx.fillStyle = '#241d33';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = '#3a2f52';
    ctx.fillRect(wall.x, wall.y, wall.w, 4);
  }
  // The gallery's outer frame.
  ctx.strokeStyle = '#3a2f52';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, FIELD.y + 3, FIELD.width - 6, FIELD.height - 6);
  for (const item of COVER) {
    if (item.kind === 'case') {
      ctx.fillStyle = '#1d2733';
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = 'rgba(140,200,230,0.25)';
      ctx.fillRect(item.x + 4, item.y + 4, item.w - 8, item.h - 8);
      ctx.strokeStyle = '#4a6a86';
      ctx.lineWidth = 2;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
    } else if (item.kind === 'bench') {
      ctx.fillStyle = '#4a2c2c';
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = '#6b3a3a';
      ctx.fillRect(item.x, item.y, item.w, 6);
    } else {
      ctx.fillStyle = '#1f3a26';
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = '#2f6b3a';
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2, item.y + item.h / 2, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStar(ctx, game, time) {
  const pedestal = STAR.pedestal;
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(pedestal.x, pedestal.y, pedestal.w, pedestal.h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(pedestal.x, pedestal.y, pedestal.w, pedestal.h);
  if (game.level.starTaken) return;
  const cx = STAR.x;
  const cy = STAR.y - 14 + Math.sin(time * 2) * 3;
  const twinkle = 0.75 + 0.25 * Math.sin(time * 5);
  ctx.save();
  ctx.globalAlpha = twinkle;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 16);
  ctx.lineTo(cx + 12, cy);
  ctx.lineTo(cx, cy + 16);
  ctx.lineTo(cx - 12, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx + 5, cy);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 5, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AURORA STAR', cx, pedestal.y + pedestal.h + 16);
}

function drawArtifacts(ctx, game) {
  for (const item of game.level.artifacts) {
    if (item.taken) continue;
    ctx.save();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(item.x, item.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0d0b16';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◆', item.x, item.y + 3);
    ctx.fillStyle = 'rgba(232,182,76,0.9)';
    ctx.font = '10px sans-serif';
    ctx.fillText(item.name.toUpperCase(), item.x, item.y + 20);
  }
}

function drawDoors(ctx, game, time) {
  // The service door: shut until lockpicked, then a dark open gap.
  if (!game.level.serviceDoorOpen) {
    ctx.fillStyle = '#3a2f52';
    ctx.fillRect(SERVICE_DOOR.x, SERVICE_DOOR.y, SERVICE_DOOR.w, SERVICE_DOOR.h);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(SERVICE_DOOR.x + SERVICE_DOOR.w / 2, SERVICE_DOOR.y + SERVICE_DOOR.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('LOCKED · HOLD E', 0, 3);
    ctx.restore();
  } else {
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(SERVICE_DOOR.x, SERVICE_DOOR.y, SERVICE_DOOR.w, SERVICE_DOOR.h);
  }
  // The getaway exit, glowing once the Star is taken.
  const open = game.thief.star && !game.lockdown;
  const pulse = open ? 0.65 + 0.35 * Math.sin(time * 6) : 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = open ? '#58d68d' : '#888888';
  ctx.fillRect(EXIT_DOOR.x, EXIT_DOOR.y - 4, EXIT_DOOR.w, 18);
  ctx.restore();
  ctx.fillStyle = open ? '#b8ffce' : '#cccccc';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(game.lockdown ? 'EXIT SEALED' : 'EXIT · GETAWAY VAN', 952, EXIT_DOOR.y + 30);
}

function drawCameras(ctx, game) {
  for (const camera of game.level.cameras) {
    const offline = game.time < camera.offlineUntil;
    const sees = !offline && game.seenByCamera;
    if (!offline) {
      drawCone(ctx, camera.x, camera.y, camera.angle, VISION.cameraHalfAngle, VISION.cameraRange, sees ? RED : '#e8b64c');
    }
    ctx.fillStyle = '#22222e';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = offline ? '#555555' : sees ? RED : GOLD;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dddddd';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(offline ? `${camera.name} OFFLINE` : camera.name, camera.x + 12, camera.y + 4);
  }
}

function drawGuards(ctx, game) {
  for (const guard of game.guards) {
    const colour = guard.state === 'chase' ? RED : guard.state === 'search' || guard.state === 'investigate' ? '#ff9f43' : '#ffd166';
    drawCone(ctx, guard.x, guard.y, guard.angle, VISION.guardHalfAngle, VISION.guardRange, colour);
    // Body: a night-shift guard in a dark uniform with a cap.
    ctx.fillStyle = '#2b3a55';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7fa0c9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#dfe9f5';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle) * 6, guard.y + Math.sin(guard.angle) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // A "seen" bar fills over a guard that is onto the thief.
    if (guard.seen > 0.05) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(guard.x - 16, guard.y - 26, 32, 5);
      ctx.fillStyle = guard.seen > 0.35 ? RED : '#ffd166';
      ctx.fillRect(guard.x - 16, guard.y - 26, 32 * guard.seen, 5);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y - 30);
    if (guard.state === 'chase') {
      ctx.fillStyle = RED;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('!', guard.x, guard.y - 40);
    }
  }
}

function drawThief(ctx, game, time) {
  const thief = game.thief;
  // A soft shadow, then Rook: a hooded figure in teal, facing the way they move.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 9, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(thief.x, thief.y);
  ctx.rotate(thief.angle);
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f2a28';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(4, -7);
  ctx.lineTo(4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8f6f3';
  ctx.beginPath();
  ctx.arc(5, -4, 2, 0, Math.PI * 2);
  ctx.arc(5, 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sneaking is drawn low and slow: a smaller, dimmer ring.
  if (thief.sneaking) {
    ctx.strokeStyle = 'rgba(63,210,192,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 18 + Math.sin(time * 3) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // The grab / lockpick channel ring.
  if (thief.channel) {
    const frac = thief.channel.done / thief.channel.need;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 22, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(thief.channel.kind === 'star' ? 'LIFTING THE STAR…' : 'PICKING THE LOCK…', thief.x, thief.y - 30);
  }
}

function drawSmokeAndCoins(ctx, game) {
  for (const smoke of game.level.smokes) {
    const alpha = Math.min(0.55, (smoke.left / TOOLS.smoke.seconds) * 0.55);
    ctx.fillStyle = `rgba(200,200,210,${alpha})`;
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(smoke.x - 20, smoke.y - 10, smoke.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const coin of game.level.coins) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,182,76,0.5)';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 12 + Math.sin(coin.left * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawAlarmMeter(ctx, game) {
  const x = 330;
  const y = 18;
  const w = 300;
  const h = 22;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, w, h);
  const frac = game.alarm / 100;
  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, '#58d68d');
  gradient.addColorStop(0.5, '#e8b64c');
  gradient.addColorStop(1, RED);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w * frac, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', x - 62, y + 16);
  // The percentage sits inside the bar's right end, clear of the tool counts.
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(game.alarm)}%`, x + w - 6, y + 16);
  if (game.lockdown) {
    ctx.fillStyle = RED;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKDOWN — EXIT SEALED', x + w / 2, y + 38);
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, VIEW.width, FIELD.y);
  ctx.strokeStyle = '#3a2f52';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, FIELD.y);
  ctx.lineTo(VIEW.width, FIELD.y);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE GILDED HOUR', 16, 26);
  ctx.fillStyle = '#b9b3c9';
  ctx.font = '12px sans-serif';
  const objective = game.thief.star
    ? 'Star taken — reach the EXIT, top right'
    : 'Lift the AURORA STAR from the pedestal';
  ctx.fillText(objective, 16, 48);

  drawAlarmMeter(ctx, game);

  // Tools, top right.
  const tools = [
    { label: 'SMOKE', count: game.thief.smoke, x: 660 },
    { label: 'EMP', count: game.thief.emp, x: 748 },
    { label: 'COIN', count: game.thief.coins, x: 824 },
  ];
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  for (const tool of tools) {
    ctx.fillStyle = tool.count > 0 ? '#ffffff' : '#555566';
    ctx.fillText(`${tool.label} ×${tool.count}`, tool.x, 26);
  }
  // Nerves and loot, bottom row of the bar.
  ctx.fillStyle = '#ffffff';
  ctx.fillText('NERVES', 700, 50);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < game.nerves ? RED : '#333344';
    ctx.beginPath();
    ctx.arc(760 + i * 20, 46, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = GOLD;
  ctx.fillText(`LOOT ${game.thief.artifacts}/3  ${game.thief.star ? '★ STAR' : '☆ STAR'}`, 838, 50);
  // Clock.
  const seconds = Math.floor(game.playTime);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  ctx.fillStyle = '#b9b3c9';
  ctx.textAlign = 'right';
  ctx.fillText(`${mm}:${ss}`, 948, 26);

  // Context hints at the bottom of the screen.
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px sans-serif';
  if (game.hints.nearStar) {
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('HOLD E — LIFT THE AURORA STAR', VIEW.width / 2, 700);
  } else if (game.hints.nearDoor) {
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('HOLD E — PICK THE SERVICE DOOR', VIEW.width / 2, 700);
  } else if (game.thief.star && !game.lockdown) {
    ctx.fillStyle = '#b8ffce';
    ctx.fillText('GET TO THE EXIT — THE VAN IS WAITING', VIEW.width / 2, 700);
  }
  if (game.anyChase) {
    ctx.fillStyle = RED;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('SPOTTED — BREAK LINE OF SIGHT!', VIEW.width / 2, 108);
  }
  if (game.caughtFlash > 0) {
    ctx.fillStyle = `rgba(229,72,77,${game.caughtFlash * 0.35})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function drawTitle(ctx, game, time) {
  ctx.fillStyle = 'rgba(10,8,18,0.88)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE GILDED HOUR', VIEW.width / 2, 190);
  ctx.fillStyle = '#e8e2f2';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('One thief. One diamond. One very awake gallery.', VIEW.width / 2, 232);
  ctx.fillStyle = '#b9b3c9';
  ctx.font = '15px sans-serif';
  const lines = [
    'WASD / arrows — move      Shift — sneak (harder to spot)',
    'Hold E — lift the Aurora Star · pick the service door',
    'Q — smoke bomb    F — EMP (blacks out cameras)    Click — toss a coin',
    'Read the cones. Dodge the cameras. Grab the Star, then reach the EXIT.',
    'If a guard reaches you, you lose a nerve and wake up at the door.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 300 + i * 28));
  const pulse = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.fillStyle = `rgba(255,233,168,${pulse})`;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PRESS ENTER TO BEGIN THE HEIST', VIEW.width / 2, 500);
  ctx.fillStyle = '#7d7690';
  ctx.font = '13px sans-serif';
  ctx.fillText('An original game — the Marlow Gallery, Rook, and the Aurora Star are invented for this heist.', VIEW.width / 2, 560);
}

function drawBusted(ctx, game) {
  ctx.fillStyle = 'rgba(20,4,8,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = RED;
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAUGHT!', VIEW.width / 2, 300);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText(`A guard got a hand on Rook. Nerves left: ${game.nerves}`, VIEW.width / 2, 350);
  ctx.fillStyle = '#b9b3c9';
  ctx.font = '15px sans-serif';
  ctx.fillText('What you stole stays stolen. Slip back in — quieter this time.', VIEW.width / 2, 386);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS ENTER TO SLIP BACK IN', VIEW.width / 2, 450);
}

function drawOver(ctx) {
  ctx.fillStyle = 'rgba(10,8,18,0.92)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = RED;
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE GALLERY WINS', VIEW.width / 2, 300);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Three strikes, and the night is over. The Star stays in its case.', VIEW.width / 2, 350);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS R TO TRY AGAIN', VIEW.width / 2, 430);
}

function drawWin(ctx, game) {
  const result = game.result;
  ctx.fillStyle = 'rgba(8,18,10,0.9)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#58d68d';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CLEAN GETAWAY', VIEW.width / 2, 170);
  ctx.fillStyle = '#e8e2f2';
  ctx.font = '17px sans-serif';
  ctx.fillText('Rook melts into the night. The van is already three streets away.', VIEW.width / 2, 208);
  // The van, drawn simple and proud.
  ctx.fillStyle = '#22303f';
  ctx.fillRect(380, 250, 200, 70);
  ctx.fillStyle = '#2f4256';
  ctx.fillRect(540, 262, 60, 58);
  ctx.fillStyle = '#9fc4e8';
  ctx.fillRect(548, 270, 34, 26);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('★', 480, 292);
  ctx.fillStyle = '#0d0b16';
  ctx.beginPath();
  ctx.arc(420, 322, 16, 0, Math.PI * 2);
  ctx.arc(560, 322, 16, 0, Math.PI * 2);
  ctx.fill();
  // The score breakdown.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  const rows = [
    ['Aurora Star', result.star ? 5000 : 0],
    [`Bonus artefacts ×${result.artifacts}`, result.artifacts * 750],
    [`Time bonus (${result.seconds}s)`, result.timeBonus],
    ['Ghost bonus — alarm never passed 50', result.ghostBonus],
  ];
  let y = 380;
  for (const [label, value] of rows) {
    ctx.fillText(label, 300, y);
    ctx.textAlign = 'right';
    ctx.fillText(`$${value.toLocaleString()}`, 660, y);
    ctx.textAlign = 'left';
    y += 30;
  }
  ctx.strokeStyle = '#3a2f52';
  ctx.beginPath();
  ctx.moveTo(300, y - 8);
  ctx.lineTo(660, y - 8);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('TOTAL TAKE', 300, y + 24);
  ctx.textAlign = 'right';
  ctx.fillText(`$${result.total.toLocaleString()}`, 660, y + 24);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`RANK: ${result.rank}`, VIEW.width / 2, y + 66);
  ctx.fillStyle = '#b9b3c9';
  ctx.font = '15px sans-serif';
  ctx.fillText('PRESS R TO RUN IT AGAIN', VIEW.width / 2, y + 100);
}

export function render(ctx, game) {
  const time = game.time;
  drawFloor(ctx, time);
  drawPaintings(ctx);
  drawWallsAndCover(ctx);
  drawStar(ctx, game, time);
  drawArtifacts(ctx, game);
  drawDoors(ctx, game, time);
  drawCameras(ctx, game);
  drawGuards(ctx, game);
  drawThief(ctx, game, time);
  drawSmokeAndCoins(ctx, game);
  drawHud(ctx, game);
  if (game.screen === SCREEN_TITLE) drawTitle(ctx, game, time);
  if (game.screen === SCREEN_PAUSED) {
    ctx.fillStyle = 'rgba(10,8,18,0.75)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, 360);
    ctx.font = '16px sans-serif';
    ctx.fillText('Press P to keep moving.', VIEW.width / 2, 400);
  }
  if (game.screen === SCREEN_BUSTED) drawBusted(ctx, game);
  if (game.screen === SCREEN_OVER) drawOver(ctx);
  if (game.screen === SCREEN_WIN) drawWin(ctx, game);
}
