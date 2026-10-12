// 여러 장에서 같이 쓰는 배경 소품: 배, 기둥 복도, 큰 벽, 달문, 그림 표지판
import { TAU, rgba } from '../util.js';
import { drawGlyph } from './glyphs.js';

export function boat(g, ctx, bx) {
  const pal = g.pal, t = g.t, by = g.view.waterY - 0.02 + Math.sin(t * 1.2) * 0.05;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(t * 0.9) * 0.03);
  ctx.fillStyle = pal.wood; ctx.beginPath(); ctx.moveTo(-1.5, -0.42); ctx.quadraticCurveTo(-1.2, 0.32, 0, 0.32); ctx.quadraticCurveTo(1.2, 0.32, 1.6, -0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pal.woodHi; ctx.globalAlpha = 0.7; ctx.fillRect(-1.42, -0.44, 2.95, 0.08); ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.woodDark; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(1.5, -0.45); ctx.quadraticCurveTo(2.4, -0.2, 2.9, -1.75); ctx.stroke();
  ctx.restore();
}

// 기둥이 늘어선 복도 (바닥 높이 y 위에 지붕)
export function colonnade(g, ctx, x0, x1, y = 0) {
  const pal = g.pal, t = g.t, roof = -y - 4.5, base = -y;
  ctx.fillStyle = pal.stoneDark;
  for (let x = x0; x <= x1; x += 3.1) {
    ctx.globalAlpha = 0.85; ctx.fillRect(x - 0.3, roof, 0.6, base - roof);
    ctx.globalAlpha = 1; ctx.fillRect(x - 0.42, roof, 0.84, 0.22); ctx.fillRect(x - 0.42, base - 0.2, 0.84, 0.2);
  }
  const rg = ctx.createLinearGradient(0, roof - 0.9, 0, roof);
  rg.addColorStop(0, pal.stone); rg.addColorStop(1, pal.stoneDark);
  ctx.fillStyle = rg; ctx.fillRect(x0 - 0.8, roof - 0.9, x1 - x0 + 1.6, 0.9);
  ctx.fillStyle = pal.top; ctx.globalAlpha = 0.8; ctx.fillRect(x0 - 0.8, roof - 0.9, x1 - x0 + 1.6, 0.1); ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.top; ctx.lineWidth = 0.05; ctx.globalAlpha = 0.6; ctx.beginPath();
  for (let x = x0; x < x1; x += 1.37) { const len = 0.3 + ((x * 7.3) % 1) * 0.8; ctx.moveTo(x, roof); ctx.quadraticCurveTo(x + Math.sin(t + x) * 0.08, roof + len * 0.6, x + Math.sin(t * 0.8 + x) * 0.12, roof + len); }
  ctx.stroke(); ctx.globalAlpha = 1;
}

// 문양 석판이 걸리는 큰 벽
export function wall(g, ctx, x0, x1, y = 0, h = 5.2) {
  const pal = g.pal, top = -y - h, base = -y;
  const wg = ctx.createLinearGradient(0, top, 0, base);
  wg.addColorStop(0, pal.stoneDark); wg.addColorStop(1, pal.stone);
  ctx.fillStyle = wg; ctx.globalAlpha = 0.92;
  ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x0 + 0.3, top + 0.6); ctx.quadraticCurveTo(x0 + 0.4, top, x0 + 1.2, top); ctx.lineTo(x1, top); ctx.lineTo(x1, base); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.top; ctx.globalAlpha = 0.75; ctx.fillRect(x0 + 1, top, x1 - x0 - 1, 0.1); ctx.globalAlpha = 1;
}

