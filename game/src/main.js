// main.js — Solmar Bay entry point: renderer, camera, input, game loop, menus.
import { buildCity, ROAD_COORDS } from './city.js';
import { createPlayer, updatePlayer, addWanted, punch, shoot } from './player.js';
import { spawnParkedCars, nearestCar, enterCar, exitCar, updateDriving, createCarMesh } from './vehicles.js';
import { spawnTraffic, updateTraffic, spawnPeds, updatePeds } from './traffic.js';
import { updatePolice } from './police.js';
import { MISSIONS, startMission, updateMissions, currentMission, abortMission } from './missions.js';
import { createHud } from './hud.js';
import { AudioSys } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);

const city = buildCity(scene);
const hud = createHud();
const audio = new AudioSys();

const ctx = {
  scene, camera, city, hud, audio,
  keys: {}, state: 'title', time: 0,
  camYaw: 0, camPitch: 0.32,
  player: null, cars: [], traffic: [], peds: [], police: [], enemies: [],
  missionIndex: 0, missionsDone: 0, missionActive: false, missionStep: 0,
  missionProgress: 0, missionTimer: 0, missionName: '', missionMarker: null,
  raceCheckpoints: [],
  cityApi: { ROAD_COORDS },
  playerApi: { addWanted },
  vehicleApi: { createCarMesh },
  gameOver,
};

ctx.player = createPlayer(scene);
ctx.cars = spawnParkedCars(ctx);
ctx.traffic = spawnTraffic(ctx, 12);
ctx.peds = spawnPeds(ctx, 22);

function gameOver(text) {
  if (ctx.state !== 'playing') return;
  ctx.state = 'over';
  document.exitPointerLock && document.exitPointerLock();
  document.getElementById('over-text').textContent = text + ' Health reached zero.';
  document.getElementById('over-screen').style.display = 'flex';
  hud.hide();
  audio.setSiren(false);
  audio.setEngine(0, false);
}

// ---- Camera: third-person orbit behind the player / car ----
function updateCamera(dt) {
  const target = ctx.player.pos;
  if (ctx.player.inCar) {
    // Camera swings behind the car while driving.
    let want = ctx.player.inCar.heading + Math.PI;
    let dh = want - ctx.camYaw;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    ctx.camYaw += dh * Math.min(1, 2.2 * dt);
  }
  const dist = ctx.player.inCar ? 11 : 8.5;
  const height = 3.6 + Math.sin(ctx.camPitch) * dist * 0.5;
  const cx = target.x + Math.sin(ctx.camYaw) * Math.cos(ctx.camPitch) * dist;
  const cz = target.z + Math.cos(ctx.camYaw) * Math.cos(ctx.camPitch) * dist;
  camera.position.set(cx, height, cz);
  camera.lookAt(target.x, target.y + 1.6, target.z);
}

