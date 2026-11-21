// Keyboard and mouse input for Solmar Bay.
// Tracks held keys and one-frame "pressed" edges so the game can react to
// taps (E, F, C, M, P) as well as held movement keys (WASD).

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.dragging = false;
    this._onKeyDown = (e) => this._key(e, true);
    this._onKeyUp = (e) => this._key(e, false);
    this._onMouseDown = (e) => {
      if (e.button === 0) this.dragging = true;
    };
    this._onMouseUp = () => { this.dragging = false; };
    this._onMouseMove = (e) => {
      if (this.dragging) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    };
    this._onBlur = () => { this.held.clear(); this.dragging = false; };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('blur', this._onBlur);
  }

  _key(e, down) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const gameKeys = ['w', 'a', 's', 'd', 'e', 'f', 'c', 'm', 'p', ' ', 'Escape', 'Shift'];
    if (gameKeys.includes(k) || gameKeys.includes(e.key)) e.preventDefault();
    if (down) {
      if (!this.held.has(k)) this.pressed.add(k);
      this.held.add(k);
    } else {
      this.held.delete(k);
    }
  }

  isDown(k) { return this.held.has(k); }
  wasPressed(k) { return this.pressed.has(k); }
  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }
  endFrame() { this.pressed.clear(); }
}
