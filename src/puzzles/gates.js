// 누름돌: 밟고 서 있는 동안만 문이 열리거나 받침돌이 솟는다 (한 명이 밟아 주고, 한 명이 지나간다)
// 누름돌이 여러 개면 그중 하나만 진짜. 어느 것이 진짜인지는 seenBy 쪽 화면에만 빛으로 보인다.
// 가짜를 밟으면 '푸슉' 하고 방울을 타고 돌아가며, 진짜의 위치가 바뀐다.
// cfg: { id, y, groups:[[x,x,x],[x,x,x]], seenBy: 0|1|'both', target:{kind:'door',x,w,h} | {kind:'riser',x,w,h} }
import { rng, TAU, damp, rgba, sat, easeInOut, roundRect } from '../util.js';

export class Gates {
  constructor(cfg) {
    Object.assign(this, { y: 0, seenBy: 0, ty: null }, cfg);
    if (this.ty == null) this.ty = this.y;   // 문/받침돌이 놓인 바닥 높이
    this.u = 0;
    this.sink = this.groups.map((g) => g.map(() => 0));
    this.puff = -9; this.puffX = 0;
    this._seed = null;
  }
  init() { return { seed: 1 }; }
  reals(seed) { // 묶음마다 진짜 누름돌 번호
    if (this._seed !== seed) { const r = rng(seed * 40503 + 11); this._r = this.groups.map((g) => (g.length > 1 ? Math.floor(r() * g.length) : 0)); this._seed = seed; }
    return this._r;
  }
  onPlate(c, x) { return c.present !== false && c.state === 'play' && c.ground && Math.abs(c.x - x) < 0.5 && Math.abs(c.y - this.y) < 0.12; }
  pressed(g) {
    const re = this.reals(g.pz(this.id).seed);
    return this.groups.some((grp, gi) => [g.me, g.other].some((c) => c.present && this.onPlate(c, grp[re[gi]])));
  }
  // 시험용 봇: 밟으면 안 되는 자리들
  decoySpans(g) { const re = this.reals(g.pz(this.id).seed), out = []; this.groups.forEach((grp, gi) => grp.forEach((x, i) => { if (i !== re[gi]) out.push([x - 0.52, x + 0.52, this.y]); })); return out; }
  peek(g) { const re = this.reals(g.pz(this.id).seed); return { real: this.groups.map((grp, gi) => grp[re[gi]]), open: this.u }; }

  solids(g, out) {
    const t = this.target;
    if (t.kind === 'door') { if (this.u < 0.6) out.push({ x: t.x, y: this.ty, w: t.w, h: t.h }); }
    else if (this.u > 0.02) out.push({ x: t.x, y: this.ty - 0.4, w: t.w, h: 0.4 + t.h * this.u, carry: true });
  }

