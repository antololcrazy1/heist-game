// The Gilded Hour — all sound is synthesised with WebAudio, so the game
// ships no audio files and makes no network request. Every effect is a short
// burst of oscillators or filtered noise, mixed quietly under the game.

let context = null;
let alarmNodes = null;

function ensureContext() {
  if (context) return context;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  } catch {
    context = null;
  }
  return context;
}

export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(freq, seconds, type, gainValue, when = 0, slideTo = null) {
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

function noise(seconds, gainValue, filterFreq, when = 0) {
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
  source.stop(start + seconds + 0.05);
}

export const sfx = {
  step() {
    noise(0.05, 0.015, 500);
  },
  pickup() {
    tone(880, 0.12, 'sine', 0.08);
    tone(1318, 0.18, 'sine', 0.07, 0.08);
  },
  star() {
    tone(523, 0.16, 'triangle', 0.09);
    tone(659, 0.16, 'triangle', 0.09, 0.1);
    tone(784, 0.22, 'triangle', 0.09, 0.2);
    tone(1046, 0.34, 'triangle', 0.08, 0.3);
  },
  coin() {
    tone(2400, 0.07, 'square', 0.035);
    tone(1800, 0.09, 'square', 0.03, 0.07);
    noise(0.04, 0.02, 6000, 0.02);
  },
  clink() {
    tone(2900, 0.06, 'sine', 0.05);
    tone(2100, 0.1, 'sine', 0.04, 0.05);
  },
  smoke() {
    noise(0.5, 0.09, 900);
  },
  emp() {
    tone(1400, 0.35, 'sawtooth', 0.05, 0, 180);
    noise(0.3, 0.05, 3200);
  },
  lockpick() {
    tone(1200, 0.05, 'square', 0.03);
    tone(1500, 0.05, 'square', 0.03, 0.12);
  },
  doorOpen() {
    noise(0.4, 0.06, 700);
    tone(220, 0.3, 'triangle', 0.05, 0.05, 330);
  },
  spotted() {
    tone(392, 0.14, 'square', 0.06);
    tone(311, 0.2, 'square', 0.06, 0.13);
  },
  busted() {
    tone(220, 0.25, 'sawtooth', 0.08, 0, 110);
    tone(165, 0.4, 'sawtooth', 0.08, 0.22, 82);
  },
  win() {
    tone(523, 0.18, 'triangle', 0.09);
    tone(659, 0.18, 'triangle', 0.09, 0.15);
    tone(784, 0.18, 'triangle', 0.09, 0.3);
    tone(1046, 0.5, 'triangle', 0.1, 0.45);
  },
  denied() {
    tone(180, 0.12, 'square', 0.05);
  },
};

// A soft two-tone alarm hum while the meter is high. It starts and stops
// with the danger, and never plays on the title screen.
export function setAlarmHum(on) {
  const ctx = ensureContext();
  if (!ctx) return;
  if (on && !alarmNodes) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 660;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    const gain = ctx.createGain();
    gain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    lfo.start();
    alarmNodes = { osc, lfo, gain };
  } else if (!on && alarmNodes) {
    try {
      alarmNodes.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      alarmNodes.osc.stop(ctx.currentTime + 0.3);
      alarmNodes.lfo.stop(ctx.currentTime + 0.3);
    } catch {
      // Already stopped; nothing to clean up.
    }
    alarmNodes = null;
  }
}
