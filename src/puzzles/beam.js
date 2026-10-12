// 빛줄기와 거울: 등불에서 나온 빛줄기와 그것을 막는 수정 덩어리, 과녁은 "보는 사람(world)"의 세계에만 있다.
// 거울을 돌리는 받침돌은 짝만 쓸 수 있다. 거울은 둘 다 보인다.
// 빛줄기는 아랫길/윗길 두 줄로 흐른다. 기둥마다 아래·위 거울이 있고, 받침돌을 누를 때마다 [없음 → / → \ → 없음]으로 바뀐다.
//   / : 오른쪽→위, 위→오른쪽     \ : 오른쪽→아래, 아래→오른쪽
// 거울을 돌릴 수 있는 횟수는 정해져 있다(눈금). 다 쓰면 거울이 전부 원래대로 돌아가고 수정의 자리가 바뀐다 → 보고 말하고 계획해야 한다.
// cfg: { id, world, x0, y, cols:[x...], targetX, door:{x,w,h}, low, high, spare }
import { TAU, rgba, rng, sat, roundRect } from '../util.js';
import { haptics } from '../game/haptics.js';

export class Beam {
  constructor(cfg) { Object.assign(this, { y: 0, low: 1.0, high: 3.4, spare: 4 }, cfg); this._seed = null; this.sink = []; }
  init() { return { seed: Math.floor(Math.random() * 1e6) + 1, m: this.cols.flatMap(() => [0, 0]), used: 0, open: 0 }; }
  // 판마다: 구간마다 막힌 줄, 과녁의 줄, 풀이, 눈금
  plan(seed) {
    if (this._seed === seed) return this._plan;
    const r = rng(seed * 7717 + 3), n = this.cols.length, block = [];
    for (let i = 0; i < n; i++) block.push(r() < 0.5 ? 0 : 1);
    const target = 1 - block[n - 1];
    let lane = 0, need = 0; const sol = [];
    for (let i = 0; i < n; i++) { const out = 1 - block[i]; if (out === lane) sol.push([0, 0]); else if (out === 1) { sol.push([1, 1]); need += 2; } else { sol.push([2, 2]); need += 4; } lane = out; }
    if (need === 0) { block[0] = 0; return (this._seed = null, this.plan(seed + 1)); } // 거울을 하나도 안 써도 되는 판은 건너뛴다
    this._plan = { block, target, sol, budget: need + this.spare }; this._seed = seed;
    return this._plan;
  }
  laneY(l) { return this.y + (l ? this.high : this.low); }
  // 빛줄기 따라가기: [[x,y],...]와 과녁에 닿았는가
  trace(st) {
    const P = this.plan(st.seed), pts = [[this.x0 + 0.4, this.laneY(0)]];
    let lane = 0;
    for (let i = 0; i < this.cols.length; i++) {
      const cx = this.cols[i], m = st.m[i * 2 + lane];
      if (m) {
        pts.push([cx, this.laneY(lane)]);
        const up = lane === 0 ? m === 1 : m === 2 ? false : null; // 아랫길: / 이면 위로, \ 이면 아래(땅)로
        if (lane === 0 && m === 2) { pts.push([cx, this.y + 0.15]); return { pts, hit: false, end: 'ground' }; }
        if (lane === 1 && m === 1) { pts.push([cx, this.y + this.high + 2.4]); return { pts, hit: false, end: 'sky' }; }
        const nl = 1 - lane, m2 = st.m[i * 2 + nl];
        // 위로 간 빛은 윗거울 / 를 만나야 다시 오른쪽으로, 아래로 간 빛은 아랫거울 \ 를 만나야 오른쪽으로
        if ((nl === 1 && m2 === 1) || (nl === 0 && m2 === 2)) { lane = nl; pts.push([cx, this.laneY(lane)]); }
        else { pts.push([cx, nl === 1 ? this.y + this.high + 2.4 : this.y + 0.15]); return { pts, hit: false }; }
        void up;
      }
      if (P.block[i] === lane) { pts.push([(cx + (this.cols[i + 1] ?? this.targetX)) / 2 - 0.35, this.laneY(lane)]); return { pts, hit: false, blocked: i }; }
    }
    pts.push([this.targetX, this.laneY(lane)]);
    return { pts, hit: lane === P.target };
  }
  slots() { return this.cols.flatMap((x) => [{ x: x - 0.6, lane: 0 }, { x: x + 0.6, lane: 1 }]); } // 받침돌: 기둥 왼쪽 = 아래 거울, 오른쪽 = 위 거울
  mySlot(g) { const me = g.me; if (!me.ground || me.state !== 'play' || Math.abs(me.y - this.y) > 0.2) return -1; return this.slots().findIndex((s) => Math.abs(me.x - s.x) < 0.38); }
  canAct(g) { const st = g.pz(this.id); return !st.open && !g.sees(this.world) && this.mySlot(g) >= 0; }
  act(g) { const i = this.mySlot(g); if (i < 0) return; g.act('beam', { id: this.id, i }); g.sound('dial', { x: g.me.x }); haptics.buzz('key'); }
  solids(g, out) { const st = g.pz(this.id), d = this.door; if (!(st.open && g.tc - st.open > 0.8)) out.push({ x: d.x, y: this.y, w: d.w, h: d.h }); }
  update(g, dt) {
    const st = g.pz(this.id);
    if (st.open && !this._opened) { this._opened = true; g.sound('gate', { x: this.door.x }); }
  }
  host(g, st, from, type, d) {
    if (type !== 'beam' || d.id !== this.id || st.open) return false;
    const P = this.plan(st.seed);
    st.m[d.i] = (st.m[d.i] + 1) % 3; st.used++;
    if (this.trace(st).hit) { st.open = g.tc; g.emitFx('beamOk', { id: this.id }); return true; }
    if (st.used >= P.budget) { st.m = st.m.map(() => 0); st.used = 0; st.seed++; g.emitFx('beamReset', { id: this.id }); }
    return true;
  }
  onFx(g, name, d) {
    if (d.id !== this.id) return;
    if (name === 'beamReset') { this.resetT = g.t; g.sound('wrong', { x: this.x0 }); haptics.buzz('wrong'); }
    if (name === 'beamOk') { this.okT = g.t; haptics.buzz('success', true); }
  }
  peek(g) { const st = g.pz(this.id), P = this.plan(st.seed); return { m: st.m.slice(), used: st.used, budget: P.budget, sol: P.sol, open: st.open, slots: this.slots().map((s) => s.x), hit: this.trace(st).hit }; }
  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const st = g.pz(this.id), P = this.plan(st.seed), pal = g.pal, sees = g.sees(this.world), Y = -this.y;
    // 기둥과 거울 (둘 다 보인다)
    this.cols.forEach((cx, i) => {
      ctx.fillStyle = pal.stoneDark; ctx.fillRect(cx - 0.08, -this.laneY(1) - 0.6, 0.16, this.high + 0.6);
      for (const lane of [0, 1]) {
        const m = st.m[i * 2 + lane], yy = -this.laneY(lane);
        ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(cx, yy, 0.42, 0, TAU); ctx.stroke();
        if (m) { const s = m === 1 ? 1 : -1; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 0.3, yy + 0.3 * s); ctx.lineTo(cx + 0.3, yy - 0.3 * s); ctx.stroke(); ctx.strokeStyle = rgba('#9fe3ff', 0.6); ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(cx - 0.22, yy + 0.3 * s - 0.06); ctx.lineTo(cx + 0.22, yy - 0.3 * s - 0.06); ctx.stroke(); }
      }
    });
    // 받침돌 (돌리는 사람에게만 또렷이): 위 거울용에는 작은 위쪽 화살표
    this.slots().forEach((s, j) => {
      const a = sees ? 0.35 : 1;
      ctx.globalAlpha = a; ctx.fillStyle = pal.stoneDark; roundRect(ctx, s.x - 0.36, Y - 0.06, 0.72, 0.14, 0.05); ctx.fill();
      ctx.fillStyle = pal.top; roundRect(ctx, s.x - 0.28, Y - 0.18, 0.56, 0.16, 0.06); ctx.fill();
      ctx.fillStyle = pal.warm; ctx.beginPath();
      if (s.lane) { ctx.moveTo(s.x, Y - 0.5); ctx.lineTo(s.x - 0.12, Y - 0.32); ctx.lineTo(s.x + 0.12, Y - 0.32); } else { ctx.arc(s.x, Y - 0.38, 0.07, 0, TAU); }
      ctx.fill(); ctx.globalAlpha = 1;
    });
    // 눈금: 남은 거울 돌리기 횟수 (둘 다 보인다)
    const left = Math.max(0, P.budget - st.used), ex = this.x0, ey = -this.laneY(1) - 1.1;
    for (let k = 0; k < P.budget; k++) { ctx.fillStyle = k < left ? '#ffe2a0' : rgba('#ffffff', 0.18); ctx.beginPath(); ctx.arc(ex - 0.6 + k * 0.26, ey, 0.08, 0, TAU); ctx.fill(); }
    const ru = (g.t - (this.resetT || -9)) / 0.8; if (ru >= 0 && ru < 1) { ctx.globalAlpha = 1 - ru; ctx.strokeStyle = '#ff9fb6'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(ex, ey, 0.4 + ru * 1.4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    // 등불 (둘 다 보인다)
    ctx.fillStyle = pal.woodDark; ctx.fillRect(this.x0 - 0.08, -this.laneY(0), 0.16, this.low);
    ctx.fillStyle = '#ffe9b8'; ctx.beginPath(); ctx.ellipse(this.x0, -this.laneY(0), 0.22, 0.28, 0, 0, TAU); ctx.fill();
    // 문 (둘 다)
    const d = this.door, ou = st.open ? sat((g.tc - st.open) / 1.2) : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(d.x - 1, Y - d.h - 1, d.w + 2, d.h + 1); ctx.clip();
    ctx.fillStyle = pal.stone; roundRect(ctx, d.x, Y - d.h + ou * (d.h + 0.2), d.w, d.h + 0.2, 0.16); ctx.fill(); ctx.restore();
    ctx.fillStyle = pal.stoneDark; ctx.fillRect(d.x - 0.3, Y - d.h - 0.7, d.w + 0.6, 0.7);
    if (!sees) return;
    // ---- 여기부터는 보는 사람의 세계에만: 수정 덩어리, 과녁, 빛줄기 ----
    this.cols.forEach((cx, i) => {
      const nx = this.cols[i + 1] ?? this.targetX, mx = (cx + nx) / 2, yy = -this.laneY(P.block[i]);
      const gr = ctx.createRadialGradient(mx, yy, 0, mx, yy, 0.8); gr.addColorStop(0, rgba('#c9a0ff', 0.75)); gr.addColorStop(1, rgba('#c9a0ff', 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(mx, yy, 0.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.moveTo(mx, yy - 0.5); ctx.lineTo(mx + 0.3, yy); ctx.lineTo(mx, yy + 0.5); ctx.lineTo(mx - 0.3, yy); ctx.closePath(); ctx.fill();
    });
    const ty = -this.laneY(P.target), hit = !!st.open;
    ctx.strokeStyle = hit ? '#fff3b0' : rgba('#fff3b0', 0.7); ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(this.targetX, ty, 0.36 + Math.sin(g.t * 3) * 0.03, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(this.targetX, ty, 0.12, 0, TAU); ctx.fill();
    const tr = this.trace(st);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, c] of [[0.34, rgba('#ffe9a0', 0.25)], [0.1, '#fffbe6']]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); tr.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, -y) : ctx.moveTo(x, -y))); ctx.stroke();
    }
  }
}
