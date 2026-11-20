// The 8 story missions, in order, with objectives, markers and payouts.
import { MISSION_DEFS } from './config.js';

export const SPOTS = {
  taxiStand: { x: 1800, y: 300, label: 'Taxi stand' },
  palmFare: { x: 1800, y: 300, label: 'Fare at Palm Court' },
  pier: { x: 3350, y: 2150, label: 'Solmar Pier' },
  cannery: { x: 1200, y: 300, label: 'Old Cannery warehouse' },
  dinaHome: { x: 1800, y: 300, label: "Dina's place" },
  neonClub: { x: 2400, y: 1500, label: 'Neon Mile club' },
  raceStart: { x: 1800, y: 900, label: 'Race start' },
  docks: { x: 3000, y: 900, label: 'East Docks warehouse' },
  pierEnd: { x: 3350, y: 2250, label: 'Pier End' },
};

export const RACE_POINTS = [
  { x: 1800, y: 300 },
  { x: 3000, y: 300 },
  { x: 3000, y: 1500 },
  { x: 600, y: 2100 },
  { x: 1800, y: 900 },
];

export class MissionRunner {
  constructor() {
    this.index = 0; // 0-based mission index; 8 = story complete
    this.stage = 'go'; // go | carry | drop | race | fight | survive | done
    this.timer = 0;
    this.racePoint = 0;
    this.faresDone = 0;
    this.fareStage = 'pickup';
    this.fareSpot = null;
    this.dropSpot = null;
    this.enemiesLeft = 0;
    this.surviveLeft = 30;
    this.message = '';
    this.messageTimer = 0;
    this.completed = [];
    this.active = false;
  }

  get current() {
    return MISSION_DEFS[this.index] || null;
  }

  get done() {
    return this.index >= MISSION_DEFS.length;
  }

  start(state) {
    this.active = true;
    this.stage = 'go';
    this.timer = 0;
    this.racePoint = 0;
    this.faresDone = 0;
    this.enemiesLeft = 0;
    this.armedOnce = false;
    const m = this.current;
    if (!m) return;
    if (m.id === 4) this.stage = 'race';
    if (m.id === 5) this.stage = 'fight';
    if (m.id === 7) this.stage = 'survive';
    if (m.id === 8) this.stage = 'fight';
    if (m.id === 3) this.timer = m.timeLimit;
    if (m.id === 6) this.stage = 'fare';
    if (m.id === 5) this.armWarehouse(state);
    if (m.id === 8) this.armFinale(state);
    if (m.id === 6) this.beginFares(state);
    if (m.id === 7) state.wanted.setStars(3);
    this.say(`Mission ${m.id}: ${m.title} — ${m.brief}`);
  }

  say(text) {
    this.message = text;
    this.messageTimer = 6;
  }

  armWarehouse(state) {
    const spots = [
      [3000, 780], [2940, 900], [3060, 930], [2910, 900],
      [3030, 1020], [2970, 1080],
    ];
    for (const [x, y] of spots) state.combat.spawnEnemy(x, y, { name: 'Dock Rival' });
    this.enemiesLeft = spots.length;
    this.armedOnce = true;
  }

  armFinale(state) {
    const spots = [
      [3340, 2180], [3400, 2260], [3360, 2340], [3420, 2140],
      [3380, 2400], [3440, 2300], [3320, 2200], [3400, 2440],
    ];
    for (let i = 0; i < spots.length; i += 1) {
      state.combat.spawnEnemy(spots[i][0], spots[i][1], {
        name: i === 0 ? 'Salvo' : 'Salvo Crew', boss: i === 0,
      });
    }
    this.enemiesLeft = spots.length;
    this.armedOnce = true;
  }

  // Where the marker should point right now, or null.
  marker(state) {
    const m = this.current;
    if (!m || this.done) return null;
    if (m.id === 1) return this.stage === 'go' ? SPOTS.palmFare : SPOTS.pier;
    if (m.id === 2) return this.stage === 'go' ? SPOTS.cannery : SPOTS.dinaHome;
    if (m.id === 3) return SPOTS.neonClub;
    if (m.id === 4) return RACE_POINTS[this.racePoint];
    if (m.id === 5) return SPOTS.docks;
    if (m.id === 6) return this.fareStage === 'pickup' ? this.fareSpot : this.dropSpot;
    if (m.id === 7) return null;
    if (m.id === 8) return SPOTS.pierEnd;
    return null;
  }

