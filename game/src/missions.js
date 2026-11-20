// missions.js — eight original story missions for Milo Ferran in Solmar Bay.
export const MISSIONS = [
  {
    id: 1, name: 'Morning Run', giver: 'Bayline Couriers',
    brief: 'Deliver the sealed parcel to the cafe in Coral Point. Do not open it.',
    steps: [{ type: 'goto', x: 80, z: -150, text: 'Go to the Coral Point cafe (orange marker).' }],
    reward: 150,
  },
  {
    id: 2, name: 'Hot Wheels', giver: 'Lena Torres',
    brief: 'Lena needs a fast car for her garage. Take any car and bring it to Marina Verde.',
    steps: [
      { type: 'enterCar', text: 'Get in any car (press E near one).' },
      { type: 'goto', x: 80, z: -40, text: 'Drive the car to Lena\'s garage in Marina Verde.' },
    ],
    reward: 250,
  },
  {
    id: 3, name: 'Dockside Pickup', giver: 'Dario Sol',
    brief: 'Three crates are waiting at the North Docks. Collect them all before the harbour patrol notices.',
    steps: [
      { type: 'collect', x: -60, z: -160, text: 'Collect crate 1 of 3 at the North Docks.' },
      { type: 'collect', x: -20, z: -170, text: 'Collect crate 2 of 3 at the North Docks.' },
      { type: 'collect', x: -40, z: -140, text: 'Collect crate 3 of 3 at the North Docks.' },
    ],
    reward: 300,
  },
  {
    id: 4, name: 'Tail the Van', giver: 'Detective Mara Ives',
    brief: 'A white van is moving Tide cargo through Bayview. Follow it for 20 seconds. Do not get spotted close up.',
    steps: [{ type: 'tail', x: -40, z: -40, text: 'Follow the white van — stay within 40 m for 20 s.' }],
    reward: 350,
  },
  {
    id: 5, name: 'Alley Trouble', giver: 'Lena Torres',
    brief: 'Rival crew the Rust Jackals are shaking down Palm Court shops. Teach three of them a lesson.',
    steps: [{ type: 'eliminate', x: 160, z: -40, count: 3, text: 'Defeat 3 Rust Jackals in Palm Court (F punch / click shoot).' }],
    reward: 400,
  },
  {
    id: 6, name: 'Midnight Race', giver: 'Dario Sol',
    brief: 'Street race across the city: hit 4 checkpoints before the timer runs out.',
    steps: [{ type: 'race', x: 0, z: 0, text: 'Race! Hit the checkpoints before time runs out.' }],
    reward: 500,
  },
  {
    id: 7, name: 'The Swap', giver: 'Detective Mara Ives',
    brief: 'Carry the evidence parcel to Lighthouse Hill. The Tide tipped off the police — expect company.',
    steps: [{ type: 'goto', x: 160, z: -150, text: 'Deliver the parcel to Lighthouse Hill. Police are watching.' }],
    reward: 450,
  },
  {
    id: 8, name: 'Tide Breaker', giver: 'Milo Ferran',
    brief: 'End it. Clear the four Tide guards at the Old Port, then reach the boat and leave Solmar Bay behind.',
    steps: [
      { type: 'eliminate', x: -160, z: -40, count: 4, text: 'Defeat 4 Tide guards at the Old Port.' },
      { type: 'goto', x: -160, z: -160, text: 'Reach the boat at Harbor Lights.' },
    ],
    reward: 1000,
  },
];

let beacon = null;
let pickups = [];
let tailVan = null;
let racePoints = [];
let raceTimer = 0;

export function currentMission(ctx) {
  return MISSIONS[ctx.missionIndex] || null;
}

export function startMission(ctx) {
  const m = currentMission(ctx);
  if (!m) { ctx.hud.toast('All missions complete! You own Solmar Bay.'); return; }
  if (ctx.missionActive) return;
  ctx.missionActive = true;
  ctx.missionStep = 0;
  ctx.missionProgress = 0;
  ctx.missionTimer = 0;
  ctx.missionEnemiesSpawned = 0;
  clearMissionObjects(ctx);
  ctx.hud.setObjective(m.name, m.steps[0].text);
  ctx.hud.toast('Mission started: ' + m.name);
  setupStep(ctx);
}

