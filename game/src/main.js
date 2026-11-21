// Solmar Bay — main entrypoint. Boots the Three.js scene, owns the game
// loop, the third-person camera, on-foot movement, entering and exiting
// cars, punching, the wanted system, busted handling, saving, pausing and
// the debug handle the playtest reads (window.__solmar).

import { CFG } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { buildCity, collideCircle, clampToWorld } from './city.js';
import { VehicleManager } from './vehicles.js';
import { PeopleManager, animateWalk } from './people.js';
import { MissionManager } from './missions.js';
import { HUD } from './hud.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;

class Game {
  constructor() {
    this.started = false;
    this.paused = false;
    this.busted = false;
    this.shotCamera = false;
    this.autoDrive = false;    // screenshot staging holds W so the car keeps moving
    this.time = 0;
    this.cameraYaw = Math.PI;      // camera looks north at spawn
    this.cameraPitch = 0.32;
    this.cameraDist = 11;
    this.bustedTimer = 0;
    this.crimeTimer = 0;           // seconds since the last crime
    this.wantedGrace = 0;          // seconds with no police nearby
    this.hurtTimer = 0;
    this.lastRamAt = -99;
    this.punchTimer = 0;
    this.punchAnim = 0;
    this.walkPhase = 0;
    this.lastDamageAt = -99;
    this.toastShown = {};

    this.input = new Input();
    this.sound = new SoundBank();
    this.hud = new HUD();

    this.player = {
      mesh: null,
      pos: new THREE.Vector3(CFG.startPos.x, 0, CFG.startPos.z),
      heading: Math.PI,
      speed: 0,
      health: CFG.playerMaxHealth,
      money: CFG.startMoney,
      wanted: 0,
      inCar: null,
    };

    this._setupScene();
    this._wireButtons();
    this._setupDebug();
  }

  _setupScene() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Adaptive quality: software GL (SwiftShader / llvmpipe, as in headless
    // browsers) cannot afford shadow maps at full resolution, so the game
    // drops shadows and the pixel ratio there and keeps the same gameplay.
    const gl = this.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    this.lowFx = /swiftshader|llvmpipe|software/i.test(gpuName);
    this.renderer.shadowMap.enabled = !this.lowFx;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (this.lowFx) this.renderer.setPixelRatio(1);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87bfe8);
    this.scene.fog = new THREE.Fog(0x9fc8e8, 180, 520);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(-40, 55, 190);
    this.camera.lookAt(0, 0, 40);

