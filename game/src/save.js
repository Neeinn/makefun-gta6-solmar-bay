// Save and load for Solmar Bay — localStorage only, no files, no network.
// Saves money, health, mission progress, position and wanted level.

import { CFG } from './config.js';

export function saveGame(G) {
  const data = {
    version: 1,
    money: G.player.money,
    health: G.player.health,
    missionIndex: G.missions.index,
    stepIndex: G.missions.stepIndex,
    wanted: G.player.wanted,
    x: G.player.pos.x,
    z: G.player.pos.z,
    heading: G.player.heading,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(CFG.saveKey, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(CFG.saveKey); } catch (err) { /* storage unavailable */ }
}
