// 퍼즐 2 · 함정 복도
// 그림자 세계(2P)에게만 함정이 보인다: 바닥 틈에서 솟는 그림자 불꽃, 바닥을 구르는 그림자 물결.
// 빛의 세계(1P)에게는 바닥의 틈(격자)만 보인다 → 2P가 "지금 가!", "뛰어!" 하고 말해줘야 한다.
// 닿으면 방울을 타고 바로 앞 안전한 자리로 돌아간다. 타이밍은 두 폰의 공유 시계로 맞춘다.
import { TAU, sat, smoothstep, rgba, hash1, lerp } from '../util.js';

export class Vents {
  // cfg: { id, vents:[{x,w,period,on,phase}], wave:{x0,x1,speed,period,h,w} }
  constructor(cfg) { Object.assign(this, { vents: [], wave: null }, cfg); this.flash = -9; this.flashAt = null; }
  init() { return {}; }

  // 불꽃 하나의 지금 상태: 0 쉬는 중, (0..1) 곧 솟는다는 예고, 2 솟아 있음
  ventPhase(v, tc) {
    const u = ((tc + v.phase) % v.period + v.period) % v.period;
    const warn = 0.55;
    if (u < v.on) return { active: true, k: Math.min(1, u / 0.12, (v.on - u) / 0.15) };
    if (u > v.period - warn) return { active: false, warn: (u - (v.period - warn)) / warn };
    return { active: false, warn: 0 };
  }
  // 구르는 물결들의 현재 위치
  waves(tc) {
    const w = this.wave; if (!w) return [];
    const span = w.x1 - w.x0, life = span / w.speed, out = [];
    const n = Math.floor(tc / w.period);
    for (let k = n; k >= n - Math.ceil(life / w.period); k--) {
      const age = tc - k * w.period;
      if (age < 0 || age > life) continue;
      out.push({ x: w.x1 - age * w.speed, age, life });
    }
    return out;
  }

  solids() {}

  update(g, dt) {
    const me = g.me;
    if (this.harmless || me.state !== 'play' || me.safe > 0) return;
    const tc = g.tc;
    for (const v of this.vents) {
      const p = this.ventPhase(v, tc);
      if (p.active && p.k > 0.5 && me.x > v.x + 0.12 && me.x < v.x + v.w - 0.12 && me.y < 2.3 + (v.y || 0)) { this.hit(g, me.x); return; }
    }
    for (const wv of this.waves(tc)) {
      const w = this.wave;
      const edge = Math.min(1, wv.age / 0.3, (wv.life - wv.age) / 0.3);
      if (edge > 0.6 && Math.abs(me.x - wv.x) < w.w / 2 + 0.2 && me.y < w.h - 0.12) { this.hit(g, me.x); return; }
    }
  }
  hit(g, x) {
    this.flash = g.t; this.flashAt = x;
    g.hazard = this.id;
    g.failMe('trap');
  }

  host() { return false; }
  onFx() {}

