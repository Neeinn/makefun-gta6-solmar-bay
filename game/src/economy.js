// Economy + SaveSystem: money and localStorage save/load.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.player.money,
      health: state.player.health,
      missionIndex: state.missions.index,
      done: state.missions.done,
      x: state.player.x,
      y: state.player.y,
      kills: state.combat.kills,
      time: state.elapsed,
    }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}
