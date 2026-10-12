// 별조각: 장마다 셋. 꼭 모을 필요는 없지만, 손이 닿기 어려운 곳에 있어서 그 장의 도구를 한 번 더 궁리해야 한다.
// 별조각도 한쪽 세계에만 있다: 보이는 사람만 집을 수 있고, 짝은 거기까지 데려다줘야 한다.
// cfg: { id, list:[{ x, y, world }] }
import { TAU, rgba } from '../util.js';
import { haptics } from '../game/haptics.js';

export class Stars {
  constructor(cfg) { Object.assign(this, { list: [] }, cfg); this.sent = new Set(); }
  init() { return { got: this.list.map(() => 0) }; }
  solids() {}
  count(g) { return g.pz(this.id).got.filter(Boolean).length; }
  update(g) {
    const st = g.pz(this.id), me = g.me; if (me.state !== 'play') return;
    this.list.forEach((s, i) => {
      if (st.got[i] || this.sent.has(i) || !g.sees(s.world)) return;
      if (Math.abs(me.x - s.x) < 0.75 && me.y + (me.size || 1) > s.y - 0.35 && me.y < s.y + 0.45) { this.sent.add(i); g.act('star', { id: this.id, i }); g.sound('lamp', { x: s.x, rate: 1.3 }); haptics.buzz('success', true); g.fx.burst('spark', s.x, s.y, g.q.sparks(14), { speed: 2.4, color: '#fff3b0', life: 0.8, size: 0.08 }); me.anim.setExpr('wow', 1); }
    });
  }
  host(g, st, from, type, d) { if (type !== 'star' || d.id !== this.id || st.got[d.i]) return false; st.got[d.i] = 1; return true; }
  onFx() {}
  peek(g) { return { got: g.pz(this.id).got.slice() }; }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    const st = g.pz(this.id);
    this.list.forEach((s, i) => {
      if (st.got[i] || !g.sees(s.world)) return;
      const X = s.x, Y = -s.y - Math.sin(g.t * 2 + i * 1.7) * 0.08, r = 0.26, rot = g.t * 0.8 + i;
      const gl = ctx.createRadialGradient(X, Y, 0, X, Y, 0.9); gl.addColorStop(0, rgba('#fff3b0', 0.55)); gl.addColorStop(1, rgba('#fff3b0', 0));
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X, Y, 0.9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff6c8'; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = rot + k * TAU / 10, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    });
  }
}
