// audio.js — all sound is synthesized with WebAudio. No audio files.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null;
    this.musicTimer = null; this.musicStep = 0; this.sirenOsc = null; this.sirenGain = null;
    this.muted = false; this.started = false;
  }
  init() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 700;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.started = true;
      this.startMusic();
    } catch (e) { /* audio unavailable: game still plays */ }
  }
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    // A slow, sunny bass-and-keys loop in A minor, scheduled step by step.
    const bass = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 82.41, 0, 73.42, 0];
    const lead = [220, 261.63, 329.63, 261.63, 220, 0, 196, 246.94, 220, 261.63, 329.63, 392, 329.63, 261.63, 246.94, 220];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const i = this.musicStep % 16;
      this.musicStep++;
      if (bass[i]) this.note(bass[i], 0.42, 'triangle', 0.16);
      if (lead[i]) this.note(lead[i], 0.38, 'sine', 0.05);
      if (i % 4 === 0) this.note(110, 0.1, 'square', 0.03);
    }, 300);
  }
  note(freq, dur, type, vol) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  setEngine(ratio, inCar) {
    if (!this.ctx || !this.engineOsc) return;
    const target = inCar ? 0.05 + ratio * 0.11 : 0.0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(48 + ratio * 130, this.ctx.currentTime, 0.08);
  }
  setSiren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'sine';
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0.035;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      let hi = false;
      this.sirenOsc._iv = setInterval(() => { hi = !hi; this.sirenOsc.frequency.value = hi ? 880 : 660; }, 450);
    } else if (!on && this.sirenOsc) {
      clearInterval(this.sirenOsc._iv);
      try { this.sirenOsc.stop(); } catch (e) {}
      this.sirenOsc = null; this.sirenGain = null;
    }
  }
  shoot() { if (this.ctx) { this.note(900, 0.09, 'square', 0.12); this.note(180, 0.12, 'sawtooth', 0.1); } }
  punch() { if (this.ctx) this.note(90, 0.12, 'sine', 0.22); }
  ding() { if (this.ctx) { this.note(880, 0.15, 'sine', 0.12); setTimeout(() => this.note(1318, 0.25, 'sine', 0.12), 110); } }
  crash() { if (this.ctx) this.note(70, 0.25, 'sawtooth', 0.2); }
  missionDone() {
    if (!this.ctx) return;
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.note(f, 0.3, 'triangle', 0.14), i * 130));
  }
}
