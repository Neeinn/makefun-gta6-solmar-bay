// save.js — save / load the game state in localStorage.
const KEY = 'solmar-bay-save-v1';
export function saveGame(state) {
  try {
    const data = {
      money: state.money, health: state.health, missionIndex: state.missionIndex,
      missionsDone: state.missionsDone, wanted: 0,
      px: state.playerPos.x, py: state.playerPos.y, pz: state.playerPos.z,
      heading: state.playerHeading, savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
export function hasSave() { return loadGame() !== null; }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }
