// 등불: 등불 담당(도구 'lantern', holder 쪽)이 늘 등불을 든다. 단추를 누르고 있으면 등불을 높이 든다(그동안은 못 걷는다).
// 어둠 구간(dark)에서 짝(크기 담당)은 등불 빛 안만 보인다. 짝의 세계의 "유리 발판"은 빛이 닿을 때만 단단하다.
// 등불 담당에게는 유리 발판이 늘 흐린 윤곽으로 보인다 → "한 칸 더 오른쪽! 거기서 들어 줘!"
// 빛의 크기는 등불 담당의 몸집을 따른다: 커지면 멀리, 작아지면 가까이 비친다 (크기는 짝이 정한다).
// cfg: { id, holder, plats:[{ x, y, w }] }   ← plats는 holder가 아닌 쪽의 세계에 있다
import { TAU, rgba, sat, clamp } from '../util.js';
import { haptics } from '../game/haptics.js';

export const LANTERN_R = 2.0, LANTERN_UP = 2.0;

export class Lantern {
  constructor(cfg) { Object.assign(this, { holder: 1, plats: [] }, cfg); this.plats = this.plats.map((p) => ({ w: 1.6, ...p })); this.litU = this.plats.map(() => 0); this.wasUp = false; }
  init() { return {}; }
  holderCat(g) { return g.role === this.holder ? g.me : g.other; }
  raised(g) { const h = this.holderCat(g); return !!h.cranking; } // 들고 있는지는 고양이 상태에 실려 짝에게 간다
  light(g) {
    const h = this.holderCat(g), s = h.size || 1, up = this.raised(g) ? LANTERN_UP : 0;
    return { x: h.x + 0.35 * s * (h.face || 1), y: h.y + 1.05 * s + up, r: LANTERN_R * s, present: h.present !== false && h.state === 'play' };
  }
  lit(g, p) { const L = this.light(g); if (!L.present) return false; const cx = clamp(L.x, p.x, p.x + p.w), cy = p.y - 0.15; return Math.hypot(cx - L.x, cy - L.y) < L.r; }
  solids(g, out) {
    if (g.role === this.holder) { // 등불을 높이 든 동안은 걷지 못한다 (내 화면에서만 판정)
      const want = !!(g.inp && g.inp.pull) && g.me.state === 'play' && g.me.ground;
      g.me.cranking = want; if (want) g.steerLock = true;
      return;
    }
    this.plats.forEach((p) => { if (this.lit(g, p)) out.push({ x: p.x, y: p.y - 0.3, w: p.w, h: 0.3 }); });
  }
  update(g, dt) {
    const up = this.raised(g);
    if (up !== this.wasUp) { this.wasUp = up; if (g.role === this.holder) { g.sound(up ? 'lamp' : 'press', { x: g.me.x, vol: 0.45, rate: up ? 1.1 : 0.9 }); haptics.buzz(up ? 'lamp' : 'tap'); } }
    this.plats.forEach((p, i) => { const on = this.lit(g, p); this.litU[i] = clamp(this.litU[i] + (on ? 1 : -1) * dt * 6, 0, 1); });
  }
  host() { return false; }
  onFx() {}
  peek(g) { const L = this.light(g); return { light: { x: +L.x.toFixed(2), y: +L.y.toFixed(2), r: +L.r.toFixed(2) }, up: this.raised(g), lit: this.plats.map((p) => this.lit(g, p)) }; }
  draw(g, ctx, layer) {
    if (layer === 'back') {
      const mine = g.role !== this.holder; // 유리 발판은 크기 담당의 세계에 있다
      for (const [i, p] of this.plats.entries()) {
        const X = p.x, Y = -p.y, u = this.litU[i];
        if (mine) { // 빛이 닿은 만큼만 보인다 (어둠 속이니까)
          if (u <= 0.01) continue;
          ctx.globalAlpha = u; ctx.fillStyle = rgba('#cfefff', 0.55); ctx.fillRect(X, Y, p.w, 0.3);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 0.06, Y, p.w - 0.12, 0.05);
          ctx.strokeStyle = rgba('#e8fbff', 0.8); ctx.lineWidth = 0.03; ctx.strokeRect(X, Y, p.w, 0.3); ctx.globalAlpha = 1;
        } else { // 등불 담당: 짝의 유리 발판이 흐린 윤곽으로 보인다. 빛이 닿으면 반짝
          ctx.setLineDash([0.12, 0.1]); ctx.strokeStyle = rgba('#bfe6ff', 0.35 + 0.45 * u); ctx.lineWidth = 0.04; ctx.strokeRect(X, Y, p.w, 0.3); ctx.setLineDash([]);
          if (u > 0.5) { ctx.fillStyle = rgba('#bfe6ff', 0.18 * u); ctx.fillRect(X, Y, p.w, 0.3); }
        }
      }
      return;
    }
    if (layer !== 'front') return;
    const h = this.holderCat(g); if (!h.present) return;
    const L = this.light(g), s = h.size || 1, up = this.raised(g);
    // 빛무리
    const gr = ctx.createRadialGradient(L.x, -L.y, 0, L.x, -L.y, L.r);
    gr.addColorStop(0, rgba('#ffe2a0', 0.3)); gr.addColorStop(0.6, rgba('#ffd98a', 0.1)); gr.addColorStop(1, rgba('#ffd98a', 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(L.x, -L.y, L.r, 0, TAU); ctx.fill();
    // 손잡이와 등불
    ctx.strokeStyle = rgba('#ffe9c2', 0.8); ctx.lineWidth = 0.04 * s; ctx.beginPath(); ctx.moveTo(h.x + 0.2 * s * (h.face || 1), -(h.y + 0.7 * s)); ctx.lineTo(L.x, -(L.y - 0.18 * s)); ctx.stroke();
    ctx.fillStyle = '#3a2a48'; ctx.fillRect(L.x - 0.13 * s, -L.y - 0.24 * s, 0.26 * s, 0.06 * s);
    const fl = 0.85 + 0.15 * Math.sin(g.t * 9) * Math.sin(g.t * 5.3);
    ctx.fillStyle = rgba('#ffe7a8', fl); ctx.beginPath(); ctx.ellipse(L.x, -L.y, 0.12 * s, 0.17 * s, 0, 0, TAU); ctx.fill();
    if (up) { ctx.strokeStyle = rgba('#ffe7a8', 0.5); ctx.lineWidth = 0.03; ctx.beginPath(); ctx.arc(L.x, -L.y, L.r * (0.96 + 0.04 * Math.sin(g.t * 4)), 0, TAU); ctx.stroke(); }
    void sat;
  }
}
