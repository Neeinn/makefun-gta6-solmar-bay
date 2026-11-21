// Mission engine for Solmar Bay: runs the 8-story job list from config.js
// in order, one objective step at a time. It owns the glowing pickup items,
// the 3D beacon over the current target, and the mission-complete payouts.

import { MISSIONS } from './config.js';

function makeBeacon() {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 34, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 17;
  g.add(beam);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.28, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  g.add(ring);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  diamond.position.y = 6;
  g.add(diamond);
  g.userData.diamond = diamond;
  g.userData.ring = ring;
  return g;
}

function makePickupMesh(kind) {
  const g = new THREE.Group();
  const color = kind === 'cash' ? 0x37b24d : 0xf2c230;
  const boxMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.8, 1.1),
    new THREE.MeshLambertMaterial({ color })
  );
  boxMesh.position.y = 0.9;
  boxMesh.castShadow = true;
  g.add(boxMesh);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 10, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 })
  );
  glow.position.y = 0.9;
  g.add(glow);
  g.userData.boxMesh = boxMesh;
  return g;
}

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.index = 0;                 // current mission in MISSIONS
    this.stepIndex = 0;             // current step inside the mission
    this.done = false;              // every mission finished
    this.beacon = makeBeacon();
    this.beacon.visible = false;
    scene.add(this.beacon);
    this.pickups = [];              // active glowing items {mesh, x, z, taken}
    this.collected = 0;
    this.defeated = 0;
    this.stepTimer = 0;             // countdown for timed steps
    this.stepTimeLeft = 0;
    this.thugsSpawned = false;
    this.objectiveText = '';
    this.onMissionComplete = null;  // callback(mission)
    this.onStepComplete = null;
  }

  get mission() { return MISSIONS[this.index]; }
  get step() {
    const m = this.mission;
    return m ? m.steps[this.stepIndex] : null;
  }

  get totalMissions() { return MISSIONS.length; }

  start() {
    this.index = 0;
    this.stepIndex = 0;
    this.done = false;
    this._enterStep();
  }

  setMission(i) {
    this.index = Math.max(0, Math.min(MISSIONS.length - 1, i));
    this.stepIndex = 0;
    this.done = false;
    this._clearPickups();
    this._enterStep();
  }

  _clearPickups() {
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.pickups = [];
  }

  _enterStep() {
    const step = this.step;
    this.collected = 0;
    this.defeated = 0;
    this.thugsSpawned = false;
    this._clearPickups();
    if (!step) return;
    this.objectiveText = step.label || '';
    if (step.type === 'collect') {
      const kind = this.index === 6 ? 'cash' : 'package';
      for (const s of step.spots) {
        const mesh = makePickupMesh(kind);
        mesh.position.set(s.x, 0, s.z);
        this.scene.add(mesh);
        this.pickups.push({ mesh, x: s.x, z: s.z, taken: false });
      }
    }
    if (step.type === 'timed') {
      this.stepTimeLeft = step.seconds;
      this.stepTimer = step.seconds;
    }
    this._placeBeacon();
  }

  _placeBeacon() {
    const step = this.step;
    if (!step) { this.beacon.visible = false; return; }
    let target = null;
    if (step.type === 'goto' || step.type === 'escape' || step.type === 'timed') {
      target = { x: step.x, z: step.z };
    } else if (step.type === 'collect') {
      const next = this.pickups.find((p) => !p.taken);
      target = next ? { x: next.x, z: next.z } : (step.drop ? { x: step.drop.x, z: step.drop.z } : null);
    } else if (step.type === 'defeat') {
      target = { x: step.area.x, z: step.area.z };
    }
    if (target) {
      this.beacon.position.set(target.x, 0, target.z);
      this.beacon.visible = true;
    } else {
      this.beacon.visible = false;
    }
  }

  // Where the player should head right now (for the HUD arrow + minimap).
  currentTarget() {
    const step = this.step;
    if (!step) return null;
    if (step.type === 'goto' || step.type === 'escape' || step.type === 'timed') return { x: step.x, z: step.z };
    if (step.type === 'collect') {
      const next = this.pickups.find((p) => !p.taken);
      if (next) return { x: next.x, z: next.z };
      return step.drop ? { x: step.drop.x, z: step.drop.z } : null;
    }
    if (step.type === 'defeat') return { x: step.area.x, z: step.area.z };
    return null;
  }

  // Called every frame with the live game state. Returns an event string
  // ('step' | 'mission' | 'failed' | null) for the main loop to react to.
  update(dt, G) {
    if (this.done) return null;
    const step = this.step;
    if (!step) return null;
    const px = G.player.pos.x;
    const pz = G.player.pos.z;
    const distTo = (x, z) => Math.hypot(px - x, pz - z);

    if (step.type === 'goto') {
      if (distTo(step.x, step.z) < step.radius) return this._advance(G);
    } else if (step.type === 'enterCar') {
      if (G.player.inCar) return this._advance(G);
    } else if (step.type === 'wanted') {
      if (G.player.wanted >= step.stars) return this._advance(G);
    } else if (step.type === 'escape') {
      if (G.player.wanted >= step.stars && distTo(step.x, step.z) < step.radius) {
        G.player.wanted = 0;
        return this._advance(G);
      }
    } else if (step.type === 'timed') {
      this.stepTimeLeft -= dt;
      if (this.stepTimeLeft <= 0) {
        // Out of time: restart this step from the pickup point.
        this.stepIndex = Math.max(0, this.stepIndex - 1);
        this._enterStep();
        return 'failed';
      }
      if (distTo(step.x, step.z) < step.radius) {
        G.player.wanted = Math.max(0, G.player.wanted - 2);
        return this._advance(G);
      }
    } else if (step.type === 'collect') {
      for (const p of this.pickups) {
        if (!p.taken && distTo(p.x, p.z) < 3.2) {
          p.taken = true;
          p.mesh.visible = false;
          this.collected++;
          G.sound.pickup();
          this.objectiveText = this.collected < step.count
            ? `Collected ${this.collected}/${step.count} — keep going`
            : (step.dropLabel || 'Deliver them');
          this._placeBeacon();
        }
      }
      if (this.collected >= step.count && step.drop && distTo(step.drop.x, step.drop.z) < step.drop.radius) {
        return this._advance(G);
      }
    } else if (step.type === 'defeat') {
      if (!this.thugsSpawned) {
        this.thugsSpawned = true;
        G.people.spawnThugs(step.area, step.count, !!step.boss);
      }
      const dead = G.people.thugs.filter((t) => !t.alive).length;
      if (dead > this.defeated) {
        this.defeated = dead;
        this.objectiveText = `Thugs down: ${this.defeated}/${step.count}`;
      }
      if (dead >= step.count) {
        G.people.clearThugs();
        return this._advance(G);
      }
    }
    // spin the beacon diamond and bob the pickups
    const t = performance.now() / 1000;
    this.beacon.userData.diamond.rotation.y = t * 2;
    this.beacon.userData.diamond.position.y = 6 + Math.sin(t * 2.4) * 0.5;
    for (const p of this.pickups) {
      if (!p.taken) p.mesh.userData.boxMesh.rotation.y = t * 1.5;
    }
    return null;
  }

  _advance(G) {
    if (this.onStepComplete) this.onStepComplete(this.step);
    this.stepIndex++;
    const mission = this.mission;
    if (this.stepIndex >= mission.steps.length) {
      const payout = mission.payout;
      G.player.money += payout;
      G.sound.missionComplete();
      if (this.onMissionComplete) this.onMissionComplete(mission, payout);
      this.index++;
      this.stepIndex = 0;
      if (this.index >= MISSIONS.length) {
        this.done = true;
        this.beacon.visible = false;
        this._clearPickups();
        return 'mission';
      }
      this._enterStep();
      return 'mission';
    }
    this._enterStep();
    return 'step';
  }

  statusLine() {
    if (this.done) return 'All missions complete — you are the King of Solmar Bay!';
    const m = this.mission;
    const step = this.step;
    let extra = '';
    if (step && step.type === 'timed') extra = `  ⏱ ${Math.max(0, Math.ceil(this.stepTimeLeft))}s`;
    if (step && step.type === 'collect') extra = `  (${this.collected}/${step.count})`;
    if (step && step.type === 'defeat') extra = `  (${this.defeated}/${step.count})`;
    return `${m.title} — ${this.objectiveText}${extra}`;
  }
}
