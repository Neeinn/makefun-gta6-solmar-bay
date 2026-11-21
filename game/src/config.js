// Solmar Bay — tuning, districts and the story mission list.
// All numbers are game design, written for this entry.

export const CFG = {
  worldHalf: 200,          // city spans -200..200 on x and z
  roadGap: 40,             // distance between parallel roads
  roadHalfWidth: 5,        // half width of a road surface
  walkSpeed: 8,
  runSpeed: 13,
  carAccel: 26,
  carBrake: 42,
  carMaxSpeed: 46,
  carReverseMax: 14,
  carTurn: 1.9,
  playerMaxHealth: 100,
  punchDamage: 14,
  punchRange: 2.8,
  punchCooldown: 0.45,
  wantedDecaySeconds: 26,
  policeRamDamage: 0,     // police ram slows the car instead of damaging it
  saveKey: 'solmar-bay-save-v1',
  startMoney: 250,
  startPos: { x: 0, z: 120 },
};

// Ten districts of Solmar Bay. Each is a rectangle; the HUD names the one
// the player is standing in. Bounds are [minX, minZ, maxX, maxZ].
export const DISTRICTS = [
  { name: 'Marina Bay',     bounds: [-200, -200, -100, -100] },
  { name: 'Neon Row',       bounds: [-100, -200,    0, -100] },
  { name: 'Downtown',       bounds: [   0, -200,  100, -100] },
  { name: 'Vista Heights',  bounds: [ 100, -200,  200, -100] },
  { name: 'Old Town',       bounds: [-200, -100, -100,    0] },
  { name: 'Palm Court',     bounds: [-100, -100,    0,    0] },
  { name: 'Solmar Hills',   bounds: [   0, -100,  100,    0] },
  { name: 'Harbor Docks',   bounds: [ 100, -100,  200,  100] },
  { name: 'Coral Beach',    bounds: [-200,    0,    0,  200] },
  { name: 'Fish Market',    bounds: [   0,    0,  200,  200] },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    const b = d.bounds;
    if (x >= b[0] && x < b[2] && z >= b[1] && z < b[3]) return d.name;
  }
  return 'Solmar Bay';
}

// Mission list. Every step is one objective; the engine in missions.js
// reads step.type and drives the HUD, the beacon and the rewards.
//   goto    — reach a point (radius)
//   enterCar— get into any car, then the step completes
//   collect — pick up N glowing items at fixed spots, then goto the drop
//   defeat  — beat N thugs that spawn in an area
//   wanted  — raise the wanted level to the given stars
//   escape  — reach a point while wanted is at least the given stars
//   timed   — a goto with a countdown (seconds)
export const MISSIONS = [
  {
    title: '1 — New in Town',
    giver: 'Rosa',
    brief: 'Milo Ferran just rolled into Solmar Bay with $250 and a borrowed jacket. Rosa is waiting at Palm Court plaza. Walk over and say hello.',
    payout: 200,
    steps: [
      { type: 'goto', label: 'Walk to Rosa at Palm Court plaza', x: 0, z: 60, radius: 6 },
    ],
  },
  {
    title: '2 — Borrowed Wheels',
    giver: 'Rosa',
    brief: 'Rosa needs a car and the city is full of them. Take any parked car — nobody locks their doors in Solmar Bay — and bring it to the garage on Neon Row.',
    payout: 350,
    steps: [
      { type: 'enterCar', label: 'Steal a parked car (press E near one)' },
      { type: 'goto', label: 'Drive the car to the garage on Neon Row', x: -80, z: -120, radius: 7 },
    ],
  },
  {
    title: '3 — Package Run',
    giver: 'Rosa',
    brief: 'Three packages are stashed around Old Town and Palm Court. Pick them all up and drop them at the Fish Market. Cops do not like couriers, so stay cool.',
    payout: 500,
    steps: [
      { type: 'collect', label: 'Collect the 3 packages', count: 3,
        spots: [{ x: -120, z: -40 }, { x: -40, z: -40 }, { x: 0, z: 40 }],
        drop: { x: 120, z: 120, radius: 7 }, dropLabel: 'Deliver the packages to the Fish Market' },
    ],
  },
  {
    title: '4 — Heat Wave',
    giver: 'Dante',
    brief: 'Dante wants to know if you can handle heat. Get the cops to 2 stars — smash something, steal a car, make noise — then lose them at the safehouse in Vista Heights.',
    payout: 600,
    steps: [
      { type: 'wanted', label: 'Raise your wanted level to 2 stars', stars: 2 },
      { type: 'escape', label: 'Reach the Vista Heights safehouse while wanted', x: 160, z: -160, radius: 8, stars: 2 },
    ],
  },
  {
    title: '5 — Dockside Muscle',
    giver: 'Dante',
    brief: 'A crew of dock thugs is shaking down Dante’s drivers at Harbor Docks. Go on foot and punch all three of them out. Press F to punch.',
    payout: 700,
    steps: [
      { type: 'goto', label: 'Go to Harbor Docks', x: 160, z: 20, radius: 10 },
      { type: 'defeat', label: 'Beat up the 3 dock thugs', count: 3, area: { x: 150, z: 40, r: 22 } },
    ],
  },
  {
    title: '6 — Getaway Driver',
    giver: 'Rosa',
    brief: 'Rosa’s friend needs a fast ride out of Downtown with the cops already on 2 stars. Pick him up at the plaza and drop him at Coral Beach before the timer runs out.',
    payout: 900,
    steps: [
      { type: 'enterCar', label: 'Get in a car' },
      { type: 'goto', label: 'Pick up the passenger in Downtown', x: 40, z: -140, radius: 7 },
      { type: 'timed', label: 'Drive the passenger to Coral Beach — fast!', x: -120, z: 120, radius: 8, seconds: 75 },
    ],
  },
  {
    title: '7 — Beachfront Heist',
    giver: 'Dante',
    brief: 'Four bags of cash are buried in the sand along Coral Beach. Grab them all while the beach patrol is watching — the heat is already on 1 star.',
    payout: 1200,
    steps: [
      { type: 'collect', label: 'Grab the 4 cash bags on Coral Beach', count: 4,
        spots: [{ x: -160, z: 170 }, { x: -100, z: 180 }, { x: -40, z: 165 }, { x: -120, z: 120 }],
        drop: { x: -160, z: 60, radius: 7 }, dropLabel: 'Drop the bags at the beach shack' },
    ],
  },
  {
    title: '8 — King of the Bay',
    giver: 'Rosa',
    brief: 'One last job. The bay boss, Vito Marlowe, is holding court at the yacht club. Beat him in a fist fight, then take the boat ramp at Marina Bay and own this city.',
    payout: 1500,
    steps: [
      { type: 'goto', label: 'Go to the yacht club at Marina Bay', x: -160, z: -160, radius: 10 },
      { type: 'defeat', label: 'Beat Vito Marlowe', count: 1, boss: true, area: { x: -160, z: -160, r: 18 } },
      { type: 'goto', label: 'Take the boat ramp and finish the story', x: -180, z: -120, radius: 8 },
    ],
  },
];

export const CAR_COLORS = [
  0xd43d2a, 0x2a6fd4, 0xf2c230, 0x37b24d, 0x8e44ad, 0xe67e22,
  0xe8e8e8, 0x222831, 0x0f9ba8, 0xc2185b, 0x7cb342, 0x5d4037,
];

export const PED_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c,
  0xecf0f1, 0xfd79a8, 0x00cec9, 0x6c5ce7, 0xd63031, 0x00b894,
];
