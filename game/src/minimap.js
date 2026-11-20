// Live minimap: whole city shrunk into the HUD corner, with blips.
import { CITY_W, CITY_H, DISTRICTS, PARK, BEACH_X, SEA_X } from './config.js';

export function drawMinimap(ctx, x, y, size, state) {
  const s = size / CITY_W;
  const sy = size / CITY_H;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 18, 28, 0.82)';
  ctx.fillRect(x - 4, y - 4, size + 8, size * (CITY_H / CITY_W) + 8);
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, size + 8, size * (CITY_H / CITY_W) + 8);
  const h = size * (CITY_H / CITY_W);
  // Land, park, beach, sea.
  ctx.fillStyle = '#3f7a3a';
  ctx.fillRect(x, y, size, h);
  ctx.fillStyle = '#4c8a3f';
  ctx.fillRect(x + PARK.x * s, y + PARK.y * sy, PARK.w * s, PARK.h * sy);
  ctx.fillStyle = '#e8cf8f';
  ctx.fillRect(x + BEACH_X * s, y, (SEA_X - BEACH_X) * s, h);
  ctx.fillStyle = '#1f7fa8';
  ctx.fillRect(x + SEA_X * s, y, (CITY_W - SEA_X) * s, h);
  // Roads.
  ctx.strokeStyle = 'rgba(220, 220, 220, 0.55)';
  ctx.lineWidth = 1;
  for (let gx = 300; gx < CITY_W; gx += 300) {
    ctx.beginPath();
    ctx.moveTo(x + gx * s, y);
    ctx.lineTo(x + gx * s, y + h);
    ctx.stroke();
  }
  for (let gy = 300; gy < CITY_H; gy += 300) {
    ctx.beginPath();
    ctx.moveTo(x, y + gy * sy);
    ctx.lineTo(x + size, y + gy * sy);
    ctx.stroke();
  }
  const blip = (wx, wy, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + wx * s, y + wy * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Mission marker.
  const mark = state.missions.marker(state);
  if (mark) {
    const pulse = 4 + Math.sin(state.time * 5) * 1.5;
    blip(mark.x, mark.y, '#ffd94d', pulse);
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + mark.x * s, y + mark.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Police blips.
  for (const cop of state.wanted.police) blip(cop.x, cop.y, '#4d8dff', 2.5);
  // Player arrow.
  const px = state.player.inCar ? state.player.inCar.x : state.player.x;
  const py = state.player.inCar ? state.player.inCar.y : state.player.y;
  ctx.save();
  ctx.translate(x + px * s, y + py * sy);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
