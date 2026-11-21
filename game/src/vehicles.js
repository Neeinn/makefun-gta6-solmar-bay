// Vehicles for Solmar Bay: car meshes, 14 parked stealable cars, 12 traffic
// cars looping the road grid, and police cars that chase the player when the
// wanted level is up. Driving physics are arcade: accelerate, steer, drift.

import { CFG, CAR_COLORS } from './config.js';
import { collideCircle, clampToWorld } from './city.js';

function makeWheel() {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10),
    new THREE.MeshLambertMaterial({ color: 0x141414 })
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.castShadow = true;
  return wheel;
}

export function makeCarMesh(color, isPolice) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: isPolice ? 0xf1faee : 0x1c2733 })
  );
  cabin.position.set(0, 1.1, -0.25);
  cabin.castShadow = true;
  car.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.5), bodyMat);
  nose.position.set(0, 0.45, 2.2);
  car.add(nose);
  // headlights and taillights
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), lightMat);
    hl.position.set(sx, 0.55, 2.46);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    tl.position.set(sx, 0.55, -2.26);
    car.add(tl);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    bar.position.set(0, 1.5, -0.25);
    car.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.42), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    red.position.set(-0.32, 1.5, -0.25);
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.42), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(0.32, 1.5, -0.25);
    car.add(blue);
    car.userData.redLight = red;
    car.userData.blueLight = blue;
    // white doors: a white stripe along the body
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 4.42), new THREE.MeshLambertMaterial({ color: 0xf1faee }));
    stripe.position.y = 0.62;
    car.add(stripe);
  }
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = makeWheel();
    w.position.set(wx, 0.42, wz);
    car.add(w);
    wheels.push(w);
  }
  car.userData.wheels = wheels;
  return car;
}

// A rectangular loop around one city block, driven by traffic cars.
function loopWaypoints(cx, cz, hw, hd) {
  return [
    { x: cx - hw, z: cz - hd }, { x: cx + hw, z: cz - hd },
    { x: cx + hw, z: cz + hd }, { x: cx - hw, z: cz + hd },
  ];
}

