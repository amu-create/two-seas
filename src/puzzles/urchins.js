// 성게: world 쪽 세계에 있어서 그쪽 고양이를 찌른다. 그런데 정작 그 고양이에게는 안 보이고(물빛에 가려), 짝에게만 보인다.
// → 방울을 타고 오르는 사람은 짝의 "왼쪽! 멈춰!"를 듣고 피한다.
// cfg: { id, world, list:[{ x, y, r }] }
import { TAU, rgba, sat } from '../util.js';
import { haptics } from '../game/haptics.js';

const R = 0.36, PAD = 0.3; // 가시 반지름, 고양이 몸 여유 (말로 부르고 피할 수 있게 넉넉히)

export class Urchins {
  constructor(cfg) { Object.assign(this, { list: [] }, cfg); this.flash = -9; this.fx = 0; }
  init() { return {}; }
  solids() {}
  update(g) {
    const me = g.me; if (!g.sees(this.world) || me.state !== 'play' || me.safe > 0) return;
    const cy = me.y + 0.5 * (me.size || 1);
    let near = 9;
    for (const u of this.list) {
      const d = Math.hypot(me.x - u.x, cy - u.y) - ((u.r || R) + PAD);
      if (d < 0) { this.flash = g.t; this.fx = u.x; this.fy = u.y; g.hazard = this.id; g.failMe('trap'); return; }
      near = Math.min(near, d);
    }
    // 안 보이는 가시가 가까우면 몸이 떨리고 폰이 두근거린다 (어느 쪽인지는 모른다 → 방향은 짝이 불러 준다)
    this.near = near;
    if (near < 1.3 && g.t - (this.beat || 0) > 0.16 + near * 0.4) { this.beat = g.t; haptics.buzz('step', true); }
  }
  host() { return false; }
  onFx() {}
  hazards() { return []; }
  peek() { return { list: this.list }; }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    const own = g.sees(this.world);
    if (own && this.near < 1.3 && g.me.state === 'play') { // 떨림: 내 고양이 둘레의 가는 물결 (방향 없음)
      const k = sat(1 - this.near / 1.3), me = g.me, cx = me.x, cy = -(me.y + 0.5);
      ctx.strokeStyle = rgba('#ff9fd8', 0.15 + k * 0.45); ctx.lineWidth = 0.035;
      for (let i = 0; i < 2; i++) { const w = (g.t * (1.5 + k * 2) + i * 0.5) % 1; ctx.globalAlpha = 1 - w; ctx.beginPath(); ctx.arc(cx, cy, 0.55 + w * 0.5, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    for (const u of this.list) {
      const r = u.r || R, X = u.x, Y = -u.y;
      let a = own ? 0 : 1;
      if (own && g.t - this.flash < 0.6 && u.x === this.fx && u.y === this.fy) a = 1 - (g.t - this.flash) / 0.6; // 찔린 순간만 보인다
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, r * 2.2); gr.addColorStop(0, rgba('#ff7ad9', 0.45)); gr.addColorStop(1, rgba('#ff7ad9', 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X, Y, r * 2.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb3ec'; ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k < 14; k++) { const t = k / 14 * TAU + g.t * 0.3; ctx.moveTo(X + Math.cos(t) * r * 0.6, Y + Math.sin(t) * r * 0.6); ctx.lineTo(X + Math.cos(t) * r * 1.35, Y + Math.sin(t) * r * 1.35); }
      ctx.stroke();
      ctx.fillStyle = '#7a2c8f'; ctx.beginPath(); ctx.arc(X, Y, r * 0.65, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
