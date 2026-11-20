// Wanted level, heat decay, and police cars that chase the player.
import { CITY_W, CITY_H } from './config.js';
import { makeRng, rangeRng } from './random.js';

export class WantedSystem {
  constructor() {
    this.stars = 0;
    this.heat = 0; // 0..100, stars derive from it
    this.bustedTimer = 0;
    this.police = [];
    this.spawnCooldown = 0;
  }

  addHeat(amount) {
    this.heat = Math.min(100, this.heat + amount);
    this.updateStars();
  }

  setStars(n) {
    this.stars = Math.max(0, Math.min(3, n));
    this.heat = this.stars === 0 ? 0 : this.stars === 1 ? 20 : this.stars === 2 ? 50 : 80;
  }

  updateStars() {
    this.stars = this.heat >= 75 ? 3 : this.heat >= 45 ? 2 : this.heat >= 15 ? 1 : 0;
  }

  // Heat fades while the player lays low (not committing crimes, not speeding near police).
  decay(dt, committingCrime) {
    if (!committingCrime && this.heat > 0) {
      this.heat = Math.max(0, this.heat - dt * 2.2);
      this.updateStars();
    }
  }

  wantedCount() {
    return this.stars === 0 ? 0 : this.stars === 1 ? 1 : this.stars === 2 ? 2 : 4;
  }

  update(dt, player, rng) {
    this.spawnCooldown -= dt;
    const want = this.wantedCount();
    while (this.police.length < want && this.spawnCooldown <= 0) {
      this.spawnCooldown = 0.8;
      const ang = rng() * Math.PI * 2;
      const dist = 520;
      this.police.push({
        x: Math.max(60, Math.min(CITY_W - 60, player.x + Math.cos(ang) * dist)),
        y: Math.max(60, Math.min(CITY_H - 60, player.y + Math.sin(ang) * dist)),
        angle: 0,
        speed: 0,
        color: '#2f6fd6',
        siren: rng() * Math.PI * 2,
        stuck: 0,
      });
    }
    if (this.police.length > want) this.police.length = want;
    for (const cop of this.police) {
      const dx = player.x - cop.x;
      const dy = player.y - cop.y;
      const d = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - cop.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
      const top = 260 + this.stars * 55;
      cop.speed = Math.min(top, cop.speed + 320 * dt);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      cop.siren += dt * 9;
      // Ram the player when close: damage on foot, shove when driving.
      if (d < 46) {
        if (player.onFoot) {
          player.takeDamage(9 * dt * 10 * 0.12);
        } else if (player.inCar) {
          player.inCar.speed *= 0.94;
          player.takeDamage(2 * dt);
        }
      }
      // Busted if a cop sits on top of the player on foot for a while.
      if (d < 34 && player.onFoot) {
        this.bustedTimer += dt;
      } else {
        this.bustedTimer = Math.max(0, this.bustedTimer - dt * 2);
      }
    }
  }

  get busted() {
    return this.bustedTimer > 2.2;
  }

  clear() {
    this.stars = 0;
    this.heat = 0;
    this.police = [];
    this.bustedTimer = 0;
  }
}

export function crimeHeatFor(kind) {
  if (kind === 'steal') return 18;
  if (kind === 'shoot') return 12;
  if (kind === 'hitPed') return 10;
  if (kind === 'speeding') return 4;
  return 5;
}
