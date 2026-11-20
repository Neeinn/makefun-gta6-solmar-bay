// PlayerOnFoot + CarPhysics: walk/run, steal and drive cars, collisions.
import { CITY, TUNE } from './config.js';
import { clamp, dist2 } from './random.js';
import { buildingAt } from './city.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: 0, speed: 0,
    onFoot: true, health: 100, money: 250,
    car: null, // {x, y, angle, speed, color} while driving
  };
}

export function stepPlayer(p, input, dt, city) {
  const ax = input.axis();
  if (p.onFoot) {
    const run = input.held.has('run');
    const top = run ? TUNE.runSpeed : TUNE.walkSpeed;
    const mx = ax.x, my = ax.y;
    const len = Math.hypot(mx, my) || 1;
    const moving = mx !== 0 || my !== 0;
    if (moving) p.angle = Math.atan2(my, mx);
    const step = moving ? top * dt : 0;
    const nx = p.x + (mx / len) * step;
    const ny = p.y + (my / len) * step;
    if (!buildingAt(city, nx, p.y, 10)) p.x = clamp(nx, 30, CITY.width - 30);
    if (!buildingAt(city, p.x, ny, 10)) p.y = clamp(ny, 30, CITY.height - 30);
    p.speed = moving ? top : 0;
    return;
  }
  const c = p.car;
  if (!c) return;
  // W (axis.y < 0) is the accelerator, S brakes/reverses.
  const accel = ax.y < 0 ? TUNE.carAccel : ax.y > 0 ? -TUNE.carReverse : 0;
  c.speed = clamp(c.speed + accel * dt - c.speed * TUNE.carDrag * dt, -140, TUNE.carMax);
  if (Math.abs(c.speed) > 20) {
    const steer = ax.x * TUNE.carTurn * dt * (c.speed > 0 ? 1 : -1);
    c.angle += steer * Math.min(1, Math.abs(c.speed) / 120);
  }
  const nx = c.x + Math.cos(c.angle) * c.speed * dt;
  const ny = c.y + Math.sin(c.angle) * c.speed * dt;
  if (buildingAt(city, nx, ny, 16)) {
    c.speed *= -0.25; // bounce off the wall
  } else {
    c.x = clamp(nx, 30, CITY.width - 30);
    c.y = clamp(ny, 30, CITY.height - 30);
  }
  p.x = c.x; p.y = c.y; p.angle = c.angle;
  p.speed = Math.abs(c.speed);
}

export function nearestCar(p, cars) {
  let best = null, bestD = 70 * 70;
  for (const c of cars) {
    if (c.stolen) continue;
    const d = dist2(p.x, p.y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function enterCar(p, car) {
  p.onFoot = false;
  p.car = { x: car.x, y: car.y, angle: car.angle, speed: 0, color: car.color };
  car.stolen = true;
}

export function exitCar(p) {
  if (!p.car) return;
  p.onFoot = true;
  p.x = p.car.x + 40;
  p.y = p.car.y;
  p.car = null;
  p.speed = 0;
}
