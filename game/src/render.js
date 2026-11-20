// Renderer: city, cars, player, effects, HUD with minimap, menus.
// 1280x720 logical field, scaled to the window; camera follows the player.
import { FIELD, CITY, PALETTE, FONT, RADIO_STATIONS } from './config.js';
import { drawMinimap } from './minimap.js';
import { districtAt } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
const ZOOM = 1.35;

function drawCar(ctx, x, y, angle, color, isPolice) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-19, -9, 40, 22);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-18, -10, 36, 20, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  ctx.beginPath();
  ctx.roundRect(-4, -8, 12, 16, 3);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(16, -8, 3, 4);
  ctx.fillRect(16, 4, 3, 4);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-19, -8, 3, 4);
  ctx.fillRect(-19, 4, 3, 4);
  if (isPolice) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('PD', -6, 3);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, label) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, 4, 0, Math.PI * 2);
  ctx.fill();
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -14);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function drawWorld(s, cam) {
    ctx.save();
    // Ground, sea and beach.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x - 40, cam.y - 40, FIELD.width + 80, FIELD.height + 80);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(cam.x - 40, cam.y - 40, 120, FIELD.height + 80);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(cam.x + 80, cam.y - 40, 60, FIELD.height + 80);
    // Roads with dashed centre lines.
    ctx.fillStyle = PALETTE.road;
    for (const rx of s.city.roadsV) ctx.fillRect(rx - 42, cam.y - 40, 84, FIELD.height + 80);
    for (const ry of s.city.roadsH) ctx.fillRect(cam.x - 40, ry - 42, FIELD.width + 80, 84);
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    for (const rx of s.city.roadsV) { ctx.moveTo(rx, cam.y - 40); ctx.lineTo(rx, cam.y + FIELD.height + 40); }
    for (const ry of s.city.roadsH) { ctx.moveTo(cam.x - 40, ry); ctx.lineTo(cam.x + FIELD.width + 40, ry); }
    ctx.stroke();
    ctx.setLineDash([]);
    // Central Park: lawn and pond.
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(s.city.park.x, s.city.park.y, s.city.park.w, s.city.park.h);
    ctx.fillStyle = PALETTE.parkLight;
    ctx.beginPath();
    ctx.arc(s.city.park.cx, s.city.park.cy, s.city.park.r, 0, Math.PI * 2);
    ctx.fill();
    // Buildings (culled to the camera view), with roofs and lit windows.
    for (const b of s.city.buildings) {
      if (b.x > cam.x + FIELD.width + 100 || b.x + b.w < cam.x - 100) continue;
      if (b.y > cam.y + FIELD.height + 100 || b.y + b.h < cam.y - 100) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x, b.y, b.w, 10);
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      for (let wx = b.x + 12; wx < b.x + b.w - 14; wx += 26) {
        for (let wy = b.y + 20; wy < b.y + b.h - 14; wy += 28) ctx.fillRect(wx, wy, 12, 14);
      }
    }
    // Trees near the camera.
    ctx.fillStyle = '#2a6a2e';
    for (const t of s.city.trees) {
      if (Math.abs(t.x - (cam.x + 640)) > 800 || Math.abs(t.y - (cam.y + 360)) > 500) continue;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Street lamps as small amber dots.
    ctx.fillStyle = '#ffd23f';
    for (const l of s.city.lamps) {
      if (l.x < cam.x - 20 || l.x > cam.x + FIELD.width + 20) continue;
      if (l.y < cam.y - 20 || l.y > cam.y + FIELD.height + 20) continue;
      ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
    }
    // Mission marker: bobbing beacon over the target.
    if (s.missions.active) {
      const t = s.missions.active.target;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 30 + Math.sin(s.elapsed * 4) * 6, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,210,63,0.25)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    // Race checkpoints.
    if (s.missions.active && s.missions.active.kind === 'race') {
      const a = s.missions.active;
      a.checkpoints.forEach((cp, i) => {
        ctx.fillStyle = i === a.cpIndex ? '#ff9f1c' : 'rgba(255,159,28,0.35)';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, i === a.cpIndex ? 26 : 18, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    // Taxi fare marker.
    if (s.missions.active && s.missions.active.kind === 'taxi' && s.missions.farePos) {
      const f = s.missions.fareStage === 'pickup' ? s.missions.farePos : s.missions.destPos;
      if (f) {
        ctx.fillStyle = '#4ac9a0';
        ctx.beginPath();
        ctx.arc(f.x, f.y - 24, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const c of s.traffic.cars) {
      if (!c.stolen) drawCar(ctx, c.x, c.y, c.angle, c.color, false);
    }
    for (const p of s.traffic.peds) drawPerson(ctx, p.x, p.y, p.angle, p.color, null);
    for (const e of s.combat.enemies) {
      drawPerson(ctx, e.x, e.y, Math.atan2(s.player.y - e.y, s.player.x - e.x), '#ff3b30', 'RIVAL');
    }
    for (const pc of s.wanted.police) drawCar(ctx, pc.x, pc.y, pc.angle, PALETTE.police, true);
    if (s.player.onFoot) {
      drawPerson(ctx, s.player.x, s.player.y, s.player.angle, PALETTE.player, 'MARA');
    } else if (s.player.car) {
      drawCar(ctx, s.player.car.x, s.player.car.y, s.player.car.angle, s.player.car.color, false);
    }
    ctx.fillStyle = '#ffe14d';
    for (const b of s.combat.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHUD(s, screen) {
    // Top-left: money, health, ammo, district and radio.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(12, 12, 300, 86);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('$' + s.player.money, 24, 40);
    ctx.font = '16px ' + FONT;
    ctx.fillText('♥ ' + Math.max(0, Math.round(s.player.health)) + '   Ammo ' + s.combat.ammo, 24, 64);
    ctx.fillText(districtAt(s.player.x, s.player.y) + '  •  ' + RADIO_STATIONS[s.radio % RADIO_STATIONS.length].name, 24, 86);
    // Wanted stars.
    ctx.font = 'bold 26px ' + FONT;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < s.wanted.stars ? '#ffd23f' : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', 330 + i * 32, 40);
    }
    if (s.wanted.stars > 0) {
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 15px ' + FONT;
      ctx.fillText('WANTED — police are chasing you', 330, 64);
    }
    // Mission box.
    const m = s.missions.active;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(12, 108, 420, 64);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(m ? `MISSION ${m.id}: ${m.title}` : 'NO ACTIVE MISSION — press SPACE', 22, 130);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '14px ' + FONT;
    ctx.fillText((m ? m.text : s.missions.message).slice(0, 62), 22, 152);
    if (m && m.kind === 'race') ctx.fillText(`Checkpoint ${m.cpIndex + 1} / 5`, 22, 168);
    if (m && m.kind === 'escape') ctx.fillText(`Escape timer: ${Math.max(0, 30 - m.escapeTimer).toFixed(0)}s at 3 stars`, 22, 168);
    if (m && m.kind === 'eliminate') ctx.fillText(`Rivals left: ${(m.count || 4) - s.missions.progress}`, 22, 168);
    if (m && m.kind === 'taxi') ctx.fillText(`Fares done: ${s.missions.progress} / ${m.count || 3}`, 22, 168);
    // Bottom-left: speed and controls.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(12, FIELD.height - 118, 420, 106);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText(s.player.onFoot ? 'ON FOOT' : Math.round(s.player.speed * 0.9) + ' km/h', 24, FIELD.height - 84);
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('WASD move/drive • E enter car • F shoot • Shift run', 24, FIELD.height - 58);
    ctx.fillText('Steal any car • S saves (pause menu) • 8 missions', 24, FIELD.height - 36);
    // Minimap and run stats.
    drawMinimap(ctx, FIELD.width - 232, 12, 220, 158, s.city, s.player, s.missions, s.wanted, s.traffic);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '11px ' + FONT;
    ctx.fillText(`Missions ${s.missions.done.length}/8  •  Kills ${s.combat.kills}  •  ${Math.floor(s.elapsed / 60)}:${String(Math.floor(s.elapsed % 60)).padStart(2, '0')}`, FIELD.width - 232, 186);

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(8,12,20,0.72)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 64px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('SOLMAR BAY', FIELD.width / 2, 220);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px ' + FONT;
      ctx.fillText('An open-world crime story — drive, steal, run, survive', FIELD.width / 2, 262);
      ctx.font = '18px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('A complete city: traffic, pedestrians, police, 8 missions, combat, minimap, radio & saves', FIELD.width / 2, 300);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px ' + FONT;
      ctx.fillText('Press SPACE or click to start  •  WASD move  •  E enter a car  •  F shoot', FIELD.width / 2, 360);
      ctx.font = '15px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Original city, characters and story — made for the make.fun GTA 6 bounty', FIELD.width / 2, 400);
      ctx.textAlign = 'left';
    }
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8,12,20,0.7)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', FIELD.width / 2, 300);
      ctx.font = '18px ' + FONT;
      ctx.fillText('S — save game   •   P / Esc — resume', FIELD.width / 2, 340);
      ctx.textAlign = 'left';
    }
    if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(60,8,8,0.78)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 56px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('BUSTED', FIELD.width / 2, 320);
      ctx.fillStyle = '#fff';
      ctx.font = '20px ' + FONT;
      ctx.fillText('The Solmar police caught you. Press SPACE to try again.', FIELD.width / 2, 360);
      ctx.textAlign = 'left';
    }
    if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(8,40,16,0.8)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 52px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('KING OF SOLMAR', FIELD.width / 2, 320);
      ctx.fillStyle = '#fff';
      ctx.font = '20px ' + FONT;
      ctx.fillText(`All 8 missions complete — $${s.player.money} in the bank. Press SPACE to keep playing.`, FIELD.width / 2, 360);
      ctx.textAlign = 'left';
    }
  }

  return {
    draw(s, screen) {
      const vw = FIELD.width / ZOOM, vh = FIELD.height / ZOOM;
      const cam = {
        x: Math.max(0, Math.min(CITY.width - vw, s.player.x - vw / 2)),
        y: Math.max(0, Math.min(CITY.height - vh, s.player.y - vh / 2)),
      };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0e1420';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // World at zoom: viewport is FIELD/ZOOM wide, camera top-left is cam.
      ctx.setTransform(view.scale * ZOOM, 0, 0, view.scale * ZOOM, view.x - cam.x * view.scale * ZOOM, view.y - cam.y * view.scale * ZOOM);
      drawWorld(s, cam);
      // HUD at unzoomed logical size.
      ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
      drawHUD(s, screen);
    },
  };
}
