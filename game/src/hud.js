// HUD for Solmar Bay: health and money, wanted stars, mission text,
// speed, a live minimap canvas, and the start / pause / busted / mission
// overlays. All DOM is built here so index.html stays a thin shell.

import { districtAt } from './config.js';

function el(tag, id, cls, parent) {
  const e = document.createElement(tag);
  if (id) e.id = id;
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this._build();
    this.toastTimer = null;
    this.minimap = this.mapCanvas.getContext('2d');
  }

  _build() {
    const topLeft = el('div', 'hud-topleft', 'hud-panel', this.root);
    this.healthBar = el('div', 'health-bar', '', topLeft);
    this.healthFill = el('div', 'health-fill', '', this.healthBar);
    this.healthText = el('div', 'health-text', '', topLeft);
    this.moneyText = el('div', 'money-text', '', topLeft);
    this.districtText = el('div', 'district-text', '', topLeft);

    const topRight = el('div', 'hud-topright', 'hud-panel', this.root);
    this.starsText = el('div', 'stars-text', '', topRight);
    this.wantedLabel = el('div', 'wanted-label', '', topRight);

    this.missionBox = el('div', 'mission-box', 'hud-panel', this.root);
    this.missionTitle = el('div', 'mission-title', '', this.missionBox);
    this.missionText = el('div', 'mission-text', '', this.missionBox);

    this.speedBox = el('div', 'speed-box', 'hud-panel', this.root);
    this.speedText = el('div', 'speed-text', '', this.speedBox);

    this.hintBox = el('div', 'hint-box', '', this.root);
    this.toastBox = el('div', 'toast-box', '', this.root);

    const mapWrap = el('div', 'map-wrap', 'hud-panel', this.root);
    this.mapCanvas = el('canvas', 'minimap', '', mapWrap);
    this.mapCanvas.width = 190;
    this.mapCanvas.height = 190;

    // overlays
    this.startScreen = el('div', 'start-screen', 'overlay', document.body);
    this.startScreen.innerHTML =
      '<h1>SOLMAR BAY</h1>' +
      '<p class="tagline">A sun-baked coastal city. One newcomer. Eight jobs. No rules.</p>' +
      '<p class="story">Milo Ferran just arrived in Solmar Bay with $250 and a borrowed jacket. ' +
      'Rosa and Dante have work for him — if he can drive, fight and outrun the law long enough to finish it.</p>' +
      '<div class="controls-grid">' +
      '<span>W A S D</span><span>Move / drive</span>' +
      '<span>E</span><span>Enter / exit car</span>' +
      '<span>F</span><span>Punch (on foot)</span>' +
      '<span>M</span><span>Mission briefing</span>' +
      '<span>C</span><span>Save game</span>' +
      '<span>P / Esc</span><span>Pause</span>' +
      '<span>Mouse drag</span><span>Look around</span>' +
      '</div>' +
      '<button id="start-btn">START GAME</button>' +
      '<button id="continue-btn" class="hidden">CONTINUE — LOAD SAVE</button>' +
      '<p class="foot">10 districts · 14 cars to steal · traffic &amp; pedestrians · wanted level &amp; police · 8 missions</p>';

    this.pauseScreen = el('div', 'pause-screen', 'overlay hidden', document.body);
    this.pauseScreen.innerHTML =
      '<h2>PAUSED</h2><p>Take a breath, Milo. The city waits.</p>' +
      '<button id="resume-btn">RESUME</button>' +
      '<button id="quit-btn">QUIT TO TITLE</button>';

    this.bustedScreen = el('div', 'busted-screen', 'overlay hidden', document.body);
    this.bustedScreen.innerHTML =
      '<h2>BUSTED!</h2><p>The Solmar Bay police hauled you in. You lost $200 and your wanted level.</p>' +
      '<button id="busted-btn">BACK ON THE STREETS</button>';

    this.briefScreen = el('div', 'brief-screen', 'overlay hidden', document.body);
    this.briefScreen.innerHTML =
      '<h2 id="brief-title">MISSION</h2><p id="brief-body"></p>' +
      '<button id="brief-btn">CLOSE (M)</button>';

    this.endScreen = el('div', 'end-screen', 'overlay hidden', document.body);
    this.endScreen.innerHTML =
      '<h2>KING OF SOLMAR BAY</h2><p>You finished all eight jobs. The city is yours, Milo.</p>' +
      '<button id="end-btn">KEEP EXPLORING</button>';
  }

  showStart(hasSave) {
    this.startScreen.classList.remove('hidden');
    document.getElementById('continue-btn').classList.toggle('hidden', !hasSave);
    this.root.classList.add('hidden');
  }

  hideStart() {
    this.startScreen.classList.add('hidden');
    this.root.classList.remove('hidden');
  }

  showPause(show) { this.pauseScreen.classList.toggle('hidden', !show); }
  showBusted(show) { this.bustedScreen.classList.toggle('hidden', !show); }
  showEnd(show) { this.endScreen.classList.toggle('hidden', !show); }

  showBrief(title, body, show) {
    document.getElementById('brief-title').textContent = title;
    document.getElementById('brief-body').textContent = body;
    this.briefScreen.classList.toggle('hidden', !show);
  }

  toast(text, ms) {
    this.toastBox.textContent = text;
    this.toastBox.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastBox.classList.remove('show'), ms || 2600);
  }

  setHint(text) { this.hintBox.textContent = text || ''; }

  update(G) {
    const p = G.player;
    this.healthFill.style.width = `${Math.max(0, p.health)}%`;
    this.healthFill.style.background = p.health > 50 ? '#37b24d' : p.health > 25 ? '#f2c230' : '#d43d2a';
    this.healthText.textContent = `♥ ${Math.ceil(p.health)} / 100`;
    this.moneyText.textContent = `$ ${Math.floor(p.money)}`;
    this.districtText.textContent = districtAt(p.pos.x, p.pos.z);
    const stars = '★'.repeat(p.wanted) + '☆'.repeat(3 - p.wanted);
    this.starsText.textContent = stars;
    this.starsText.style.color = p.wanted > 0 ? '#ffd23f' : '#888888';
    this.wantedLabel.textContent = p.wanted === 0 ? 'CLEAN' : p.wanted === 1 ? 'WANTED' : p.wanted === 2 ? 'HOT' : 'MOST WANTED';
    this.wantedLabel.style.color = p.wanted > 0 ? '#ff6b6b' : '#888888';
    this.missionTitle.textContent = G.missions.done ? 'STORY COMPLETE' : G.missions.mission.title;
    this.missionText.textContent = G.missions.statusLine();
    if (p.inCar) {
      const kmh = Math.round(Math.abs(p.inCar.speed) * 3.2);
      this.speedBox.style.display = 'block';
      this.speedText.textContent = `${kmh} km/h`;
    } else {
      this.speedBox.style.display = 'none';
    }
    this._drawMinimap(G);
  }

  _drawMinimap(G) {
    const ctx = this.minimap;
    const S = 190;
    const half = 210;
    const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#1d2733';
    ctx.fillRect(0, 0, S, S);
    // sand + sea
    ctx.fillStyle = '#eed9a4';
    ctx.fillRect(0, ((150 + half) / (half * 2)) * S, S, S);
    ctx.fillStyle = '#1e90c8';
    ctx.fillRect(0, ((215 + half) / (half * 2)) * S, S, S);
    // roads
    ctx.strokeStyle = '#4a5058';
    ctx.lineWidth = 5;
    for (let i = -4; i <= 4; i++) {
      const c = i * 40;
      const [x1, y1] = toMap(c, -half);
      const [x2, y2] = toMap(c, half);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const [x3, y3] = toMap(-half, c);
      const [x4, y4] = toMap(half, c);
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }
    const dot = (x, z, color, r) => {
      const [mx, my] = toMap(x, z);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
    };
    // parked cars
    for (const c of G.vehicles.parked) if (c.parked) dot(c.x, c.z, '#9fb3c8', 2);
    // traffic
    for (const t of G.vehicles.traffic) dot(t.x, t.z, '#e8e8e8', 2);
    // police
    for (const p of G.vehicles.police) dot(p.x, p.z, '#2244ff', 3);
    // pedestrians
    for (const p of G.people.pedestrians) if (p.alive) dot(p.x, p.z, '#f2c230', 1.6);
    // mission target
    const target = G.missions.currentTarget();
    if (target) {
      const [mx, my] = toMap(target.x, target.z);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // player arrow
    const [px, py] = toMap(G.player.pos.x, G.player.pos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI - G.player.heading);
    ctx.fillStyle = '#37b24d';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // north + border
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('N', 6, 14);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, S - 2, S - 2);
  }
}
