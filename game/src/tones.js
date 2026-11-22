// tones.js — every sound is synthesized with WebAudio: no audio files,
// no network, just oscillators and filtered noise. Created lazily on the
// first user gesture so the browser's autoplay rules stay happy.

export function makeTones() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch (e) {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function beep(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch (e) {}
  }

  function noise(dur, vol, cutoff) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff || 900;
      const g = c.createGain();
      g.gain.value = vol || 0.1;
      src.connect(f);
      f.connect(g);
      g.connect(c.destination);
      src.start();
    } catch (e) {}
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    step() {
      beep(140 + Math.random() * 40, 0.05, 'triangle', 0.03);
    },
    pickup() {
      beep(660, 0.09, 'sine', 0.09, 990);
      setTimeout(() => beep(990, 0.12, 'sine', 0.08, 1320), 70);
    },
    coin() {
      beep(1180, 0.07, 'square', 0.05, 1560);
    },
    smoke() {
      noise(0.5, 0.12, 500);
    },
    emp() {
      beep(220, 0.35, 'sawtooth', 0.07, 55);
      noise(0.3, 0.08, 2400);
    },
    zap() {
      beep(1800, 0.12, 'sawtooth', 0.09, 220);
    },
    hack() {
      beep(520, 0.08, 'square', 0.05);
      setTimeout(() => beep(780, 0.08, 'square', 0.05), 90);
      setTimeout(() => beep(1040, 0.14, 'square', 0.06), 180);
    },
    spotted() {
      beep(392, 0.16, 'sawtooth', 0.1, 311);
      setTimeout(() => beep(311, 0.22, 'sawtooth', 0.1, 233), 140);
    },
    caught() {
      beep(300, 0.5, 'sawtooth', 0.11, 70);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'sine', 0.09), i * 130));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.09), i * 160));
    },
    alarmTick() {
      beep(880, 0.06, 'square', 0.04);
    },
    locked() {
      beep(160, 0.08, 'square', 0.06, 120);
    },
  };
}