function clearMissionObjects(ctx) {
  if (beacon) { ctx.scene.remove(beacon); beacon = null; }
  for (const p of pickups) ctx.scene.remove(p);
  pickups = [];
  if (tailVan) { ctx.scene.remove(tailVan.mesh); tailVan = null; }
  for (const r of racePoints) ctx.scene.remove(r);
  racePoints = [];
  for (const e of ctx.enemies) ctx.scene.remove(e.mesh);
  ctx.enemies = [];
}

export function makeBeacon(ctx, x, z, color) {
  if (beacon) ctx.scene.remove(beacon);
  const group = new THREE.Group();
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: color || 0xffa500, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  cyl.position.y = 13; group.add(cyl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.25, 8, 24), new THREE.MeshBasicMaterial({ color: color || 0xffa500 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; group.add(ring);
  group.position.set(x, 0, z);
  ctx.scene.add(group);
  beacon = group;
  return group;
}

function spawnEnemy(ctx, x, z) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), new THREE.MeshLambertMaterial({ color: 0x8b0000 }));
  body.position.y = 1.0; group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.8; group.add(head);
  group.position.set(x, 0, z);
  ctx.scene.add(group);
  const e = { mesh: group, pos: group.position, health: 60, kind: 'enemy', speed: 3.2 };
  ctx.enemies.push(e);
  return e;
}

function setupStep(ctx) {
  const m = currentMission(ctx);
  if (!m) return;
  const step = m.steps[ctx.missionStep];
  if (!step) return;
  ctx.hud.setObjective(m.name, step.text);
  if (step.type === 'goto' || step.type === 'collect' || step.type === 'eliminate') {
    makeBeacon(ctx, step.x, step.z);
  }
  if (step.type === 'collect') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
    box.position.set(step.x, 0.6, step.z);
    ctx.scene.add(box);
    pickups.push(box);
  }
  if (step.type === 'eliminate') {
    for (let i = 0; i < step.count; i++) spawnEnemy(ctx, step.x + (i - 1) * 5, step.z + (i % 2) * 6 - 3);
    ctx.missionEnemiesSpawned = step.count;
  }
  if (step.type === 'tail') {
    const { createCarMesh } = ctx.vehicleApi;
    const mesh = createCarMesh(0xffffff);
    mesh.position.set(step.x, 0, step.z);
    ctx.scene.add(mesh);
    tailVan = { mesh, pos: mesh.position, heading: 0, speed: 9, kind: 'van' };
    makeBeacon(ctx, step.x, step.z, 0xffffff);
  }
  if (step.type === 'race') {
    raceTimer = 90;
    const pts = [[-80, -80], [80, -80], [80, 80], [-80, 80]];
    racePoints = pts.map(([x, z]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.35, 8, 24), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
      ring.rotation.x = Math.PI / 2; ring.position.set(x, 1, z);
      ctx.scene.add(ring);
      return ring;
    });
    ctx.raceCheckpoints = pts.map(([x, z]) => ({ x, z, done: false }));
    makeBeacon(ctx, pts[0][0], pts[0][1], 0x00ff88);
  }
  if (step.type === 'goto' && m.id === 7) {
    ctx.playerApi.addWanted(ctx, 1); // the swap is watched
  }
}

