// Screenshot staging: simulate real play forward, then paint one frame.
// ?shot=start|drive|chase|mission (&seed=1) — each scene is a real game state.
import { STEP } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { startMission } from './missions.js';
import { spawnEnemies } from './combat.js';
import { addHeat } from './police.js';
import { enterCar } from './player.js';

// Move the world forward: drive the car, or walk toward the mission marker.
function simulate(state, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    state.elapsed += STEP;
    if (state.player.car) {
      const car = state.player.car;
      car.speed = Math.min(car.speed + 520 * STEP, 380);
      car.x += Math.cos(car.angle) * car.speed * STEP;
      car.y += Math.sin(car.angle) * car.speed * STEP;
      if (car.x > 3300) car.angle = Math.PI;
      state.player.x = car.x;
      state.player.y = car.y;
      state.player.speed = Math.abs(car.speed);
    } else {
      const t = state.missions.active ? state.missions.active.target : { x: 1800, y: 1300 };
      const dx = t.x - state.player.x, dy = t.y - state.player.y;
      const d = Math.hypot(dx, dy) || 1;
      state.player.x += (dx / d) * 180 * STEP;
      state.player.y += (dy / d) * 180 * STEP;
      state.player.angle = Math.atan2(dy, dx);
      state.player.speed = 180;
    }
    state.traffic.step(STEP);
  }
}

export function stageShot(name, state, rng) {
  state.player.x = 1500;
  state.player.y = 1500;
  state.player.onFoot = true;
  state.player.car = null;
  state.player.health = 100;
  state.player.money = 1250;
  startMission(state.missions, state.combat, rng, state.traffic);

  if (name === 'start') {
    simulate(state, 5);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'drive') {
    const car = state.traffic.cars[0];
    enterCar(state.player, car);
    state.player.car.angle = 0;
    state.player.car.x = 1200;
    state.player.car.y = 600;
    state.player.car.color = '#ff9f1c';
    state.player.x = 1200;
    state.player.y = 600;
    simulate(state, 6);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const car = state.traffic.cars[1];
    enterCar(state.player, car);
    state.player.car.angle = 0.2;
    state.player.car.x = 1800;
    state.player.car.y = 900;
    state.player.x = 1800;
    state.player.y = 900;
    addHeat(state.wanted, 80); // 3 stars
    for (let i = 0; i < 6; i++) {
      state.wanted.police.push({ x: 0, y: 0, angle: 0, speed: 360 });
    }
    simulate(state, 4);
    // Pull the police close to the player so the chase reads in the shot.
    state.wanted.police.forEach((pc, i) => {
      pc.x = state.player.x - 130 - i * 50;
      pc.y = state.player.y + (i - 2) * 70;
      pc.speed = 360;
      pc.angle = 0;
    });
    return { screen: SCREEN_PLAY };
  }
  // mission: on foot at the warehouse, rivals visible, objective marker up.
  state.missions.index = 4;
  state.missions.active = null;
  startMission(state.missions, state.combat, rng, state.traffic);
  state.player.x = 700;
  state.player.y = 1350;
  spawnEnemies(state.combat, 650, 1400, 4, rng);
  state.combat.ammo = 48;
  simulate(state, 2);
  state.player.x = 700;
  state.player.y = 1350;
  return { screen: SCREEN_PLAY };
}
