// Solmar Bay — main loop and game state glue.
import { CITY_W, CITY_H, VIEW_W, VIEW_H } from './config.js';
import { makeRng } from './random.js';
import { buildCity, collidesWithBuildings } from './city.js';
import { InputState } from './input.js';
import { Player, nearestCar } from './player.js';
import { spawnTrafficCars, spawnParkedCars, spawnPedestrians, updateTrafficCar, updatePedestrian, driveCar } from './traffic.js';
import { WantedSystem, crimeHeatFor } from './police.js';
import { Combat } from './combat.js';
import { MissionRunner } from './missions.js';
import { Economy } from './economy.js';
import { RadioPlayer } from './audio.js';
import { drawWorld, drawHud, drawTitle, drawHelp, drawPaused, drawGameOver } from './render.js';
import { parseShotQuery, applyShotMode } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export function createState(seed) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const player = new Player(1800, 900);
  const trafficCars = spawnTrafficCars(seed, 26);
  const parkedCars = spawnParkedCars(seed, 14, city.buildings);
  const peds = spawnPedestrians(seed, 40);
  const state = {
    seed,
    rng,
    city,
    player,
    trafficCars,
    parkedCars,
    peds,
    wanted: new WantedSystem(),
    combat: new Combat(),
    missions: new MissionRunner(),
    economy: new Economy(),
    audio: new RadioPlayer(),
    input: new InputState(),
    time: 0,
    mode: 'title', // title | play | help | paused | over
    titleSelected: 0,
    fromTitle: false,
    overReason: '',
    cam: { x: 0, y: 0 },
    committingCrime: false,
    saveFlash: '',
    saveFlashTimer: 0,
  };
  state.missions.start(state);
  return state;
}

function allCars(state) {
  return state.trafficCars.concat(state.parkedCars);
}

function updateCamera(state) {
  const p = state.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  const tx = Math.max(0, Math.min(CITY_W - VIEW_W, px - VIEW_W / 2));
  const ty = Math.max(0, Math.min(CITY_H - VIEW_H, py - VIEW_H / 2));
  state.cam.x += (tx - state.cam.x) * 0.12;
  state.cam.y += (ty - state.cam.y) * 0.12;
}

function tryEnterCar(state) {
  const p = state.player;
  if (p.inCar) {
    // Get out beside the car.
    const car = p.inCar;
    car.speed = 0;
    p.inCar = null;
    p.onFoot = true;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    return;
  }
  const car = nearestCar(allCars(state), p.x, p.y, 64);
  if (!car) return;
  p.inCar = car;
  p.onFoot = false;
  car.parked = false;
  if (car.kind !== 'player') {
    state.wanted.addHeat(crimeHeatFor('steal'));
    state.economy.recordSteal();
    state.missions.say(`You took the ${car.name}. The heat is on — drive!`);
  }
}

function updatePlay(state, dt) {
  const p = state.player;
  const input = state.input;
  state.committingCrime = false;
  // Aim from mouse position in world space.
  const worldMouseX = state.cam.x + input.mouseX;
  const worldMouseY = state.cam.y + input.mouseY;
  p.aimAngle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);

  if (input.wasPressed('e')) tryEnterCar(state);
  if (input.wasPressed('m')) {
    state.audio.ensure();
    state.audio.nextStation();
    state.missions.say(`Radio: ${state.audio.name}`);
  }
  if (input.wasPressed('f')) {
    const ok = state.economy.save(state);
    state.saveFlash = ok ? 'Game saved.' : 'Save failed.';
    state.saveFlashTimer = 2;
  }
  if (input.wasPressed('r')) {
    state.missions.failMission(state, 'Mission restarted.');
    state.missions.start(state);
  }
  if (input.wasPressed('p')) {
    state.mode = 'paused';
    return;
  }
  if (input.wasPressed('h')) {
    state.fromTitle = false;
    state.mode = 'help';
    return;
  }
  // Shooting.
  if (input.mouseDown && p.onFoot) {
    if (state.combat.playerShoot(p, worldMouseX, worldMouseY)) {
      state.economy.shotsFired += 1;
      state.wanted.addHeat(0.4);
      state.committingCrime = true;
    }
  }
  // Movement.
  if (p.inCar) {
    driveCar(p.inCar, input, dt, state.city.buildings);
    p.x = p.inCar.x;
    p.y = p.inCar.y;
    p.angle = p.inCar.angle;
    if (Math.abs(p.inCar.speed) > 380) {
      state.wanted.addHeat(crimeHeatFor('speeding') * dt * 0.4);
    }
  } else {
    p.moveOnFoot(input, dt, state.city.buildings);
  }
  // Traffic and pedestrians.
  for (const car of state.trafficCars) {
    if (car === p.inCar) continue;
    updateTrafficCar(car, dt);
    // Bump into the player on foot.
    if (p.onFoot && Math.hypot(car.x - p.x, car.y - p.y) < 26) {
      p.takeDamage(14 * dt * 4);
    }
  }
  for (const ped of state.peds) {
    updatePedestrian(ped, dt, state.city.buildings);
    if (p.inCar && Math.hypot(ped.x - p.x, ped.y - p.y) < 26) {
      ped.panic = 3;
      state.wanted.addHeat(crimeHeatFor('hitPed'));
      state.committingCrime = true;
    }
  }
  // Wanted, combat, missions.
  state.wanted.decay(dt, state.committingCrime);
  state.wanted.update(dt, p, state.rng);
  state.combat.update(dt, p, state.city.buildings, (enemy) => {
    p.earn(25);
    state.missions.say(`${enemy.name} down! +$25`);
  });
  state.missions.update(dt, state);
  state.audio.schedule(dt);
  if (state.saveFlashTimer > 0) state.saveFlashTimer -= dt;
  // Busted or dead.
  if (state.wanted.busted) {
    state.mode = 'over';
    state.overReason = 'BUSTED';
    return;
  }
  if (p.dead) {
    state.mode = 'over';
    state.overReason = 'WASTED';
    return;
  }
  updateCamera(state);
}

