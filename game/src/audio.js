// Synthesized WebAudio radio: three stations, each its own tempo and pattern.
// No audio files — every note is generated live with oscillators.
import { RADIO } from './config.js';

const SCALES = {
  major: [0, 2, 4, 7, 9],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export class RadioPlayer {
  constructor() {
    this.ctx = null;
    this.station = 0;
    this.enabled = false;
    this.step = 0;
    this.nextTime = 0;
    this.master = null;
    this.muted = false;
  }

  get name() {
    return RADIO[this.station].name;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      this.nextTime = this.ctx.currentTime + 0.1;
    } catch {
      this.ctx = null;
    }
  }

  setStation(n) {
    this.station = ((n % RADIO.length) + RADIO.length) % RADIO.length;
    this.step = 0;
  }

  nextStation() {
    this.setStation(this.station + 1);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.16;
  }

  note(freq, when, dur, type, vol) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  schedule(dt) {
    if (!this.ctx || !this.enabled || this.muted) return;
    const st = RADIO[this.station];
    const beat = 60 / st.bpm / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const scale = st.minor ? SCALES.minor : SCALES.major;
      const stepInBar = this.step % 16;
      // Bass on beats 0, 4, 8, 12 (root, or fifth on 8).
      if (stepInBar % 4 === 0) {
        const f = st.root * (stepInBar === 8 ? 1.5 : 1);
        this.note(f, this.nextTime, beat * 2.2, 'sine', 0.5);
      }
      // Lead pluck: pentatonic wander, denser on the fast station.
      const density = st.bpm > 120 ? 0.62 : st.bpm > 90 ? 0.45 : 0.34;
      if (Math.random() < density) {
        const deg = scale[Math.floor(Math.random() * scale.length)];
        const oct = Math.random() < 0.3 ? 4 : 2;
        const f = st.root * oct * Math.pow(2, deg / 12);
        this.note(f, this.nextTime, beat * 1.4, st.wave, 0.22);
      }
      // Hat tick on off-beats for the fast station.
      if (st.bpm > 120 && stepInBar % 2 === 1) {
        this.note(5200, this.nextTime, 0.03, 'square', 0.05);
      }
      this.step += 1;
      this.nextTime += beat;
    }
  }

  blip(freq, dur) {
    if (!this.ctx) return;
    this.note(freq, this.ctx.currentTime, dur, 'square', 0.12);
  }
}