export function updateMissions(ctx, dt) {
  if (!ctx.missionActive) return;
  const m = currentMission(ctx);
  if (!m) return;
  const step = m.steps[ctx.missionStep];
  if (!step) return;
  const p = ctx.player.pos;
  ctx.missionTimer += dt;
  if (beacon) beacon.rotation.y += dt;

  if (step.type === 'goto') {
    if (Math.hypot(p.x - step.x, p.z - step.z) < 5) advanceStep(ctx);
  } else if (step.type === 'enterCar') {
    if (ctx.player.inCar) advanceStep(ctx);
  } else if (step.type === 'collect') {
    if (Math.hypot(p.x - step.x, p.z - step.z) < 3) {
      const box = pickups.pop();
      if (box) ctx.scene.remove(box);
      ctx.audio.ding();
      ctx.player.money += 40;
      advanceStep(ctx);
    }
  } else if (step.type === 'tail' && tailVan) {
    // The van cruises a loop around Bayview.
    tailVan.heading += dt * 0.25;
    tailVan.pos.x += Math.sin(tailVan.heading) * tailVan.speed * dt;
    tailVan.pos.z += Math.cos(tailVan.heading) * tailVan.speed * dt;
    tailVan.mesh.rotation.y = tailVan.heading;
    if (beacon) beacon.position.set(tailVan.pos.x, 0, tailVan.pos.z);
    const d = Math.hypot(p.x - tailVan.pos.x, p.z - tailVan.pos.z);
    if (d < 40) ctx.missionProgress += dt;
    else ctx.missionProgress = Math.max(0, ctx.missionProgress - dt);
    ctx.hud.setObjective(m.name, step.text + ' (' + Math.floor(ctx.missionProgress) + ' / 20 s)');
    if (ctx.missionProgress >= 20) advanceStep(ctx);
  } else if (step.type === 'eliminate') {
    // Enemies walk toward the player and punch when close.
    for (const e of ctx.enemies) {
      const dx = p.x - e.pos.x, dz = p.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 14) {
        e.pos.x += (dx / d) * e.speed * dt;
        e.pos.z += (dz / d) * e.speed * dt;
        e.mesh.rotation.y = Math.atan2(dx, dz);
        if (d < 1.8) {
          ctx.player.health -= 8 * dt;
          if (ctx.player.health <= 0) ctx.gameOver('The Rust Jackals / Tide guards got you.');
        }
      }
    }
    const need = step.count;
    const down = need - ctx.enemies.length;
    ctx.hud.setObjective(m.name, step.text + ' — down: ' + Math.max(0, down) + '/' + need);
    if (ctx.missionEnemiesSpawned > 0 && ctx.enemies.length === 0) advanceStep(ctx);
  } else if (step.type === 'race') {
    raceTimer -= dt;
    const next = ctx.raceCheckpoints.find((c) => !c.done);
    if (next) {
      if (beacon) beacon.position.set(next.x, 0, next.z);
      if (Math.hypot(p.x - next.x, p.z - next.z) < 5) {
        next.done = true;
        ctx.audio.ding();
        ctx.hud.toast('Checkpoint!');
      }
      const left = ctx.raceCheckpoints.filter((c) => !c.done).length;
      ctx.hud.setObjective(m.name, 'Checkpoints left: ' + left + ' — time: ' + Math.max(0, Math.ceil(raceTimer)) + ' s');
      if (left === 0) advanceStep(ctx);
    }
    if (raceTimer <= 0) {
      ctx.hud.toast('Race failed — time up. Press M to retry.');
      ctx.missionActive = false;
      clearMissionObjects(ctx);
      ctx.hud.setObjective('Free Roam', 'Press M to start a mission.');
    }
  }
}

function advanceStep(ctx) {
  const m = currentMission(ctx);
  ctx.missionStep++;
  ctx.missionProgress = 0;
  if (ctx.missionStep >= m.steps.length) {
    ctx.missionActive = false;
    clearMissionObjects(ctx);
    ctx.player.money += m.reward;
    ctx.missionsDone++;
    ctx.missionIndex++;
    ctx.audio.missionDone();
    ctx.hud.toast('Mission complete! +$' + m.reward);
    ctx.hud.setObjective('Free Roam', 'Press M for the next mission (' + (ctx.missionIndex + 1) + ' of 8).');
    if (ctx.missionIndex >= MISSIONS.length) {
      ctx.hud.setObjective('Story Complete', 'You finished all 8 missions. Solmar Bay is yours.');
    }
  } else {
    ctx.audio.ding();
    setupStep(ctx);
  }
}

export function abortMission(ctx) {
  ctx.missionActive = false;
  clearMissionObjects(ctx);
}
