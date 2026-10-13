// 시간 멈춤: 멈춤 담당(도구 'freeze')이 단추를 누르면 내 둘레(반지름 R)의 시간이 DUR초 동안 멈춘다.
// 멈추는 것: 불꽃, 떠다니는 발판, 메아리 유령 (어느 세계의 것이든). 구간(zones)마다 쓸 수 있는 횟수가 정해져 있다.
// 멈춘 것은 "자기만의 시계"를 쓴다: 장 시계 − 멈춰 있던 시간. 멈춘 구간 목록은 방장이 정해 두 폰에 똑같이 퍼진다.
// → 불이 꺼진 순간에 멈추면 4초 동안 지나갈 수 있다. 켜진 순간에 멈추면 4초 동안 길이 막힌다 ("지금! 아니 아직!").
// cfg: { id, zones:[{ x0, x1, n }] }
import { TAU, rgba, sat } from '../util.js';
import { haptics } from '../game/haptics.js';

export const FREEZE_R = 2.6, FREEZE_DUR = 4.0;
const r2 = (v) => Math.round(v * 100) / 100;

export class Freeze {
  constructor(cfg) { Object.assign(this, { zones: [] }, cfg); this.isFreezer = true; this.cool = 0; this.emptyT = -9; }
  init() { return { p: {}, c: [], used: this.zones.map(() => 0) }; }
  zoneAt(x) { return this.zones.findIndex((z) => x >= z.x0 && x < z.x1); }
  left(g) { const i = this.zoneAt(g.me.x); return i < 0 ? 0 : this.zones[i].n - (g.pz(this.id).used[i] || 0); }
  localT(g, key) {
    const tc = g.tc, L = g.pz(this.id).p[key]; if (!L) return tc;
    let s = 0; for (const [a, b] of L) if (a < tc) s += Math.min(b, tc) - a;
    return tc - s;
  }
  frozen(g, key) { const tc = g.tc, L = g.pz(this.id).p[key]; return !!L && L.some(([a, b]) => tc >= a && tc < b); }
  solids() {}
  update(g, dt) {
    this.cool = Math.max(0, this.cool - dt);
    const me = g.me;
    if (g.tool !== 'freeze' || !g.inp || !g.inp.toolPressed || this.cool > 0 || me.state !== 'play') return;
    this.cool = 0.5;
    if (this.left(g) <= 0) { this.emptyT = g.t; g.sound('oops', { x: me.x, vol: 0.35, rate: 1.5 }); haptics.buzz('wrong'); return; }
    g.act('freeze', { id: this.id, x: r2(me.x), y: r2(me.y + 0.5) });
    me.anim.setExpr('effort', 0.4);
  }
  host(g, st, from, type, d) {
    if (type !== 'freeze' || d.id !== this.id) return false;
    const x = +d.x, y = +d.y, zi = this.zoneAt(x);
    if (zi < 0 || (st.used[zi] || 0) >= this.zones[zi].n) return false;
    st.used[zi] = (st.used[zi] || 0) + 1;
    const t0 = g.tc, t1 = t0 + FREEZE_DUR; let n = 0;
    for (const p of g.chapter.puzzles) if (p.freezables) for (const f of p.freezables(g)) {
      if (Math.hypot(f.x - x, f.y - y) > FREEZE_R) continue;
      const L = (st.p[f.key] = st.p[f.key] || []), last = L[L.length - 1];
      if (last && last[1] > t0) last[1] = Math.max(last[1], t1); else L.push([r2(t0), r2(t1)]);
      n++;
    }
    st.c.push({ x, y, t0: r2(t0) }); if (st.c.length > 4) st.c.shift();
    g.emitFx('freeze', { id: this.id, x, y, n });
    return true;
  }
  onFx(g, name, d) {
    if (name !== 'freeze' || d.id !== this.id) return;
    g.sound('lamp', { x: d.x, rate: 0.55, vol: 0.9 }); haptics.buzz('open', true);
    g.fx.burst('spark', d.x, d.y, g.q.sparks(18), { speed: 2.4, color: '#dff4ff', life: 0.8, size: 0.08 });
  }
  peek(g) { const st = g.pz(this.id); return { used: st.used.slice(), left: this.left(g), frozen: Object.keys(st.p).filter((k) => this.frozen(g, k)) }; }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    const st = g.pz(this.id), tc = g.tc;
    for (const c of st.c) { // 멈춘 둘레: 서리 낀 유리구슬
      const u = (tc - c.t0) / FREEZE_DUR; if (u < 0 || u > 1) continue;
      const a = Math.min(1, u * 10, (1 - u) * 6), X = c.x, Y = -c.y, R = FREEZE_R * (0.92 + 0.08 * sat(u * 6));
      const gr = ctx.createRadialGradient(X, Y, R * 0.2, X, Y, R);
      gr.addColorStop(0, rgba('#bfe8ff', 0.02)); gr.addColorStop(0.85, rgba('#bfe8ff', 0.12 * a)); gr.addColorStop(1, rgba('#eaf8ff', 0.3 * a));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X, Y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#f2fbff', 0.7 * a); ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.arc(X, Y, R, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - u)); ctx.stroke(); // 남은 시간
      for (let k = 0; k < 6; k++) { // 서리 결정
        const t = k / 6 * TAU, px = X + Math.cos(t) * R, py = Y + Math.sin(t) * R;
        ctx.beginPath(); ctx.moveTo(px - 0.12, py); ctx.lineTo(px + 0.12, py); ctx.moveTo(px, py - 0.12); ctx.lineTo(px, py + 0.12); ctx.stroke();
      }
    }
    if (g.tool === 'freeze' && this.zoneAt(g.me.x) >= 0 && g.me.state === 'play') { // 남은 횟수: 머리 위 작은 모래시계 점
      const n = this.left(g), z = this.zones[this.zoneAt(g.me.x)].n, X = g.me.x, Y = -g.me.y - 1.55;
      const shake = g.t - this.emptyT < 0.4 ? Math.sin(g.t * 60) * 0.05 : 0;
      for (let k = 0; k < z; k++) {
        const x = X + (k - (z - 1) / 2) * 0.24 + shake;
        ctx.fillStyle = k < n ? '#dff4ff' : rgba('#ffffff', 0.18);
        ctx.beginPath(); ctx.moveTo(x, Y - 0.09); ctx.lineTo(x + 0.07, Y); ctx.lineTo(x, Y + 0.09); ctx.lineTo(x - 0.07, Y); ctx.closePath(); ctx.fill();
      }
    }
  }
}
