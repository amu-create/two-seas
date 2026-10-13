// 무너지는 길(탈출): 둘 다 trigger를 지나면 뒤에서부터 발판이 하나씩 무너진다. 무너짐은 초당 speed칸으로 쫓아온다.
// 누가 떨어지면 길이 다시 붙는다(처음부터 다시). 두 세계 모두에 있다.
// cfg: { id, trigger, y, tiles:[[x0,x1],...], delay, speed }
import { rgba, sat, hash1 } from '../util.js';
import { haptics } from '../game/haptics.js';

export class Crumble {
  constructor(cfg) { Object.assign(this, { y: 0, delay: 3, speed: 1.2 }, cfg); this.start = Math.min(...this.tiles.map((t) => t[0])); this.shown = 0; this.lastFall = -1; }
  init() { return { t0: 0 }; }
  fallAt(st, t) { return st.t0 + this.delay + (t[0] - this.start) / this.speed; }  // 이 발판이 무너지는 시각
  solids(g, out) { const st = g.pz(this.id), tc = g.tc; for (const t of this.tiles) if (!st.t0 || tc < this.fallAt(st, t)) out.push({ x: t[0], y: this.y - 0.9, w: t[1] - t[0], h: 0.9 }); }
  update(g) {
    const st = g.pz(this.id);
    if (g.isHost && !st.t0 && !g.W.end && g.bothPast(this.trigger)) { st.t0 = g.tc; g.W.rev++; g._dirty = true; }
    if (st.t0 && !this.shown) { this.shown = 1; g.sound('swap', { rate: 0.6 }); haptics.buzz('swap', true); }
    if (!st.t0) { this.shown = 0; this.lastFall = -1; return; }
    const k = this.tiles.findIndex((t) => g.tc < this.fallAt(st, t)) ; const fallen = k < 0 ? this.tiles.length : k;
    if (fallen > this.lastFall + 1 && this.lastFall >= -1 && fallen > 0) { const t = this.tiles[fallen - 1]; g.sound('dissolve', { x: (t[0] + t[1]) / 2, vol: 0.6, rate: 0.8 }); if (Math.abs(g.me.x - t[1]) < 6) haptics.buzz('thud'); }
    this.lastFall = fallen - 1;
  }
  host(g, st, from, type, d) { if (type === 'fell' && st.t0) { st.t0 = 0; return true; } return false; }
  onFx() {}
  peek(g) { const st = g.pz(this.id); return { t0: st.t0, edge: st.t0 ? +(this.start + Math.max(0, g.tc - st.t0 - this.delay) * this.speed).toFixed(2) : null }; }
  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const st = g.pz(this.id), tc = g.tc, pal = g.pal;
    for (const [i, t] of this.tiles.entries()) {
      const at = st.t0 ? this.fallAt(st, t) : Infinity, left = at - tc;
      const drop = left < 0 ? -left : 0; if (drop > 1.6) continue;
      const shake = left > 0 && left < 1.2 ? Math.sin(tc * 40 + i) * 0.04 * (1 - left / 1.2) : 0;
      const X = t[0] + shake, Y = -this.y + drop * drop * 4, w = t[1] - t[0];
      ctx.globalAlpha = 1 - sat(drop / 1.6);
      ctx.fillStyle = pal.stoneDark; ctx.fillRect(X + 0.04, Y, w - 0.08, 0.9);
      ctx.fillStyle = pal.top; ctx.fillRect(X, Y - 0.04, w, 0.14);
      ctx.strokeStyle = rgba('#000000', 0.3); ctx.lineWidth = 0.03; ctx.beginPath();
      for (let k = 0; k < 3; k++) { const cx = X + w * hash1(i * 7 + k); ctx.moveTo(cx, Y + 0.1); ctx.lineTo(cx + 0.15, Y + 0.45); ctx.lineTo(cx - 0.05, Y + 0.85); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
}
