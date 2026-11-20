// traffic.js — traffic cars driving the road grid and pedestrians on the sidewalks.
import { ROAD_COORDS, collideCircle } from './city.js';
import { createCarMesh } from './vehicles.js';

const TRAFFIC_COLORS = [0xbbbbbb, 0x555555, 0x8a3324, 0x2f5d50, 0xc9a227, 0x7a7a9a];

export function spawnTraffic(ctx, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const vertical = i % 2 === 0;
    const road = ROAD_COORDS[1 + (i % (ROAD_COORDS.length - 2))];
    const mesh = createCarMesh(TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]);
    const pos = new THREE.Vector3(
      vertical ? road + (i % 4 < 2 ? 2.4 : -2.4) : -170 + (i * 37) % 340,
      0,
      vertical ? -170 + (i * 53) % 340 : road + (i % 4 < 2 ? 2.4 : -2.4)
    );
    mesh.position.copy(pos);
    ctx.scene.add(mesh);
    list.push({
      mesh, pos, heading: vertical ? (i % 4 < 2 ? 0 : Math.PI) : (i % 4 < 2 ? Math.PI / 2 : -Math.PI / 2),
      speed: 7 + (i % 4), vertical, road, kind: 'traffic', health: 100,
    });
  }
  return list;
}

export function updateTraffic(ctx, dt) {
  for (const t of ctx.traffic) {
    t.pos.x += Math.sin(t.heading) * t.speed * dt;
    t.pos.z += Math.cos(t.heading) * t.speed * dt;
    // At the edge of the map, turn around at the next intersection.
    if (t.pos.x > 185 || t.pos.x < -185 || t.pos.z > 185 || t.pos.z < -185) {
      t.heading += Math.PI;
      t.pos.x = Math.max(-185, Math.min(185, t.pos.x));
      t.pos.z = Math.max(-185, Math.min(185, t.pos.z));
    }
    // Random turn at intersections (keeps traffic spread across the grid).
    const nearX = Math.abs(t.pos.x - Math.round(t.pos.x / 40) * 40) < 0.6;
    const nearZ = Math.abs(t.pos.z - Math.round(t.pos.z / 40) * 40) < 0.6;
    if (nearX && nearZ && Math.random() < dt * 0.25) {
      t.heading += (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      t.vertical = !t.vertical;
    }
    // Slow down if the player car is right ahead.
    if (ctx.player.inCar) {
      const d = Math.hypot(t.pos.x - ctx.player.pos.x, t.pos.z - ctx.player.pos.z);
      if (d < 7) t.speed = Math.max(0, t.speed - 10 * dt);
      else t.speed = Math.min(9, t.speed + 4 * dt);
    }
    t.mesh.position.copy(t.pos);
    t.mesh.rotation.y = t.heading;
  }
}

export function spawnPeds(ctx, count) {
  const list = [];
  const shirt = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0xe9c46a, 0x9d4edd];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), new THREE.MeshLambertMaterial({ color: shirt[i % shirt.length] }));
    body.position.y = 1.0; group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
    head.position.y = 1.65; group.add(head);
    const road = ROAD_COORDS[i % ROAD_COORDS.length];
    const vertical = i % 2 === 0;
    group.position.set(
      vertical ? road + 6.5 : -180 + (i * 29) % 360,
      0,
      vertical ? -180 + (i * 41) % 360 : road + 6.5
    );
    ctx.scene.add(group);
    list.push({
      mesh: group, heading: vertical ? 0 : Math.PI / 2, speed: 1.2 + (i % 3) * 0.4,
      phase: Math.random() * 6, vertical, kind: 'ped', health: 100,
    });
  }
  return list;
}

export function updatePeds(ctx, dt) {
  for (const p of ctx.peds) {
    p.mesh.position.x += Math.sin(p.heading) * p.speed * dt;
    p.mesh.position.z += Math.cos(p.heading) * p.speed * dt;
    p.phase += dt * 4;
    p.mesh.rotation.y = p.heading;
    p.mesh.position.y = Math.abs(Math.sin(p.phase)) * 0.08;
    if (p.mesh.position.x > 190 || p.mesh.position.x < -190 || p.mesh.position.z > 250 || p.mesh.position.z < -190) {
      p.heading += Math.PI;
    }
    // Flee from a speeding player car nearby.
    if (ctx.player.inCar && Math.abs(ctx.player.inCar.speed) > 8) {
      const d = Math.hypot(p.mesh.position.x - ctx.player.pos.x, p.mesh.position.z - ctx.player.pos.z);
      if (d < 6) {
        p.heading = Math.atan2(p.mesh.position.x - ctx.player.pos.x, p.mesh.position.z - ctx.player.pos.z);
        p.speed = 4;
      } else { p.speed = 1.4; }
    }
    // Run over by the player car: a crime.
    if (ctx.player.inCar && Math.abs(ctx.player.inCar.speed) > 3) {
      const d = Math.hypot(p.mesh.position.x - ctx.player.pos.x, p.mesh.position.z - ctx.player.pos.z);
      if (d < 2.2) {
        ctx.scene.remove(p.mesh);
        ctx.peds = ctx.peds.filter((x) => x !== p);
        ctx.playerApi.addWanted(ctx, 1);
        ctx.hud.toast('Pedestrian hit! Wanted +1 ★');
      }
    }
  }
}
