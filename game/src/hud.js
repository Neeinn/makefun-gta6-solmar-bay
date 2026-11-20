// hud.js — DOM HUD plus the 2D canvas minimap.
export function createHud() {
  const $ = (id) => document.getElementById(id);
  const minimap = $('minimap');
  const mctx = minimap.getContext('2d');
  let toastTimer = null;
  return {
    show() { $('hud').style.display = 'block'; },
    hide() { $('hud').style.display = 'none'; },
    setObjective(title, text) {
      $('objective-title').textContent = title;
      $('objective-text').textContent = text;
    },
    setPrompt(text) {
      const el = $('prompt');
      el.style.display = text ? 'block' : 'none';
      el.textContent = text;
    },
    toast(text) {
      const el = $('toast');
      el.textContent = text;
      el.style.display = 'block';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
    },
    update(ctx) {
      const p = ctx.player;
      $('money').textContent = '$' + p.money;
      $('health-text').textContent = Math.max(0, Math.ceil(p.health));
      $('health-fill').style.width = Math.max(0, p.health) + '%';
      $('health-fill').style.background = p.health > 50 ? '#3ddc5f' : p.health > 25 ? '#ffb703' : '#e63946';
      const stars = $('wanted').children;
      for (let i = 0; i < 3; i++) stars[i].className = i < p.wanted ? '' : 'off';
      const speedEl = $('speed');
      if (p.inCar) {
        speedEl.style.display = 'block';
        speedEl.innerHTML = Math.round(Math.abs(p.inCar.speed) * 3.6) + ' <small>km/h</small>';
      } else speedEl.style.display = 'none';
      $('crosshair').style.display = ctx.state === 'playing' ? 'block' : 'none';
      const label = ctx.missionActive && ctx.missionIndex < 8
        ? 'Mission ' + (ctx.missionIndex + 1) + '/8 — ' + ctx.missionName
        : ctx.missionIndex >= 8 ? 'Story complete ✓' : 'Free Roam — press M for a mission';
      $('mission-label').textContent = label;
      this.drawMinimap(ctx, mctx);
    },
    drawMinimap(ctx, g) {
      const S = 180, scale = S / 420;
      g.clearRect(0, 0, S, S);
      g.fillStyle = '#0f2a1e'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#1e6f9f'; g.fillRect(0, S - 32, S, 32); // sea at the south edge
      g.strokeStyle = '#3a3a44'; g.lineWidth = 5;
      const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
      const { ROAD_COORDS } = ctx.cityApi;
      for (const c of ROAD_COORDS) {
        const [x1, y1] = toMap(c, -200); const [x2, y2] = toMap(c, 200);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        const [x3, y3] = toMap(-200, c); const [x4, y4] = toMap(200, c);
        g.beginPath(); g.moveTo(x3, y3); g.lineTo(x4, y4); g.stroke();
      }
      // Mission marker.
      if (ctx.missionMarker) {
        const [mx, my] = toMap(ctx.missionMarker.x, ctx.missionMarker.z);
        g.fillStyle = '#ffa500';
        g.beginPath(); g.arc(mx, my, 6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      }
      // Traffic (grey) and police (red/blue).
      g.fillStyle = '#cccccc';
      for (const t of ctx.traffic) { const [x, y] = toMap(t.pos.x, t.pos.z); g.fillRect(x - 1.5, y - 1.5, 3, 3); }
      g.fillStyle = '#ff2222';
      for (const c of ctx.police) { const [x, y] = toMap(c.pos.x, c.pos.z); g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); }
      // Player: white triangle pointing along heading.
      const [px, py] = toMap(ctx.player.pos.x, ctx.player.pos.z);
      const h = ctx.player.inCar ? ctx.player.inCar.heading : ctx.player.heading;
      g.fillStyle = '#ffffff';
      g.save(); g.translate(px, py); g.rotate(h);
      g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
      g.restore();
      // North label.
      g.fillStyle = '#fff'; g.font = 'bold 11px Arial'; g.fillText('N', 6, 14);
    },
  };
}
