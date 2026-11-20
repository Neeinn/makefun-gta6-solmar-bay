// Money ledger, fare stats, and localStorage save / load.
import { SAVE_KEY } from './config.js';

export class Economy {
  constructor() {
    this.totalEarned = 0;
    this.missionsDone = 0;
    this.faresDone = 0;
    this.carsStolen = 0;
    this.shotsFired = 0;
  }

  recordMission(pay) {
    this.totalEarned += pay;
    this.missionsDone += 1;
  }

  recordFare(pay) {
    this.totalEarned += pay;
    this.faresDone += 1;
  }

  recordSteal() {
    this.carsStolen += 1;
  }

  save(state) {
    try {
      const data = {
        money: state.player.money,
        health: state.player.health,
        ammo: state.player.ammo,
        missionIndex: state.missions.index,
        totalEarned: this.totalEarned,
        missionsDone: this.missionsDone,
        faresDone: this.faresDone,
        carsStolen: this.carsStolen,
        px: state.player.x,
        py: state.player.y,
        radio: state.audio.station,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  hasSave() {
    try {
      return !!window.localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  applySave(state, data) {
    state.player.money = data.money ?? 150;
    state.player.health = data.health ?? 100;
    state.player.ammo = data.ammo ?? 48;
    state.player.x = data.px ?? 1800;
    state.player.y = data.py ?? 900;
    state.missions.index = data.missionIndex ?? 0;
    this.totalEarned = data.totalEarned ?? 0;
    this.missionsDone = data.missionsDone ?? 0;
    this.faresDone = data.faresDone ?? 0;
    this.carsStolen = data.carsStolen ?? 0;
    if (typeof data.radio === 'number') state.audio.setStation(data.radio);
  }
}
