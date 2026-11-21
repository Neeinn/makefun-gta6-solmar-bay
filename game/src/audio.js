// Synthesized sound effects for Solmar Bay — WebAudio only, no audio files
// and no network. Everything is an oscillator or filtered noise built at
// runtime, started after the first user gesture.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOscA = null;
    this.sirenOscB = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this._buildEngine();
      this._buildSiren();
    } catch (err) {
      this.ctx = null;
    }
  }

  _buildEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  _buildSiren() {
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOscA = this.ctx.createOscillator();
    this.sirenOscA.type = 'triangle';
    this.sirenOscA.frequency.value = 720;
    this.sirenOscB = this.ctx.createOscillator();
    this.sirenOscB.type = 'triangle';
    this.sirenOscB.frequency.value = 960;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 1.6;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.5;
    const switchGain = this.ctx.createGain();
    switchGain.gain.value = 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(switchGain.gain);
    this.sirenOscA.connect(switchGain);
    this.sirenOscB.connect(switchGain);
    switchGain.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOscA.start();
    this.sirenOscB.start();
    lfo.start();
  }

  setEngine(speedNorm, driving) {
    if (!this.ctx || !this.engineGain) return;
    const target = driving ? 0.05 + 0.11 * speedNorm : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineOsc.frequency.setTargetAtTime(52 + 130 * speedNorm, this.ctx.currentTime, 0.1);
  }

  setSiren(on) {
    if (!this.ctx || !this.sirenGain || on === this.sirenOn) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.15);
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol, freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq || 900;
    const gain = this.ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  punch() { this._noise(0.12, 0.5, 500); this._tone(140, 0.1, 'square', 0.15, 70); }
  hit() { this._noise(0.08, 0.25, 1200); }
  pickup() { this._tone(660, 0.09, 'sine', 0.22); setTimeout(() => this._tone(880, 0.12, 'sine', 0.22), 80); }
  coin() { this._tone(990, 0.08, 'triangle', 0.2); setTimeout(() => this._tone(1320, 0.16, 'triangle', 0.2), 70); }
  enterCar() { this._tone(220, 0.08, 'square', 0.12, 330); }
  horn() { this._tone(370, 0.25, 'square', 0.12); this._tone(466, 0.25, 'square', 0.1); }
  missionComplete() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.22), i * 110));
  }
  busted() { this._tone(392, 0.3, 'sawtooth', 0.18, 196); setTimeout(() => this._tone(196, 0.5, 'sawtooth', 0.18, 98), 280); }
  click() { this._tone(800, 0.05, 'sine', 0.12); }
}
