// The player on foot: movement, health, ammo, entering and leaving cars.
import { PLAYER_SPEED, CITY_W, CITY_H } from './config.js';
import { collidesWithBuildings, clampToCity } from './city.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.health = 100;
    this.maxHealth = 100;
    this.ammo = 48;
    this.maxAmmo = 120;
    this.money = 150;
    this.inCar = null; // reference to a car object when driving
    this.onFoot = true;
    this.walkFrame = 0;
    this.shootCooldown = 0;
    this.hurtFlash = 0;
  }

  moveOnFoot(input, dt, buildings) {
    const ax = input.axis();
    const len = Math.hypot(ax.x, ax.y);
    if (len > 0) {
      const nx = this.x + (ax.x / len) * PLAYER_SPEED * dt;
      const ny = this.y + (ax.y / len) * PLAYER_SPEED * dt;
      if (!collidesWithBuildings(buildings, nx, this.y, 12)) this.x = nx;
      if (!collidesWithBuildings(buildings, this.x, ny, 12)) this.y = ny;
      this.angle = Math.atan2(ax.y, ax.x);
      this.walkFrame += dt * 10;
    }
    const clamped = clampToCity(this.x, this.y, 16);
    this.x = clamped.x;
    this.y = clamped.y;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.hurtFlash = 0.35;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addAmmo(amount) {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
  }

  earn(amount) {
    this.money += amount;
  }

  spend(amount) {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  get dead() {
    return this.health <= 0;
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.health = this.maxHealth;
    this.ammo = 48;
    this.inCar = null;
    this.onFoot = true;
  }
}

// Find the nearest car the player can steal within reach.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}