// ---- Input ----
window.addEventListener('keydown', (e) => {
  ctx.keys[e.code] = true;
  if (e.code === 'KeyM' && ctx.state === 'playing') startMission(ctx);
  if (e.code === 'KeyF' && ctx.state === 'playing' && !ctx.player.inCar) punch(ctx);
  if (e.code === 'KeyC' && ctx.state === 'playing') {
    const ok = saveGame({ money: ctx.player.money, health: ctx.player.health, missionIndex: ctx.missionIndex, missionsDone: ctx.missionsDone, playerPos: ctx.player.pos, playerHeading: ctx.player.heading });
    hud.toast(ok ? 'Game saved.' : 'Save failed.');
  }
  if ((e.code === 'KeyP' || e.code === 'Escape') && (ctx.state === 'playing' || ctx.state === 'paused')) togglePause();
  if (e.code === 'KeyE' && ctx.state === 'playing') {
    if (ctx.player.inCar) exitCar(ctx);
    else {
      const car = nearestCar(ctx, 5);
      if (car) enterCar(ctx, car);
    }
  }
});
window.addEventListener('keyup', (e) => { ctx.keys[e.code] = false; });
canvas.addEventListener('mousedown', (e) => {
  if (ctx.state !== 'playing') return;
  if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  if (e.button === 0) shoot(ctx);
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || ctx.state !== 'playing') return;
  ctx.camYaw -= e.movementX * 0.0032;
  ctx.camPitch = Math.max(-0.1, Math.min(0.9, ctx.camPitch + e.movementY * 0.002));
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function togglePause() {
  if (ctx.state === 'playing') {
    ctx.state = 'paused';
    document.getElementById('pause-screen').style.display = 'flex';
    document.exitPointerLock && document.exitPointerLock();
  } else if (ctx.state === 'paused') {
    ctx.state = 'playing';
    document.getElementById('pause-screen').style.display = 'none';
  }
}

function startGame(fromSave) {
  audio.init();
  const saved = fromSave ? loadGame() : null;
  if (saved) {
    ctx.player.money = saved.money;
    ctx.player.health = saved.health;
    ctx.missionIndex = saved.missionIndex;
    ctx.missionsDone = saved.missionsDone;
    ctx.player.pos.set(saved.px, 0, saved.pz);
    ctx.player.heading = saved.heading || 0;
    ctx.player.mesh.rotation.y = ctx.player.heading;
    hud.toast('Save loaded — welcome back to Solmar Bay.');
  } else {
    ctx.player.money = 500; ctx.player.health = 100;
    ctx.missionIndex = 0; ctx.missionsDone = 0;
    ctx.player.pos.set(0, 0, 20);
  }
  ctx.player.wanted = 0;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('over-screen').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  hud.show();
  ctx.state = 'playing';
  const m = currentMission(ctx);
  hud.setObjective(m ? m.name : 'Free Roam', m ? 'Press M to start: ' + m.name : 'All missions complete.');
  if (m) ctx.missionName = m.name;
}

document.getElementById('btn-start').addEventListener('click', () => startGame(false));
document.getElementById('btn-how').addEventListener('click', () => {
  const el = document.getElementById('how-text');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-save').addEventListener('click', () => {
  const ok = saveGame({ money: ctx.player.money, health: ctx.player.health, missionIndex: ctx.missionIndex, missionsDone: ctx.missionsDone, playerPos: ctx.player.pos, playerHeading: ctx.player.heading });
  hud.toast(ok ? 'Game saved.' : 'Save failed.');
});
document.getElementById('btn-restart').addEventListener('click', () => {
  document.getElementById('pause-screen').style.display = 'none';
  ctx.player.health = 100; ctx.player.pos.set(0, 0, 20);
  startGame(false);
});
document.getElementById('btn-quit').addEventListener('click', () => {
  ctx.state = 'title';
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  hud.hide();
});
document.getElementById('btn-retry').addEventListener('click', () => {
  ctx.player.money = Math.max(0, ctx.player.money - 100);
  ctx.player.health = 100; ctx.player.wanted = 0; ctx.player.pos.set(0, 0, 20);
  if (ctx.player.inCar) { ctx.player.inCar = null; ctx.player.mesh.visible = true; }
  audio.setSiren(false);
  startGame(false);
});
document.getElementById('btn-over-title').addEventListener('click', () => {
  ctx.state = 'title';
  document.getElementById('over-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  hud.hide();
});
if (hasSave()) document.getElementById('btn-continue').style.display = 'inline-block';
document.getElementById('btn-continue').addEventListener('click', () => startGame(true));

// ---- Test / screenshot hooks (used by the maker's own Playwright checks) ----
window.SOLMAR = {
  ctx,
  start: () => startGame(false),
  startMission: () => startMission(ctx),
  setWanted: (n) => { ctx.player.wanted = n; ctx.player.lastCrime = ctx.time; audio.setSiren(n > 0); },
  teleport: (x, z) => { ctx.player.pos.set(x, 0, z); if (ctx.player.inCar) { ctx.player.inCar.pos.set(x, 0, z); } },
  enterNearestCar: () => { const c = nearestCar(ctx, 10); if (c) enterCar(ctx, c); return !!c; },
  state: () => ({ state: ctx.state, wanted: ctx.player.wanted, money: ctx.player.money, health: ctx.player.health, missionIndex: ctx.missionIndex, missionActive: ctx.missionActive, inCar: !!ctx.player.inCar, pos: [ctx.player.pos.x, ctx.player.pos.z] }),
};

// ---- Main loop ----
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.08);
  if (ctx.state === 'playing') {
    ctx.time += dt;
    updatePlayer(ctx, dt);
    updateDriving(ctx, dt);
    updateTraffic(ctx, dt);
    updatePeds(ctx, dt);
    updatePolice(ctx, dt);
    updateMissions(ctx, dt);
    // Slow health regen while the police are not after you.
    if (ctx.player.wanted === 0 && ctx.player.health < 100) ctx.player.health = Math.min(100, ctx.player.health + 1.2 * dt);
    if (ctx.player.health <= 0) gameOver('You went down in Solmar Bay.');
    // Mission marker for the minimap.
    ctx.missionMarker = null;
    if (ctx.missionActive) {
      const m = currentMission(ctx);
      const step = m && m.steps[ctx.missionStep];
      if (step && step.x !== undefined) ctx.missionMarker = { x: step.x, z: step.z };
      if (step && step.type === 'race') {
        const next = ctx.raceCheckpoints.find((c) => !c.done);
        if (next) ctx.missionMarker = { x: next.x, z: next.z };
      }
      if (m) ctx.missionName = m.name;
    }
    // "Press E" prompt near a car.
    if (!ctx.player.inCar) {
      const car = nearestCar(ctx, 5);
      hud.setPrompt(car ? 'Press E to enter the car' : '');
    } else hud.setPrompt('');
    hud.update(ctx);
    if (!ctx.player.inCar) audio.setEngine(0, false);
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}
document.getElementById('loading').style.display = 'none';
document.getElementById('start-screen').style.display = 'flex';
frame();