  draw(g, ctx, layer) {
    const pal = g.pal, tc = g.tc, sees = g.viewRole === 1;
    if (layer === 'back') {
      // 바닥의 틈(격자)은 둘 다 본다: 여기에 뭔가 있다는 것까지만 알 수 있다
      for (const v of this.vents) {
        const y = -(v.y || 0);
        ctx.fillStyle = rgba('#000000', 0.45);
        rr(ctx, v.x + 0.1, y + 0.03, v.w - 0.2, 0.16, 0.08); ctx.fill();
        ctx.strokeStyle = pal.stoneDark; ctx.lineWidth = 0.05;
        ctx.beginPath();
        for (let x = v.x + 0.3; x < v.x + v.w - 0.15; x += 0.28) { ctx.moveTo(x, y + 0.03); ctx.lineTo(x, y + 0.19); }
        ctx.stroke();
      }
      return;
    }
    if (layer !== 'front') return;
    const flashU = (g.t - this.flash) / 0.45;
    for (const v of this.vents) {
      const p = this.ventPhase(v, tc);
      const y = -(v.y || 0);
      let a = 0, h = 0;
      if (p.active) { a = p.k; h = 2.3 * p.k; }
      if (sees) {
        if (p.warn > 0) { // 예고: 틈에서 빛이 차오른다
          const wg = ctx.createLinearGradient(0, y - 0.7 * p.warn, 0, y);
          wg.addColorStop(0, rgba('#ff7ad9', 0)); wg.addColorStop(1, rgba('#ff7ad9', 0.55 * p.warn));
          ctx.fillStyle = wg; ctx.fillRect(v.x + 0.1, y - 0.7 * p.warn, v.w - 0.2, 0.7 * p.warn + 0.05);
          const n = 4;
          for (let i = 0; i < n; i++) {
            const u = (g.t * 1.6 + i / n) % 1, px = v.x + 0.25 + hash1(i + v.x) * (v.w - 0.5);
            ctx.globalAlpha = (1 - u) * p.warn; ctx.fillStyle = '#ffd0f4';
            ctx.beginPath(); ctx.arc(px, y - u * 0.9, 0.04, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        if (a > 0) flame(ctx, v.x, y, v.w, h, a, g.t, v.x);
      } else if (flashU >= 0 && flashU < 1 && this.flashAt != null && this.flashAt > v.x - 0.3 && this.flashAt < v.x + v.w + 0.3) {
        // 빛의 눈에는 안 보이지만, 닿는 순간 잠깐 형체가 비친다
        flame(ctx, v.x, y, v.w, 2.3, (1 - flashU) * 0.55, g.t, v.x);
      }
    }
    const w = this.wave;
    if (w) {
      for (const wv of this.waves(tc)) {
        const edge = sat(Math.min(wv.age / 0.3, (wv.life - wv.age) / 0.3));
        let a = sees ? edge : 0;
        if (!sees && flashU >= 0 && flashU < 1 && this.flashAt != null && Math.abs(this.flashAt - wv.x) < 1.6) a = (1 - flashU) * 0.55;
        if (a <= 0) continue;
        roller(ctx, wv.x, 0, w.w, w.h, a, g.t);
      }
      if (sees) { // 물결이 나오는 구멍
        ctx.fillStyle = rgba('#ff7ad9', 0.18 + 0.1 * Math.sin(g.t * 4));
        ctx.beginPath(); ctx.ellipse(w.x1, -0.35, 0.3, 0.42, 0, 0, TAU); ctx.fill();
      }
    }
  }
}

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// 그림자 불꽃: 흔들리는 여러 갈래의 혀
function flame(ctx, x, y, w, h, a, t, seed) {
  const n = Math.max(3, Math.round(w / 0.42));
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, rgba('#7a2cff', 0)); g.addColorStop(0.35, rgba('#b04cff', 0.75 * a)); g.addColorStop(1, rgba('#ff8ae2', 0.95 * a));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 0.08, y);
  for (let i = 0; i < n; i++) {
    const x0 = x + 0.08 + (w - 0.16) * (i / n), x1 = x + 0.08 + (w - 0.16) * ((i + 1) / n), mx = (x0 + x1) / 2;
    const hh = h * (0.62 + 0.38 * Math.sin(t * 7 + i * 1.9 + seed) * Math.sin(t * 3.1 + i)) * (0.8 + 0.2 * hash1(i + seed));
    const lean = Math.sin(t * 5 + i * 2.3) * 0.12;
    ctx.quadraticCurveTo(x0 + 0.02, y - hh * 0.6, mx + lean, y - hh);
    ctx.quadraticCurveTo(x1 - 0.02, y - hh * 0.6, x1, y);
  }
  ctx.closePath(); ctx.fill();
  // 속불
  ctx.fillStyle = rgba('#ffe3fb', 0.5 * a);
  ctx.beginPath(); ctx.ellipse(x + w / 2, y - 0.1, w * 0.36, Math.min(0.5, h * 0.3), 0, 0, TAU); ctx.fill();
}

// 바닥을 구르는 그림자 물결
function roller(ctx, x, y, w, h, a, t) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, -h * 0.45, 0.05, 0, -h * 0.45, w * 0.95);
  g.addColorStop(0, rgba('#ffd9f7', 0.95 * a)); g.addColorStop(0.45, rgba('#c45cff', 0.8 * a)); g.addColorStop(1, rgba('#5a22c9', 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w * 0.9, 0);
  ctx.quadraticCurveTo(w * 0.5, -h * 0.25, w * 0.25, -h * (0.95 + 0.06 * Math.sin(t * 9)));
  ctx.quadraticCurveTo(-w * 0.35, -h * 1.25, -w * 0.6, -h * 0.55);
  ctx.quadraticCurveTo(-w * 0.72, -h * 0.2, -w * 0.45, -h * 0.28);
  ctx.quadraticCurveTo(-w * 0.2, -h * 0.4, -w * 0.3, 0);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#ffd0f4';
  for (let i = 0; i < 3; i++) { const u = (t * 1.5 + i / 3) % 1; ctx.beginPath(); ctx.arc(w * 0.9 + u * 0.9, -0.1 - u * 0.3 - i * 0.1, 0.045 * (1 - u), 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.globalAlpha = 1;
}
