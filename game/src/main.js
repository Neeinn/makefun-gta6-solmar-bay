// Solmar Bay — boot, fixed-step loop, screens, mission/police/combat wiring.
// ?seed=N fixes the world. ?shot=start|drive|chase|mission stages a scene for screenshots.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createTraffic } from './traffic.js';
import { createPlayer, stepPlayer, nearestCar, enterCar, exitCar } from './player.js';
import { createWanted, addHeat, stepWanted, clearWanted } from './police.js';
import { createCombat, spawnEnemies, shoot, stepCombat } from './combat.js';
import { createMissions, currentMission, startMission, stepMissions } from './missions.js';
import { saveGame, loadGame } from './economy.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_WIN } from './render.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_SHOOT, createInput } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261120;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
const city = createCity(rng);
const traffic = createTraffic(rng, city);
const player = createPlayer(1500, 1500);
const wanted = createWanted();
const combat = createCombat();
const missions = createMissions();
const audio = createAudio();
const renderer = createRenderer(canvas);
const state = { city, traffic, player, wanted, combat, missions, radio: 0, elapsed: 0 };

function announce(msg) {
  status.textContent = msg;
}

// Begin (or resume) a mission of the eliminate kind: rivals appear on site.
function armEliminate() {
  const m = currentMission(missions);
  if (m && m.kind === 'eliminate') {
    spawnEnemies(combat, m.target.x, m.target.y, m.count || 4, rng);
  }
}

function startGame() {
  const save = loadGame();
  if (save) {
    player.money = save.money;
    player.health = save.health;
    missions.index = save.missionIndex || 0;
    missions.done = save.done || [];
    player.x = save.x;
    player.y = save.y;
  }
  startMission(missions, combat, rng, traffic);
  armEliminate();
  audio.unlock();
  audio.startMusic();
  announce('Playing Solmar Bay.');
}

function stepWorld(dt, input) {
  state.elapsed += dt;
  stepPlayer(player, input, dt, city);
  traffic.step(dt);
  const busted = stepWanted(wanted, dt, player, rng);
  if (busted === 'busted' || player.health <= 0) return 'busted';
  const killed = stepCombat(combat, dt, player, (dmg) => { player.health -= dmg; });
  if (killed > 0 && missions.active && missions.active.kind === 'eliminate') missions.progress += killed;
  const done = stepMissions(missions, dt, player, combat, wanted, addHeat, rng);
  if (done) {
    audio.pickup();
    if (missions.index >= 8) return 'win';
    startMission(missions, combat, rng, traffic);
    armEliminate();
  }
  if (player.car) audio.engine(Math.abs(player.car.speed) / 420);
  if (wanted.stars > 0 && Math.floor(state.elapsed * 2) !== Math.floor((state.elapsed - dt) * 2)) {
    audio.sirenTick(Math.floor(state.elapsed * 2) % 2 === 0);
  }
  return null;
}

function runShot(name) {
  const scene = stageShot(name, state, rng);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
      screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
    }

    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_ENTER) {
        if (player.onFoot) {
          const car = nearestCar(player, traffic.cars);
          if (car) {
            enterCar(player, car);
            addHeat(wanted, 20);
            announce('Car stolen — wanted level rising!');
          }
        } else {
          exitCar(player);
        }
      }
      // Shooting: F key (one shot per press) or held mouse click.
      if (input.mouse.down || (actions & ACTION_SHOOT)) {
        const rect = canvas.getBoundingClientRect();
        const aim = Math.atan2(input.mouse.y - rect.height / 2, input.mouse.x - rect.width / 2);
        if (shoot(combat, player.x, player.y, aim)) {
          audio.shot();
          if (wanted.stars === 0) addHeat(wanted, 8);
        }
      }
      while (accumulator >= STEP) {
        const outcome = stepWorld(STEP, input);
        accumulator -= STEP;
        if (outcome === 'busted') {
          screen = SCREEN_OVER;
          clearWanted(wanted);
          announce('Busted.');
          break;
        }
        if (outcome === 'win') {
          screen = SCREEN_WIN;
          announce('King of Solmar!');
          break;
        }
      }
    } else if (screen === SCREEN_TITLE) {
      traffic.step(STEP);
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyS' && screen === SCREEN_PAUSED) {
      saveGame(state);
      announce('Game saved.');
    }
    if (e.code === 'KeyM') {
      state.radio = (state.radio + 1) % 3;
      audio.setStation(state.radio);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });
  announce('Solmar Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
