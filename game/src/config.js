// Solmar Bay — world constants, district names and mission data.
// Every name, place and character here is invented for this game.
export const CITY_W = 3600;
export const CITY_H = 2600;
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const DISTRICTS = [
  { name: 'Marina Point', x: 0, y: 0, w: 900, h: 650, tint: '#2e6f8e' },
  { name: 'Old Cannery', x: 900, y: 0, w: 900, h: 650, tint: '#7a6a4f' },
  { name: 'Palm Court', x: 1800, y: 0, w: 900, h: 650, tint: '#c98a3d' },
  { name: 'Coral Heights', x: 2700, y: 0, w: 900, h: 650, tint: '#4f7a5a' },
  { name: 'Harbor Lights', x: 0, y: 650, w: 900, h: 650, tint: '#3d5a80' },
  { name: 'Juniper Park', x: 900, y: 650, w: 900, h: 650, tint: '#3f7d4a' },
  { name: 'Downtown Solmar', x: 1800, y: 650, w: 900, h: 650, tint: '#5a5f8a' },
  { name: 'East Docks', x: 2700, y: 650, w: 900, h: 650, tint: '#6e5a7a' },
  { name: 'South Beach', x: 0, y: 1300, w: 1800, h: 1300, tint: '#d9b06a' },
  { name: 'Pier End', x: 1800, y: 1300, w: 1800, h: 1300, tint: '#2e7a8e' },
];

export const BEACH_X = 3300; // sand starts here; sea beyond 3450
export const SEA_X = 3450;
export const PARK = { x: 760, y: 560, w: 520, h: 460 };

export const ROAD_STEP = 300;
export const ROAD_W = 54;

export const PLAYER_SPEED = 215;
export const CAR_ACCEL = 420;
export const CAR_MAX_SPEED = 430;
export const CAR_REVERSE = 170;

export const COLORS = {
  grass: '#5da24a',
  road: '#3a3f47',
  roadLine: '#e8d44d',
  sidewalk: '#9aa0a8',
  sand: '#e8cf8f',
  sea: '#1f7fa8',
  park: '#4c8a3f',
  buildingRoof: '#8a7f72',
  player: '#ffcf3d',
  police: '#2f6fd6',
};

export const RADIO = [
  { name: 'BAY FM 88.2 — Sunset Pop', bpm: 96, root: 220, wave: 'triangle', minor: false },
  { name: 'TURBO 107 — Street Bass', bpm: 138, root: 55, wave: 'sawtooth', minor: true },
  { name: 'NIGHT DRIVE 94.5 — Neon Synth', bpm: 72, root: 164.8, wave: 'sine', minor: true },
];

export const MISSION_DEFS = [
  {
    id: 1, title: 'First Fare', giver: 'Dina',
    brief: 'Dina needs a cab. Drive the yellow taxi to the fare at Palm Court, then drop them at the pier.',
    pay: 120,
  },
  {
    id: 2, title: 'The Pickup', giver: 'Marco',
    brief: 'Marco left a package at the Old Cannery warehouse. Pick it up and bring it back to Dina.',
    pay: 200,
  },
  {
    id: 3, title: 'Hot Delivery', giver: 'Marco',
    brief: 'Deliver the package to the Neon Mile club before the timer runs out. Drive fast, stay clean.',
    pay: 350, timeLimit: 75,
  },
  {
    id: 4, title: 'Bay Grand Prix', giver: 'Rosa',
    brief: 'Rosa bets you cannot beat her street race. Hit all 5 checkpoints around Solmar Bay first.',
    pay: 600,
  },
  {
    id: 5, title: 'Warehouse Shootout', giver: 'Marco',
    brief: 'Rivals took the East Docks warehouse. Clear out all 6 armed guards. Watch your health.',
    pay: 800,
  },
  {
    id: 6, title: 'Rush Hour', giver: 'Dina',
    brief: 'Three fares, one shift. Pick up and drop off three passengers across the city.',
    pay: 500,
  },
  {
    id: 7, title: 'Heat Wave', giver: 'Rosa',
    brief: 'The whole force is after you. Survive 30 seconds at 3 wanted stars without getting busted.',
    pay: 900,
  },
  {
    id: 8, title: 'King of the Bay', giver: 'Marco',
    brief: 'Final showdown at Pier End. Take down Salvo and his crew of 8 and claim Solmar Bay.',
    pay: 2000,
  },
];

export const SAVE_KEY = 'solmar-bay-save-v1';
