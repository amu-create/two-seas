// 바늘: 바늘 담당(도구 'needle')이 단추를 누르면
//   · 방울을 타고 있으면 → 방울을 터뜨리며 높이 뛰어오른다 ("지금 터뜨려!")
//   · 아니면 → 앞을 콕 찌른다. 짝의 세계에만 있는 거품벽(짝의 길을 막는다)이 터진다.
//     바늘 담당에게는 거품벽이 안 보인다 → "네 앞 두 칸쯤, 찔러!"
// cfg: { id, world(거품벽이 있는 세계), foams:[{ x, y, w, h }] }
import { TAU, rgba, hash1 } from '../util.js';
import { haptics } from '../game/haptics.js';

export class Needle {
  constructor(cfg) { Object.assign(this, { foams: [] }, cfg); this.foams = this.foams.map((f) => ({ y: 0, w: 0.9, h: 3.2, ...f })); this.pokeT = -9; this.cool = 0; }
  init() { return { popped: this.foams.map(() => 0) }; }
  solids(g, out) { const st = g.pz(this.id); if (!g.sees(this.world)) return; this.foams.forEach((f, i) => { if (!st.popped[i]) out.push({ x: f.x, y: f.y, w: f.w, h: f.h }); }); }
  update(g, dt) {
    this.cool = Math.max(0, this.cool - dt);
    const me = g.me;
    if (g.tool !== 'needle' || !g.inp || !g.inp.toolPressed || this.cool > 0 || me.state !== 'play') return;
    this.cool = 0.3; this.pokeT = g.t;
    const bub = g.chapter.puzzles.find((p) => p.popRiding);
    if (bub && bub.popRiding(g)) { // 방울 터뜨리고 높이 뛰기
      me.vy = 15.5; me.ground = false; me.anim.sq.kick(3); g.sound('pop', { x: me.x, rate: 1.3 }); haptics.buzz('open', true);
      return;
    }
    // 앞뒤 1.7칸 안에서 가장 가까운 거품벽 (보이지 않는 벽이라 방향을 맞추기 어렵다 → 가까운 쪽을 찌른다)
    const st = g.pz(this.id), dir = me.face || 1, near = (f) => Math.max(0, f.x - me.x, me.x - (f.x + f.w)) - (Math.sign(f.x + f.w / 2 - me.x) === dir ? 0.3 : 0);
    let i = -1, best = 1e9;
    this.foams.forEach((f, k) => { if (st.popped[k] || f.x > me.x + 1.7 || f.x + f.w < me.x - 1.7 || me.y + 1 <= f.y || me.y >= f.y + f.h) return; const d = near(f); if (d < best) { best = d; i = k; } });
    if (i >= 0) g.act('foam', { id: this.id, i });
    g.sound('press', { x: me.x, rate: 1.5, vol: 0.5 }); haptics.buzz('tap');
  }
  host(g, st, from, type, d) { if (type !== 'foam' || d.id !== this.id || st.popped[d.i]) return false; st.popped[d.i] = 1; g.emitFx('foamPop', { id: this.id, i: d.i }); return true; }
  onFx(g, name, d) {
    if (name !== 'foamPop' || d.id !== this.id) return;
    const f = this.foams[d.i]; g.sound('dissolve', { x: f.x }); haptics.buzz('open', true);
    g.fx.burst('spark', f.x + f.w / 2, f.y + f.h / 2, g.q.sparks(18), { speed: 2.6, color: '#f4fbff', life: 0.7, size: 0.09, rx: f.w });
  }
  peek(g) { return { popped: g.pz(this.id).popped.slice(), foams: this.foams.map((f) => f.x) }; }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    const st = g.pz(this.id);
    if (g.sees(this.world)) this.foams.forEach((f, i) => { // 거품벽: 동글동글한 거품 덩어리
      if (st.popped[i]) return;
      for (let k = 0; k < 16; k++) {
        const x = f.x + hash1(k + f.x) * f.w, y = -(f.y + hash1(k * 3.7 + f.x) * f.h), r = 0.22 + hash1(k * 1.9) * 0.22 + Math.sin(g.t * 2 + k) * 0.02;
        ctx.fillStyle = rgba('#e9f6ff', 0.55); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgba('#ffffff', 0.8); ctx.lineWidth = 0.025; ctx.stroke();
      }
    });
    // 바늘 찌르기 모습 (둘 다 보인다)
    const u = (g.t - this.pokeT) / 0.25;
    if (u >= 0 && u < 1 && g.tool === 'needle') { const me = g.me, d = me.face || 1, X = me.x + d * (0.45 + Math.sin(u * Math.PI) * 1.0), Y = -me.y - 0.55;
      ctx.strokeStyle = '#f4f8ff'; ctx.lineWidth = 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X - d * 0.5, Y); ctx.lineTo(X, Y); ctx.stroke(); }
  }
}
