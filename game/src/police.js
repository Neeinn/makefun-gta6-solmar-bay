// police.js — wanted level, police cars that chase and ram the player.
import { createCarMesh } from './vehicles.js';

export function spawnPoliceCar(ctx, x, z) {
  const mesh = createCarMesh(0x111111);
  // White doors + light bar make the cruiser read as police at a glance.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.22), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  stripe.position.y = 0.55; mesh.add(stripe);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  bar.position.set(0, 1.55, -0.2); mesh.add(bar);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), new THREE.MeshBasicMaterial({ color: 0x0044ff }));
  bar2.position.set(0.7, 1.55, -0.2); mesh.add(bar2);
  mesh.position.set(x, 0, z);
  ctx.scene.add(mesh);
  return { mesh, pos: mesh.position, heading: 0, speed: 0, health: 120, kind: 'police' };
}

export function updatePolice(ctx, dt) {
  const wanted = ctx.player.wanted;
  // Spawn cruisers up to the wanted level (1 star = 1 car, 3 stars = 3 cars).
  while (ctx.police.length < wanted) {
    const a = Math.random() * Math.PI * 2;
    const x = ctx.player.pos.x + Math.sin(a) * 45;
    const z = ctx.player.pos.z + Math.cos(a) * 45;
    ctx.police.push(spawnPoliceCar(ctx, Math.max(-180, Math.min(180, x)), Math.max(-180, Math.min(180, z))));
  }
  while (ctx.police.length > wanted) {
    const c = ctx.police.pop();
    ctx.scene.remove(c.mesh);
  }
  for (const c of ctx.police) {
    const dx = ctx.player.pos.x - c.pos.x;
    const dz = ctx.player.pos.z - c.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - c.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    const top = 14 + wanted * 4;
    c.speed = Math.min(top, c.speed + 10 * dt);
    c.pos.x += Math.sin(c.heading) * c.speed * dt;
    c.pos.z += Math.cos(c.heading) * c.speed * dt;
    c.mesh.rotation.y = c.heading;
    // Ram: damage the player (or their car) on contact.
    if (dist < 3.2) {
      c.speed *= 0.4;
      ctx.player.health -= 12 * dt * 4;
      if (ctx.player.inCar) ctx.player.inCar.speed *= 0.6;
      ctx.audio.crash();
      if (ctx.player.health <= 0) ctx.gameOver('The Solmar Bay police took you down.');
    }
  }
}