export class VehicleManager {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.parked = [];   // stealable cars standing still
    this.traffic = [];  // cars looping the roads
    this.police = [];   // active pursuit cars
    this._policeSpawnTimer = 0;
  }

  spawnParked() {
    // 14 parked cars at road edges, spread across the districts. Every spot
    // was placed clear of the block-centre buildings.
    const spots = [
      [-6, 108, 0], [44, 96, 1], [-44, 66, 0], [66, 46, 1], [-84, 26, 0],
      [2, -14, 1], [-14, -44, 0], [84, -66, 1], [-84, -106, 0], [124, 106, 1],
      [-124, 146, 0], [44, 146, 1], [-164, -146, 0], [164, -146, 1],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [x, z, dir] = spots[i];
      const mesh = makeCarMesh(CAR_COLORS[i % CAR_COLORS.length], false);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = dir ? Math.PI / 2 : 0;
      this.scene.add(mesh);
      this.parked.push({
        mesh, x, z, heading: mesh.rotation.y, speed: 0,
        parked: true, stolen: false, color: CAR_COLORS[i % CAR_COLORS.length],
      });
    }
  }

  spawnTraffic() {
    // 12 traffic cars on loops of different sizes around the grid.
    const loops = [
      [-80, -80, 40, 40], [80, -80, 40, 40], [-80, 80, 40, 40], [80, 80, 40, 40],
      [0, -120, 60, 20], [0, 120, 60, 20], [-120, 0, 20, 60], [120, 0, 20, 60],
      [-40, -40, 80, 80], [40, 40, 80, 80], [0, 0, 120, 40], [0, 0, 40, 120],
    ];
    for (let i = 0; i < loops.length; i++) {
      const [cx, cz, hw, hd] = loops[i];
      const mesh = makeCarMesh(CAR_COLORS[(i * 5 + 3) % CAR_COLORS.length], false);
      const wp = loopWaypoints(cx, cz, hw, hd);
      mesh.position.set(wp[0].x, 0, wp[0].z);
      this.scene.add(mesh);
      this.traffic.push({
        mesh, waypoints: wp, wpIndex: 1, speed: 9 + (i % 4) * 1.5,
        heading: 0, x: wp[0].x, z: wp[0].z, parked: false,
      });
    }
  }

  nearestParked(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.parked) {
      if (!c.parked) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  spawnPoliceNear(x, z, count) {
    while (this.police.length < count) {
      const angle = Math.random() * Math.PI * 2;
      const px = x + Math.cos(angle) * 55;
      const pz = z + Math.sin(angle) * 55;
      const mesh = makeCarMesh(0x1b2a4a, true);
      mesh.position.set(px, 0, pz);
      this.scene.add(mesh);
      this.police.push({ mesh, x: px, z: pz, heading: 0, speed: 0 });
    }
  }

  removeExtraPolice(count) {
    while (this.police.length > count) {
      const p = this.police.pop();
      this.scene.remove(p.mesh);
    }
  }

  clearPolice() {
    for (const p of this.police) this.scene.remove(p.mesh);
    this.police = [];
  }

  // Arcade driving for the car the player is in. input is the Input object.
  driveCar(car, input, dt) {
    const forward = input.isDown('w') || input.isDown('ArrowUp');
    const back = input.isDown('s') || input.isDown('ArrowDown');
    const left = input.isDown('a') || input.isDown('ArrowLeft');
    const right = input.isDown('d') || input.isDown('ArrowRight');
    if (forward) car.speed += CFG.carAccel * dt;
    else if (back) car.speed -= (car.speed > 0.5 ? CFG.carBrake : CFG.carAccel * 0.55) * dt;
    else car.speed -= Math.sign(car.speed) * 9 * dt;
    if (Math.abs(car.speed) < 0.4 && !forward && !back) car.speed = 0;
    car.speed = Math.max(-CFG.carReverseMax, Math.min(CFG.carMaxSpeed, car.speed));
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    if (Math.abs(car.speed) > 0.5) {
      car.heading += steer * CFG.carTurn * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 12);
    }
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    const before = { x: car.x, z: car.z };
    if (collideCircle(this.colliders, car, 1.9)) {
      car.speed *= 0.45;
    }
    clampToWorld(car, CFG.worldHalf);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 1.4;
    return before;
  }

  updateTraffic(dt) {
    for (const t of this.traffic) {
      const target = t.waypoints[t.wpIndex];
      const dx = target.x - t.x;
      const dz = target.z - t.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) {
        t.wpIndex = (t.wpIndex + 1) % t.waypoints.length;
        continue;
      }
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - t.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      t.x += Math.sin(t.heading) * t.speed * dt;
      t.z += Math.cos(t.heading) * t.speed * dt;
      t.mesh.position.set(t.x, 0, t.z);
      t.mesh.rotation.y = t.heading;
      for (const w of t.mesh.userData.wheels) w.rotation.x += t.speed * dt * 1.4;
    }
  }

  // Police chase: steer toward the player, ram the player's car, and flash
  // the light bar. Returns the closest police distance to the player.
  updatePolice(dt, playerX, playerZ, playerInCar, time) {
    let closest = Infinity;
    for (const p of this.police) {
      const dx = playerX - p.x;
      const dz = playerZ - p.z;
      const dist = Math.hypot(dx, dz);
      closest = Math.min(closest, dist);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - p.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const targetSpeed = dist > 90 ? 40 : 30;
      p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.8);
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      if (collideCircle(this.colliders, p, 1.9)) p.speed *= 0.5;
      clampToWorld(p, CFG.worldHalf);
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      const phase = Math.floor(time * 4) % 2 === 0;
      if (p.mesh.userData.redLight) {
        p.mesh.userData.redLight.material.color.setHex(phase ? 0xff0000 : 0x550000);
        p.mesh.userData.blueLight.material.color.setHex(phase ? 0x111166 : 0x2244ff);
      }
      for (const w of p.mesh.userData.wheels) w.rotation.x += p.speed * dt * 1.4;
    }
    return closest;
  }
}
