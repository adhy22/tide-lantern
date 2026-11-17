// Keyboard and mouse input, read once per frame. Actions are edge-triggered
// (confirm, pause, dash, mute) and taken by the loop; movement is a held state.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let fireHeld = false;
  let pointer = { x: 0, y: 0, active: false, movedAt: 0 };
  let pointerDown = false;

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'Space') fireHeld = true;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') actions |= ACTION_DASH;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyF' || event.code === 'KeyJ') fireHeld = true;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    if (event.code === 'KeyF' || event.code === 'KeyJ' || event.code === 'Space') fireHeld = held.has('KeyF') || held.has('KeyJ') || held.has('Space');
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = toField(event);
    pointer = { x: p.x, y: p.y, active: true, movedAt: performance.now() };
  });
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const p = toField(event);
    pointer = { x: p.x, y: p.y, active: true, movedAt: performance.now() };
    if (event.button === 2) { actions |= ACTION_DASH; return; }
    pointerDown = true;
    fireHeld = true;
  });
  window.addEventListener('pointerup', () => { pointerDown = false; fireHeld = held.has('KeyF') || held.has('KeyJ'); });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('blur', () => { held.clear(); fireHeld = false; pointerDown = false; });

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** Held movement as a unit-ish vector, plus the pointer for steering and aim. */
  function movement() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      const d = MOVE_KEYS[code];
      if (d) { x += d[0]; y += d[1]; }
    }
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    return { x, y, pointer, firing: fireHeld, pointerDown };
  }

  return { takeActions, movement };
}
