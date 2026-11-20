// MinimapRenderer: city overview with roads, mission marker, player,
// police and traffic.
import { CITY } from './config.js';

export function drawMinimap(ctx, x, y, w, h, city, player, missions, wanted, traffic) {
  const sx = w / CITY.width, sy = h / CITY.height;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.85)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ff9f1c';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#3f7d44';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  // Sea on the west edge.
  ctx.fillStyle = '#1d6f8e';
  ctx.fillRect(x, y, 14, h);
  // Roads.
  ctx.fillStyle = '#2b2e36';
  for (const rx of city.roadsV) ctx.fillRect(x + rx * sx - 1, y, 2, h);
  for (const ry of city.roadsH) ctx.fillRect(x, y + ry * sy - 1, w, 2);
  // Buildings as dots.
  ctx.fillStyle = 'rgba(220,220,220,0.5)';
  for (const b of city.buildings) {
    ctx.fillRect(x + b.x * sx, y + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
  }
  // Mission marker.
  if (missions && missions.active) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x + missions.active.target.x * sx, y + missions.active.target.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }
  // Traffic dots.
  for (const c of traffic.cars) {
    if (c.stolen) continue;
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(x + c.x * sx - 1.5, y + c.y * sy - 1.5, 3, 3);
  }
  // Police dots.
  for (const pc of wanted.police) {
    ctx.fillStyle = '#3a6fd8';
    ctx.beginPath();
    ctx.arc(x + pc.x * sx, y + pc.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(x + player.x * sx, y + player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('SOLMAR BAY', x + 6, y + 14);
  ctx.restore();
}
