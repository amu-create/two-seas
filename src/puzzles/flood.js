// 물이 차오른다: 둘 다 trigger 지점을 지나면 물이 올라오기 시작한다. 잠기면 방울을 타고 탑 밑으로 돌아가고 물도 빠진다.
// cfg: { id, x0, start, speed, when(g) }
import { rgba, sat } from '../util.js';
import { haptics } from '../game/haptics.js';

export class Flood {
  constructor(cfg) { Object.assign(this, { speed: 0.25 }, cfg); this.shown = 0; this.lvl = cfg.start; }
  init() { return { t0: 0 }; }
  level(g) { const st = g.pz(this.id); return st.t0 ? this.start + Math.max(0, g.tc - st.t0) * this.speed : this.start - 3; }
  solids() {}
  update(g, dt) {
    const st = g.pz(this.id), me = g.me;
    if (g.isHost && !st.t0 && !g.W.end && g.bothPast(this.x0) && (!this.when || this.when(g))) { st.t0 = g.tc; g.W.rev++; g._dirty = true; }
    if (g.W.end) { this.lvl += (this.lvl > this.start ? -1 : 0) * dt * 0.6; }
    else this.lvl += (this.level(g) - this.lvl) * Math.min(1, dt * 4);
    if (st.t0 && !this.shown) { this.shown = 1; g.sound('swap', { rate: 0.7 }); haptics.buzz('swap', true); }
    if (!st.t0) this.shown = 0;
    if (!g.W.end && st.t0 && me.state === 'play' && me.safe <= 0 && this.lvl > me.y + 0.55) { g.hazard = this.id; g.failMe('water'); }
  }
  host(g, st, from, type, d) { if (type === 'fell' && d.pz === this.id && st.t0) { st.t0 = 0; return true; } return false; }
  onFx() {}
  peek(g) { return { t0: g.pz(this.id).t0, level: +this.lvl.toFixed(2) }; }
  draw(g, ctx, layer) {
    if (layer !== 'front' || this.lvl < this.start - 2.5) return;
    const v = g.view, y = -this.lvl, l = v.left - 1, r = v.right + 1, b = y + 30;
    const gr = ctx.createLinearGradient(0, y, 0, y + 6); gr.addColorStop(0, rgba('#5fd6ff', 0.55)); gr.addColorStop(1, rgba('#0a2a4a', 0.85));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(l, b);
    for (let x = l; x <= r; x += 0.5) ctx.lineTo(x, y + Math.sin(x * 1.4 + g.t * 2.2) * 0.07 + Math.sin(x * 0.5 - g.t * 1.3) * 0.08);
    ctx.lineTo(r, b); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#e9fbff', 0.6); ctx.lineWidth = 0.05; ctx.beginPath();
    for (let x = l; x <= r; x += 0.5) ctx.lineTo(x, y + Math.sin(x * 1.4 + g.t * 2.2) * 0.07 + Math.sin(x * 0.5 - g.t * 1.3) * 0.08);
    ctx.stroke();
    void sat;
  }
}
