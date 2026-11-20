// World and HUD rendering on one canvas: city, cars, people, combat, markers.
import { CITY_W, CITY_H, DISTRICTS, PARK, BEACH_X, SEA_X, ROAD_STEP, ROAD_W, VIEW_W, VIEW_H } from './config.js';
import { districtAt } from './city.js';
import { drawMinimap } from './minimap.js';

export function drawCarShape(ctx, car, isPlayerCar) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-22, -12, 46, 26);
  ctx.fillStyle = car.color;
  ctx.fillRect(-20, -11, 42, 22);
  ctx.fillStyle = '#20242c';
  ctx.fillRect(-6, -9, 12, 18);
  ctx.fillStyle = '#cfe8ff';
  ctx.fillRect(8, -8, 6, 16);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(20, -8, 2, 5);
  ctx.fillRect(20, 3, 2, 5);
  if (car.taxi) {
    ctx.fillStyle = '#111';
    ctx.fillRect(-4, -12, 10, 3);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('TAXI', -4, -13);
  }
  if (isPlayerCar) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-24, -15, 50, 30);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-27, -18, 56, 36);
  }
  ctx.restore();
}

export function drawWorld(ctx, state, cam) {
  const { city, player, trafficCars, parkedCars, peds } = state;
  // Ground.
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(cam.x, cam.y, VIEW_W, VIEW_H);
  // District tint wash.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.tint;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.globalAlpha = 1;
  }
  // Park.
  ctx.fillStyle = '#4c8a3f';
  ctx.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
  ctx.fillStyle = '#3f7d4a';
  ctx.beginPath();
  ctx.ellipse(PARK.x + PARK.w / 2, PARK.y + PARK.h / 2, 150, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beach and sea.
  ctx.fillStyle = '#e8cf8f';
  ctx.fillRect(BEACH_X, 0, SEA_X - BEACH_X, CITY_H);
  ctx.fillStyle = '#1f7fa8';
  ctx.fillRect(SEA_X, 0, CITY_W - SEA_X, CITY_H);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let wy = 40; wy < CITY_H; wy += 180) {
    ctx.fillRect(SEA_X + 14, wy, 60, 4);
  }
  // Roads run along multiples of ROAD_STEP; buildings sit inside the blocks.
  ctx.fillStyle = '#3a3f47';
  for (let gx = 0; gx <= CITY_W; gx += ROAD_STEP) {
    ctx.fillRect(gx - ROAD_W / 2, 0, ROAD_W, CITY_H);
  }
  for (let gy = 0; gy <= CITY_H; gy += ROAD_STEP) {
    ctx.fillRect(0, gy - ROAD_W / 2, CITY_W, ROAD_W);
  }
  // Lane dashes.
  ctx.fillStyle = '#e8d44d';
  for (let gx = 0; gx <= CITY_W; gx += ROAD_STEP) {
    for (let y = 0; y < CITY_H; y += 64) {
      ctx.fillRect(gx - 2, y, 4, 26);
    }
  }
  for (let gy = 0; gy <= CITY_H; gy += ROAD_STEP) {
    for (let x = 0; x < CITY_W; x += 64) {
      ctx.fillRect(x, gy - 2, 26, 4);
    }
  }
  // Sidewalk edges.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let gx = 0; gx <= CITY_W; gx += ROAD_STEP) {
    ctx.strokeRect(gx - ROAD_W / 2 - 6, -10, ROAD_W + 12, CITY_H + 20);
  }
  // Buildings with fake height shading and lit windows.
  for (const b of city.buildings) {
    if (b.x + b.w < cam.x - 80 || b.x > cam.x + VIEW_W + 80 || b.y + b.h < cam.y - 80 || b.y > cam.y + VIEW_H + 80) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    if (b.lit) {
      ctx.fillStyle = '#ffe9a8';
      for (let wx = b.x + 16; wx < b.x + b.w - 12; wx += 26) {
        for (let wy = b.y + 16; wy < b.y + b.h - 12; wy += 26) {
          if ((wx + wy) % 52 === 0) ctx.fillRect(wx, wy, 8, 10);
        }
      }
    }
  }
  // Trees.
  for (const t of city.trees) {
    if (t.x < cam.x - 40 || t.x > cam.x + VIEW_W + 40 || t.y < cam.y - 40 || t.y > cam.y + VIEW_H + 40) continue;
    ctx.fillStyle = '#2f6b2a';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57a04a';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission marker column.
  const mark = state.missions.marker(state);
  if (mark) {
    const pulse = 26 + Math.sin(state.time * 4) * 6;
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,217,77,0.25)';
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(mark.x, mark.y - 66);
    ctx.lineTo(mark.x - 12, mark.y - 40);
    ctx.lineTo(mark.x + 12, mark.y - 40);
    ctx.closePath();
    ctx.fill();
  }
  // Pickups.
  for (const pk of state.combat.pickups) {
    ctx.fillStyle = pk.kind === 'health' ? '#ff5a6e' : '#ffd94d';
    ctx.beginPath();
    ctx.arc(pk.x, pk.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + 5);
  }
  // Pedestrians.
  for (const ped of peds) {
    if (ped.x < cam.x - 40 || ped.x > cam.x + VIEW_W + 40 || ped.y < cam.y - 40 || ped.y > cam.y + VIEW_H + 40) continue;
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(4, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Cars.
  for (const car of parkedCars) drawCarShape(ctx, car, player.inCar === car);
  for (const car of trafficCars) drawCarShape(ctx, car, player.inCar === car);
  // Police cars with light bar.
  for (const cop of state.wanted.police) {
    drawCarShape(ctx, cop, false);
    const on = Math.sin(cop.siren) > 0;
    ctx.fillStyle = on ? '#ff3b30' : '#3b82ff';
    ctx.beginPath();
    ctx.arc(cop.x, cop.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = on ? '#3b82ff' : '#ff3b30';
    ctx.beginPath();
    ctx.arc(cop.x, cop.y + 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Enemies.
  for (const e of state.combat.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.fillStyle = e.boss ? '#c81e3a' : '#8a1e2e';
    ctx.beginPath();
    ctx.arc(0, 0, e.boss ? 15 : 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(6, -3, 16, 6);
    ctx.restore();
    ctx.fillStyle = '#222';
    ctx.fillRect(e.x - 18, e.y - 26, 36, 5);
    ctx.fillStyle = e.boss ? '#ff3b30' : '#ff8a3d';
    ctx.fillRect(e.x - 18, e.y - 26, 36 * Math.max(0, e.health / (e.boss ? 220 : 60)), 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.name, e.x, e.y - 30);
  }
  // Bullets and particles.
  for (const b of state.combat.bullets) {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const p of state.combat.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Player on foot.
  if (player.onFoot) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    const bob = Math.sin(player.walkFrame) * 2;
    ctx.fillStyle = player.hurtFlash > 0 ? '#ff6b6b' : '#ffcf3d';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d3a5f';
    ctx.fillRect(-4, -8, 14, 16);
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(8 + bob * 0.3, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Aim line.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.aimAngle || 0) * 46, player.y + Math.sin(player.aimAngle || 0) * 46);
    ctx.stroke();
  }
  // Muzzle flash.
  if (state.combat.muzzle > 0 && player.onFoot) {
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(player.aimAngle || 0) * 26, player.y + Math.sin(player.aimAngle || 0) * 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHud(ctx, state) {
  const p = state.player;
  const w = state.wanted;
  ctx.save();
  // Top-left: money, health, ammo.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 12, 336, 86);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.money}`, 26, 42);
  ctx.fillStyle = '#fff';
  ctx.font = '15px sans-serif';
  ctx.fillText(`HEALTH ${Math.ceil(p.health)}`, 26, 64);
  ctx.fillStyle = '#222';
  ctx.fillRect(26, 70, 130, 10);
  ctx.fillStyle = p.health > 40 ? '#7dff8a' : '#ff5a4d';
  ctx.fillRect(26, 70, 130 * (p.health / 100), 10);
  ctx.fillStyle = '#fff';
  ctx.fillText(`AMMO ${p.ammo}`, 170, 64);
  ctx.fillText(p.inCar ? `DRIVING: ${p.inCar.name}` : 'ON FOOT', 170, 84);
  // Top-right: wanted stars.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(VIEW_W - 190, 12, 176, 44);
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'left';
  let stars = '';
  for (let i = 0; i < 3; i += 1) stars += i < w.stars ? '★' : '☆';
  ctx.fillStyle = w.stars > 0 ? '#ffd94d' : '#888';
  ctx.fillText(stars, VIEW_W - 178, 44);
  if (w.bustedTimer > 0.4) {
    ctx.fillStyle = '#ff5a4d';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('BUSTED?! RUN!', VIEW_W - 178, 66);
  }
  // District + radio.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, VIEW_H - 64, 330, 50);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  ctx.fillText(districtAt(px, py), 26, VIEW_H - 42);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(`♪ ${state.audio.name}  (M to change)`, 26, VIEW_H - 24);
  // Mission objective bar.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(366, 12, VIEW_W - 576, 56);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 15px sans-serif';
  const m = state.missions.current;
  ctx.fillText(m ? `MISSION ${m.id}/8 — ${m.title}` : 'STORY COMPLETE', 380, 32);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(state.missions.objectiveText(), 380, 54);
  // Minimap bottom-right.
  drawMinimap(ctx, VIEW_W - 220, VIEW_H - 190, 200, state);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText('SOLMAR BAY', VIEW_W - 220, VIEW_H - 196);
  // Controls hint.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(14, 106, 300, 62);
  ctx.fillStyle = '#ddd';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD move / drive · Mouse aim · Click shoot', 24, 124);
  ctx.fillText('E enter / steal car · M radio · F save · R retry', 24, 142);
  ctx.fillText('H help · P pause', 24, 160);
  // Mission message toast.
  if (state.missions.messageTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    const msg = state.missions.message;
    ctx.fillRect(250, VIEW_H - 130, 780, 52);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, msg, VIEW_W / 2, VIEW_H - 110, VIEW_W - 430, 19);
    ctx.textAlign = 'left';
  }
  // Hurt vignette.
  if (p.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${p.hurtFlash * 0.4})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
}

export function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
  return lines.length;
}

export function drawTitle(ctx, state, selected) {
  ctx.save();
  // Sunset gradient sky over the bay.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#ff9a5a');
  g.addColorStop(0.45, '#ff6b8a');
  g.addColorStop(0.75, '#2e6f8e');
  g.addColorStop(1, '#123a5c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(1150, 110, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f7fa8';
  ctx.fillRect(0, 480, VIEW_W, 240);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 8; i += 1) ctx.fillRect(120 + i * 150, 520 + (i % 3) * 40, 90, 4);
  // Skyline.
  ctx.fillStyle = '#1d2b3a';
  const skyline = [120, 200, 160, 260, 190, 300, 150, 230, 180, 210];
  let sx = 0;
  for (const hgt of skyline) {
    ctx.fillRect(sx, 480 - hgt, 128, hgt);
    sx += 128;
  }
  ctx.fillStyle = '#ffe9a8';
  for (let i = 0; i < 40; i += 1) {
    ctx.fillRect(20 + (i * 53) % 1200, 300 + (i * 37) % 150, 6, 8);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px sans-serif';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 18;
  ctx.fillText('SOLMAR BAY', VIEW_W / 2, 190);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('An open-world crime story — drive, hustle, survive.', VIEW_W / 2, 240);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('WASD move & drive · E steal a car · Mouse aim, click to shoot · M radio · F save', VIEW_W / 2, 300);
  const items = ['▶  NEW GAME', state.economy.hasSave() ? '↻  CONTINUE (saved game)' : '—  NO SAVE YET —', 'ℹ  HOW TO PLAY'];
  items.forEach((item, i) => {
    const y = 380 + i * 52;
    if (i === selected) {
      ctx.fillStyle = '#ffd94d';
      ctx.fillRect(VIEW_W / 2 - 220, y - 28, 440, 40);
      ctx.fillStyle = '#111';
    } else {
      ctx.fillStyle = '#fff';
    }
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(item, VIEW_W / 2, y);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '14px sans-serif';
  ctx.fillText('8 story missions · 26 traffic cars · 40 pedestrians · wanted level 0–3 · 3 radio stations', VIEW_W / 2, 570);
  ctx.fillText('Original game — no Rockstar content. Built for make.fun gta6-01.', VIEW_W / 2, 596);
  ctx.restore();
}

export function drawHelp(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOW TO PLAY', VIEW_W / 2, 110);
  ctx.fillStyle = '#fff';
  ctx.font = '17px sans-serif';
  const lines = [
    'Move on foot with WASD. Walk up to any car and press E to get in —',
    'parked cars and traffic cars are both fair game, but stealing raises heat.',
    '',
    'Drive with WASD: W accelerate, S brake / reverse, A and D steer.',
    'Press E again to get out. Mouse aims your pistol; click to shoot.',
    '',
    'Follow the yellow marker to complete 8 story missions in order.',
    'Crimes raise your wanted level (0–3 stars). Police chase harder at',
    'higher stars. Lay low and heat fades. Get busted or killed and you',
    'wake up at the hospital, $100 poorer.',
    '',
    'M switches radio station, F saves, R restarts the current mission,',
    'P pauses, H closes this help.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, 170 + i * 30));
  ctx.restore();
}

export function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press P to resume', VIEW_W / 2, VIEW_H / 2 + 36);
  ctx.restore();
}

export function drawGameOver(ctx, reason) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,0,0,0.75)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ff5a4d';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(reason, VIEW_W / 2, VIEW_H / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Press ENTER to wake up at the hospital (-$100) and keep playing', VIEW_W / 2, VIEW_H / 2 + 30);
  ctx.restore();
}
