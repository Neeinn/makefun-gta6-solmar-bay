// vehicles.js — drivable cars: build, enter/exit, arcade driving, parked cars.
import { collideCircle } from './city.js';

const CAR_COLORS = [0xd62828, 0x003049, 0xf77f00, 0x2a9d8f, 0x8338ec, 0xe9c46a, 0x90be6d, 0xdddddd];

export function createCarMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.55; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.0), new THREE.MeshLambertMaterial({ color: 0x1a2a33 }));
  cabin.position.set(0, 1.15, -0.2); group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const spots = [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]];
  for (const [x, z] of spots) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, z); group.add(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0 });
  const hl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.1), lightMat);
  hl.position.set(0, 0.6, 2.12); group.add(hl);
  return group;
}

export function spawnParkedCars(ctx) {
  const cars = [];
  const spots = [
    [0, 10, 0], [40, -6, 1.57], [-40, 26, 0], [80, 14, -1.57], [-80, -14, 0],
    [120, 30, 1.57], [-120, 46, 0], [160, -30, -1.57], [-160, 70, 0], [40, 110, 1.57],
    [-40, 130, 0], [80, 150, -1.57], [-120, -90, 0], [120, -70, 1.57],
  ];
  spots.forEach(([x, z, h], i) => {
    const mesh = createCarMesh(CAR_COLORS[i % CAR_COLORS.length]);
    mesh.position.set(x, 0, z); mesh.rotation.y = h;
    ctx.scene.add(mesh);
    cars.push({ mesh, pos: mesh.position, heading: h, speed: 0, parked: true, stolen: false, health: 100, isPlayerCar: false });
  });
  return cars;
}

export function nearestCar(ctx, maxDist) {
  let best = null, bestD = maxDist;
  for (const c of ctx.cars) {
    const d = Math.hypot(c.pos.x - ctx.player.pos.x, c.pos.z - ctx.player.pos.z);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

export function enterCar(ctx, car) {
  ctx.player.inCar = car;
  car.parked = false; car.isPlayerCar = true;
  ctx.player.mesh.visible = false;
  if (!car.stolen) { car.stolen = true; ctx.player.money += 0; }
  // Stealing a parked car draws the police.
  if (car.parkedBefore !== false && !car.wasEntered) { /* first entry counts as theft */ }
  if (!car.wasEntered) {
    car.wasEntered = true;
    const { addWanted } = ctx.playerApi;
    addWanted(ctx, 1);
    ctx.hud.toast('Car taken! Wanted +1 ★');
  }
  ctx.hud.setPrompt('');
}

export function exitCar(ctx) {
  const car = ctx.player.inCar;
  if (!car) return;
  car.speed = 0;
  ctx.player.inCar = null;
  ctx.player.mesh.visible = true;
  const side = 2.4;
  ctx.player.pos.set(car.pos.x + Math.cos(car.heading) * side, 0, car.pos.z - Math.sin(car.heading) * side);
  ctx.player.mesh.position.copy(ctx.player.pos);
}

export function updateDriving(ctx, dt) {
  const car = ctx.player.inCar;
  if (!car) return;
  const keys = ctx.keys;
  const maxSpeed = 30, accel = 16, brake = 26;
  if (keys['KeyW']) car.speed += accel * dt;
  if (keys['KeyS']) car.speed -= (car.speed > 0.5 ? brake : accel * 0.6) * dt;
  if (!keys['KeyW'] && !keys['KeyS']) car.speed *= Math.max(0, 1 - 0.8 * dt);
  car.speed = Math.max(-9, Math.min(maxSpeed, car.speed));
  const steer = (keys['KeyA'] ? 1 : 0) - (keys['KeyD'] ? 1 : 0);
  if (Math.abs(car.speed) > 0.3) {
    car.heading += steer * 1.9 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 8);
  }
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  const hitWall = collideCircle(car.pos, 1.6, ctx.city.colliders);
  if (hitWall && Math.abs(car.speed) > 6) {
    ctx.audio.crash();
    car.speed *= -0.25;
    ctx.player.health -= 2;
  }
  // Bump into traffic cars.
  for (const t of ctx.traffic) {
    const d = Math.hypot(t.pos.x - car.pos.x, t.pos.z - car.pos.z);
    if (d < 3.4 && Math.abs(car.speed) > 4) {
      ctx.audio.crash(); car.speed *= 0.5; t.speed = 0;
    }
  }
  car.mesh.rotation.y = car.heading;
  ctx.player.pos.copy(car.pos);
  ctx.player.mesh.position.copy(car.pos);
  ctx.audio.setEngine(Math.abs(car.speed) / maxSpeed, true);
}
