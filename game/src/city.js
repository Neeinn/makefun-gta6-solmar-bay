// city.js — builds the 3D city of Solmar Bay: roads, districts, box buildings, sea, beach.
export const CITY_SIZE = 400;
export const ROAD_COORDS = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
export const DISTRICTS = [
  { name: 'Harbor Lights', x: -160, z: -160, color: 0x2e86ab },
  { name: 'North Docks', x: -40, z: -160, color: 0x8d99ae },
  { name: 'Coral Point', x: 80, z: -160, color: 0xef8354 },
  { name: 'Lighthouse Hill', x: 160, z: -160, color: 0xf4d35e },
  { name: 'Old Cannery', x: -160, z: -40, color: 0x9c6644 },
  { name: 'Bayview', x: -40, z: -40, color: 0x06d6a0 },
  { name: 'Marina Verde', x: 80, z: -40, color: 0x118ab2 },
  { name: 'Palm Court', x: 160, z: -40, color: 0xef476f },
  { name: 'Citrus Park', x: -100, z: 100, color: 0x80b918 },
  { name: 'Sunset Ridge', x: 100, z: 100, color: 0xff9e00 },
];

function windowTexture(baseColor) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = baseColor; g.fillRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(255, 240, 180, 0.9)';
  for (let y = 8; y < 120; y += 16) for (let x = 6; x < 58; x += 14) {
    if ((x + y) % 28 !== 0) g.fillRect(x, y, 9, 10);
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

const PALETTE = ['#c96f4a', '#e0a458', '#7fb069', '#5b8e7d', '#d9c7a7', '#a26769', '#6a8eae', '#e07a5f', '#8ecae6', '#f2cc8f'];

export function buildCity(scene) {
  const colliders = [];
  const buildings = [];
  const group = new THREE.Group();
  scene.add(group);

  // Ground: grassy city slab, with a sandy beach and blue sea on the south edge.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SIZE + 260, CITY_SIZE + 260),
    new THREE.MeshLambertMaterial({ color: 0x4d7c4f })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 60);
  ground.receiveShadow = true; group.add(ground);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 130),
    new THREE.MeshLambertMaterial({ color: 0x1e6f9f })
  );
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, 330); group.add(sea);
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 30),
    new THREE.MeshLambertMaterial({ color: 0xe8d8a0 })
  );
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.06, 272); group.add(beach);

  // Roads: dark strips along the grid, with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2b33 });
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  for (const c of ROAD_COORDS) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(10, CITY_SIZE), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0.08, 0); group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(CITY_SIZE, 10), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.08, c); group.add(h);
    for (let t = -190; t <= 190; t += 20) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 4), dashMat);
      d1.rotation.x = -Math.PI / 2; d1.position.set(c, 0.12, t); group.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.6), dashMat);
      d2.rotation.x = -Math.PI / 2; d2.position.set(t, 0.12, c); group.add(d2);
    }
  }

  // Buildings: one box per block cell, height by district, windows via canvas texture.
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let ix = 0; ix < ROAD_COORDS.length - 1; ix++) {
    for (let iz = 0; iz < ROAD_COORDS.length - 1; iz++) {
      const cx = (ROAD_COORDS[ix] + ROAD_COORDS[ix + 1]) / 2;
      const cz = (ROAD_COORDS[iz] + ROAD_COORDS[iz + 1]) / 2;
      if (cz > 200) continue; // beach / sea strip stays open
      if (rand() < 0.12) {
        // A little park: trees instead of a building.
        for (let k = 0; k < 4; k++) {
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
          trunk.position.set(cx - 8 + k * 5, 1.5, cz - 6 + (k % 2) * 10); group.add(trunk);
          const top = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2f7d32 }));
          top.position.set(trunk.position.x, 4.6, trunk.position.z); group.add(top);
        }
        continue;
      }
      const w = 18 + rand() * 8, d = 18 + rand() * 8;
      const h = 8 + rand() * rand() * 42;
      const color = PALETTE[Math.floor(rand() * PALETTE.length)];
      const mat = new THREE.MeshLambertMaterial({ map: windowTexture(color) });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(cx, h / 2, cz); group.add(b);
      // Roof box, slightly smaller, flat colour.
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.2, d * 0.7), new THREE.MeshLambertMaterial({ color: 0x333333 }));
      roof.position.set(cx, h + 0.6, cz); group.add(roof);
      buildings.push({ x: cx, z: cz, w, d, h });
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }
  }

  // District signposts: tall coloured pillars with a floating name sprite.
  for (const dist of DISTRICTS) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 8), new THREE.MeshLambertMaterial({ color: dist.color }));
    pillar.position.set(dist.x, 6, dist.z); group.add(pillar);
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const g = canvas.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#fff'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText(dist.name, 128, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.scale.set(24, 6, 1); sprite.position.set(dist.x, 15, dist.z); group.add(sprite);
  }

  // Sun, sky and fog.
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 90, 340);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
  sun.position.set(120, 180, 60); scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  return { colliders, buildings, group };
}

export function collideCircle(pos, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      pos.x = nx + (dx / d) * radius;
      pos.z = nz + (dz / d) * radius;
      return true;
    }
  }
  // Keep inside the playable map.
  pos.x = Math.max(-195, Math.min(195, pos.x));
  pos.z = Math.max(-195, Math.min(255, pos.z));
  return false;
}

export function nearestRoadCoord(v) {
  let best = ROAD_COORDS[0], bd = 1e9;
  for (const c of ROAD_COORDS) { const d = Math.abs(v - c); if (d < bd) { bd = d; best = c; } }
  return best;
}
