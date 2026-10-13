// 사진: 사진 담당(도구 'photo')이 단추를 누르면 가까이 있는 "내 세계의 것"을 찍는다. 찍은 것은 짝의 세계에 그대로 생긴다.
// 찍을 수 있는 것: 이 퍼즐의 물건들(items: 다리·기둥, 사진 담당의 세계에만 있다)과, 짝이 내 세계에 그어 준 선(Ink).
// 사진은 한 장뿐: 새로 찍으면 먼저 붙인 것은 사라진다. → "그 다리 찍어 줘!" "잠깐, 나 아직 건너는 중이야!"
// cfg: { id, world(물건이 있는 세계 = 사진 담당의 세계), items:[{ x, y(윗면), w, h }], ink(선 퍼즐 id) }
import { TAU, rgba, sat, roundRect } from '../util.js';
import { haptics } from '../game/haptics.js';
import { Ink } from './ink.js';

const REACH = 3.2;

export class Photo {
  constructor(cfg) { Object.assign(this, { world: 0, items: [], ink: null }, cfg); this.items = this.items.map((it) => ({ h: 0.32, ...it })); this.cool = 0; this.flashT = -9; this.missT = -9; }
  init() { return { c: null, n: 0 }; }
  // 지금 찍을 수 있는 것 중 가장 가까운 것
  target(g) {
    const me = g.me, cands = [];
    this.items.forEach((it, i) => cands.push({ kind: 'item', i, x0: it.x, x1: it.x + it.w, y: it.y }));
    const I = this.ink && g.chapter.puzzles.find((p) => p.id === this.ink);
    if (I) for (const s of g.pz(I.id).s) if (I.alive(g, s)) { const xs = s.pts.map((p) => p[0]); cands.push({ kind: 'ink', n: s.n, pts: s.pts, x0: Math.min(...xs), x1: Math.max(...xs), y: s.pts[0][1] }); }
    let best = null, bd = 1e9;
    for (const c of cands) { const dx = Math.max(0, c.x0 - me.x, me.x - c.x1), dy = Math.abs(c.y - me.y); const d = dx + dy * 0.5; if (dx < REACH && dy < 4 && d < bd) { bd = d; best = c; } }
    return best;
  }
  shape(g, c) { // 붙인 사진의 모양(고체 목록)
    if (!c) return [];
    if (c.kind === 'item') { const it = this.items[c.i]; return [{ x: it.x, y: it.y - it.h, w: it.w, h: it.h }]; }
    const out = []; Ink.segs(c.pts, out, 'photo'); return out;
  }
  solids(g, out) {
    if (g.sees(this.world)) { for (const it of this.items) out.push({ x: it.x, y: it.y - it.h, w: it.w, h: it.h }); return; }
    for (const s of this.shape(g, g.pz(this.id).c)) out.push(s); // 짝의 세계: 붙인 사진
  }
  update(g, dt) {
    this.cool = Math.max(0, this.cool - dt);
    const me = g.me;
    if (g.tool !== 'photo' || !g.inp || !g.inp.toolPressed || this.cool > 0 || me.state !== 'play') return;
    this.cool = 0.6;
    const t = this.target(g);
    if (!t) { this.missT = g.t; g.sound('oops', { x: me.x, vol: 0.3, rate: 1.6 }); haptics.buzz('wrong'); return; }
    g.act('photo', t.kind === 'item' ? { id: this.id, kind: 'item', i: t.i } : { id: this.id, kind: 'ink', pts: t.pts });
  }
  host(g, st, from, type, d) {
    if (type !== 'photo' || d.id !== this.id) return false;
    if (d.kind === 'item' && this.items[d.i]) st.c = { kind: 'item', i: +d.i, n: ++st.n };
    else if (d.kind === 'ink' && Array.isArray(d.pts)) st.c = { kind: 'ink', pts: d.pts.slice(0, 40).map((p) => [+p[0], +p[1]]), n: ++st.n };
    else return false;
    st.c.t0 = g.tc;
    g.emitFx('photo', { id: this.id });
    return true;
  }
  onFx(g, name, d) { if (name !== 'photo' || d.id !== this.id) return; this.flashT = g.t; g.sound('panel', { rate: 1.3, vol: 0.8 }); haptics.buzz('open', true); }
  peek(g) { const c = g.pz(this.id).c, t = this.target(g); return { copy: c ? (c.kind === 'item' ? 'item' + c.i : 'ink') : null, target: t ? (t.kind === 'item' ? 'item' + t.i : 'ink') : null }; }
  slab(g, ctx, x, y, w, h, alpha, frame) {
    const pal = g.pal, Y = -y;
    ctx.globalAlpha = alpha;
    const gr = ctx.createLinearGradient(0, Y, 0, Y + h); gr.addColorStop(0, pal.stone); gr.addColorStop(1, pal.stoneDark);
    ctx.fillStyle = gr; roundRect(ctx, x, Y, w, h, Math.min(0.12, h / 2)); ctx.fill();
    ctx.fillStyle = pal.top; roundRect(ctx, x - 0.05, Y - 0.06, w + 0.1, 0.14, 0.06); ctx.fill();
    if (frame) { ctx.strokeStyle = rgba('#ffffff', 0.85); ctx.lineWidth = 0.06; ctx.setLineDash([0.22, 0.1]); ctx.strokeRect(x - 0.12, Y - 0.16, w + 0.24, h + 0.28); ctx.setLineDash([]); }
    ctx.globalAlpha = 1;
  }
  draw(g, ctx, layer) {
    const st = g.pz(this.id), mine = g.sees(this.world);
    if (layer === 'back') {
      if (mine) for (const it of this.items) this.slab(g, ctx, it.x, it.y, it.w, it.h, 1, false);
      const c = st.c;
      if (c && c.kind === 'item') { const it = this.items[c.i]; this.slab(g, ctx, it.x, it.y, it.w, it.h, mine ? 0.25 : sat((g.tc - c.t0) / 0.3), true); } // 붙인 사진: 하얀 테두리
      return;
    }
    if (layer !== 'front') return;
    const c = st.c;
    if (c && c.kind === 'ink') { const a = mine ? 0.3 : sat((g.tc - c.t0) / 0.3); Ink.drawLine(ctx, c.pts, rgba('#ffffff', 0.9), 0.3, a * 0.5); Ink.drawLine(ctx, c.pts, '#fff6e6', 0.1, a); }
    if (g.tool === 'photo' && g.me.state === 'play') { // 찍을 수 있는 것: 네 귀퉁이 틀
      const t = this.target(g);
      if (t) {
        const x0 = t.x0 - 0.2, x1 = t.x1 + 0.2, y0 = -t.y - 0.6, y1 = -t.y + 0.5, k = 0.3, a = 0.45 + 0.25 * Math.sin(g.t * 4);
        ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 0.05; ctx.beginPath();
        for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { ctx.moveTo(x, y + sy * k); ctx.lineTo(x, y); ctx.lineTo(x + sx * k, y); }
        ctx.stroke();
      }
    }
    const f = (g.t - this.flashT) / 0.5; // 찰칵: 화면 전체가 하얗게 번쩍
    if (f >= 0 && f < 1) { const v = g.view; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba('#ffffff', 0.35 * (1 - f)); ctx.fillRect(0, 0, v.W, v.H); ctx.restore(); }
    void TAU;
  }
}
