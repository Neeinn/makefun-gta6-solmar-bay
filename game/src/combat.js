// Mouse-aimed shooting: bullets, muzzle flashes, armed enemies, pickups.
import { makeRng, rangeRng } from './random.js';

export class Combat {
  constructor() {
    this.bullets = []; // {x,y,vx,vy,life,fromPlayer}
    this.enemies = []; // {x,y,health,angle,shootCd,speed,name,boss}
    this.particles = []; // {x,y,vx,vy,life,color,size}
    this.pickups = []; // {x,y,kind:'health'|'ammo'}
    this.muzzle = 0;
  }

  playerShoot(player, aimX, aimY) {
    if (player.ammo <= 0 || player.shootCooldown > 0 || !player.onFoot) return false;
    player.ammo -= 1;
    player.shootCooldown = 0.16;
    const ang = Math.atan2(aimY - player.y, aimX - player.x);
    const sx = player.x + Math.cos(ang) * 20;
    const sy = player.y + Math.sin(ang) * 20;
    this.bullets.push({ x: sx, y: sy, vx: Math.cos(ang) * 640, vy: Math.sin(ang) * 640, life: 0.9, fromPlayer: true });
    this.muzzle = 0.07;
    this.burst(sx, sy, 4, '#ffd94d');
    return true;
  }

  spawnEnemy(x, y, opts = {}) {
    const e = {
      x, y,
      health: opts.boss ? 220 : 60,
      angle: 0,
      shootCd: rangeRng(Math.random, 0.4, 1.2),
      speed: opts.boss ? 95 : 78,
      name: opts.name || 'Rival',
      boss: !!opts.boss,
    };
    this.enemies.push(e);
    return e;
  }

  spawnPickup(x, y, kind) {
    this.pickups.push({ x, y, kind });
  }

  burst(x, y, n, color) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.3, color, size: 2 + Math.random() * 3,
      });
    }
  }

  update(dt, player, buildings, onEnemyKilled) {
    if (this.muzzle > 0) this.muzzle -= dt;
    // Bullets fly and hit enemies / the player.
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0;
      if (!dead && b.fromPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
          const e = this.enemies[j];
          if (Math.hypot(e.x - b.x, e.y - b.y) < 20) {
            e.health -= 26;
            this.burst(b.x, b.y, 6, '#ff5a4d');
            dead = true;
            if (e.health <= 0) {
              this.burst(e.x, e.y, 18, '#ff5a4d');
              this.enemies.splice(j, 1);
              if (Math.random() < 0.5) this.spawnPickup(e.x, e.y, Math.random() < 0.5 ? 'health' : 'ammo');
              if (onEnemyKilled) onEnemyKilled(e);
            }
            break;
          }
        }
      } else if (!dead && !b.fromPlayer) {
        const px = player.inCar ? player.inCar.x : player.x;
        const py = player.inCar ? player.inCar.y : player.y;
        if (Math.hypot(px - b.x, py - b.y) < 20) {
          player.takeDamage(5);
          this.burst(b.x, b.y, 5, '#ff8a7a');
          dead = true;
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }
    // Enemies chase the player and shoot.
    for (const e of this.enemies) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy);
      e.angle = Math.atan2(dy, dx);
      if (d > 130) {
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
      }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 460) {
        e.shootCd = e.boss ? 0.9 : 1.4;
        const spread = (Math.random() - 0.5) * 0.22;
        const a = e.angle + spread;
        this.bullets.push({
          x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20,
          vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.1, fromPlayer: false,
        });
      }
    }
    // Particles fade.
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    // Pickups.
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pk = this.pickups[i];
      if (Math.hypot(pk.x - player.x, pk.y - player.y) < 26) {
        if (pk.kind === 'health') player.heal(35);
        else player.addAmmo(36);
        this.pickups.splice(i, 1);
      }
    }
  }
}
