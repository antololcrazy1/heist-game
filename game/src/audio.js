// The Gilded Hour v2 — sound. Everything is synthesized with WebAudio:
// footsteps, chimes, alarm stings and the getaway arpeggio. No audio files,
// no network. The context stays locked until the first gesture, so the page
// never complains about autoplay.

let ctx = null;
let hum = null;
let humGain = null;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();
    hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 55;
    humGain = ctx.createGain();
    humGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    hum.connect(filter);
    filter.connect(humGain);
    humGain.connect(ctx.destination);
    hum.start();
  } catch {
    ctx = null;
  }
}

function tone(freq, seconds, type = 'sine', gain = 0.12, slideTo = null, delay = 0) {
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.05);
}

function noise(seconds, gain = 0.1, delay = 0) {
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  source.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  source.start(now);
}

export function setAlarmHum(on) {
  if (!ctx || !humGain) return;
  const target = on ? 0.045 : 0;
  humGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.3);
}

export const sfx = {
  step() {
    noise(0.05, 0.03);
  },
  pickup() {
    tone(880, 0.12, 'sine', 0.1);
    tone(1318, 0.16, 'sine', 0.08, null, 0.07);
  },
  star() {
    [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.11, null, i * 0.08));
  },
  crown() {
    [392, 523, 659, 784, 1046, 1318].forEach((freq, i) => tone(freq, 0.25, 'triangle', 0.1, null, i * 0.07));
  },
  crack() {
    tone(220, 0.3, 'square', 0.07, 440);
    noise(0.2, 0.06, 0.1);
  },
  hack() {
    tone(1200, 0.08, 'square', 0.06);
    tone(900, 0.08, 'square', 0.06, null, 0.09);
    tone(1500, 0.14, 'square', 0.06, null, 0.18);
  },
  spotted() {
    tone(220, 0.28, 'sawtooth', 0.1, 440);
    tone(220, 0.28, 'sawtooth', 0.08, 440, 0.3);
  },
  busted() {
    tone(330, 0.4, 'sawtooth', 0.12, 110);
    noise(0.3, 0.08, 0.05);
  },
  win() {
    [523, 659, 784, 1046, 1318, 1568].forEach((freq, i) => tone(freq, 0.35, 'triangle', 0.11, null, i * 0.1));
  },
  emp() {
    tone(1800, 0.4, 'sine', 0.1, 120);
    noise(0.35, 0.07);
  },
  smoke() {
    noise(0.5, 0.12);
  },
  coin() {
    tone(2000, 0.06, 'sine', 0.07);
  },
  clink() {
    tone(2400, 0.1, 'sine', 0.09, 1800);
    tone(3000, 0.08, 'sine', 0.05, null, 0.05);
  },
  lockpick() {
    tone(700, 0.05, 'square', 0.05);
    tone(700, 0.05, 'square', 0.05, null, 0.12);
  },
  doorOpen() {
    noise(0.25, 0.07);
    tone(180, 0.25, 'sine', 0.08, 90);
  },
  laser() {
    tone(1400, 0.18, 'sawtooth', 0.12, 300);
    noise(0.15, 0.08);
  },
  denied() {
    tone(160, 0.12, 'square', 0.07);
  },
};
