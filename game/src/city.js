// Solmar Bay city builder: ground, road grid, buildings with lit windows,
// beach and sea, palms, lamps, billboards and props. Every mesh is built
// from Three.js primitives with canvas textures made at runtime — no files.

import { CFG } from './config.js';

function makeWindowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#20242c';
  g.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 246; y += 22) {
    for (let x = 10; x < 118; x += 22) {
      const lit = Math.random() < 0.42;
      g.fillStyle = lit ? '#ffd98a' : '#3a4a63';
      g.fillRect(x, y, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeTextTexture(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fg;
  g.font = 'bold 58px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  return new THREE.CanvasTexture(c);
}

function box(w, h, d, color, x, y, z, opts) {
  const mat = new THREE.MeshLambertMaterial({ color });
  if (opts && opts.map) {
    mat.map = opts.map;
    mat.emissive = new THREE.Color(0x222222);
    mat.emissiveMap = opts.map;
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts && opts.ry) m.rotation.y = opts.ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildCity(scene) {
  const colliders = [];   // {x, z, hw, hd} axis-aligned boxes the player and cars bump into
  const windowTex = makeWindowTexture();
  const palette = [0xd9a066, 0xc97b5a, 0x8fa3b8, 0xe8dcc0, 0x7fb069, 0xb56576, 0x6d6875, 0xf4a261];

  // --- ground, beach and sea -------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.worldHalf * 2 + 120, CFG.worldHalf * 2 + 120),
    new THREE.MeshLambertMaterial({ color: 0x9aa0a3 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // Sand strip along the south edge (z > 150) and the sea beyond it.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.worldHalf * 2 + 120, 70),
    new THREE.MeshLambertMaterial({ color: 0xeed9a4 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.06, 185);
  sand.receiveShadow = true;
  scene.add(sand);

  const waterMat = new THREE.MeshLambertMaterial({ color: 0x1e90c8, transparent: true, opacity: 0.9 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(CFG.worldHalf * 2 + 160, 90), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.12, 255);
  scene.add(water);

  // --- roads ------------------------------------------------------------------
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33373d });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  const roads = [];
  for (let i = -4; i <= 4; i++) {
    const c = i * CFG.roadGap;
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(CFG.worldHalf * 2, CFG.roadHalfWidth * 2), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.04, c);
    hRoad.receiveShadow = true;
    scene.add(hRoad);
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadHalfWidth * 2, CFG.worldHalf * 2), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(c, 0.04, 0);
    vRoad.receiveShadow = true;
    scene.add(vRoad);
    roads.push(c);
    // dashed centre lines
    for (let p = -CFG.worldHalf + 10; p < CFG.worldHalf; p += 16) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.7), lineMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(p, 0.06, c);
      scene.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), lineMat);
      d2.rotation.x = -Math.PI / 2;
      d2.position.set(c, 0.06, p);
      scene.add(d2);
    }
  }

  // --- buildings ---------------------------------------------------------------
  // One building per block quadrant, skipping the beach strip and the plaza.
  const buildingColors = [];
  let bi = 0;
  for (let gx = -4; gx <= 4; gx++) {
    for (let gz = -4; gz <= 4; gz++) {
      const bx = gx * CFG.roadGap;
      const bz = gz * CFG.roadGap;
      if (bz > 120) continue;                    // beach, no buildings
      if (Math.abs(bx) < 25 && Math.abs(bz - 60) < 25) continue; // Palm Court plaza
      if (Math.abs(bx - 150) < 30 && Math.abs(bz - 40) < 30) continue; // docks yard
      const w = 16 + ((bi * 7) % 10);
      const d = 14 + ((bi * 11) % 10);
      const h = 10 + ((bi * 13) % 34) + (Math.abs(gx) <= 1 && Math.abs(gz) <= 1 ? 14 : 0);
      const color = palette[bi % palette.length];
      const tex = windowTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(w / 10)), Math.max(1, Math.round(h / 12)));
      // Buildings sit at the centre of each block (bx+20, bz+20) so the
      // road grid stays fully clear for driving; a building never crosses
      // a road surface.
      const b = box(w, h, d, color, bx + 20, h / 2, bz + 20, { map: tex });
      scene.add(b);
      buildingColors.push(color);
      colliders.push({ x: bx + 20, z: bz + 20, hw: w / 2, hd: d / 2 });
      // flat roof cap
      const roof = box(w + 0.6, 0.8, d + 0.6, 0x3a3f46, bx + 20, h + 0.4, bz + 20);
      roof.castShadow = false;
      scene.add(roof);
      bi++;
    }
  }

  // --- palms --------------------------------------------------------------------
  const palmPositions = [];
  for (let i = 0; i < 46; i++) {
    const along = -190 + i * 8.4;
    palmPositions.push([along, 168]);
    if (i % 3 === 0) palmPositions.push([-180 + (i % 9) * 44, -180 + Math.floor(i / 9) * 40]);
  }
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6d3b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44 });
  for (const [px, pz] of palmPositions) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
    trunk.position.set(px, 3.5, pz);
    trunk.castShadow = true;
    scene.add(trunk);
    for (let l = 0; l < 5; l++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.4, 4), leafMat);
      const a = (l / 5) * Math.PI * 2;
      leaf.position.set(px + Math.cos(a) * 1.6, 7.4, pz + Math.sin(a) * 1.6);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      scene.add(leaf);
    }
  }

  // --- street lamps ---------------------------------------------------------------
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2f3338 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let gx = -4; gx <= 4; gx++) {
    for (let gz = -4; gz <= 4; gz++) {
      if ((gx + gz) % 2 !== 0) continue;
      const lx = gx * CFG.roadGap + 6;
      const lz = gz * CFG.roadGap + 6;
      if (lz > 150) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), lampMat);
      pole.position.set(lx, 3, lz);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bulbMat);
      bulb.position.set(lx, 6.2, lz);
      scene.add(bulb);
    }
  }

  // --- billboards -----------------------------------------------------------------
  const boards = [
    { text: 'SOLMAR BAY', x: -40, z: -160, ry: 0 },
    { text: 'CORAL BEACH', x: 40, z: 150, ry: Math.PI },
    { text: 'NEON ROW', x: -160, z: -40, ry: Math.PI / 2 },
    { text: 'HARBOR DOCKS', x: 170, z: 0, ry: -Math.PI / 2 },
  ];
  for (const b of boards) {
    const tex = makeTextTexture(b.text, '#ffe066', '#14213d');
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 6.5),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
    board.position.set(b.x, 14, b.z);
    board.rotation.y = b.ry;
    scene.add(board);
    const post1 = box(0.8, 14, 0.8, 0x444444, b.x - 10, 7, b.z);
    const post2 = box(0.8, 14, 0.8, 0x444444, b.x + 10, 7, b.z);
    post1.castShadow = false;
    post2.castShadow = false;
    scene.add(post1);
    scene.add(post2);
  }

  // --- beach props: umbrellas, crates, dock containers ---------------------------
  const umbrellaMat = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
  const umbrellaMat2 = new THREE.MeshLambertMaterial({ color: 0x4cc9f0 });
  for (let i = 0; i < 8; i++) {
    const ux = -170 + i * 22;
    const uz = 168 + (i % 2) * 10;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), lampMat);
    pole.position.set(ux, 1.5, uz);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3, 1.6, 8), i % 2 ? umbrellaMat : umbrellaMat2);
    top.position.set(ux, 3.6, uz);
    top.castShadow = true;
    scene.add(top);
  }
  // shipping containers and crates at the docks
  const crateColors = [0xb5651d, 0x2a9d8f, 0xe76f51, 0x6d6875];
  for (let i = 0; i < 10; i++) {
    const cx = 130 + (i % 5) * 12;
    const cz = 20 + Math.floor(i / 5) * 14;
    const crate = box(9, 4, 4, crateColors[i % 4], cx, 2, cz, { ry: (i % 2) * 0.4 });
    scene.add(crate);
    colliders.push({ x: cx, z: cz, hw: 4.5, hd: 2 });
  }
  // yacht club pier
  const pier = box(30, 1, 8, 0x8a6d3b, -170, 0.6, 205);
  pier.castShadow = false;
  scene.add(pier);
  const boatHull = box(10, 2, 4, 0xf1faee, -170, 1.4, 214);
  scene.add(boatHull);

  return { colliders, water, buildingCount: bi };
}

// Push a circle (x, z, radius) out of every building collider it overlaps.
// Returns true when a push happened, so callers can kill speed on impact.
export function collideCircle(colliders, pos, radius) {
  let hit = false;
  for (const c of colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const px = c.hw + radius - Math.abs(dx);
    const pz = c.hd + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      hit = true;
      if (px < pz) pos.x = c.x + Math.sign(dx || 1) * (c.hw + radius);
      else pos.z = c.z + Math.sign(dz || 1) * (c.hd + radius);
    }
  }
  return hit;
}

export function clampToWorld(pos, half) {
  pos.x = Math.max(-half, Math.min(half, pos.x));
  pos.z = Math.max(-half - 8, Math.min(half + 52, pos.z));
}
