// 2D 그림: 발판, 먼 풍경, 물, 실, 등불. 좌표는 "세계 단위", 그릴 때 y는 위가 음수(-y).
import { clamp, lerp, mixHex, rgba, hash1, TAU, rng, smoothstep, sat } from '../util.js';

// 두 세계의 색 (k=0 빛의 바다, k=1 그림자 바다). 화면 뒤바뀜 때 섞인다.
const PAL = [
  { rock: '#1f4257', rockDark: '#0f2437', top: '#3d9c8e', topHi: '#a9f7d0', rim: '#8ff3c4', wood: '#6b5560', woodDark: '#3b2f3d', woodHi: '#c9a48f',
    stone: '#31566b', stoneDark: '#162c40', far: '#0e2a3c', far2: '#143a4d', water: '#0a2b40', waterHi: '#7ff2e0', glow: '#bfffe0', warm: '#ffe6a8', thread: '#fff3c4', ink: '#061523' },
  { rock: '#322a63', rockDark: '#1a1440', top: '#7a62c0', topHi: '#e3c4ff', rim: '#d9a6ff', wood: '#574a78', woodDark: '#2c2348', woodHi: '#b79ad8',
    stone: '#463a7a', stoneDark: '#211a4a', far: '#1b1444', far2: '#281d5a', water: '#160f3c', waterHi: '#e59cff', glow: '#e6c2ff', warm: '#ffb3dc', thread: '#ffd9f1', ink: '#0c0720' },
];
const cache = new Map();
export function palette(k) {
  const key = Math.round(sat(k) * 24);
  let p = cache.get(key);
  if (!p) {
    p = {};
    for (const n of Object.keys(PAL[0])) p[n] = mixHex(PAL[0][n], PAL[1][n], key / 24);
    p.k = key / 24;
    p.raw = (n) => (key < 12 ? PAL[0][n] : PAL[1][n]);
    cache.set(key, p);
  }
  return p;
}

