// Solmar Bay — tuning, districts, story missions and palette.
// Original city, characters and story: nothing from any commercial game.
export const FIELD = { width: 1280, height: 720 };
export const CITY = { width: 3600, height: 2600 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay.save.v1';

// Ten named districts laid out as a 4 x 3 grid over the city.
export const DISTRICTS = [
  { name: 'Marina Bay', x: 0, y: 0, w: 900, h: 900, tint: '#2e6f8e' },
  { name: 'Old Town', x: 900, y: 0, w: 900, h: 900, tint: '#8e6f2e' },
  { name: 'Downtown', x: 1800, y: 0, w: 900, h: 900, tint: '#5b6b8c' },
  { name: 'Neon Strip', x: 2700, y: 0, w: 900, h: 900, tint: '#8c2e6f' },
  { name: 'Harbor Docks', x: 0, y: 900, w: 900, h: 850, tint: '#3a5a4a' },
  { name: 'Palm Heights', x: 900, y: 900, w: 900, h: 850, tint: '#6f8e2e' },
  { name: 'Central Park', x: 1800, y: 900, w: 900, h: 850, tint: '#2e7a3a' },
  { name: 'Airport Road', x: 2700, y: 900, w: 900, h: 850, tint: '#7a6a2e' },
  { name: 'South Beach', x: 0, y: 1750, w: 1800, h: 850, tint: '#c98e3a' },
  { name: 'Sunset Hills', x: 1800, y: 1750, w: 1800, h: 850, tint: '#8c4a2e' },
];

// The story: Mara works her way from a first drive to King of Solmar.
export const MISSIONS = [
  { id: 1, title: 'Welcome to Solmar', giver: 'Mara', text: 'Drive to the Marina district.', kind: 'drive', target: { x: 420, y: 420 }, reward: 150 },
  { id: 2, title: 'The Pickup', giver: 'Mara', text: 'On foot: collect the package at the docks.', kind: 'goto', target: { x: 300, y: 1150 }, reward: 200 },
  { id: 3, title: 'Hot Delivery', giver: 'Dex', text: 'Deliver the package to Neon Strip. Lose the cops first if they spot you.', kind: 'deliver', target: { x: 3100, y: 400 }, reward: 300 },
  { id: 4, title: 'Street Race', giver: 'Dex', text: 'Race through 5 checkpoints around Downtown.', kind: 'race', target: { x: 2100, y: 500 }, reward: 400 },
  { id: 5, title: 'Warehouse Trouble', giver: 'Mara', text: 'Clear 4 rivals at the warehouse, then grab the cash.', kind: 'eliminate', target: { x: 600, y: 1400 }, reward: 500, count: 4 },
  { id: 6, title: 'Taxi Nights', giver: 'Fares', text: 'Pick up 3 fares and drop them off. Tips pay well.', kind: 'taxi', target: { x: 1500, y: 1500 }, reward: 450, count: 3 },
  { id: 7, title: 'The Getaway', giver: 'Dex', text: 'Steal the blue sports car and survive a 3-star wanted level for 30 seconds.', kind: 'escape', target: { x: 2900, y: 2000 }, reward: 600 },
  { id: 8, title: 'King of Solmar', giver: 'Mara', text: 'Final job: reach the Sunset Hills mansion and take out the last 5 rivals.', kind: 'eliminate', target: { x: 3100, y: 2100 }, reward: 1000, count: 5 },
];

export const RADIO_STATIONS = [
  { name: 'SOL 98.5 — Sunset FM', notes: [110, 130.8, 164.8, 196, 164.8, 130.8], beat: 420, wave: 'triangle', vol: 0.035 },
  { name: 'BAY WAVE 101 — synth drive', notes: [55, 55, 82.4, 110, 98, 82.4, 110, 130.8], beat: 300, wave: 'sawtooth', vol: 0.02 },
  { name: 'PALM RADIO — late-night jazz', notes: [220, 261.6, 329.6, 392, 329.6, 261.6, 196, 246.9], beat: 560, wave: 'sine', vol: 0.045 },
];

export const PALETTE = {
  grass: '#3f7d44', road: '#2b2e36', roadLine: '#e8d44d', sidewalk: '#9a938a',
  water: '#1d6f8e', sand: '#d9b96a', park: '#2e7a3a', parkLight: '#4a9a4a',
  building: ['#c96a4a', '#4a7dc9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#c94a6a'],
  player: '#ffd23f', police: '#3a6fd8', traffic: ['#d8d8d8', '#c94a4a', '#4a9ac9', '#e8a13a', '#7ac94a'],
  text: '#f2f0e8', muted: '#b8b4a8', panel: 'rgba(12,16,24,0.82)', accent: '#ff9f1c',
};
export const FONT = 'system-ui, "Segoe UI", sans-serif';

// Tuning knobs the other systems share.
export const TUNE = {
  walkSpeed: 210, runSpeed: 330,
  carAccel: 520, carReverse: 380, carMax: 420, carDrag: 0.55, carTurn: 1.9,
  policeTop: 380, policeAccel: 420, policeTurn: 2.4,
  bulletSpeed: 900, bulletLife: 0.6, bulletDamage: 34,
  enemyHealth: 50, enemyDamage: 8,
  heatSteal: 20, heatShot: 8,
  starAt: [12, 45, 75], // heat thresholds for 1, 2, 3 stars
};
