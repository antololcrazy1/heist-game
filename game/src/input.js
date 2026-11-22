// The Gilded Hour v2 — input. Keyboard and mouse on desktop; a virtual
// joystick and action buttons on touch. WASD or arrows move, Shift sneaks,
// E interacts (grab, pick, crack, hack), Q drops smoke, F fires the EMP, a
// mouse click tosses a coin, Enter starts, R restarts, P pauses.

export const TOUCH_BUTTONS = {
  interact: { x: 840, y: 610, r: 42, label: 'E' },
  smoke: { x: 736, y: 656, r: 30, label: 'Q' },
  emp: { x: 906, y: 664, r: 30, label: 'F' },
  sneak: { x: 736, y: 556, r: 30, label: 'SNEAK' },
};

const STICK_ZONE = { x: 0, y: 470, w: 380, h: 250 };
const STICK_RADIUS = 52;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  let touchSeen = false;
  let sneakToggle = false;
  let touchInteract = false;
  const stick = { active: false, id: -1, ox: 140, oy: 600, x: 0, y: 0 };

  function toCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

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
    const point = toCanvas(event.clientX, event.clientY);
    mouse = { x: point.x, y: point.y, clicked: true, clickX: point.x, clickY: point.y };
  }

  function buttonAt(point) {
    for (const [name, button] of Object.entries(TOUCH_BUTTONS)) {
      if (Math.hypot(point.x - button.x, point.y - button.y) <= button.r + 6) return name;
    }
    return null;
  }

  function onTouchStart(event) {
    event.preventDefault();
    touchSeen = true;
    for (const touch of event.changedTouches) {
      const point = toCanvas(touch.clientX, touch.clientY);
      const button = buttonAt(point);
      if (button === 'interact') {
        touchInteract = true;
      } else if (button === 'smoke') {
        pressed.add('KeyQ');
      } else if (button === 'emp') {
        pressed.add('KeyF');
      } else if (button === 'sneak') {
        sneakToggle = !sneakToggle;
      } else if (
        !stick.active &&
        point.x >= STICK_ZONE.x && point.x <= STICK_ZONE.x + STICK_ZONE.w &&
        point.y >= STICK_ZONE.y && point.y <= STICK_ZONE.y + STICK_ZONE.h
      ) {
        stick.active = true;
        stick.id = touch.identifier;
        stick.ox = point.x;
        stick.oy = point.y;
        stick.x = 0;
        stick.y = 0;
      }
    }
  }

  function onTouchMove(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      if (stick.active && touch.identifier === stick.id) {
        const point = toCanvas(touch.clientX, touch.clientY);
        let dx = (point.x - stick.ox) / STICK_RADIUS;
        let dy = (point.y - stick.oy) / STICK_RADIUS;
        const length = Math.hypot(dx, dy);
        if (length > 1) {
          dx /= length;
          dy /= length;
        }
        stick.x = dx;
        stick.y = dy;
      }
    }
  }

  function onTouchEnd(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      if (stick.active && touch.identifier === stick.id) {
        stick.active = false;
        stick.x = 0;
        stick.y = 0;
      }
      const point = toCanvas(touch.clientX, touch.clientY);
      if (buttonAt(point) === 'interact') touchInteract = false;
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

  return {
    moveVector() {
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      if (left || right || up || down) {
        return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
      }
      return { x: stick.x, y: stick.y };
    },
    sneaking() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight') || sneakToggle;
    },
    interacting() {
      return keys.has('KeyE') || touchInteract;
    },
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
    isTouch() {
      return touchSeen;
    },
    sneakToggled() {
      return sneakToggle;
    },
    stickState() {
      return { active: stick.active, ox: stick.ox, oy: stick.oy, x: stick.x, y: stick.y };
    },
    endFrame() {
      pressed.clear();
    },
  };
}
