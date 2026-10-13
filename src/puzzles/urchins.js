// 성게: world 쪽 세계에 있어서 그쪽 고양이를 찌른다. 그런데 정작 그 고양이에게는 안 보이고(물빛에 가려), 짝에게만 보인다.
// → 방울을 타고 오르는 사람은 짝의 "왼쪽! 멈춰!"를 듣고 피한다.
// cfg: { id, world, list:[{ x, y, r }] }
import { TAU, rgba } from '../util.js';

export class Urchins {
  constructor(cfg) { Object.assign(this, { list: [] }, cfg); this.flash = -9; this.fx = 0; }
  init() { return {}; }
  solids() {}
  update(g) {
    const me = g.me; if (!g.sees(this.world) || me.state !== 'play' || me.safe > 0) return;
    const cy = me.y + 0.5 * (me.size || 1);
    for (const u of this.list) if (Math.hypot(me.x - u.x, cy - u.y) < (u.r || 0.45) + 0.38) { this.flash = g.t; this.fx = u.x; this.fy = u.y; g.hazard = this.id; g.failMe('trap'); return; }
  }
  host() { return false; }
  onFx() {}
  hazards() { return []; }
  peek() { return { list: this.list }; }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    const own = g.sees(this.world);
    for (const u of this.list) {
      const r = u.r || 0.45, X = u.x, Y = -u.y;
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
