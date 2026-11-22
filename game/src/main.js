// The Gilded Hour — bootstrap. Wires the canvas, the input and the loop,
// honours ?shot= for staged screenshots and ?selftest=1 for the in-page
// playtest, and exposes the live game on window.__game so a headless run can
// drive it and read its state.

import { VIEW } from './config.js';
import { createGame, selfTest, updateGame } from './game.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { createShotGame, stageShot, trace } from './shots.js';
import { unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const runSelfTest = params.get('selftest') === '1';

const game = shotName ? createShotGame() : createGame();
const input = createInput(canvas);

window.__game = game;
window.__shot = shotName;

if (shotName) {
  stageShot(game, shotName);
  render(ctx, game);
  document.title = `shot:${shotName}:${game.screen}`;
  if (params.get('trace') === '1') {
    window.__trace = trace;
  }
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateGame(game, input, dt);
    input.endFrame();
    render(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

canvas.addEventListener('mousedown', unlockAudio);
window.addEventListener('keydown', unlockAudio, { once: true });

if (runSelfTest) {
  // Run after the first frame so the page has painted once.
  requestAnimationFrame(() => {
    let verdict;
    try {
      verdict = selfTest(game);
    } catch (error) {
      verdict = { ok: false, lines: [`FAIL selftest threw: ${error.message}`] };
    }
    const box = document.getElementById('selftest');
    box.textContent = verdict.lines.join('\n');
    box.dataset.ok = String(verdict.ok);
    document.title = verdict.ok ? 'SELFTEST PASS' : 'SELFTEST FAIL';
    render(ctx, game);
  });
}
