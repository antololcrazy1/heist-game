// boot.js — the entry point. Builds the world, wires keyboard, mouse
// and touch, runs the frame loop, and answers the URL modes the maker
// uses: ?scene=cover|vault|spotted|getaway stages a frozen screenshot
// scene, ?drills=1 runs the in-game self-test.

import { buildMansion } from './mansion.js';
import { makeRook, pressInteract, useSmoke, useEmp, useCoin } from './rook.js';
import { makeSentries } from './sentries.js';
import { makeDefenses } from './defenses.js';
import { makeTones } from './tones.js';
import { drawWorld, screenToWorld } from './canvas.js';
import { updateWorld, startGame } from './sim.js';
import { runDrills, stageScene } from './drills.js';
import { getLevel, loadUnlocked, levelAtPoint } from './levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function makeWorld(levelN) {
  const cfg = getLevel(levelN);
  const mansion = buildMansion(cfg);
  return {
    mansion,
    level: cfg.n,
    levelCfg: cfg,
    unlocked: loadUnlocked(),
    selectedLevel: cfg.n,
    rook: makeRook(mansion, cfg),
    guards: makeSentries(mansion),
    defenses: makeDefenses(mansion),
    tones: makeTones(),
    state: 'title',
    time: 0,
    startTime: 0,
    alarm: 0,
    maxAlarm: 0,
    lockdownT: 0,
    camsOff: 0,
    empTimer: 0,
    laserOff: 0,
    laserCooldown: 0,
    callToVault: 0,
    anySees: false,
    camSees: false,
    banner: null,
    bannerT: 0,
    shake: 0,
    result: null,
    drillResults: null,
  };
}

/** Rebuild the world for a level and make it live. */
function loadLevel(n) {
  world = makeWorld(n);
  window.__game = world;
  return world;
}

let world = makeWorld(1);
window.__game = world;

const params = new URLSearchParams(location.search);
const scene = params.get('scene');
const wantDrills = params.get('drills') === '1';

if (wantDrills) {
  world.drillResults = runDrills();
  const passed = world.drillResults.filter((d) => d.ok).length;
  document.title = `DRILLS ${passed}/${world.drillResults.length}`;
  console.log('DRILLS', JSON.stringify(world.drillResults));
  window.__drillsDone = true;
} else if (scene) {
  startGame(world);
  stageScene(world, scene);
  document.title = `SCENE ${scene}`;
  window.__scene = scene;
}

// --- input: keyboard ---
const keys = new Set();
let clickTarget = null;

function moveVector() {
  let x = 0;
  let y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (touchMove.x !== 0 || touchMove.y !== 0) {
    x = touchMove.x;
    y = touchMove.y;
  }
  if (clickTarget) {
    const dx = clickTarget.x - world.rook.x;
    const dy = clickTarget.y - world.rook.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) {
      clickTarget = null;
    } else {
      x = dx / d;
      y = dy / d;
    }
  }
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Enter' && world.state === 'title') {
    startGame(world);
  } else if (e.code === 'Enter' && world.state === 'won' && world.level < 10 && world.level + 1 <= world.unlocked) {
    loadLevel(world.level + 1);
    startGame(world);
  } else if (e.code === 'KeyR' && (world.state === 'won' || world.state === 'lost')) {
    loadLevel(world.level);
    startGame(world);
  } else if (e.code === 'KeyN' && world.state === 'won' && world.level < 10 && world.level + 1 <= world.unlocked) {
    loadLevel(world.level + 1);
    startGame(world);
  } else if (world.state === 'title' && /^Digit[0-9]$/.test(e.code)) {
    const n = e.code === 'Digit0' ? 10 : Number(e.code.slice(5));
    if (n <= world.unlocked) {
      loadLevel(n);
    }
  } else if (e.code === 'KeyM') {
    world.tones.toggleMute();
  } else if (world.state === 'play') {
    if (e.code === 'KeyE') pressInteract(world);
    else if (e.code === 'KeyQ') useEmp(world);
    else if (e.code === 'KeyF') useSmoke(world);
    else if (e.code === 'Space') useCoin(world);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// --- input: mouse (click to walk) and touch (tap to start) ---
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = ((e.clientX - rect.left) / rect.width) * 960;
  const sy = ((e.clientY - rect.top) / rect.height) * 720;
  if (world.state === 'title') {
    const picked = levelAtPoint(sx, sy);
    if (picked && picked <= world.unlocked) {
      loadLevel(picked);
    }
    startGame(world);
    return;
  }
  if (world.state === 'won' || world.state === 'lost') {
    loadLevel(world.level);
    startGame(world);
    return;
  }
  if (e.pointerType === 'touch') return;
  if (sy >= 64 && world.state === 'play') {
    clickTarget = screenToWorld(world, sx, sy);
  }
});

// --- input: touch (virtual joystick + action buttons) ---
const touchMove = { x: 0, y: 0 };
let touchSneak = false;
const touchUI = document.getElementById('touch');
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  touchUI.classList.add('on');
}
const joy = document.getElementById('joy');
const knob = document.getElementById('knob');
let joyId = null;
function joyCenter() {
  const r = joy.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rad: r.width / 2 };
}
joy.addEventListener('pointerdown', (e) => {
  joyId = e.pointerId;
  joy.setPointerCapture(e.pointerId);
  joyMove(e);
});
joy.addEventListener('pointermove', (e) => {
  if (e.pointerId === joyId) joyMove(e);
});
function joyEnd(e) {
  if (e.pointerId === joyId) {
    joyId = null;
    touchMove.x = 0;
    touchMove.y = 0;
    knob.style.transform = 'translate(-50%, -50%)';
  }
}
joy.addEventListener('pointerup', joyEnd);
joy.addEventListener('pointercancel', joyEnd);
function joyMove(e) {
  const c = joyCenter();
  let dx = (e.clientX - c.x) / c.rad;
  let dy = (e.clientY - c.y) / c.rad;
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  touchMove.x = dx;
  touchMove.y = dy;
  knob.style.transform = `translate(calc(-50% + ${dx * 34}px), calc(-50% + ${dy * 34}px))`;
}
function bindButton(id, down, up) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    down();
  });
  if (up) {
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}
let touchHoldE = false;
bindButton(
  'btn-e',
  () => {
    if (world.state === 'play') pressInteract(world);
    touchHoldE = true;
  },
  () => {
    touchHoldE = false;
  },
);
bindButton('btn-q', () => {
  if (world.state === 'play') useEmp(world);
});
bindButton('btn-f', () => {
  if (world.state === 'play') useSmoke(world);
});
bindButton('btn-sneak', () => {
  touchSneak = !touchSneak;
  document.getElementById('btn-sneak').classList.toggle('active', touchSneak);
});

// --- frame loop ---
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!scene && !wantDrills) {
    if (world.state === 'play') {
      const mv = moveVector();
      updateWorld(world, dt, {
        x: mv.x,
        y: mv.y,
        sneak: keys.has('ShiftLeft') || keys.has('ShiftRight') || touchSneak,
        holdE: keys.has('KeyE') || touchHoldE,
      });
    } else {
      world.time += dt;
    }
  }
  drawWorld(ctx, world);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