  objectiveText() {
    const m = this.current;
    if (!m) return 'Story complete! Free roam Solmar Bay — drive, earn fares, dodge the law.';
    if (m.id === 1) return this.stage === 'go' ? 'Pick up the fare at Palm Court (follow the yellow marker)' : 'Drop the fare at Solmar Pier';
    if (m.id === 2) return this.stage === 'go' ? 'Pick up the package at the Old Cannery warehouse' : 'Bring the package back to Dina';
    if (m.id === 3) return `Deliver the package to the Neon Mile club — ${Math.ceil(this.timer)}s left`;
    if (m.id === 4) return `Race! Checkpoint ${this.racePoint + 1} of 5 — follow the markers`;
    if (m.id === 5) return `Clear the East Docks warehouse — ${this.enemiesLeft} rivals left`;
    if (m.id === 6) return this.fareStage === 'pickup' ? `Fare ${this.faresDone + 1} of 3: pick up the passenger` : `Fare ${this.faresDone + 1} of 3: drop them off`;
    if (m.id === 7) return `Survive at 3 stars — ${Math.ceil(this.surviveLeft)}s left`;
    if (m.id === 8) return `Final showdown: take down Salvo and his crew — ${this.enemiesLeft} left`;
    return m.brief;
  }

  completeMission(state) {
    const m = this.current;
    if (!m) return;
    state.player.earn(m.pay);
    this.completed.push(m.id);
    this.say(`Mission complete: ${m.title} — earned $${m.pay}!`);
    state.economy.recordMission(m.pay);
    this.index += 1;
    this.active = false;
    state.wanted.clear();
    state.combat.enemies.length = 0;
    if (!this.done) {
      this.start(state);
    } else {
      this.say('STORY COMPLETE — you are the King of the Bay! Free roam unlocked.');
    }
  }

  failMission(state, reason) {
    this.say(`${reason} Mission failed — try again (press R to restart it).`);
    this.active = false;
    state.wanted.clear();
    state.combat.enemies.length = 0;
  }

  // Called every frame; returns nothing, mutates state.
  update(dt, state) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (!this.active || this.done) return;
    const m = this.current;
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    if (m.id === 3) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.failMission(state, 'Too slow — the delivery went cold.');
        return;
      }
    }
    if (m.id === 7) {
      this.surviveLeft -= dt;
      state.wanted.setStars(3);
      if (this.surviveLeft <= 0) {
        this.completeMission(state);
        return;
      }
    }
    const mark = this.marker(state);
    if (mark && Math.hypot(mark.x - px, mark.y - py) < 70) {
      this.reachMarker(state);
    }
    if ((m.id === 5 || m.id === 8) && this.stage === 'fight') {
      this.enemiesLeft = state.combat.enemies.length;
      if (this.enemiesLeft === 0 && state.combat.enemies.length === 0 && this.armedOnce) {
        this.completeMission(state);
      }
    }
    if (m.id === 4 && this.stage === 'race') {
      const cp = RACE_POINTS[this.racePoint];
      if (cp && Math.hypot(cp.x - px, cp.y - py) < 80) {
        this.racePoint += 1;
        this.say(`Checkpoint ${this.racePoint} of 5!`);
        if (this.racePoint >= RACE_POINTS.length) this.completeMission(state);
      }
    }
  }

  reachMarker(state) {
    const m = this.current;
    if (!m) return;
    if (m.id === 1) {
      if (this.stage === 'go') {
        this.stage = 'carry';
        this.say('Fare picked up. Drive them to Solmar Pier.');
      } else {
        this.completeMission(state);
      }
    } else if (m.id === 2) {
      if (this.stage === 'go') {
        this.stage = 'carry';
        this.say('Package collected. Take it back to Dina.');
      } else {
        this.completeMission(state);
      }
    } else if (m.id === 3) {
      this.completeMission(state);
    } else if (m.id === 6) {
      if (this.fareStage === 'pickup') {
        this.fareStage = 'drop';
        this.dropSpot = this.pickDropSpot(state);
        this.say(`Passenger aboard. Drop them at ${this.dropSpot.label}.`);
      } else {
        this.faresDone += 1;
        state.player.earn(80);
        state.economy.recordFare(80);
        if (this.faresDone >= 3) {
          this.completeMission(state);
        } else {
          this.fareStage = 'pickup';
          this.fareSpot = this.pickFareSpot(state);
          this.say(`Fare ${this.faresDone} done (+$80). Next passenger is waiting.`);
        }
      }
    }
  }

  pickFareSpot(state) {
    const spots = [
      { x: 600, y: 300, label: 'Marina Point' },
      { x: 2400, y: 300, label: 'Palm Court' },
      { x: 600, y: 1500, label: 'Harbor Lights' },
      { x: 2400, y: 2100, label: 'Pier End' },
    ];
    return spots[(this.faresDone + state.player.money) % spots.length] || spots[0];
  }

  pickDropSpot(state) {
    const spots = [
      { x: 3000, y: 300, label: 'Coral Heights' },
      { x: 600, y: 900, label: 'Harbor Lights' },
      { x: 1800, y: 2100, label: 'South Beach' },
      { x: 3000, y: 1500, label: 'East Docks' },
    ];
    return spots[(this.faresDone * 2 + 1) % spots.length] || spots[0];
  }

  // Begin mission 6's first fare and arm flags used by the fight missions.
  beginFares(state) {
    this.fareSpot = this.pickFareSpot(state);
    this.fareStage = 'pickup';
  }
}