// 달문: 장의 끝에 서 있는 커다란 돌 고리. moons=2면 두 개의 달이 겹쳐 뜬다(마지막 장).
export function moonArch(g, ctx, cx, y = 0, moons = 0) {
  const pal = g.pal, t = g.t, cy = -y - 2.55, r = 2.5;
  const glow = 0.5 + 0.2 * Math.sin(t * 1.1) + g.surge * 0.4;
  const gg = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.1);
  gg.addColorStop(0, rgba('#fff6d8', 0.22 * glow)); gg.addColorStop(1, rgba('#fff6d8', 0));
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, TAU); ctx.fill();
  if (moons > 0) { // 고리 안에서 두 달이 다가와 하나가 된다
    const d = (1 - moons) * 1.5;
    for (const [sx, col] of [[-1, '#fff1cf'], [1, '#e9d8ff']]) {
      const mg = ctx.createRadialGradient(cx + sx * d, cy, 0, cx + sx * d, cy, 1.5);
      mg.addColorStop(0, rgba(col, 0.95)); mg.addColorStop(0.55, rgba(col, 0.85)); mg.addColorStop(0.62, rgba(col, 0.25)); mg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = mg; ctx.globalAlpha = 0.45 + 0.5 * moons; ctx.beginPath(); ctx.arc(cx + sx * d, cy, 1.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 0.62; ctx.strokeStyle = pal.stoneDark; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 0.4; ctx.strokeStyle = pal.stone; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 0.05; ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(cx, cy, r + 0.22, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.globalAlpha = 1;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.36;
    ctx.globalAlpha = 0.5 + 0.4 * glow; drawGlyph(ctx, i, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.3, pal.warm, 0.12);
  }
  ctx.globalAlpha = 1;
}

// 글자 없는 그림 표지판: 새 동작을 처음 쓰는 자리에 세워 둔다
// kind: 'stack'(목말) | 'hold'(밟고 있기) | 'pull'(당기기) | 'crank'(올리기) | 'dark'(짝 주변만 보인다) | 'talk'
export function sign(g, ctx, x, y, kind) {
  const pal = g.pal, X = x, Y = -y;
  ctx.fillStyle = pal.woodDark; ctx.fillRect(X - 0.07, Y - 1.3, 0.14, 1.3);
  ctx.save(); ctx.translate(X, Y - 2.0); ctx.rotate(Math.sin(g.t * 0.8 + x) * 0.015);
  ctx.fillStyle = pal.wood; rr(ctx, -0.95, -0.72, 1.9, 1.44, 0.16); ctx.fill();
  ctx.strokeStyle = pal.woodHi; ctx.lineWidth = 0.05; ctx.globalAlpha = 0.8; rr(ctx, -0.86, -0.63, 1.72, 1.26, 0.12); ctx.stroke(); ctx.globalAlpha = 1;
  const A = '#fff1d6', B = '#dccdf8', W = pal.raw('warm');
  const head = (hx, hy, s, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx - s * 0.62, hy - s * 0.72, s * 0.34, 0, TAU); ctx.arc(hx + s * 0.62, hy - s * 0.72, s * 0.34, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy, s, s * 0.82, 0, 0, TAU); ctx.fill(); };
  const arrow = (ax, ay, dx, dy) => { ctx.strokeStyle = W; ctx.fillStyle = W; ctx.lineWidth = 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + dx, ay + dy); ctx.stroke(); const a = Math.atan2(dy, dx); ctx.beginPath(); ctx.moveTo(ax + dx + Math.cos(a) * 0.12, ay + dy + Math.sin(a) * 0.12); ctx.lineTo(ax + dx + Math.cos(a + 2.5) * 0.14, ay + dy + Math.sin(a + 2.5) * 0.14); ctx.lineTo(ax + dx + Math.cos(a - 2.5) * 0.14, ay + dy + Math.sin(a - 2.5) * 0.14); ctx.closePath(); ctx.fill(); };
  const bob = Math.sin(g.t * 2.2) * 0.04;
  if (kind === 'fog') { // 안개 속 내 불은 안 보인다 → 짝이 등불을 켜 준다
    ctx.fillStyle = 'rgba(232,242,255,0.55)'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-0.45 + k * 0.3, 0.05 + Math.sin(g.t + k) * 0.04, 0.24, 0, TAU); ctx.fill(); }
    head(-0.3, 0.3, 0.17, A); head(0.5, 0.25, 0.17, B); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.ellipse(0.62, -0.18, 0.09, 0.12, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = 0.04; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(g.t * 3); ctx.beginPath(); ctx.moveTo(0.5, -0.12); ctx.lineTo(-0.2, -0.3); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (kind === 'mirror') { // 한 사람 화면이 좌우로 뒤집힌다
    head(-0.42, 0.15, 0.2, A); arrow(-0.42, -0.3, 0.3, 0); ctx.strokeStyle = W; ctx.lineWidth = 0.05; ctx.setLineDash([0.08, 0.07]); ctx.beginPath(); ctx.moveTo(0, -0.55); ctx.lineTo(0, 0.55); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.scale(-1, 1); head(-0.42, 0.15, 0.2, A); arrow(-0.42, -0.3, 0.3, 0); ctx.restore();
  } else if (kind === 'beam') { // 빛줄기는 한 사람만 본다, 거울은 짝이 돌린다
    ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(-0.8, 0.3); ctx.lineTo(-0.1, 0.3); ctx.lineTo(-0.1, -0.35); ctx.lineTo(0.75, -0.35); ctx.stroke();
    ctx.strokeStyle = '#9fe3ff'; ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(-0.3, 0.5); ctx.lineTo(0.1, 0.1); ctx.stroke(); head(0.5, 0.35, 0.17, B);
  } else if (kind === 'bubble') { // 내가 불면 → 짝이 방울을 타고 오른다
    head(-0.5, 0.3, 0.2, A); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.05; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(-0.12 + k * 0.16, 0.26 - k * 0.1, 0.05 + k * 0.03, 0, TAU); ctx.stroke(); }
    const by = 0.1 - ((g.t * 0.35) % 1) * 0.5; ctx.beginPath(); ctx.arc(0.45, by, 0.34, 0, TAU); ctx.stroke(); head(0.45, by + 0.04, 0.17, B); arrow(0.86, 0.3, 0, -0.55);
  } else if (kind === 'wind') { // 바람이 방울을 옆으로 민다
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(-0.3 + Math.sin(g.t * 1.2) * 0.25, 0, 0.3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = W; for (let k = 0; k < 3; k++) { const yy = -0.36 + k * 0.36, u = (g.t * 0.8 + k * 0.3) % 1; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.moveTo(-0.75 + u * 0.5, yy); ctx.bezierCurveTo(-0.4 + u * 0.5, yy - 0.1, -0.1 + u * 0.5, yy + 0.1, 0.25 + u * 0.5, yy); ctx.stroke(); } ctx.globalAlpha = 1; arrow(0.3, 0.45, 0.4, 0);
  } else if (kind === 'echo' || kind === 'echo2') { // 내가 걸으면 → 메아리가 짝을 태운다 / 메아리가 돌을 밟아 준다
    const u = (g.t * 0.4) % 1, gx = -0.6 + u * 1.2;
    ctx.globalAlpha = 0.45; head(gx, 0.28, 0.2, A); ctx.globalAlpha = 1;
    if (kind === 'echo') { head(gx, -0.12, 0.2, B); ctx.strokeStyle = A; ctx.lineWidth = 0.05; ctx.setLineDash([0.1, 0.08]); ctx.beginPath(); ctx.moveTo(-0.8, 0.52); ctx.lineTo(0.8, 0.52); ctx.stroke(); ctx.setLineDash([]); }
    else { ctx.fillStyle = W; rr(ctx, 0.3, 0.46, 0.5, 0.12, 0.05); ctx.fill(); rr(ctx, -0.7, 0.46, 0.5, 0.12, 0.05); ctx.fill(); head(-0.45, 0.26, 0.2, B); }
    ctx.strokeStyle = '#ff8fa8'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0.62, -0.42, 0.13, 0, TAU); ctx.stroke(); ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.arc(0.62, -0.42, 0.06, 0, TAU); ctx.fill();
  } else if (kind === 'size') { // 내가 커지면 짝이 작아진다
    const k = 0.5 + 0.5 * Math.sin(g.t * 1.6); head(-0.38, 0.2 - k * 0.12, 0.16 + k * 0.14, A); head(0.42, 0.2 - (1 - k) * 0.12, 0.16 + (1 - k) * 0.14, B);
    arrow(-0.38, -0.28, 0, k > 0.5 ? -0.2 : 0.2); arrow(0.42, -0.28, 0, k > 0.5 ? 0.2 : -0.2);
  } else if (kind === 'follow') { // 짝이 걸으면 내 발판이 따라온다
    head(-0.4, -0.2 + bob * 0.5, 0.2, A); ctx.fillStyle = W; rr(ctx, -0.72, 0.02, 0.64, 0.12, 0.05); ctx.fill();
    head(-0.4, 0.42, 0.18, B); arrow(0.0, 0.42, 0.5, 0); arrow(0.0, 0.08, 0.5, 0);
  } else if (kind === 'box') { // 짝이 상자를 밀어 주면 → 그걸 밟고 건넌다
    ctx.fillStyle = W; rr(ctx, -0.16, -0.02, 0.4, 0.34, 0.05); ctx.fill(); head(0.52, 0.12, 0.2, B); arrow(0.3, -0.3, -0.4, 0);
    head(-0.58, -0.02 + bob, 0.2, A); ctx.strokeStyle = A; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(-0.82, 0.36); ctx.lineTo(-0.44, 0.36); ctx.stroke();
    ctx.strokeStyle = B; ctx.setLineDash([0.1, 0.07]); ctx.beginPath(); ctx.moveTo(-0.3, 0.36); ctx.lineTo(0.82, 0.36); ctx.stroke(); ctx.setLineDash([]);
  } else if (kind === 'link') { // 내가 돌을 밟으면 → 짝의 세계에 다리가 놓인다
    head(-0.48, -0.08 + bob * 0.5, 0.22, A); ctx.fillStyle = W; rr(ctx, -0.78, 0.2, 0.6, 0.13, 0.05); ctx.fill();
    arrow(-0.1, 0.05, 0.28, 0);
    head(0.5, -0.12, 0.2, B); ctx.strokeStyle = B; ctx.lineWidth = 0.06; ctx.setLineDash([0.12, 0.07]); ctx.beginPath(); ctx.moveTo(0.22, 0.26); ctx.lineTo(0.8, 0.26); ctx.stroke(); ctx.setLineDash([]);
  } else if (kind === 'ride') { // 짝의 머리에 타고 건넌다
    head(-0.05, 0.3, 0.24, A); head(-0.05, -0.14 + bob, 0.24, B); arrow(0.32, 0.36, 0.36, 0);
    ctx.strokeStyle = A; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(-0.5, 0.56); ctx.lineTo(0.8, 0.56); ctx.stroke();
  } else if (kind === 'stack') { head(-0.2, 0.3, 0.26, A); head(-0.2, -0.18 + bob, 0.26, B); arrow(0.45, 0.25, 0, -0.5); }
  else if (kind === 'hold') { head(-0.35, -0.02 + bob * 0.5, 0.24, A); ctx.fillStyle = W; rr(ctx, -0.7, 0.32, 0.7, 0.14, 0.05); ctx.fill(); arrow(0.1, 0.39, 0.42, 0); ctx.strokeStyle = B; ctx.lineWidth = 0.07; ctx.strokeRect(0.56, -0.3, 0.2, 0.7); }
  else if (kind === 'pull') { head(-0.52, 0.25, 0.22, A); head(0.5, -0.22, 0.22, B); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.04; ctx.setLineDash([0.07, 0.06]); ctx.lineDashOffset = -g.t * 0.4; ctx.beginPath(); ctx.moveTo(-0.3, 0.18); ctx.lineTo(0.3, -0.14); ctx.stroke(); ctx.setLineDash([]); arrow(-0.3, 0.42, 0.34, -0.18); }
  else if (kind === 'crank') { ctx.strokeStyle = W; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.arc(-0.38, 0.05, 0.3, 0, TAU); ctx.stroke(); ctx.save(); ctx.translate(-0.38, 0.05); ctx.rotate(g.t * 2); ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(0.3, 0); ctx.moveTo(0, -0.3); ctx.lineTo(0, 0.3); ctx.stroke(); ctx.restore(); head(0.42, 0.1 - ((g.t * 0.5) % 1) * 0.3, 0.2, B); arrow(0.42, 0.5, 0, -0.01); }
  else if (kind === 'dark') { ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, -0.8, -0.56, 1.6, 1.12, 0.1); ctx.fill(); const gl = ctx.createRadialGradient(0.38, 0.1, 0, 0.38, 0.1, 0.5); gl.addColorStop(0, 'rgba(255,255,255,0.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0.38, 0.1, 0.5, 0, TAU); ctx.fill(); head(0.38, 0.14, 0.2, B); ctx.globalAlpha = 0.5; head(-0.42, 0.14, 0.2, A); ctx.globalAlpha = 1; ctx.strokeStyle = W; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.62, -0.28); ctx.quadraticCurveTo(-0.42, -0.46, -0.22, -0.28); ctx.quadraticCurveTo(-0.42, -0.1, -0.62, -0.28); ctx.stroke(); ctx.fillStyle = W; ctx.beginPath(); ctx.arc(-0.42, -0.28, 0.06, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
