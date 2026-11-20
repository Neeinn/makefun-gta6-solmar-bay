// TrafficSystem: cars follow the road grid and turn at intersections.
// PedestrianSystem: walkers wander the sidewalks and change direction.
import { CITY, PALETTE } from './config.js';
import { pick, clamp } from './random.js';

const PED_COLORS = ['#e8e8e8', '#ff6b6b', '#6bc9ff', '#ffd23f', '#c96bff'];

export function createTraffic(rng, city) {
  const cars = [];
  for (let i = 0; i < 26; i++) {
    const vertical = rng() < 0.5;
    const lane = rng() < 0.5 ? -14 : 14;
    cars.push({
      x: vertical ? pick(rng, city.roadsV) + lane : 150 + rng() * (CITY.width - 300),
      y: vertical ? 150 + rng() * (CITY.height - 300) : pick(rng, city.roadsH) + lane,
      angle: vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      speed: 90 + rng() * 70,
      color: pick(rng, PALETTE.traffic),
      vertical,
      w: 34, h: 18,
      turnAt: 0,
      stolen: false,
    });
  }

  const peds = [];
  for (let i = 0; i < 40; i++) {
    peds.push({
      x: 100 + rng() * (CITY.width - 200),
      y: 100 + rng() * (CITY.height - 200),
      angle: rng() * Math.PI * 2,
      speed: 28 + rng() * 22,
      color: pick(rng, PED_COLORS),
      changeAt: rng() * 4,
    });
  }

  function step(dt) {
    for (const c of cars) {
      if (c.stolen) continue; // a stolen car is driven by the player, not traffic
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      c.turnAt -= dt;
      if (c.turnAt <= 0) {
        const nearV = city.roadsV.find((rx) => Math.abs(c.x - rx) < 20);
        const nearH = city.roadsH.find((ry) => Math.abs(c.y - ry) < 20);
        if (nearV !== undefined && nearH !== undefined && rng() < 0.5) {
          c.angle = rng() < 0.5 ? 0 : Math.PI / 2;
          if (rng() < 0.5) c.angle += Math.PI;
          c.turnAt = 2 + rng() * 3;
        }
      }
      if (c.x < 40) { c.x = 40; c.angle = 0; }
      if (c.x > CITY.width - 40) { c.x = CITY.width - 40; c.angle = Math.PI; }
      if (c.y < 40) { c.y = 40; c.angle = Math.PI / 2; }
      if (c.y > CITY.height - 40) { c.y = CITY.height - 40; c.angle = -Math.PI / 2; }
    }
    for (const p of peds) {
      p.changeAt -= dt;
      if (p.changeAt <= 0) {
        p.angle = rng() * Math.PI * 2;
        p.changeAt = 2 + rng() * 4;
      }
      p.x = clamp(p.x + Math.cos(p.angle) * p.speed * dt, 40, CITY.width - 40);
      p.y = clamp(p.y + Math.sin(p.angle) * p.speed * dt, 40, CITY.height - 40);
    }
  }

  return { cars, peds, step };
}
