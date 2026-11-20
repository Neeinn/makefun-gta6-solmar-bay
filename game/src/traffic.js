// Traffic cars and pedestrians wandering the city.
import { CITY_W, CITY_H, ROAD_STEP, CAR_MAX_SPEED } from './config.js';
import { makeRng, rangeRng, intRng, pickFrom } from './random.js';
import { roadCenter, isOnRoad, collidesWithBuildings } from './city.js';

const CAR_COLORS = ['#d64545', '#3d7dd6', '#e8c93d', '#e8e8e8', '#3d3d3d', '#6ab04c', '#d67db0', '#7d5ad6', '#e07b2e'];
const PED_COLORS = ['#e8a0a0', '#a0c8e8', '#c8e8a0', '#e8d0a0', '#d0a0e8', '#a0e8d8', '#f0f0f0', '#c08050'];
const CAR_NAMES = ['Comet', 'Vagabond', 'Sunrunner', 'Marlin', 'Prowler', 'Dune Buggy', 'Harbor Van', 'City Cab'];

export function spawnTrafficCars(seed, count) {
  const rng = makeRng(seed + 101);
  const cars = [];
  const cols = Math.floor(CITY_W / ROAD_STEP);
  const rows = Math.floor(CITY_H / ROAD_STEP);
  for (let i = 0; i < count; i += 1) {
    const horizontal = rng() < 0.5;
    const lane = intRng(rng, 0, horizontal ? rows - 2 : cols - 2);
    const along = rangeRng(rng, 100, (horizontal ? CITY_W : CITY_H) - 100);
    const dir = rng() < 0.5 ? 1 : -1;
    const x = horizontal ? along : roadCenter(lane) + (dir > 0 ? 12 : -12);
    const y = horizontal ? roadCenter(lane) + (dir > 0 ? 12 : -12) : along;
    cars.push({
      id: i,
      kind: 'traffic',
      name: pickFrom(rng, CAR_NAMES),
      x, y,
      angle: horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: rangeRng(rng, 90, 170),
      color: pickFrom(rng, CAR_COLORS),
      taxi: rng() < 0.14,
      parked: false,
      horizontal, lane, dir,
      wobble: rng() * Math.PI * 2,
    });
  }
  return cars;
}

export function spawnParkedCars(seed, count, buildings) {
  const rng = makeRng(seed + 202);
  const cars = [];
  let tries = 0;
  while (cars.length < count && tries < 600) {
    tries += 1;
    const x = rangeRng(rng, 120, CITY_W - 300);
    const y = rangeRng(rng, 120, CITY_H - 120);
    if (!isOnRoad(x, y)) continue;
    if (collidesWithBuildings(buildings, x, y, 26)) continue;
    if (cars.some((c) => Math.hypot(c.x - x, c.y - y) < 90)) continue;
    cars.push({
      id: 1000 + cars.length,
      kind: 'parked',
      name: pickFrom(rng, CAR_NAMES),
      x, y,
      angle: pickFrom(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      speed: 0,
      color: pickFrom(rng, CAR_COLORS),
      taxi: rng() < 0.2,
      parked: true,
      horizontal: rng() < 0.5,
      lane: 0, dir: 1,
    });
  }
  return cars;
}

export function updateTrafficCar(car, dt, rngJitter) {
  if (car.parked) return;
  const step = car.speed * car.dir * dt;
  if (car.horizontal) {
    car.x += step;
    if (car.x > CITY_W - 60) { car.x = CITY_W - 60; car.dir = -1; car.angle = Math.PI; }
    if (car.x < 60) { car.x = 60; car.dir = 1; car.angle = 0; }
    car.y = roadCenter(car.lane) + (car.dir > 0 ? 12 : -12) + Math.sin(car.wobble) * 2;
  } else {
    car.y += step;
    if (car.y > CITY_H - 60) { car.y = CITY_H - 60; car.dir = -1; car.angle = -Math.PI / 2; }
    if (car.y < 60) { car.y = 60; car.dir = 1; car.angle = Math.PI / 2; }
    car.x = roadCenter(car.lane) + (car.dir > 0 ? 12 : -12) + Math.sin(car.wobble) * 2;
  }
  car.wobble += dt * 0.7;
}

// Simple arcade driving for the car the player is in.
export function driveCar(car, input, dt, buildings) {
  const ax = input.axis();
  if (ax.y < 0) car.speed = Math.min(CAR_MAX_SPEED, car.speed + 420 * dt);
  else if (ax.y > 0) car.speed = Math.max(-170, car.speed - 420 * dt);
  else car.speed *= Math.max(0, 1 - 1.6 * dt);
  const steer = ax.x * (car.speed >= 0 ? 1 : -1);
  car.angle += steer * 2.1 * dt * Math.min(1, Math.abs(car.speed) / 120);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!collidesWithBuildings(buildings, nx, ny, 20)) {
    car.x = nx;
    car.y = ny;
  } else {
    car.speed *= -0.25;
  }
  car.x = Math.max(30, Math.min(CITY_W - 30, car.x));
  car.y = Math.max(30, Math.min(CITY_H - 30, car.y));
  car.parked = false;
}

export function spawnPedestrians(seed, count) {
  const rng = makeRng(seed + 303);
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    peds.push({
      id: i,
      x: rangeRng(rng, 100, CITY_W - 200),
      y: rangeRng(rng, 100, CITY_H - 100),
      angle: rangeRng(rng, 0, Math.PI * 2),
      speed: rangeRng(rng, 28, 62),
      color: pickFrom(rng, PED_COLORS),
      targetX: rangeRng(rng, 100, CITY_W - 200),
      targetY: rangeRng(rng, 100, CITY_H - 100),
      panic: 0,
    });
  }
  return peds;
}

export function updatePedestrian(ped, dt, buildings) {
  const dx = ped.targetX - ped.x;
  const dy = ped.targetY - ped.y;
  const d = Math.hypot(dx, dy);
  if (d < 24) {
    ped.targetX = Math.random() * (CITY_W - 200) + 100;
    ped.targetY = Math.random() * (CITY_H - 100) + 100;
    return;
  }
  const sp = ped.speed * (ped.panic > 0 ? 2.4 : 1);
  const nx = ped.x + (dx / d) * sp * dt;
  const ny = ped.y + (dy / d) * sp * dt;
  if (!collidesWithBuildings(buildings, nx, ny, 8)) {
    ped.x = nx;
    ped.y = ny;
  }
  ped.angle = Math.atan2(dy, dx);
  if (ped.panic > 0) ped.panic -= dt;
}