  update(g, dt) {
    const st = g.pz(this.id), re = this.reals(st.seed), me = g.me;
    const was = this.u > 0.5;
    this.u = damp(this.u, this.pressed(g) ? 1 : 0, this.target.kind === 'door' ? 5 : 2.2, dt);
    if (this.u > 0.5 !== was) g.sound(this.u > 0.5 ? 'panel' : 'press', { x: this.target.x });
    this.groups.forEach((grp, gi) => grp.forEach((x, i) => {
      const on = [g.me, g.other].some((c) => c.present && this.onPlate(c, x));
      this.sink[gi][i] = damp(this.sink[gi][i], on ? 1 : 0, 14, dt);
      if (i !== re[gi] && me.safe <= 0 && this.onPlate(me, x)) { // 가짜를 밟았다
        this.puff = g.t; this.puffX = x; g.hazard = this.id; g.failMe('trap');
      }
    }));
  }
  host(g, st, from, type, d) { if (type === 'fell' && d.pz === this.id) { st.seed++; return true; } return false; }
  onFx() {}

  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const pal = g.pal, st = g.pz(this.id), re = this.reals(st.seed), sees = g.sees(this.seenBy), Y = -this.y, t = this.target, TY = -this.ty;
    // 누름돌에서 문까지 이어진 점선: 밟으면 빛이 흐른다
    const tx = t.x + t.w / 2;
    this.groups.forEach((grp) => {
      const gx = grp[Math.floor(grp.length / 2)];
      ctx.strokeStyle = pal.warm; ctx.lineWidth = 0.05; ctx.globalAlpha = 0.18 + 0.6 * this.u; ctx.setLineDash([0.12, 0.16]); ctx.lineDashOffset = -g.t * 0.6 * this.u;
      ctx.beginPath(); ctx.moveTo(gx, Y + 0.14); ctx.lineTo(gx, Y + 0.45); ctx.lineTo(tx, Math.max(Y, TY) + 0.45); ctx.lineTo(tx, TY + 0.14); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    this.groups.forEach((grp, gi) => grp.forEach((x, i) => {
      const s = this.sink[gi][i], real = i === re[gi];
      ctx.fillStyle = pal.stoneDark; roundRect(ctx, x - 0.52, Y - 0.04, 1.04, 0.14, 0.05); ctx.fill();
      const top = Y - 0.2 + s * 0.13;
      if (sees && real && grp.length > 1) { // 진짜는 은은히 빛난다 (보이는 쪽에게만)
        const gg = ctx.createRadialGradient(x, top, 0, x, top, 1.0);
        gg.addColorStop(0, pal.glow); gg.addColorStop(1, rgba('#000000', 0));
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(g.t * 2.4 + x); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(x, top, 0.95, 0.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      const pg = ctx.createLinearGradient(0, top, 0, top + 0.22);
      pg.addColorStop(0, pal.top); pg.addColorStop(1, pal.stone);
      ctx.fillStyle = pg; roundRect(ctx, x - 0.42, top, 0.84, 0.22, 0.08); ctx.fill();
      ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.6; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(x - 0.3, top + 0.03); ctx.lineTo(x + 0.3, top + 0.03); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.arc(x, top + 0.11, 0.07, 0, TAU); ctx.fill();
    }));
    const pu = (g.t - this.puff) / 0.5;
    if (pu >= 0 && pu < 1) { ctx.globalAlpha = (1 - pu) * 0.7; ctx.fillStyle = '#ffd0f4'; ctx.beginPath(); ctx.arc(this.puffX, Y - 0.5 - pu * 0.6, 0.3 + pu * 0.7, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (t.kind === 'door') {
      const e = easeInOut(this.u);
      ctx.save();
      ctx.beginPath(); ctx.rect(t.x - 1, TY - t.h - 1.2, t.w + 2, t.h + 1.2); ctx.clip();
      const off = e * (t.h + 0.2);
      const dg = ctx.createLinearGradient(t.x, 0, t.x + t.w, 0);
      dg.addColorStop(0, pal.stone); dg.addColorStop(1, pal.stoneDark);
      ctx.fillStyle = dg; roundRect(ctx, t.x, TY - t.h + off, t.w, t.h + 0.2, 0.18); ctx.fill();
      ctx.strokeStyle = pal.warm; ctx.globalAlpha = 0.35 + 0.5 * this.u; ctx.lineWidth = 0.05;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(t.x + t.w / 2, TY - t.h + off + 0.9 + k * 1.05, 0.22, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.restore();
      ctx.fillStyle = pal.stoneDark; ctx.fillRect(t.x - 0.3, TY - t.h - 0.75, t.w + 0.6, 0.75);
      ctx.fillStyle = pal.top; ctx.fillRect(t.x - 0.3, TY - t.h - 0.75, t.w + 0.6, 0.12);
    } else { // 솟아오르는 받침돌
      const h = t.h * this.u;
      ctx.fillStyle = pal.stoneDark; ctx.fillRect(t.x + 0.08, TY - 0.03, t.w - 0.16, 0.08);
      if (h > 0.01) {
        const bg = ctx.createLinearGradient(0, TY - h, 0, TY);
        bg.addColorStop(0, pal.stone); bg.addColorStop(1, pal.stoneDark);
        ctx.fillStyle = bg; roundRect(ctx, t.x, TY - h, t.w, h + 0.05, 0.1); ctx.fill();
        ctx.fillStyle = pal.top; ctx.fillRect(t.x + 0.05, TY - h, t.w - 0.1, 0.1);
      }
      ctx.fillStyle = pal.warm; ctx.globalAlpha = 0.35 + 0.5 * this.u; // 위쪽 화살표
      for (let k = 0; k < 2; k++) { const ax = t.x + t.w * (0.33 + k * 0.34), ay = TY - h - 0.25 - Math.sin(g.t * 3 + k) * 0.05; ctx.beginPath(); ctx.moveTo(ax, ay - 0.16); ctx.lineTo(ax - 0.13, ay + 0.04); ctx.lineTo(ax + 0.13, ay + 0.04); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
}
