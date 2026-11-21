// People of Solmar Bay: Milo Ferran the player, 22 wandering pedestrians,
// and mission thugs who fight back. Characters are simple articulated
// box figures with swinging limbs while they walk.

import { CFG, PED_COLORS } from './config.js';
import { collideCircle, clampToWorld } from './city.js';

export function makePersonMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin || 0xe8b98a });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x2b2118 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.4), shirtMat);
  torso.position.y = 1.32;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.42), skinMat);
  head.position.y = 2.0;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.44), hairMat);
  hair.position.y = 2.26;
  g.add(hair);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), shirtMat);
  armL.position.set(-0.48, 1.35, 0);
  armL.geometry.translate(0, -0.32, 0);
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), shirtMat);
  armR.position.set(0.48, 1.35, 0);
  armR.geometry.translate(0, -0.32, 0);
  g.add(armR);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), pantsMat);
  legL.position.set(-0.18, 0.85, 0);
  legL.geometry.translate(0, -0.4, 0);
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), pantsMat);
  legR.position.set(0.18, 0.85, 0);
  legR.geometry.translate(0, -0.4, 0);
  g.add(legR);
  g.userData = { armL, armR, legL, legR, torso, head };
  return g;
}

function animateWalk(mesh, phase, speedNorm) {
  const u = mesh.userData;
  const swing = 0.65 * speedNorm;
  u.legL.rotation.x = Math.sin(phase) * swing;
  u.legR.rotation.x = -Math.sin(phase) * swing;
  u.armL.rotation.x = -Math.sin(phase) * swing * 0.8;
  u.armR.rotation.x = Math.sin(phase) * swing * 0.8;
}

export class PeopleManager {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.pedestrians = [];
    this.thugs = [];
  }

  makePlayer() {
    // Milo Ferran: teal jacket, dark jeans, sun-bleached hair.
    const mesh = makePersonMesh(0x0f766e, 0x1e293b, 0xe8b98a);
    mesh.position.set(CFG.startPos.x, 0, CFG.startPos.z);
    this.scene.add(mesh);
    return mesh;
  }

  spawnPedestrians() {
    // 22 pedestrians wandering the sidewalks of every district.
    const spots = [];
    for (let i = 0; i < 22; i++) {
      const gx = -160 + (i % 6) * 64 + ((i * 13) % 20);
      const gz = -160 + Math.floor(i / 6) * 80 + ((i * 7) % 24);
      spots.push([gx, gz]);
    }
    for (let i = 0; i < spots.length; i++) {
      const [x, z] = spots[i];
      const mesh = makePersonMesh(
        PED_COLORS[i % PED_COLORS.length],
        [0x2b2d42, 0x3d405b, 0x6d6875, 0x222222][i % 4]
      );
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      this.pedestrians.push({
        mesh, x, z,
        heading: (i * 1.7) % (Math.PI * 2),
        speed: 1.6 + (i % 3) * 0.5,
        phase: Math.random() * 6,
        turnTimer: 2 + (i % 5),
        alive: true,
      });
    }
  }

  spawnThugs(area, count, boss) {
    const made = [];
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2;
      const x = area.x + Math.cos(a) * 6;
      const z = area.z + Math.sin(a) * 6;
      const mesh = makePersonMesh(boss ? 0x7f1d1d : 0x44403c, 0x1c1917, 0xd9a066);
      if (boss) mesh.scale.set(1.25, 1.25, 1.25);
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      const thug = {
        mesh, x, z, heading: a, speed: 2.6,
        hp: boss ? 130 : 42, maxHp: boss ? 130 : 42,
        boss: !!boss, phase: 0, attackTimer: 1.2, alive: true,
      };
      this.thugs.push(thug);
      made.push(thug);
    }
    return made;
  }

  clearThugs() {
    for (const t of this.thugs) this.scene.remove(t.mesh);
    this.thugs = [];
  }

  updatePedestrians(dt) {
    for (const p of this.pedestrians) {
      if (!p.alive) continue;
      p.turnTimer -= dt;
      if (p.turnTimer <= 0) {
        p.turnTimer = 3 + Math.random() * 4;
        p.heading += (Math.random() - 0.5) * 2.2;
      }
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      if (Math.abs(p.x) > 195 || Math.abs(p.z) > 195) p.heading += Math.PI;
      p.phase += dt * 7;
      animateWalk(p.mesh, p.phase, 1);
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }

  // Thugs walk at the player and punch when close. Returns damage dealt
  // to the player this frame (0 when nobody lands a hit).
  updateThugs(dt, px, pz) {
    let damage = 0;
    for (const t of this.thugs) {
      if (!t.alive) continue;
      const dx = px - t.x;
      const dz = pz - t.z;
      const dist = Math.hypot(dx, dz);
      t.attackTimer -= dt;
      if (dist > 1.6) {
        t.heading = Math.atan2(dx, dz);
        t.x += Math.sin(t.heading) * t.speed * dt;
        t.z += Math.cos(t.heading) * t.speed * dt;
        t.phase += dt * 7;
        animateWalk(t.mesh, t.phase, 1);
      } else if (t.attackTimer <= 0) {
        t.attackTimer = 1.1;
        damage += t.boss ? 14 : 8;
        t.mesh.userData.armR.rotation.x = -1.6;
        setTimeout(() => { t.mesh.userData.armR.rotation.x = 0; }, 180);
      }
      t.mesh.position.set(t.x, 0, t.z);
      t.mesh.rotation.y = t.heading;
    }
    return damage;
  }

  // Player punch: hit the nearest living person in range in front of the
  // player. Returns { kind: 'ped' | 'thug' | 'boss' | null, target }.
  tryPunch(px, pz, heading) {
    let best = null;
    let bestD = CFG.punchRange;
    let kind = null;
    const consider = (list, k) => {
      for (const t of list) {
        if (!t.alive) continue;
        const dx = t.x - px;
        const dz = t.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > bestD) continue;
        const ang = Math.atan2(dx, dz);
        let diff = Math.abs(ang - heading);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff > 1.4) continue;
        bestD = d;
        best = t;
        kind = k;
      }
    };
    consider(this.thugs, 'thug');
    consider(this.pedestrians, 'ped');
    if (!best) return { kind: null, target: null };
    best.hp = (best.hp ?? 30) - CFG.punchDamage;
    // knockback away from the player
    const dx = best.x - px;
    const dz = best.z - pz;
    const len = Math.hypot(dx, dz) || 1;
    best.x += (dx / len) * 1.6;
    best.z += (dz / len) * 1.6;
    best.mesh.position.set(best.x, 0, best.z);
    if (best.hp <= 0) {
      best.alive = false;
      best.mesh.rotation.x = -Math.PI / 2;
      best.mesh.position.y = 0.4;
    }
    return { kind: best.boss ? 'boss' : kind, target: best };
  }
}

export { animateWalk };
