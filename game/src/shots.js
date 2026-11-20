// Staged screenshot modes: deterministic scenes for ?shot=...&seed=...
// start = title view, drive = behind the wheel downtown, chase = police pursuit,
// mission = warehouse shootout in progress.
import { SPOTS } from './missions.js';

export function parseShotQuery(search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || '1') || 1;
  if (!shot) return null;
  return { shot, seed };
}

export function applyShotMode(state, shotName, seed) {
  const p = state.player;
  const w = state.wanted;
  const m = state.missions;
  if (shotName === 'start') {
    state.mode = 'title';
    state.titleSelected = 0;
    p.x = 1800;
    p.y = 900;
    return 'start';
  }
  state.mode = 'play';
  if (shotName === 'drive') {
    // Player driving a taxi through Downtown Solmar with traffic around.
    const taxi = state.parkedCars.find((c) => c.taxi) || state.parkedCars[0];
    taxi.x = 1800;
    taxi.y = 900;
    taxi.angle = 0;
    taxi.speed = 240;
    p.inCar = taxi;
    p.onFoot = false;
    taxi.parked = false;
    p.x = taxi.x;
    p.y = taxi.y;
    m.index = 0;
    m.stage = 'carry';
    m.active = true;
    m.say('Fare picked up. Drive them to Solmar Pier.');
    // Bring a few traffic cars into frame so the street feels alive.
    const nearSpots = [
      { x: 1800, y: 600, angle: Math.PI / 2 },
      { x: 2100, y: 900, angle: Math.PI },
      { x: 1800, y: 1200, angle: -Math.PI / 2 },
      { x: 1500, y: 900, angle: 0 },
      { x: 2100, y: 1200, angle: Math.PI / 2 },
    ];
    state.trafficCars.slice(0, 5).forEach((car, i) => {
      car.x = nearSpots[i].x;
      car.y = nearSpots[i].y;
      car.angle = nearSpots[i].angle;
      car.speed = 120;
    });
    return 'drive';
  }
  if (shotName === 'chase') {
    // Player in a fast car at 3 stars with four police cars closing in.
    const car = state.parkedCars[0];
    car.x = 1800;
    car.y = 1500;
    car.angle = -Math.PI / 2;
    car.speed = 300;
    p.inCar = car;
    p.onFoot = false;
    car.parked = false;
    p.x = car.x;
    p.y = car.y;
    w.setStars(3);
    const rng = state.rng;
    for (let i = 0; i < 4; i += 1) {
      const ang = (i / 4) * Math.PI * 2 + 0.4;
      w.police.push({
        x: p.x + Math.cos(ang) * 260,
        y: p.y + Math.sin(ang) * 260,
        angle: ang + Math.PI,
        speed: 280,
        color: '#2f6fd6',
        siren: i * 1.7,
        stuck: 0,
      });
    }
    m.index = 6;
    m.stage = 'survive';
    m.surviveLeft = 18;
    m.active = true;
    m.say('The whole force is after you. Survive 30 seconds at 3 wanted stars!');
    return 'chase';
  }
  if (shotName === 'mission') {
    // Warehouse shootout: player on foot, pistol out, rivals in the docks.
    p.x = 3000;
    p.y = 1050;
    p.onFoot = true;
    p.inCar = null;
    p.ammo = 72;
    p.health = 100;
    m.index = 4;
    m.stage = 'fight';
    m.active = true;
    m.armedOnce = true;
    m.armWarehouse(state);
    m.say('Rivals took the East Docks warehouse. Clear out all 6 armed guards.');
    state.combat.spawnPickup(3000, 1110, 'health');
    state.combat.spawnPickup(3000, 990, 'ammo');
    return 'mission';
  }
  return null;
}
