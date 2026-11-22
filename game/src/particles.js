// The Gilded Hour v2 — particles: sparkles when loot is pocketed, dust
// under Rook's feet, smoke puffs, and floating text for the score. Small,
// short-lived, and drawn over the floor but under the HUD.

export function createParticles() {
  return { list: [] };
}

export function burst(particles, x, y, color, count = 14, speed = 90) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const power = speed * (0.4 + Math.random() * 0.8);
    particles.list.push({
      x, y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      life: 0.7,
      maxLife: 0.7,
      size: 2 + Math.random() * 3,
      color,
      text: null,
    });
  }
}

export function puff(particles, x, y, color = '#9aa0b0', count = 10) {
  for (let i = 0; i < count; i += 1) {
    particles.list.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 24,
      vy: -12 - Math.random() * 20,
      life: 1.1,
      maxLife: 1.1,
      size: 8 + Math.random() * 10,
      color,
      text: null,
    });
  }
}

export function floatText(particles, x, y, text, color = '#ffd76a') {
  particles.list.push({
    x, y,
    vx: 0,
    vy: -34,
    life: 1.4,
    maxLife: 1.4,
    size: 15,
    color,
    text,
  });
}

export function updateParticles(particles, dt) {
  for (const piece of particles.list) {
    piece.life -= dt;
    piece.x += piece.vx * dt;
    piece.y += piece.vy * dt;
    piece.vx *= 1 - dt * 1.5;
    piece.vy *= 1 - dt * 1.5;
  }
  particles.list = particles.list.filter((piece) => piece.life > 0);
}
