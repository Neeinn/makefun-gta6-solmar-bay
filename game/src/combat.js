// CombatSystem: aim with the mouse, shoot (F / click), enemy AI that
// advances and shoots back, pickups of ammo.
import { TUNE } from './config.js';
import { dist2 } from './random.js';

export function createCombat() {
  return { bullets: [], enemies: [], ammo: 60, kills: 0 };
}

export function spawnEnemies(c, x, y, n, rng) {
  for (let i = 0; i < n; i++) {
    c.enemies.push({
      x: x + (rng() - 0.5) * 260,
      y: y + (rng() - 0.5) * 260,
      health: TUNE.enemyHealth,
      speed: 70 + rng() * 40,
      shootAt: 1 + rng() * 2,
    });
  }
}

export function shoot(c, fromX, fromY, angle) {
  if (c.ammo <= 0) return false;
  c.ammo -= 1;
  c.bullets.push({
    x: fromX, y: fromY,
    vx: Math.cos(angle) * TUNE.bulletSpeed,
    vy: Math.sin(angle) * TUNE.bulletSpeed,
    life: TUNE.bulletLife,
  });
  return true;
}

// Returns how many enemies died this step.
export function stepCombat(c, dt, player, onPlayerHit) {
  for (const b of c.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
  }
  c.bullets = c.bullets.filter((b) => b.life > 0);
  for (const e of c.enemies) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * dt;
    e.y += (dy / d) * e.speed * dt;
    e.shootAt -= dt;
    if (e.shootAt <= 0 && d < 520) {
      e.shootAt = 1.4;
      onPlayerHit(TUNE.enemyDamage);
    }
    for (const b of c.bullets) {
      // Only a living enemy can be hit: two bullets landing in the same
      // step must not count one death twice.
      if (b.life > 0 && e.health > 0 && dist2(b.x, b.y, e.x, e.y) < 26 * 26) {
        e.health -= TUNE.bulletDamage;
        b.life = 0;
        if (e.health <= 0) c.kills += 1;
      }
    }
  }
  const before = c.enemies.length;
  c.enemies = c.enemies.filter((e) => e.health > 0);
  return before - c.enemies.length;
}
