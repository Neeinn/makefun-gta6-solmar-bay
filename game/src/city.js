// City generation: road grid, building blocks, beach, park and props.
// Roads run every 300 px; buildings fill the blocks between them.
import { CITY, DISTRICTS, PALETTE } from './config.js';
import { pick } from './random.js';

export function createCity(rng) {
  const roadsV = [];
  for (let x = 300; x < CITY.width; x += 300) roadsV.push(x);
  const roadsH = [];
  for (let y = 300; y < CITY.height; y += 300) roadsH.push(y);

  const buildings = [];
  for (let bx = 0; bx < 11; bx++) {
    for (let by = 0; by < 8; by++) {
      const x0 = bx * 300 + 40, y0 = by * 300 + 40;
      if (x0 > 3300 || y0 > 2300) continue;
      if (bx === 0 && by >= 5) continue; // beach strip stays open on the far west
      if (bx >= 6 && bx <= 7 && by === 3) continue; // Central Park stays open
      const count = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < count; i++) {
        buildings.push({
          x: x0 + (i * 130) % 140,
          y: y0 + Math.floor(i / 2) * 120,
          w: 90 + rng() * 110,
          h: 80 + rng() * 100,
          color: pick(rng, PALETTE.building),
          roof: rng() < 0.4,
          floors: 1 + Math.floor(rng() * 6),
        });
      }
    }
  }

  const trees = [];
  for (let i = 0; i < 220; i++) {
    trees.push({ x: 60 + rng() * (CITY.width - 120), y: 60 + rng() * (CITY.height - 120), r: 8 + rng() * 8 });
  }
  const lamps = [];
  for (const x of roadsV) for (const y of roadsH) lamps.push({ x: x + 18, y: y + 18 });

  return { roadsV, roadsH, buildings, trees, lamps, park: { x: 1830, y: 930, w: 840, h: 790, cx: 2250, cy: 1320, r: 180 } };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Solmar Bay';
}

export function buildingAt(city, x, y, pad) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

export function onRoad(city, x, y) {
  return city.roadsV.some((rx) => Math.abs(x - rx) < 42) || city.roadsH.some((ry) => Math.abs(y - ry) < 42);
}
