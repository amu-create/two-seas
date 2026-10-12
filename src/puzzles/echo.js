// 메아리: 도구 단추를 누르면 내 움직임이 녹화되고(최대 6초, 다시 누르면 끝), 그 움직임을 되풀이하는 유령이 "짝의 세계"에 나타난다.
// 유령은 짝의 세계에서 실제로 있다: 머리를 밟고 올라탈 수 있고(타고 있으면 실려 간다), 짝의 세계의 누름돌을 누른다.
// → 내 세계에만 있는 다리를 내가 걸으면, 그 메아리가 짝에게는 허공을 건너는 탈것이 된다.
// → 짝의 세계에 돌이 둘인데 고양이는 하나: 내 메아리를 세워 둔다 ("세 걸음 더… 거기서 멈춰").
// 유령의 위치는 (녹화한 점들, 시작 시각)만으로 정해지므로 두 폰에서 똑같이 움직인다.
import { TAU, lerp, sat, rgba } from '../util.js';
import { CatAnim, drawCat, LOOKS } from '../render/cat.js';
import { haptics } from '../game/haptics.js';

const STEP = 0.1, MAXT = 6, HOLD = 1.2;

export class Echo {
  constructor(cfg) { Object.assign(this, {}, cfg); this.rec = null; this.anims = [new CatAnim(3), new CatAnim(4)]; this.last = [null, null]; this.prevHead = null; this.onHead = false; }
  init() { return { g: [null, null] }; }
  ghost(g, role) { // 지금 유령의 자리
    const G = g.pz(this.id).g[role]; if (!G || G.p.length < 2) return null;
    const dur = (G.p.length - 1) * STEP, cyc = dur + HOLD, tt = g.tc - G.t0; if (tt < 0) return null;
    const u = tt % cyc, k = Math.min(u, dur) / STEP, i = Math.min(G.p.length - 2, Math.floor(k)), f = Math.min(1, k - i);
    const a = G.p[i], b = G.p[i + 1];
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), vx: u < dur ? (b[0] - a[0]) / STEP : 0, vy: u < dur ? (b[1] - a[1]) / STEP : 0, ground: !!a[2] || u >= dur, fade: Math.min(sat(u / 0.25), sat((cyc - u) / 0.25)), held: u >= dur };
  }
  // 누름돌용: 유령은 "짝의 세계"의 고양이 대역이다
  standins(g, mine, out) { const gh = this.ghost(g, mine ? 1 - g.role : g.role); if (gh && gh.fade > 0.5) out.push({ x: gh.x, y: gh.y, ground: gh.ground, state: 'play', present: true, size: 1 }); }
  solids(g, out) {
    const gh = this.ghost(g, 1 - g.role), me = g.me; // 짝의 메아리만 내 세계에 있다
    if (!gh || gh.fade < 0.5) { this.prevHead = null; this.onHead = false; return; }
    const hy = gh.y + 0.92, prev = this.prevHead;
    // 유령 머리 위에 가만히 있으면 붙어서 실려 간다 (움직이거나 뛰면 내린다)
    const on = me.state === 'play' && prev && Math.abs(me.x - prev.x) < 0.8 && Math.abs(me.y - prev.y) < 0.3 && me.vy <= 0.5 && !(g.inp && (g.inp.x || g.inp.jump || g.inp.jumpPressed)) && (this.onHead || me.ground);
    if (on && Math.hypot(gh.x - prev.x, hy - prev.y) < 5) { me.x = gh.x; me.y = hy; me.vy = 0; if (!this.onHead) haptics.buzz('ride'); this.onHead = true; } else this.onHead = false;
    this.prevHead = { x: gh.x, y: hy };
    out.push({ x: gh.x - 0.45, y: hy - 0.12, w: 0.9, h: 0.12, oneWay: true });
  }
  update(g, dt) {
    const me = g.me, R = this.rec;
    if (R) {
      R.t += dt;
      while (R.p.length * STEP <= R.t) R.p.push([Math.round(me.x * 100) / 100, Math.round(me.y * 100) / 100, me.ground ? 1 : 0]);
      const stop = (g.inp && g.inp.toolPressed && R.t > 0.6) || R.t >= MAXT || me.state !== 'play';
      if (stop) { this.rec = null; if (R.p.length >= 6 && me.state === 'play') { g.act('echo', { id: this.id, p: R.p }); g.sound('panel', { x: me.x }); haptics.buzz('open'); } }
    } else if (g.tool === 'echo' && g.inp && g.inp.toolPressed && me.state === 'play' && me.ground) {
      this.rec = { t: 0, p: [[Math.round(me.x * 100) / 100, Math.round(me.y * 100) / 100, 1]] }; g.sound('press', { x: me.x }); haptics.buzz('key');
    }
    for (let r = 0; r < 2; r++) { const gh = this.ghost(g, r); if (gh) this.anims[r].update(dt, { vx: gh.vx, vy: gh.vy, ground: gh.ground, face: gh.vx < -0.2 ? -1 : gh.vx > 0.2 ? 1 : (this.last[r] || 1), state: 'play', partnerDx: 0 }); if (gh && Math.abs(gh.vx) > 0.2) this.last[r] = Math.sign(gh.vx); }
  }
  host(g, st, from, type, d) {
    if (type !== 'echo' || d.id !== this.id || !Array.isArray(d.p)) return false;
    st.g[from] = { p: d.p.slice(0, MAXT / STEP + 2), t0: g.tc + 0.4 };
    return true;
  }
  onFx() {}
  peek(g) { return { rec: this.rec ? +this.rec.t.toFixed(1) : null, ghosts: [0, 1].map((r) => { const gh = this.ghost(g, r); return gh ? { x: +gh.x.toFixed(2), y: +gh.y.toFixed(2), held: gh.held } : null; }), onHead: this.onHead }; }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    for (let r = 0; r < 2; r++) {
      const gh = this.ghost(g, r); if (!gh) continue;
      const real = r !== g.role; // 짝의 메아리는 내 세계에 또렷이, 내 메아리는 흐릿한 자국으로
      ctx.save(); ctx.translate(gh.x, -gh.y); ctx.globalAlpha = (real ? 0.78 : 0.3) * gh.fade;
      drawCat(ctx, this.anims[r], LOOKS[r], {});
      ctx.restore();
      if (real) { // 물결 고리: "이건 메아리"
        ctx.strokeStyle = rgba(LOOKS[r].glow, 0.7); ctx.lineWidth = 0.03;
        for (let k = 0; k < 2; k++) { const u = (g.t * 0.7 + k * 0.5) % 1; ctx.globalAlpha = (1 - u) * 0.5 * gh.fade; ctx.beginPath(); ctx.ellipse(gh.x, -gh.y - 0.5, 0.5 + u * 0.5, 0.6 + u * 0.5, 0, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    }
    const R = this.rec; // 녹화 중: 머리 위에 줄어드는 고리
    if (R) { const me = g.me, u = R.t / MAXT, X = me.x, Y = -me.y - 1.75;
      ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 0.09; ctx.beginPath(); ctx.arc(X, Y, 0.3, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ff8fa8'; ctx.beginPath(); ctx.arc(X, Y, 0.3, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - u)); ctx.stroke();
      ctx.fillStyle = '#ff8fa8'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.t * 8); ctx.beginPath(); ctx.arc(X, Y, 0.11, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
}