function render(state) {
  ctx.save();
  if (state.mode === 'title') {
    drawTitle(ctx, state, state.titleSelected);
    ctx.restore();
    return;
  }
  ctx.translate(-Math.round(state.cam.x), -Math.round(state.cam.y));
  drawWorld(ctx, state, state.cam);
  ctx.restore();
  drawHud(ctx, state);
  if (state.saveFlashTimer > 0) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.saveFlash, VIEW_W / 2, 120);
    ctx.textAlign = 'left';
  }
  if (state.mode === 'help') drawHelp(ctx);
  if (state.mode === 'paused') drawPaused(ctx);
  if (state.mode === 'over') drawGameOver(ctx, state.overReason);
}

function startLoop(state) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.time += dt;
    const input = state.input;
    if (state.mode === 'title') {
      if (input.wasPressed('arrowdown') || input.wasPressed('s')) {
        state.titleSelected = (state.titleSelected + 1) % 3;
      }
      if (input.wasPressed('arrowup') || input.wasPressed('w')) {
        state.titleSelected = (state.titleSelected + 2) % 3;
      }
      if (input.wasPressed('enter') || input.mouseClicked) {
        state.audio.ensure();
        state.audio.enabled = true;
        if (state.titleSelected === 0) {
          state.mode = 'play';
          state.missions.start(state);
        } else if (state.titleSelected === 1) {
          const save = state.economy.load();
          if (save) {
            state.economy.applySave(state, save);
            state.missions.start(state);
            state.mode = 'play';
          }
        } else {
          state.fromTitle = true;
          state.mode = 'help';
        }
      }
      if (input.wasPressed('h')) {
        state.fromTitle = true;
        state.mode = 'help';
      }
    } else if (state.mode === 'help') {
      if (input.wasPressed('h') || input.wasPressed('escape') || input.wasPressed('enter')) {
        // Help opened from the title goes back to the title; in-game help resumes play.
        state.mode = state.fromTitle ? 'title' : 'play';
      }
    } else if (state.mode === 'paused') {
      if (input.wasPressed('p') || input.wasPressed('escape')) state.mode = 'play';
    } else if (state.mode === 'over') {
      if (input.wasPressed('enter')) {
        state.player.respawn(1800, 900);
        state.player.money = Math.max(0, state.player.money - 100);
        state.wanted.clear();
        state.combat.enemies.length = 0;
        state.mode = 'play';
        state.missions.start(state);
      }
    } else {
      updatePlay(state, dt);
    }
    render(state);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function boot() {
  const query = parseShotQuery(window.location.search);
  const seed = query ? query.seed : 1;
  const state = createState(seed);
  state.input.attach(canvas);
  // Expose a small handle for automated tests (window.__solmar).
  window.__solmar = state;
  if (query) {
    applyShotMode(state, query.shot, seed);
    // Centre the camera on the staged scene at once.
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    state.cam.x = Math.max(0, Math.min(CITY_W - VIEW_W, px - VIEW_W / 2));
    state.cam.y = Math.max(0, Math.min(CITY_H - VIEW_H, py - VIEW_H / 2));
  } else {
    state.cam.x = Math.max(0, Math.min(CITY_W - VIEW_W, state.player.x - VIEW_W / 2));
    state.cam.y = Math.max(0, Math.min(CITY_H - VIEW_H, state.player.y - VIEW_H / 2));
  }
  startLoop(state);
}

boot();
