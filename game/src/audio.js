// WebAudio synth: engine hum, siren, shots, pickups and a 3-station radio
// loop. No audio files — every sound is synthesized.
import { RADIO_STATIONS } from './config.js';

export function createAudio() {
  let ctx = null;
  let engineOsc = null, engineGain = null;
  let musicTimer = null, station = 0, noteIndex = 0;
  let enabled = true;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol) {
    if (!enabled || !ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  function startLoop() {
    if (musicTimer || !ensure()) return;
    const play = () => {
      if (!enabled) return;
      const st = RADIO_STATIONS[station % RADIO_STATIONS.length];
      blip(st.notes[noteIndex % st.notes.length], 0.5, st.wave, st.vol);
      noteIndex += 1;
    };
    const st = RADIO_STATIONS[station % RADIO_STATIONS.length];
    musicTimer = setInterval(play, st.beat);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    toggle() { enabled = !enabled; return enabled; },
    setStation(i) {
      station = i % RADIO_STATIONS.length;
      noteIndex = 0;
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
        startLoop();
      }
    },
    shot() { blip(180, 0.12, 'sawtooth', 0.12); blip(90, 0.08, 'square', 0.08); },
    pickup() { blip(660, 0.1, 'sine', 0.1); setTimeout(() => blip(880, 0.14, 'sine', 0.1), 90); },
    crash() { blip(70, 0.25, 'sawtooth', 0.15); },
    sirenTick(high) { blip(high ? 950 : 700, 0.28, 'sine', 0.03); },
    engine(speed01) {
      if (!ensure()) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 60;
        engineGain.gain.value = 0.0;
        engineOsc.connect(engineGain).connect(ctx.destination);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speed01 * 160;
      engineGain.gain.value = 0.015 + speed01 * 0.03;
    },
    startMusic() { startLoop(); },
  };
}
