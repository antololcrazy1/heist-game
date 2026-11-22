// The Gilded Hour — keyboard and mouse input. Movement is WASD or arrows,
// Shift sneaks, E interacts (grab the Star, pick the service door), Q drops
// smoke, F fires the EMP, and a mouse click tosses a coin to distract guards.
// Enter starts, R restarts after a win or a bust, P pauses.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

  function codeOf(event) {
    return event.code || event.key;
  }

  function onKeyDown(event) {
    const code = codeOf(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(code);
    keys.add(code);
  }

  function onKeyUp(event) {
    keys.delete(codeOf(event));
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      clicked: true,
      clickX: (event.clientX - rect.left) * scaleX,
      clickY: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    // Held keys, as a -1/0/1 pair for the current frame.
    moveVector() {
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    sneaking() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    interacting() {
      return keys.has('KeyE');
    },
    // True once per physical press; consumed at the end of each frame.
    wasPressed(code) {
      return pressed.has(code);
    },
    consumePress(code) {
      pressed.delete(code);
    },
    mouseClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
    mousePosition() {
      return { x: mouse.x, y: mouse.y };
    },
    // Called by the game loop after each frame so single presses do not repeat.
    endFrame() {
      pressed.clear();
    },
  };
}