    const sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -220;
    sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220;
    sun.shadow.camera.bottom = -220;
    sun.shadow.camera.far = 600;
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.75));

    const city = buildCity(this.scene);
    this.colliders = city.colliders;
    this.water = city.water;

    this.vehicles = new VehicleManager(this.scene, this.colliders);
    this.vehicles.spawnParked();
    this.vehicles.spawnTraffic();

    this.people = new PeopleManager(this.scene, this.colliders);
    this.player.mesh = this.people.makePlayer();
    this.people.spawnPedestrians();

    this.missions = new MissionManager(this.scene);
    this.missions.onMissionComplete = (m, payout) => {
      this.hud.toast(`Mission complete: ${m.title}  +$${payout}`);
      if (this.missions.done) {
        this.hud.showEnd(true);
        this.sound.missionComplete();
      }
    };
    this.missions.onStepComplete = () => { this.sound.coin(); };

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    this.input.attach();
  }

  _wireButtons() {
    document.getElementById('start-btn').addEventListener('click', () => {
      this.sound.init();
      this.sound.click();
      this.startGame(false);
    });
    document.getElementById('continue-btn').addEventListener('click', () => {
      this.sound.init();
      this.sound.click();
      this.startGame(true);
    });
    document.getElementById('resume-btn').addEventListener('click', () => {
      this.paused = false;
      this.hud.showPause(false);
    });
    document.getElementById('quit-btn').addEventListener('click', () => {
      this.paused = false;
      this.hud.showPause(false);
      this.started = false;
      this.hud.showStart(hasSave());
    });
    document.getElementById('busted-btn').addEventListener('click', () => {
      this.busted = false;
      this.hud.showBusted(false);
      this._respawnAfterBusted();
    });
    document.getElementById('brief-btn').addEventListener('click', () => {
      this.hud.showBrief('', '', false);
    });
    document.getElementById('end-btn').addEventListener('click', () => {
      this.hud.showEnd(false);
    });
  }

  startGame(fromSave) {
    this.started = true;
    this.paused = false;
    this.busted = false;
    this.hud.hideStart();
    if (fromSave) {
      const data = loadGame();
      if (data) {
        this.player.money = data.money;
        this.player.health = data.health;
        this.player.wanted = data.wanted;
        this.player.pos.set(data.x, 0, data.z);
        this.player.heading = data.heading;
        this.player.mesh.position.copy(this.player.pos);
        this.missions.setMission(data.missionIndex);
        this.missions.stepIndex = Math.min(data.stepIndex, this.missions.mission.steps.length - 1);
        this.missions._enterStep();
        this.hud.toast('Save loaded — welcome back to Solmar Bay');
        return;
      }
    }
    this.player.money = CFG.startMoney;
    this.player.health = CFG.playerMaxHealth;
    this.player.wanted = 0;
    this.player.pos.set(CFG.startPos.x, 0, CFG.startPos.z);
    this.player.heading = Math.PI;
    this.player.mesh.position.copy(this.player.pos);
    this.missions.start();
    this.hud.toast('Welcome to Solmar Bay — meet Rosa at Palm Court plaza');
  }

  enterCar(car) {
    car.parked = false;
    car.stolen = true;
    this.player.inCar = car;
    this.player.mesh.visible = false;
    this.player.pos.set(car.x, 0, car.z);
    this.player.heading = car.heading;
    this.sound.enterCar();
    this.addWanted(1, 'car stolen');
    this.hud.toast('Car stolen! The cops noticed. Drive!');
    this.hud.setHint('');
  }

  exitCar() {
    const car = this.player.inCar;
    if (!car) return;
    car.speed = 0;
    this.player.inCar = null;
    this.player.mesh.visible = true;
    this.player.pos.set(car.x + Math.cos(car.heading) * 2.4, 0, car.z - Math.sin(car.heading) * 2.4);
    this.player.mesh.position.copy(this.player.pos);
    this.sound.enterCar();
  }

  addWanted(stars, reason) {
    const before = this.player.wanted;
    this.player.wanted = Math.min(3, this.player.wanted + stars);
    this.crimeTimer = 0;
    if (this.player.wanted > before) {
      this.hud.toast(`Wanted level ${this.player.wanted} — ${reason}`);
    }
  }

  _respawnAfterBusted() {
    this.player.money = Math.max(0, this.player.money - 200);
    this.player.wanted = 0;
    this.player.health = CFG.playerMaxHealth;
    if (this.player.inCar) {
      this.player.inCar.speed = 0;
      this.player.inCar = null;
      this.player.mesh.visible = true;
    }
    this.vehicles.clearPolice();
    this.player.pos.set(CFG.startPos.x, 0, CFG.startPos.z);
    this.player.heading = Math.PI;
    this.player.mesh.position.copy(this.player.pos);
    this.player.mesh.rotation.set(0, this.player.heading, 0);
    this.sound.setSiren(false);
  }

  _updatePlayerOnFoot(dt, processEdges) {
    const input = this.input;
    const run = input.isDown('Shift') || input.isDown('shift');
    const speed = run ? CFG.runSpeed : CFG.walkSpeed;
    // Movement is camera-relative: W walks away from the camera.
    let mx = 0;
    let mz = 0;
    if (input.isDown('w')) { mx += Math.sin(this.cameraYaw); mz += Math.cos(this.cameraYaw); }
    if (input.isDown('s')) { mx -= Math.sin(this.cameraYaw); mz -= Math.cos(this.cameraYaw); }
    if (input.isDown('a')) { mx += Math.sin(this.cameraYaw - Math.PI / 2); mz += Math.cos(this.cameraYaw - Math.PI / 2); }
    if (input.isDown('d')) { mx += Math.sin(this.cameraYaw + Math.PI / 2); mz += Math.cos(this.cameraYaw + Math.PI / 2); }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
      this.player.pos.x += mx * speed * dt;
      this.player.pos.z += mz * speed * dt;
      const targetHeading = Math.atan2(mx, mz);
      let diff = targetHeading - this.player.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.heading += Math.max(-8 * dt, Math.min(8 * dt, diff));
      this.walkPhase += dt * speed * 1.4;
      animateWalk(this.player.mesh, this.walkPhase, len);
      this.player.speed = speed;
    } else {
      animateWalk(this.player.mesh, this.walkPhase, 0);
      this.player.speed = 0;
    }
    if (collideCircle(this.colliders, this.player.pos, 0.7)) {
      // pushed out of the building
    }
    clampToWorld(this.player.pos, CFG.worldHalf);
    this.player.mesh.position.copy(this.player.pos);
    this.player.mesh.rotation.y = this.player.heading;

    // punch animation: right arm swings forward briefly
    if (this.punchAnim > 0) {
      this.punchAnim -= dt;
      this.player.mesh.userData.armR.rotation.x = -1.5 * Math.max(0, this.punchAnim / 0.25);
      if (this.punchAnim <= 0) this.player.mesh.userData.armR.rotation.x = 0;
    }

    // enter a car (edge-triggered: once per key tap, not once per sub-step)
    if (processEdges && input.wasPressed('e')) {
      const car = this.vehicles.nearestParked(this.player.pos.x, this.player.pos.z, 4.5);
      if (car) this.enterCar(car);
      else this.hud.setHint('No parked car nearby — look for one at the road edge');
    }

    // punch
    this.punchTimer -= dt;
    if (processEdges && input.wasPressed('f') && this.punchTimer <= 0) {
      this.punchTimer = CFG.punchCooldown;
      this.punchAnim = 0.25;
      this.sound.punch();
      const result = this.people.tryPunch(this.player.pos.x, this.player.pos.z, this.player.heading);
      if (result.kind === 'ped') {
        this.addWanted(1, 'you punched a pedestrian');
        this.hud.toast('You punched a pedestrian! Someone called the cops.');
      } else if (result.kind === 'thug') {
        this.sound.hit();
        this.hud.toast('Thug down! Keep swinging.');
      } else if (result.kind === 'boss') {
        this.sound.hit();
        this.hud.toast('You hurt Vito Marlowe! Finish him!');
      }
    }
  }

  _updateCamera(dt) {
    const drag = this.input.consumeMouse();
    if (drag.dx !== 0 || drag.dy !== 0) {
      this.cameraYaw -= drag.dx * 0.005;
      this.cameraPitch = Math.max(0.08, Math.min(0.9, this.cameraPitch + drag.dy * 0.003));
    }
    const target = this.player.inCar
      ? new THREE.Vector3(this.player.inCar.x, 1.5, this.player.inCar.z)
      : new THREE.Vector3(this.player.pos.x, 1.6, this.player.pos.z);
    let yaw = this.cameraYaw;
    if (this.player.inCar) {
      // chase camera: drift behind the car's heading unless the player drags
      const behind = this.player.inCar.heading + Math.PI;
      let diff = behind - yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw += diff * Math.min(1, dt * 1.4);
      this.cameraYaw = yaw;
    }
    const dist = this.player.inCar ? this.cameraDist + 3 : this.cameraDist;
    const cx = target.x - Math.sin(yaw) * Math.cos(this.cameraPitch) * dist;
    const cz = target.z - Math.cos(yaw) * Math.cos(this.cameraPitch) * dist;
    const cy = target.y + Math.sin(this.cameraPitch) * dist + 1.5;
    this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 6));
    this.camera.lookAt(target.x, target.y + 0.6, target.z);
  }

  _updateWanted(dt) {
    const p = this.player;
    this.crimeTimer += dt;
    // police presence follows the wanted level
    if (p.wanted > 0) {
      this.vehicles.spawnPoliceNear(p.pos.x, p.pos.z, p.wanted);
      this.sound.setSiren(true);
    } else {
      this.vehicles.removeExtraPolice(0);
      this.sound.setSiren(false);
    }
    const closest = this.vehicles.updatePolice(dt, p.pos.x, p.pos.z, !!p.inCar, this.time);
    // busted: a police car catches Milo on foot
    if (p.wanted > 0 && !p.inCar && closest < 3.2) {
      this.bustedTimer += dt;
      if (this.bustedTimer > 1.4) {
        this.busted = true;
        this.bustedTimer = 0;
        this.sound.busted();
        this.hud.showBusted(true);
      }
    } else {
      this.bustedTimer = 0;
    }
    // police ramming the player's car: a single bump with a cooldown, so a
    // chase slows the player down without gluing the car to a crawl.
    if (p.inCar && closest < 3.6 && this.time - this.lastRamAt > 1.2) {
      this.lastRamAt = this.time;
      p.inCar.speed *= 0.65;
      this.hud.setHint('Police rammed you — keep driving!');
    }
    // wanted decays when the player stays clean and far from police
    if (p.wanted > 0 && this.crimeTimer > CFG.wantedDecaySeconds) {
      if (closest > 45) {
        this.wantedGrace += dt;
        if (this.wantedGrace > 6) {
          p.wanted -= 1;
          this.crimeTimer = 0;
          this.wantedGrace = 0;
          this.hud.toast(`Wanted level down to ${p.wanted}`);
        }
      } else {
        this.wantedGrace = 0;
      }
    }
  }

  _updateKeys() {
    const input = this.input;
    if (input.wasPressed('m')) {
      const m = this.missions.mission;
      if (m) {
        const showing = !this.hud.briefScreen.classList.contains('hidden');
        this.hud.showBrief(m.title + ' — ' + m.giver, m.brief, !showing);
      }
    }
    if (input.wasPressed('c')) {
      const ok = saveGame(this);
      this.hud.toast(ok ? 'Game saved (C) — progress kept' : 'Save failed — storage unavailable');
      this.sound.coin();
    }
    if (this.player.inCar) {
      if (input.wasPressed('e')) this.exitCar();
      if (input.wasPressed('f')) this.sound.horn();
    }
  }

  _setupDebug() {
    window.__solmar = {
      game: this,
      state: () => ({
        started: this.started,
        paused: this.paused,
        busted: this.busted,
        money: Math.floor(this.player.money),
        health: Math.ceil(this.player.health),
        wanted: this.player.wanted,
        mission: this.missions.done ? 8 : this.missions.index,
        missionTitle: this.missions.done ? 'done' : this.missions.mission.title,
        step: this.missions.stepIndex,
        objective: this.missions.objectiveText,
        inCar: !!this.player.inCar,
        speed: this.player.inCar ? Math.round(Math.abs(this.player.inCar.speed) * 3.2) : 0,
        x: Math.round(this.player.pos.x),
        z: Math.round(this.player.pos.z),
        police: this.vehicles.police.length,
        parked: this.vehicles.parked.filter((c) => c.parked).length,
        traffic: this.vehicles.traffic.length,
        peds: this.people.pedestrians.filter((p) => p.alive).length,
        thugsAlive: this.people.thugs.filter((t) => t.alive).length,
        done: this.missions.done,
      }),
      setWanted: (n) => { this.player.wanted = n; this.crimeTimer = 0; },
      teleport: (x, z) => {
        if (this.player.inCar) {
          this.player.inCar.x = x; this.player.inCar.z = z;
        }
        this.player.pos.set(x, 0, z);
      },
      save: () => saveGame(this),
      load: () => loadGame(),
    };
    window.__shotReady = false;
  }

  // Fixed-timestep simulation: the game advances in 1/60 s steps no matter
  // how fast the browser renders, so slow software GL still plays at real
  // speed instead of slow motion. Rendering happens once per animation
  // frame; edge-triggered keys (E, F, C, M, P) are handled on the first
  // sub-step of the frame only, so one tap never fires twice.
  loop() {
    const clock = new THREE.Clock();
    const STEP = 1 / 60;
    let acc = 0;
    const tick = () => {
      requestAnimationFrame(tick);
      const frameDt = Math.min(0.25, clock.getDelta());
      acc += frameDt;
      // Pause toggle lives here, once per frame, so one P / Esc tap can
      // never be seen twice (the step below would see the same tap again
      // and toggle straight back).
      if (this.started && !this.busted && (this.input.wasPressed('p') || this.input.wasPressed('Escape'))) {
        this.paused = !this.paused;
        this.hud.showPause(this.paused);
      }
      let first = true;
      let steps = 0;
      while (acc >= STEP && steps < 20) {
        this._step(STEP, first);
        first = false;
        acc -= STEP;
        steps++;
      }
      if (steps === 20) acc = 0; // drop the backlog rather than spiral
      if (this.started && !this.paused && !this.busted) this.hud.update(this);
      this.renderer.render(this.scene, this.camera);
      // Clear edge-triggered presses only after this frame's steps have
      // read them. Key events arrive between animation frames (one JS task
      // cannot be interrupted by another), so a tap is always seen by the
      // next frame's first sub-step before it is cleared here.
      this.input.endFrame();
    };
    tick();
  }

  _step(dt, processEdges) {
    this.time += dt;
    if (this.water) {
      this.water.position.y = 0.12 + Math.sin(this.time * 0.7) * 0.06;
    }
    if (!this.started) {
      // Title screen: slow orbit over the city while the game waits.
      if (!this.shotCamera) {
        const a = this.time * 0.05;
        this.camera.position.set(Math.sin(a) * 190, 70, Math.cos(a) * 190);
        this.camera.lookAt(0, 0, 0);
      }
      this.vehicles.updateTraffic(dt);
      this.people.updatePedestrians(dt);
      return;
    }
    if (this.paused || this.busted) return;
    if (processEdges) this._updateKeys();
    if (this.player.inCar) {
      if (this.autoDrive) this.input.held.add('w');
      this.vehicles.driveCar(this.player.inCar, this.input, dt);
      this.player.pos.set(this.player.inCar.x, 0, this.player.inCar.z);
      this.player.heading = this.player.inCar.heading;
      this.sound.setEngine(Math.abs(this.player.inCar.speed) / CFG.carMaxSpeed, true);
    } else {
      this._updatePlayerOnFoot(dt, processEdges);
      this.sound.setEngine(0, false);
    }
    this.vehicles.updateTraffic(dt);
    this.people.updatePedestrians(dt);
    const dmg = this.people.updateThugs(dt, this.player.pos.x, this.player.pos.z);
    if (dmg > 0) {
      this.player.health -= dmg;
      this.lastDamageAt = this.time;
      this.hurtTimer = 0.4;
      this.sound.hit();
      if (this.player.health <= 0) {
        this.player.health = 0;
        this.busted = true;
        this.sound.busted();
        this.hud.showBusted(true);
      }
    }
    // slow health regen when not recently hurt
    if (this.time - this.lastDamageAt > 6 && this.player.health < CFG.playerMaxHealth) {
      this.player.health = Math.min(CFG.playerMaxHealth, this.player.health + 2.5 * dt);
    }
    const ev = this.missions.update(dt, this);
    if (ev === 'failed') this.hud.toast('Out of time! The step restarted.');
    this._updateWanted(dt);
    this._updateCamera(dt);
  }
}

const game = new Game();
game.hud.showStart(hasSave());
game.loop();

// Screenshot staging: ?shot=start|driving|mission|chase
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(game, shot);
}
