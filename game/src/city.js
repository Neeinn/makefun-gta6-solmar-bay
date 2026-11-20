// City layout: road grid, building blocks, park, beach and sea, district lookup.
import { CITY_W, CITY_H, DISTRICTS, PARK, BEACH_X, SEA_X, ROAD_STEP, ROAD_W } from './config.js';
import { makeRng, rangeRng, intRng } from './random.js';

export function roadCenter(index) {
  return (index + 1) * ROAD_STEP;
}

export function isOnRoad(x, y) {
  const rx = x % ROAD_STEP;
  const ry = y % ROAD_STEP;
  const half = ROAD_W / 2;
  const nearV = rx < half || rx > ROAD_STEP - half;
  const nearH = ry < half || ry > ROAD_STEP - half;
  return nearV || nearH;
}

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const cols = Math.floor(CITY_W / ROAD_STEP);
  const rows = Math.floor(CITY_H / ROAD_STEP);
  const palette = ['#b08d57', '#7d8aa0', '#a06a5a', '#6a8a7d', '#93826a', '#5f7d9a', '#a08a4a', '#8a6a8a'];
  for (let cx = 0; cx < cols; cx += 1) {
    for (let cy = 0; cy < rows; cy += 1) {
      const bx = cx * ROAD_STEP + ROAD_W / 2 + 14;
      const by = cy * ROAD_STEP + ROAD_W / 2 + 14;
      const bw = ROAD_STEP - ROAD_W - 28;
      const bh = ROAD_STEP - ROAD_W - 28;
      if (bx + bw > BEACH_X - 10) continue; // beach strip stays open
      if (bx < PARK.x + PARK.w && bx + bw > PARK.x && by < PARK.y + PARK.h && by + bh > PARK.y) continue;
      if (rng() < 0.12) continue; // empty lot / plaza
      const tall = rng() < 0.3;
      buildings.push({
        x: bx, y: by, w: bw, h: bh,
        color: palette[intRng(rng, 0, palette.length - 1)],
        roof: tall ? '#4a4f5e' : '#6e5a44',
        height: tall ? intRng(rng, 3, 6) : intRng(rng, 1, 2),
        lit: rng() < 0.5,
      });
    }
  }
  const trees = [];
  for (let i = 0; i < 90; i += 1) {
    trees.push({
      x: rangeRng(rng, PARK.x + 20, PARK.x + PARK.w - 20),
      y: rangeRng(rng, PARK.y + 20, PARK.y + PARK.h - 20),
      r: rangeRng(rng, 10, 18),
    });
  }
  for (let i = 0; i < 40; i += 1) {
    trees.push({
      x: rangeRng(rng, BEACH_X + 10, SEA_X - 20),
      y: rangeRng(rng, 100, CITY_H - 100),
      r: rangeRng(rng, 8, 14),
    });
  }
  return { buildings, trees, cols, rows };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Solmar Bay';
}

export function collidesWithBuildings(buildings, x, y, radius) {
  for (const b of buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) {
      return b;
    }
  }
  return null;
}

export function clampToCity(x, y, margin) {
  return {
    x: Math.max(margin, Math.min(CITY_W - margin, x)),
    y: Math.max(margin, Math.min(CITY_H - margin, y)),
  };
}
