// WantedSystem + PoliceAI: stars rise with crime, police chase and ram,
// heat cools off when the player slips away.
import { CITY, TUNE } from './config.js';
import { clamp, angleDelta } from './random.js';

export function createWanted() {
  return { stars: 0, heat: 0, bustedTimer: 0, police: [] };
}

export function starsForHeat(heat) {
  if (heat > TUNE.starAt[2]) return 3;
  if (heat > TUNE.starAt[1]) return 2;
  if (heat > TUNE.starAt[0]) return 1;
  return 0;
}

export function addHeat(w, amount) {
  w.heat = clamp(w.heat + amount, 0, 100);
  w.stars = starsForHeat(w.heat);
}

export function stepWanted(w, dt, player, rng) {
  // Two police cars per star, spawned near the player.
  const want = w.stars * 2;
  while (w.police.length < want) {
    w.police.push({
      x: player.x + (rng() < 0.5 ? -500 : 500),
      y: player.y + (rng() < 0.5 ? -400 : 400),
      angle: 0, speed: 0,
    });
  }
  while (w.police.length > want) w.police.pop();

  if (w.stars === 0) w.heat = Math.max(0, w.heat - 2 * dt);

  for (const pc of w.police) {
    const dx = player.x - pc.x, dy = player.y - pc.y;
    const d = Math.hypot(dx, dy) || 1;
    const turn = clamp(angleDelta(pc.angle, Math.atan2(dy, dx)), -TUNE.policeTurn * dt, TUNE.policeTurn * dt);
    pc.angle += turn;
    pc.speed = clamp(pc.speed + TUNE.policeAccel * dt, 0, TUNE.policeTop);
    pc.x = clamp(pc.x + Math.cos(pc.angle) * pc.speed * dt, 30, CITY.width - 30);
    pc.y = clamp(pc.y + Math.sin(pc.angle) * pc.speed * dt, 30, CITY.height - 30);
    if (d < 46) {
      // Ram: slow a car, hurt a pedestrian, build busted pressure.
      if (player.onFoot) {
        player.health -= 22 * dt;
        w.bustedTimer += dt;
      } else if (player.car) {
        player.car.speed *= 0.92;
      }
      if (w.bustedTimer > 2.2) return 'busted';
    }
  }
  return null;
}

export function clearWanted(w) {
  w.stars = 0; w.heat = 0; w.police = []; w.bustedTimer = 0;
}
