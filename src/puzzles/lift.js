// 승강기: 한 명이 손잡이 앞에서 발바닥 단추를 꾹 누르고 있는 동안 올라가고, 놓으면 천천히 내려온다.
// 탄 사람은 조종할 수 없다 → "올려! 멈춰!"를 말로 주고받는다 (통로의 불꽃은 한쪽 화면에만 보인다).
// 높이는 방장이 (기준 높이, 기준 시각, 방향)으로 정하고 두 폰이 같은 식으로 계산한다.
// cfg: { id, x, w, y0, y1, cranks:[{x,y}], up, down }
import { TAU, clamp, rgba, damp } from '../util.js';
import { pawHint } from './glyph.js';

export class Lift {
  constructor(cfg) { Object.assign(this, { up: 1.3, down: 0.7 }, cfg); this.spin = 0; this.sent = false; }
  init() { return { h0: 0, t0: 0, dir: 0, by: [false, false] }; }
  height(g) { const st = g.pz(this.id), H = this.y1 - this.y0; return clamp(st.h0 + (st.dir > 0 ? this.up : st.dir < 0 ? -this.down : 0) * (g.tc - st.t0), 0, H); }
  top(g) { return this.y0 + this.height(g); }
  solids(g, out) { out.push({ x: this.x, y: this.top(g) - 0.3, w: this.w, h: 0.3, carry: true, oneWay: true }); } // 아래에 서 있어도 끼이지 않게, 위에서만 밟힌다
  myCrank(g) { const me = g.me; if (!me.ground || me.state !== 'play') return -1; return this.cranks.findIndex((c) => Math.abs(me.x - c.x) < 0.9 && Math.abs(me.y - c.y) < 0.3); }
  canAct(g) { return this.myCrank(g) >= 0; }
  act() {}
  update(g, dt) {
    const on = this.myCrank(g) >= 0 && g.inp.actHeld;
    g.me.cranking = on;
    if (on !== this.sent) { this.sent = on; g.act('crank', { id: this.id, on }); }
    const st = g.pz(this.id);
    if (st.dir > 0) { this.spin += dt * 5; if (Math.floor(this.spin / 1.2) !== Math.floor((this.spin - dt * 5) / 1.2)) g.sound('dial', { x: this.x, vol: 0.6 }); }
    else if (st.dir < 0 && this.height(g) > 0) this.spin -= dt * 2.5;
  }
  host(g, st, from, type, d) {
    if (type !== 'crank' || d.id !== this.id) return false;
    st.by[from] = !!d.on;
    const dir = st.by[0] || st.by[1] ? 1 : -1;
    if (dir === st.dir) return false;
    st.h0 = this.height(g); st.t0 = g.tc; st.dir = dir;
    return true;
  }
  onFx() {}
  peek(g) { return { top: this.top(g), dir: g.pz(this.id).dir, cranks: this.cranks, x: this.x, w: this.w }; }
  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const pal = g.pal, st = g.pz(this.id), top = -this.top(g);
    // 통로의 레일
    ctx.strokeStyle = pal.stoneDark; ctx.lineWidth = 0.1;
    ctx.beginPath(); ctx.moveTo(this.x + 0.12, -this.y0); ctx.lineTo(this.x + 0.12, -this.y1 - 0.9); ctx.moveTo(this.x + this.w - 0.12, -this.y0); ctx.lineTo(this.x + this.w - 0.12, -this.y1 - 0.9); ctx.stroke();
    ctx.fillStyle = pal.stoneDark; ctx.fillRect(this.x - 0.1, -this.y1 - 1.05, this.w + 0.2, 0.2);
    // 줄과 발판
    ctx.strokeStyle = pal.woodHi; ctx.lineWidth = 0.035; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(this.x + 0.3, top); ctx.lineTo(this.x + this.w / 2, -this.y1 - 0.9); ctx.lineTo(this.x + this.w - 0.3, top); ctx.stroke(); ctx.globalAlpha = 1;
    const pg = ctx.createLinearGradient(0, top, 0, top + 0.3);
    pg.addColorStop(0, pal.woodHi); pg.addColorStop(0.3, pal.wood); pg.addColorStop(1, pal.woodDark);
    ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(this.x, top); ctx.lineTo(this.x + this.w, top); ctx.lineTo(this.x + this.w - 0.1, top + 0.3); ctx.lineTo(this.x + 0.1, top + 0.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.6; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(this.x + 0.1, top + 0.02); ctx.lineTo(this.x + this.w - 0.1, top + 0.02); ctx.stroke(); ctx.globalAlpha = 1;
    // 손잡이(바퀴)
    this.cranks.forEach((c, i) => {
      const X = c.x, Y = -c.y, held = st.by[0] || st.by[1];
      ctx.fillStyle = pal.stoneDark; ctx.fillRect(X - 0.08, Y - 1.1, 0.16, 1.1);
      ctx.save(); ctx.translate(X, Y - 1.25); ctx.rotate(this.spin);
      ctx.strokeStyle = held ? pal.warm : pal.stone; ctx.lineWidth = 0.09; ctx.beginPath(); ctx.arc(0, 0, 0.36, 0, TAU); ctx.stroke();
      ctx.lineWidth = 0.06; ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = k * TAU / 4; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.36, Math.sin(a) * 0.36); } ctx.stroke();
      ctx.fillStyle = pal.warm; ctx.beginPath(); ctx.arc(0.36, 0, 0.08, 0, TAU); ctx.fill();
      ctx.restore();
      // 위쪽 화살표 그림: "누르고 있으면 올라간다"
      ctx.fillStyle = pal.warm; ctx.globalAlpha = held ? 1 : 0.45;
      const ay = Y - 1.95 - (held ? ((g.t * 1.5) % 1) * 0.2 : 0);
      ctx.beginPath(); ctx.moveTo(X, ay - 0.16); ctx.lineTo(X - 0.14, ay + 0.04); ctx.lineTo(X + 0.14, ay + 0.04); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      if (this.myCrank(g) === i && !g.inp.actHeld) pawHint(ctx, X + 0.75, Y - 1.3 - Math.sin(g.t * 3) * 0.05, pal.raw('warm'));
    });
  }
}