// ---------- 발판 ----------
export function drawSolid(ctx, s, pal, t, view) {
  const x = s.x, top = -(s.y + s.h), w = s.w;
  const bottom = Math.min(-s.y, view.waterY + 0.9);
  const h = bottom - top;
  if (s.kind === 'pier') return drawPier(ctx, x, top, w, pal, view);
  if (s.kind === 'none') return;
  const stone = s.kind === 'stone';
  const base = stone ? pal.stone : pal.rock, dark = stone ? pal.stoneDark : pal.rockDark;
  // 앞면
  const g = ctx.createLinearGradient(0, top, 0, top + Math.min(h, 4.2));
  g.addColorStop(0, base); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  const r = stone ? 0.08 : 0.3;
  ctx.beginPath();
  ctx.moveTo(x, top + r);
  ctx.quadraticCurveTo(x, top, x + r, top);
  ctx.lineTo(x + w - r, top);
  ctx.quadraticCurveTo(x + w, top, x + w, top + r);
  if (stone) { ctx.lineTo(x + w, bottom); ctx.lineTo(x, bottom); }
  else { ctx.lineTo(x + w - 0.18, top + h * 0.5); ctx.lineTo(x + w - 0.42, bottom); ctx.lineTo(x + 0.42, bottom); ctx.lineTo(x + 0.18, top + h * 0.5); }
  ctx.closePath(); ctx.fill();

  ctx.save(); ctx.clip();
  if (stone) { // 벽돌 줄눈
    ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let row = 0, y = top + 0.62; y < bottom; y += 0.62, row++) {
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      const x0 = Math.floor(x / 1.3) * 1.3 + (row % 2 ? 0.65 : 0);
      for (let bx = x0; bx < x + w; bx += 1.3) { if (bx > x) { ctx.moveTo(bx, y - 0.62); ctx.lineTo(bx, y); } }
    }
    ctx.stroke();
  } else { // 지층 무늬
    ctx.strokeStyle = rgba('#000000', 0.13); ctx.lineWidth = 0.05;
    for (let i = 0; i < 4; i++) {
      const y = top + 0.75 + i * 0.7 + hash1(x + i) * 0.3;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let xx = x; xx <= x + w + 0.8; xx += 0.8) ctx.lineTo(xx, y + Math.sin(xx * 1.7 + i * 2.1) * 0.08);
      ctx.stroke();
    }
  }
  // 윗면 (2.5D 느낌: 밝은 띠가 살짝 두께를 가진다)
  const th = stone ? 0.2 : 0.3;
  const tg = ctx.createLinearGradient(0, top, 0, top + th);
  tg.addColorStop(0, pal.top); tg.addColorStop(1, rgba('#000000', 0));
  ctx.fillStyle = pal.top; ctx.globalAlpha = 0.9;
  ctx.fillRect(x, top, w, th * 0.55);
  ctx.globalAlpha = 1; ctx.fillStyle = tg; ctx.fillRect(x, top + th * 0.5, w, th);
  if (!stone) { // 이끼가 흘러내린 자국
    ctx.fillStyle = pal.top; ctx.globalAlpha = 0.85;
    for (let xx = Math.ceil(x / 0.55) * 0.55; xx < x + w; xx += 0.55) {
      const d = 0.1 + hash1(xx * 3.1) * 0.24;
      ctx.beginPath(); ctx.ellipse(xx, top + th * 0.5, 0.2, d, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 오로라 빛이 닿는 윗선
  ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.75; ctx.lineWidth = 0.045; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + r, top + 0.02); ctx.lineTo(x + w - r, top + 0.02); ctx.stroke();
  ctx.globalAlpha = 1;
  if (!stone) { // 풀 몇 가닥
    ctx.strokeStyle = pal.topHi; ctx.lineWidth = 0.04; ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let xx = Math.ceil((x + 0.3) / 1.7) * 1.7; xx < x + w - 0.3; xx += 1.7) {
      const sway = Math.sin(t * 1.3 + xx) * 0.05, bx = xx + hash1(xx) * 0.8;
      if (bx > x + w - 0.3) continue;
      ctx.moveTo(bx, top); ctx.quadraticCurveTo(bx + sway, top - 0.16, bx + sway * 2 - 0.05, top - 0.3);
      ctx.moveTo(bx + 0.09, top); ctx.quadraticCurveTo(bx + 0.12 + sway, top - 0.12, bx + 0.2 + sway * 2, top - 0.22);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function drawPier(ctx, x, top, w, pal, view) {
  const wy = view.waterY + 0.6;
  // 기둥
  for (let px = x + 0.5; px < x + w; px += 2.6) {
    const g = ctx.createLinearGradient(0, top, 0, wy);
    g.addColorStop(0, pal.wood); g.addColorStop(1, pal.woodDark);
    ctx.fillStyle = g; ctx.fillRect(px - 0.13, top + 0.2, 0.26, wy - top);
    ctx.strokeStyle = pal.woodDark; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(px, top + 0.5); ctx.lineTo(Math.min(px + 2.6, x + w - 0.3), top + 1.5); ctx.stroke();
  }
  // 상판
  const g = ctx.createLinearGradient(0, top, 0, top + 0.34);
  g.addColorStop(0, pal.woodHi); g.addColorStop(0.3, pal.wood); g.addColorStop(1, pal.woodDark);
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(x - 0.1, top); ctx.lineTo(x + w + 0.1, top); ctx.lineTo(x + w + 0.1, top + 0.34); ctx.lineTo(x - 0.1, top + 0.34); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#000000', 0.25); ctx.lineWidth = 0.03; ctx.beginPath();
  for (let xx = Math.ceil(x / 0.7) * 0.7; xx < x + w; xx += 0.7) { ctx.moveTo(xx, top + 0.03); ctx.lineTo(xx, top + 0.34); }
  ctx.stroke();
  ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.moveTo(x - 0.05, top + 0.02); ctx.lineTo(x + w + 0.05, top + 0.02); ctx.stroke(); ctx.globalAlpha = 1;
}

// ---------- 먼 풍경 (천천히 움직여서 깊이감을 준다) ----------
export function makeDecor(length, seed = 7) {
  const r = rng(seed);
  const d = { far: [], mid: [], near: [], fore: [] };
  for (let x = -30; x < length * 0.16 + 60; x += 9 + r() * 12) d.far.push({ x, w: 2.5 + r() * 4, h: 0.5 + r() * 1.2, s: r() });
  for (let x = -20; x < length * 0.42 + 40; x += 6 + r() * 8) d.mid.push({ x, w: 1.6 + r() * 2.6, h: 2.2 + r() * 4.6, s: r(), arch: r() < 0.22 });
  for (let x = -10; x < length * 0.78 + 30; x += 5 + r() * 7) d.near.push({ x, h: 2.6 + r() * 1.6, s: r(), lamp: r() < 0.75 });
  for (let x = -6; x < length * 1.3 + 30; x += 11 + r() * 12) d.fore.push({ x, s: r(), kind: 'reed' });
  return d;
}

export function drawFar(ctx, view, pal, decor, t, goalX) {
  const { s, W, H } = view;
  const horizonY = H * (1 - view.horizon);
  // 먼 섬들
  let par = 0.16;
  ctx.fillStyle = pal.far;
  for (const o of decor.far) {
    const X = W / 2 + (o.x - view.cx * par) * s * 0.9, w = o.w * s * 0.55, h = o.h * s * 0.5;
    if (X + w < 0 || X - w > W) continue;
    ctx.beginPath(); ctx.moveTo(X - w, horizonY + 1);
    ctx.bezierCurveTo(X - w * 0.6, horizonY - h * (0.6 + o.s * 0.5), X - w * 0.1, horizonY - h * 1.2, X + w * 0.15, horizonY - h * (0.7 + o.s * 0.3));
    ctx.bezierCurveTo(X + w * 0.5, horizonY - h * 0.9, X + w * 0.8, horizonY - h * 0.2, X + w, horizonY + 1);
    ctx.closePath(); ctx.fill();
  }
  // 저 멀리 등대 (가야 할 곳)
  {
    const X = W / 2 + (goalX * 0.16 + 9 - view.cx * par) * s * 0.9, base = horizonY + 2, hh = s * 2.3;
    ctx.fillStyle = pal.far2;
    ctx.beginPath(); ctx.moveTo(X - hh * 0.09, base); ctx.lineTo(X - hh * 0.05, base - hh); ctx.lineTo(X + hh * 0.05, base - hh); ctx.lineTo(X + hh * 0.09, base); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(X, base, hh * 0.5, hh * 0.1, 0, Math.PI, 0); ctx.fill();
    const a = t * 0.5, bx = Math.cos(a), bright = 0.5 + 0.5 * Math.sin(a);
    const g = ctx.createRadialGradient(X, base - hh, 0, X, base - hh, hh * 0.9);
    g.addColorStop(0, rgba('#fff2c8', 0.5 + 0.4 * bright)); g.addColorStop(0.12, rgba('#ffe9a8', 0.18 * bright + 0.05)); g.addColorStop(1, rgba('#ffe9a8', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, base - hh, hh * 0.9, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#fff2c8', 0.1 + 0.06 * bright);
    ctx.beginPath(); ctx.moveTo(X, base - hh); ctx.lineTo(X + bx * hh * 4, base - hh - hh * 0.35); ctx.lineTo(X + bx * hh * 4, base - hh + hh * 0.35); ctx.closePath(); ctx.fill();
  }
  // 바다 위 바위기둥
  par = 0.42;
  for (const o of decor.mid) {
    const X = W / 2 + (o.x - view.cx * par) * s, w = o.w * s * 0.5, h = o.h * s * 0.62;
    if (X + w * 2 < 0 || X - w * 2 > W) continue;
    const base = horizonY + s * (0.5 + o.s * 0.5);
    const lean = (o.s - 0.5) * w * 0.6;
    const g = ctx.createLinearGradient(0, base - h, 0, base);
    g.addColorStop(0, pal.far2); g.addColorStop(1, pal.far);
    ctx.fillStyle = g;
    // 깎아지른 바위섬: 어깨에 턱이 있고 꼭대기는 살짝 기울었다
    ctx.beginPath();
    ctx.moveTo(X - w * 1.25, base);
    ctx.bezierCurveTo(X - w * 1.05, base - h * 0.25, X - w * 0.95 + lean * 0.3, base - h * 0.5, X - w * 0.78 + lean * 0.6, base - h * (0.7 + o.s * 0.12));
    ctx.lineTo(X - w * 0.5 + lean * 0.8, base - h * (0.76 + o.s * 0.1));
    ctx.bezierCurveTo(X - w * 0.42 + lean, base - h * 1.02, X + w * 0.05 + lean, base - h * 1.04, X + w * 0.28 + lean, base - h * 0.94);
    ctx.lineTo(X + w * 0.5 + lean * 0.8, base - h * (0.62 + o.s * 0.2));
    ctx.bezierCurveTo(X + w * 0.8, base - h * 0.5, X + w * 0.95, base - h * 0.2, X + w * 1.2, base);
    ctx.closePath(); ctx.fill();
    // 꼭대기의 풀 더미
    ctx.fillStyle = pal.far2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(X - w * 0.25 + lean + k * w * 0.2, base - h * (1.0 - k * 0.02), w * 0.16, h * 0.035 + s * 0.05, 0, 0, TAU); ctx.fill(); }
    if (o.arch) { // 구멍 뚫린 아치 바위
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.ellipse(X + w * 0.05, base, w * 0.4, h * 0.36, 0, Math.PI, 0); ctx.fill();
      ctx.restore();
    }
    // 오로라 쪽 가장자리 빛
    ctx.strokeStyle = pal.rim; ctx.globalAlpha = 0.3; ctx.lineWidth = Math.max(1, s * 0.035); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X - w * 0.95 + lean * 0.3, base - h * 0.5);
    ctx.lineTo(X - w * 0.78 + lean * 0.6, base - h * (0.7 + o.s * 0.12)); ctx.lineTo(X - w * 0.5 + lean * 0.8, base - h * (0.76 + o.s * 0.1));
    ctx.bezierCurveTo(X - w * 0.42 + lean, base - h * 1.02, X + w * 0.05 + lean, base - h * 1.04, X + w * 0.28 + lean, base - h * 0.94);
    ctx.stroke(); ctx.globalAlpha = 1;
    // 지층 줄무늬
    ctx.strokeStyle = pal.far; ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    for (let k = 1; k <= 3; k++) { const yy = base - h * (0.2 * k + o.s * 0.08); ctx.moveTo(X - w * (1.0 - k * 0.12) + lean * 0.2 * k, yy); ctx.lineTo(X - w * (0.3 - k * 0.05) + lean * 0.2 * k, yy - h * 0.012); }
    ctx.stroke(); ctx.globalAlpha = 1;
    // 물에 닿는 자리의 물안개
    const mg = ctx.createRadialGradient(X, base, 0, X, base, w * 2);
    mg.addColorStop(0, rgba('#bfe9ff', 0.1)); mg.addColorStop(1, rgba('#bfe9ff', 0));
    ctx.fillStyle = mg; ctx.fillRect(X - w * 2, base - w * 0.5, w * 4, w);
  }
}

// 발판 바로 뒤의 기둥·등불 줄
export function drawNear(ctx, view, pal, decor, t) {
  const par = 0.8;
  ctx.save();
  const off = (view.cx * (1 - par));
  ctx.translate(off, 0);
  let prev = null;
  for (const o of decor.near) {
    const x = o.x;
    const sx = x + off;
    const vis = sx > view.left - 8 && sx < view.right + 8;
    const top = -o.h;
    if (vis) {
      ctx.fillStyle = pal.far2;
      ctx.fillRect(x - 0.09, top, 0.18, o.h + 3);
      ctx.beginPath(); ctx.arc(x, top, 0.14, 0, TAU); ctx.fill();
    }
    if (prev && (vis || (prev.x + off > view.left - 8 && prev.x + off < view.right + 8))) {
      // 기둥 사이 늘어진 줄과 작은 등
      const x0 = prev.x, y0 = -prev.h, x1 = x, y1 = top, mx = (x0 + x1) / 2, sag = Math.max(y0, y1) + 0.9;
      ctx.strokeStyle = pal.far2; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, sag, x1, y1); ctx.stroke();
      if (o.lamp) {
        for (const u of [0.3, 0.55, 0.78]) {
          const lx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
          const ly = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * sag + u * u * y1 + 0.12 + Math.sin(t * 1.4 + lx) * 0.02;
          const tw = 0.7 + 0.3 * Math.sin(t * 2.3 + lx * 3.1);
          const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 0.55);
          g.addColorStop(0, rgba('#ffe7b0', 0.5 * tw)); g.addColorStop(1, rgba('#ffe7b0', 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 0.55, 0, TAU); ctx.fill();
          ctx.fillStyle = pal.warm; ctx.beginPath(); ctx.arc(lx, ly, 0.065, 0, TAU); ctx.fill();
        }
      }
    }
    prev = o;
  }
  ctx.restore();
}

// 화면 가장 앞을 스치는 어두운 실루엣 (가까이 있어서 빨리 지나간다)
export function drawFore(ctx, view, pal, decor, t) {
  const par = 1.32;
  ctx.save();
  ctx.translate(view.cx * (1 - par), 0);
  ctx.fillStyle = pal.ink; ctx.strokeStyle = pal.ink;
  const base = view.waterY + 1.4;
  for (const o of decor.fore) {
    const sx = o.x + view.cx * (1 - par);
    if (sx < view.left - 3 || sx > view.right + 3) continue;
    ctx.globalAlpha = 0.86;
    if (o.kind === 'post') {
      const h = 2.6 + o.s * 1.6;
      ctx.fillRect(o.x - 0.24, base - h, 0.48, h + 2);
      ctx.beginPath(); ctx.arc(o.x, base - h, 0.34, 0, TAU); ctx.fill();
      ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(o.x, base - h + 0.5); ctx.quadraticCurveTo(o.x + 2.4, base - h + 1.9, o.x + 5, base + 0.6); ctx.stroke();
    } else {
      ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.globalAlpha = 0.7;
      for (let i = 0; i < 5; i++) {
        const bx = o.x + (i - 2) * 0.22, hh = 0.7 + hash1(o.x + i) * 1.0, sw = Math.sin(t * 0.9 + o.x + i) * 0.14;
        ctx.beginPath(); ctx.moveTo(bx, base + 0.6); ctx.quadraticCurveTo(bx + sw * 0.4, base - hh * 0.6, bx + sw + (i - 2.5) * 0.12, base - hh); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// 발판이 잠기는 가까운 물
export function drawWater(ctx, view, pal, t, front) {
  const y0 = view.waterY, l = view.left - 1, w = view.right - view.left + 2, bottom = view.bottom + 1;
  if (!front) {
    const g = ctx.createLinearGradient(0, y0 - 1.3, 0, y0 + 0.2);
    g.addColorStop(0, rgba('#000000', 0)); g.addColorStop(1, pal.water);
    ctx.fillStyle = g; ctx.globalAlpha = 0.55; ctx.fillRect(l, y0 - 1.3, w, 1.5); ctx.globalAlpha = 1;
    return;
  }
  const g = ctx.createLinearGradient(0, y0, 0, bottom);
  g.addColorStop(0, pal.water); g.addColorStop(1, pal.ink);
  ctx.globalAlpha = 0.82; ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(l, bottom);
  for (let x = l; x <= l + w + 0.5; x += 0.5) ctx.lineTo(x, y0 + Math.sin(x * 1.3 + t * 1.6) * 0.045 + Math.sin(x * 0.47 - t * 1.1) * 0.06);
  ctx.lineTo(l + w, bottom); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  // 물결 위의 빛
  ctx.strokeStyle = pal.waterHi; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
  const x0 = Math.floor(l / 1.9) * 1.9;
  for (let x = x0; x < l + w; x += 1.9) {
    for (let r = 0; r < 2; r++) {
      const hx = x + hash1(x + r * 7.1) * 1.9, hy = y0 + 0.14 + r * 0.32 + hash1(x * 1.7 + r) * 0.2;
      const len = 0.25 + hash1(x * 2.3 + r) * 0.5, a = 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.5 + x * 2.1 + r));
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(hx - len / 2, hy); ctx.lineTo(hx + len / 2, hy); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// 두 고양이를 잇는 빛의 실. 멀어질수록 팽팽해진다.
export function drawThread(ctx, ax, ay, bx, by, pal, t, tension) {
  const mx = (ax + bx) / 2, d = Math.abs(bx - ax);
  const sag = lerp(0.9, 0.05, tension) * Math.min(1, d / 3) + Math.sin(t * 1.7) * 0.03 * (1 - tension);
  const my = (ay + by) / 2 + sag;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.thread;
  ctx.globalAlpha = 0.14 + tension * 0.2; ctx.lineWidth = 0.14;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my + sag, bx, by); ctx.stroke();
  ctx.globalAlpha = 0.55 + tension * 0.4; ctx.lineWidth = 0.032;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my + sag, bx, by); ctx.stroke();
  // 실을 따라 흐르는 빛 구슬
  for (let i = 0; i < 2; i++) {
    const u = ((t * 0.22 + i * 0.5) % 1);
    const px = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx;
    const py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * (my + sag) + u * u * by;
    ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 0.05, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// 체크포인트: 조개 등불. 지나가면 불이 켜진다.
export function drawShellLamp(ctx, x, y, lit, pal, t) {
  const Y = -y;
  ctx.save();
  ctx.translate(x, Y);
  ctx.fillStyle = pal.stoneDark; ctx.fillRect(-0.05, -0.62, 0.1, 0.62);
  const glow = lit * (0.75 + 0.25 * Math.sin(t * 2.4 + x));
  if (lit > 0.01) {
    const g = ctx.createRadialGradient(0, -0.8, 0, 0, -0.8, 1.5);
    g.addColorStop(0, rgba('#ffe9b0', 0.42 * glow)); g.addColorStop(1, rgba('#ffe9b0', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -0.8, 1.5, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = lit > 0.5 ? '#fff1c9' : pal.stone;
  ctx.strokeStyle = lit > 0.5 ? '#ffd58a' : pal.stoneDark; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(-0.22, -0.62); ctx.bezierCurveTo(-0.34, -0.98, 0.34, -0.98, 0.22, -0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); for (const a of [-0.5, 0, 0.5]) { ctx.moveTo(0, -0.63); ctx.lineTo(a * 0.3, -0.86); } ctx.stroke();
  ctx.restore();
}

export function drawFallback(ctx, W, H, pal) { // WebGL이 안 되는 기기용 단색 배경
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#020813'); g.addColorStop(0.6, pal.far); g.addColorStop(1, pal.water);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
