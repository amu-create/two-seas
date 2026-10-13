// 함정: 틈에서 솟는 불꽃(vents)과 바닥을 구르는 물결(wave)
// seenBy: 누구 화면에 보이는가 — 1(그림자 바다, 기본) / 0(빛의 바다) / 'both'(둘 다. 어둠 속 장에서 쓴다)
// 불은 보이는 쪽의 세계에만 있다: 보이는 사람만 데고, 안 보이는 사람은 그냥 지나간다. (격자도 보이는 쪽에만 그린다)
// 타이밍은 두 폰의 공유 시계로 계산한다. 닿으면 방울을 타고 바로 앞 등불로 돌아간다.
import { TAU, sat, rgba, hash1 } from '../util.js';

export const TINT = { // 그림자 바다의 불꽃은 분홍·보라, 빛의 바다의 불꽃은 금빛·민트
  1: ['#7a2cff', '#b04cff', '#ff8ae2', '#ffe3fb', '#ff7ad9', '#ffd0f4'],
  0: ['#18b890', '#4fe0b0', '#ffe9a0', '#fffbe0', '#9dffd8', '#fff3c4'],
};

export class Vents {
  // cfg: { id, seenBy, vents:[{x,w,y,h,period,on,phase}], wave:{x0,x1,speed,period,h,w}, harmless }
  constructor(cfg) { Object.assign(this, { vents: [], wave: null, seenBy: 1 }, cfg); this.flash = -9; this.flashAt = null; }
  init() { return {}; }
  tint(g) { return TINT[this.seenBy === 'both' ? g.viewRole : this.seenBy] || TINT[1]; }
  // 시험용 봇·안개: 이 불이 지금 이 폰에서 보이는가
  visible(g) { return this.fog ? (!g.sees(this.seenBy) && g.lampOn) : g.sees(this.seenBy); }

  ventPhase(v, tc, g) {
    if (g && g.localT) tc = g.localT(this.id + ':' + this.vents.indexOf(v)); // 시간 멈춤에 걸렸으면 이 불만 시계가 멈춘다
    const u = ((tc + v.phase) % v.period + v.period) % v.period;
    const warn = 0.7;
    if (u < v.on) return { active: true, k: Math.min(1, u / 0.12, (v.on - u) / 0.15), activeIn: 0, clearIn: v.on - u };
    return { active: false, warn: u > v.period - warn ? (u - (v.period - warn)) / warn : 0, activeIn: v.period - u, clearIn: 0 };
  }
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
  // 시험용 봇이 쓰는 정보: 지금 위험한 구역들
  hazards(tc, g) { return this.harmless || (g && !g.sees(this.seenBy)) ? [] : this.vents.map((v, i) => { let p = this.ventPhase(v, tc, g); if (!p.active && g && g.isFrozen && g.isFrozen(this.id + ':' + i)) p = { ...p, activeIn: 9 }; return { x0: v.x, x1: v.x + v.w, y0: v.y || 0, y1: (v.y || 0) + (v.h || 2.3), active: p.active, activeIn: p.activeIn, clearIn: p.clearIn }; }); }

  freezables(g) { return this.vents.map((v, i) => ({ key: this.id + ':' + i, x: v.x + v.w / 2, y: (v.y || 0) + 1 })); }
  solids() {}

  update(g) {
    const me = g.me;
    if (this.harmless || me.state !== 'play' || me.safe > 0) return;
    if (!g.sees(this.seenBy)) return; // 내 눈에 안 보이는 불은 내 세계에 없다 → 나는 데지 않는다
    const tc = g.tc;
    for (const v of this.vents) {
      const p = this.ventPhase(v, tc, g), y0 = v.y || 0, h = v.h || 2.3;
      if (p.active && p.k > 0.5 && me.x > v.x + 0.12 && me.x < v.x + v.w - 0.12 && me.y < y0 + h && me.y + 0.9 > y0) { this.hit(g, me.x); return; }
    }
    for (const wv of this.waves(tc)) {
      const w = this.wave;
      const edge = Math.min(1, wv.age / 0.3, (wv.life - wv.age) / 0.3);
      if (edge > 0.6 && Math.abs(me.x - wv.x) < w.w / 2 + 0.2 && me.y < (w.y || 0) + w.h - 0.12 && me.y > (w.y || 0) - 0.5) { this.hit(g, me.x); return; }
    }
  }
  hit(g, x) { this.flash = g.t; this.flashAt = x; g.hazard = this.id; g.failMe('trap'); }
  host() { return false; }
  onFx() {}

