// Keyboard + mouse input: held keys, one-shot actions, aim point.
export const ACTION_CONFIRM = 1, ACTION_PAUSE = 2, ACTION_ENTER = 4, ACTION_SHOOT = 8;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  const mouse = { x: 640, y: 360, down: false };

  window.addEventListener('keydown', (e) => {
    if (KEYMAP[e.code]) {
      held.add(KEYMAP[e.code]);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      if (!e.repeat) actions |= ACTION_CONFIRM;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (!e.repeat) actions |= ACTION_PAUSE;
    } else if (e.code === 'KeyE') {
      if (!e.repeat) actions |= ACTION_ENTER;
    } else if (e.code === 'KeyF') {
      if (!e.repeat) actions |= ACTION_SHOOT;
    } else {
      return;
    }
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (KEYMAP[e.code]) held.delete(KEYMAP[e.code]);
  });
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('pointerdown', () => {
    mouse.down = true;
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => { mouse.down = false; });

  return {
    held, mouse,
    axis() {
      return {
        x: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
        y: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0),
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
