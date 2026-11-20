// player.js — the on-foot character: third-person movement, punch and shooting.
import { collideCircle } from './city.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a9d8f });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x264653 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
  body.position.y = 1.05; group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.y = 1.8; group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.56), new THREE.MeshLambertMaterial({ color: 0xe9c46a }));
  cap.position.y = 2.08; group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), legMat);
  legL.position.set(-0.18, 0.35, 0); group.add(legL);
  const legR = legL.clone(); legR.position.x = 0.18; group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), bodyMat);
  armL.position.set(-0.48, 1.05, 0); group.add(armL);
  const armR = armL.clone(); armR.position.x = 0.48; group.add(armR);
  group.position.set(0, 0, 20);
  scene.add(group);
  return {
    mesh: group, legL, legR, armL, armR,
    pos: group.position, heading: 0, walkPhase: 0,
    health: 100, money: 500, wanted: 0, lastCrime: -999, inCar: null,
  };
}

export function updatePlayer(ctx, dt) {
  const p = ctx.player;
  if (p.inCar || ctx.state !== 'playing') return;
  const keys = ctx.keys;
  let fx = 0, fz = 0;
  const yaw = ctx.camYaw;
  // WASD relative to the camera yaw.
  if (keys['KeyW']) { fx += -Math.sin(yaw); fz += -Math.cos(yaw); }
  if (keys['KeyS']) { fx += Math.sin(yaw); fz += Math.cos(yaw); }
  if (keys['KeyA']) { fx += -Math.cos(yaw); fz += Math.sin(yaw); }
  if (keys['KeyD']) { fx += Math.cos(yaw); fz += -Math.sin(yaw); }
  const len = Math.hypot(fx, fz);
  if (len > 0) {
    fx /= len; fz /= len;
    const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 10 : 6;
    p.pos.x += fx * speed * dt;
    p.pos.z += fz * speed * dt;
    p.heading = Math.atan2(fx, fz);
    p.mesh.rotation.y = p.heading;
    p.walkPhase += dt * speed * 1.6;
    const swing = Math.sin(p.walkPhase) * 0.5;
    p.legL.rotation.x = swing; p.legR.rotation.x = -swing;
    p.armL.rotation.x = -swing; p.armR.rotation.x = swing;
  } else {
    p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
    p.armL.rotation.x *= 0.8; p.armR.rotation.x *= 0.8;
  }
  collideCircle(p.pos, 0.7, ctx.city.colliders);
  // Wanted decays after 25 seconds without a new crime.
  if (p.wanted > 0 && ctx.time - p.lastCrime > 25) {
    p.wanted = 0; ctx.audio.setSiren(false);
  }
}

export function addWanted(ctx, amount) {
  const p = ctx.player;
  p.wanted = Math.max(0, Math.min(3, p.wanted + amount));
  p.lastCrime = ctx.time;
  ctx.audio.setSiren(p.wanted > 0);
}

// Punch: damages the nearest enemy / pedestrian in front of the player.
export function punch(ctx) {
  const p = ctx.player;
  ctx.audio.punch();
  p.armR.rotation.x = -1.4;
  const hit = nearestTarget(ctx, p.pos, 2.4, 1.2);
  if (hit) {
    hit.health -= 25;
    ctx.hud.toast('Punch! -25');
    if (hit.kind === 'ped') addWanted(ctx, 1);
    if (hit.health <= 0) killTarget(ctx, hit);
  }
}

// Shoot: hits the nearest enemy / police / ped in a cone ahead of the player (or car).
export function shoot(ctx) {
  const p = ctx.player;
  ctx.audio.shoot();
  const origin = p.inCar ? p.inCar.mesh.position : p.pos;
  const dir = p.inCar ? p.inCar.heading : p.heading;
  const fx = Math.sin(dir), fz = Math.cos(dir);
  let best = null, bestD = 35;
  const consider = (t) => {
    const dx = t.pos.x - origin.x, dz = t.pos.z - origin.z;
    const d = Math.hypot(dx, dz);
    if (d < bestD && d > 0.5) {
      const dot = (dx * fx + dz * fz) / d;
      if (dot > 0.7) { best = t; bestD = d; }
    }
  };
  ctx.enemies.forEach(consider);
  ctx.police.forEach((c) => consider(c));
  if (best) {
    best.health -= 34;
    ctx.hud.toast('Hit! -34');
    addWanted(ctx, 1);
    if (best.health <= 0) killTarget(ctx, best);
  }
  // Muzzle flash: a quick yellow sphere at the gun.
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffff66 }));
  flash.position.set(origin.x + fx * 1.2, 1.4, origin.z + fz * 1.2);
  ctx.scene.add(flash);
  setTimeout(() => ctx.scene.remove(flash), 70);
}

function nearestTarget(ctx, pos, range, cone) {
  let best = null, bestD = range;
  for (const t of ctx.enemies) {
    const d = Math.hypot(t.pos.x - pos.x, t.pos.z - pos.z);
    if (d < bestD) { best = t; bestD = d; }
  }
  for (const pd of ctx.peds) {
    const d = Math.hypot(pd.mesh.position.x - pos.x, pd.mesh.position.z - pos.z);
    if (d < bestD) { best = pd; bestD = d; }
  }
  return best;
}

export function killTarget(ctx, t) {
  if (t.kind === 'ped') {
    ctx.scene.remove(t.mesh);
    ctx.peds = ctx.peds.filter((x) => x !== t);
    ctx.player.money += 20;
    ctx.hud.toast('+$20');
    return;
  }
  if (t.kind === 'police') { // police car destroyed
    ctx.scene.remove(t.mesh);
    ctx.police = ctx.police.filter((x) => x !== t);
    ctx.player.money += 150;
    ctx.hud.toast('Police car wrecked! +$150');
    return;
  }
  // Mission enemy.
  ctx.scene.remove(t.mesh);
  ctx.enemies = ctx.enemies.filter((x) => x !== t);
  ctx.player.money += 50;
  ctx.hud.toast('Target down! +$50');
}
