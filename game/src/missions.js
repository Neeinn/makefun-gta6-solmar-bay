// MissionSystem: 8 story missions + working taxi fares, objectives and dialogue.
import { CITY, MISSIONS } from './config.js';
import { dist2 } from './random.js';

export function createMissions() {
  return {
    index: 0, active: null, progress: 0, done: [],
    fareStage: null, farePos: null, destPos: null, escapeTimer: 0,
    message: 'Press SPACE to start. WASD move, E enter car, F shoot, P pause.',
  };
}

export function currentMission(m) {
  return MISSIONS[m.index] || null;
}

function randomSpot(rng) {
  return { x: 200 + rng() * (CITY.width - 400), y: 200 + rng() * (CITY.height - 400) };
}

export function startMission(m, combat, rng, traffic) {
  const def = currentMission(m);
  if (!def) return;
  m.active = { ...def, checkpoints: [], cpIndex: 0 };
  m.progress = 0;
  m.escapeTimer = 0;
  m.fareStage = null;
  m.farePos = null;
  m.destPos = null;
  if (def.kind === 'race') {
    for (let i = 0; i < 5; i++) {
      m.active.checkpoints.push({ x: 900 + i * 450, y: 350 + (i % 2) * 500 });
    }
  }
  if (def.kind === 'eliminate') combat.enemies = [];
  if (def.kind === 'taxi') {
    m.fareStage = 'pickup';
    m.farePos = { x: def.target.x, y: def.target.y };
    m.active.target = { ...m.farePos };
  }
  if (def.kind === 'escape' && traffic) {
    // The blue sports car the job needs, parked near the target.
    traffic.cars.push({
      x: def.target.x, y: def.target.y, angle: 0, speed: 0,
      color: '#3a6fd8', vertical: false, w: 34, h: 18, turnAt: 0, stolen: false,
    });
  }
  m.message = `${def.giver}: ${def.text}`;
}

export function stepMissions(m, dt, player, combat, wanted, addHeat, rng) {
  const a = m.active;
  if (!a) return null;
  const d = Math.sqrt(dist2(player.x, player.y, a.target.x, a.target.y));

  if (a.kind === 'goto' || a.kind === 'drive' || a.kind === 'deliver') {
    if (d < 90) return completeMission(m, player);
  }
  if (a.kind === 'race') {
    const cp = a.checkpoints[a.cpIndex];
    if (cp && Math.sqrt(dist2(player.x, player.y, cp.x, cp.y)) < 110) {
      a.cpIndex += 1;
      m.progress = a.cpIndex;
      if (a.cpIndex >= a.checkpoints.length) return completeMission(m, player);
    }
  }
  if (a.kind === 'eliminate') {
    if (m.progress >= (a.count || 4)) return completeMission(m, player);
  }
  if (a.kind === 'taxi') {
    const marker = m.fareStage === 'pickup' ? m.farePos : m.destPos;
    if (marker && Math.sqrt(dist2(player.x, player.y, marker.x, marker.y)) < 90) {
      if (m.fareStage === 'pickup') {
        m.fareStage = 'dropoff';
        m.destPos = randomSpot(rng);
        a.target = { ...m.destPos };
        m.message = 'Fare on board — drive to the drop-off marker.';
      } else {
        const tip = 25 + Math.floor(rng() * 36);
        player.money += tip;
        m.progress += 1;
        m.fareStage = 'pickup';
        m.farePos = randomSpot(rng);
        a.target = { ...m.farePos };
        m.message = `Fare paid +$${tip}. ${a.count - m.progress} fare(s) left.`;
        if (m.progress >= (a.count || 3)) return completeMission(m, player);
      }
    }
  }
  if (a.kind === 'escape') {
    if (wanted.stars >= 3) {
      m.escapeTimer += dt;
      if (m.escapeTimer > 30) return completeMission(m, player);
    } else {
      m.escapeTimer = 0;
    }
  }
  return null;
}

export function completeMission(m, player) {
  const a = m.active;
  if (!a) return null;
  player.money += a.reward;
  m.done.push(a.id);
  m.index += 1;
  m.active = null;
  m.progress = 0;
  const next = currentMission(m);
  m.message = next
    ? `Mission complete! +$${a.reward}. Next: ${next.title}`
    : `All missions complete! You are King of Solmar. +$${a.reward}`;
  return a;
}