  draw(g, ctx, layer) {
    const pal = g.pal, tc = g.tc, sees = g.sees(this.seenBy), T = this.tint(g);
    const fog = this.fog, lit = fog && !sees && g.lampOn; // 안개: 불의 주인은 못 보고, 짝이 등불을 켜야 보인다
    if (layer === 'back') {
      if (!sees && !fog) return; // 안개 구간의 불구멍은 둘 다 보인다 (어디인지는 알지만 언제인지는 모른다)
      for (const v of this.vents) { // 틈(격자)
        const y = -(v.y || 0);
        ctx.fillStyle = rgba('#000000', 0.45);
        rr(ctx, v.x + 0.1, y + 0.03, v.w - 0.2, 0.16, 0.08); ctx.fill();
        ctx.strokeStyle = pal.stoneDark; ctx.lineWidth = 0.05;
        ctx.beginPath();
        for (let x = v.x + 0.3; x < v.x + v.w - 0.15; x += 0.28) { ctx.moveTo(x, y + 0.03); ctx.lineTo(x, y + 0.19); }
        ctx.stroke();
        if (v.y) { ctx.fillStyle = pal.stoneDark; ctx.fillRect(v.x - 0.25, y + 0.05, 0.3, 0.16); ctx.fillRect(v.x + v.w - 0.05, y + 0.05, 0.3, 0.16); } // 공중의 분출구는 벽에 달린 받침
      }
      return;
    }
    if (layer !== 'front') return;
    const flashU = (g.t - this.flash) / 0.45;
    for (const v of this.vents) {
      const p = this.ventPhase(v, tc, g), y = -(v.y || 0), H = v.h || 2.3;
      if (fog && sees) { // 내 불인데 안개에 가려 안 보인다: 닿는 순간만 비친다
        if (flashU >= 0 && flashU < 1 && this.flashAt != null && this.flashAt > v.x - 0.3 && this.flashAt < v.x + v.w + 0.3) flame(ctx, v.x, y, v.w, H, (1 - flashU) * 0.6, g.t, v.x, T);
        continue;
      }
      if (sees || lit) {
        if (lit) ctx.globalAlpha = 0.9;
        if (p.warn > 0) {
          const wg = ctx.createLinearGradient(0, y - 0.7 * p.warn, 0, y);
          wg.addColorStop(0, rgba(T[4], 0)); wg.addColorStop(1, rgba(T[4], 0.55 * p.warn));
          ctx.fillStyle = wg; ctx.fillRect(v.x + 0.1, y - 0.7 * p.warn, v.w - 0.2, 0.7 * p.warn + 0.05);
          for (let i = 0; i < 4; i++) {
            const u = (g.t * 1.6 + i / 4) % 1, px = v.x + 0.25 + hash1(i + v.x) * (v.w - 0.5);
            ctx.globalAlpha = (1 - u) * p.warn; ctx.fillStyle = T[5];
            ctx.beginPath(); ctx.arc(px, y - u * 0.9, 0.04, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        if (p.active) flame(ctx, v.x, y, v.w, H * p.k, p.k, g.t, v.x, T);
        ctx.globalAlpha = 1;
      } else if (flashU >= 0 && flashU < 1 && this.flashAt != null && this.flashAt > v.x - 0.3 && this.flashAt < v.x + v.w + 0.3) {
        flame(ctx, v.x, y, v.w, H, (1 - flashU) * 0.55, g.t, v.x, T); // 안 보이지만, 닿는 순간 잠깐 형체가 비친다
      }
    }
    const w = this.wave;
    if (w) {
      for (const wv of this.waves(tc)) {
        const edge = sat(Math.min(wv.age / 0.3, (wv.life - wv.age) / 0.3));
        let a = sees ? edge : 0;
        if (!sees && flashU >= 0 && flashU < 1 && this.flashAt != null && Math.abs(this.flashAt - wv.x) < 1.6) a = (1 - flashU) * 0.55;
        if (a > 0) roller(ctx, wv.x, -(w.y || 0), w.w, w.h, a, g.t, T);
      }
      if (sees) { ctx.fillStyle = rgba(T[4], 0.18 + 0.1 * Math.sin(g.t * 4)); ctx.beginPath(); ctx.ellipse(w.x1, -(w.y || 0) - 0.35, 0.3, 0.42, 0, 0, TAU); ctx.fill(); }
    }
  }
}

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

export function flame(ctx, x, y, w, h, a, t, seed, T) {
  const n = Math.max(3, Math.round(w / 0.42));
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, rgba(T[0], 0)); g.addColorStop(0.35, rgba(T[1], 0.75 * a)); g.addColorStop(1, rgba(T[2], 0.95 * a));
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
  ctx.fillStyle = rgba(T[3], 0.5 * a);
  ctx.beginPath(); ctx.ellipse(x + w / 2, y - 0.1, w * 0.36, Math.min(0.5, h * 0.3), 0, 0, TAU); ctx.fill();
}

function roller(ctx, x, y, w, h, a, t, T) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, -h * 0.45, 0.05, 0, -h * 0.45, w * 0.95);
  g.addColorStop(0, rgba(T[3], 0.95 * a)); g.addColorStop(0.45, rgba(T[1], 0.8 * a)); g.addColorStop(1, rgba(T[0], 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w * 0.9, 0);
  ctx.quadraticCurveTo(w * 0.5, -h * 0.25, w * 0.25, -h * (0.95 + 0.06 * Math.sin(t * 9)));
  ctx.quadraticCurveTo(-w * 0.35, -h * 1.25, -w * 0.6, -h * 0.55);
  ctx.quadraticCurveTo(-w * 0.72, -h * 0.2, -w * 0.45, -h * 0.28);
  ctx.quadraticCurveTo(-w * 0.2, -h * 0.4, -w * 0.3, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
