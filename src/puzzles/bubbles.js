// 방울: 방울 담당(도구 'bubble')이 단추를 누르면 발밑에서 방울이 피어난다. 그 방울은 "짝의 세계"에만 있다.
// 짝이 방울 안에 들어서면 방울과 함께 떠오르고, 안에서 ←→로 방울을 몬다(방울은 짝이 몬다, 부는 사람은 못 몬다).
// 큰 방울 받침(pads)에서 불면 두 세계에 다 있는 큰 방울이 생겨 둘이 같이 탄다(모는 건 바늘 담당).
// 방울의 위치 = (생긴 곳, 생긴 시각, 짝이 민 거리, 바람)으로 정해져서 두 폰에서 같게 움직인다.
// cfg: { id, winds:[{ world, x0, x1, y0, y1, v }], pads:[x] }
import { TAU, clamp, rgba, sat, damp } from '../util.js';
import { haptics } from '../game/haptics.js';

const FORM = 0.4, SPEED = 1.4, RISE = 6.4, HOVER = 2.2, MAXN = 2, STEER = 2.6, REACH = 2.8;

export class Bubbles {
  constructor(cfg) {
    Object.assign(this, { winds: [], pads: [], padY: 0 }, cfg);
    this.cool = 0; this.inside = null; this.prev = new Map(); this.prevY = new Map();
    this.steer = new Map(); this.sentAt = 0; this.gone = new Set(); this.shown = new Map();
  }
  init() { return { list: [], n: 0 }; }
  life() { return FORM + RISE / SPEED + HOVER; }
  dxOf(g, b) { // 짝이 민 거리: 내가 몰고 있으면 내 손의 값, 아니면 방장이 받은 값(부드럽게)
    if (this.steer.has(b.n)) return this.steer.get(b.n);
    const t = b.dx || 0, s = this.shown.get(b.n) ?? t, v = Math.abs(t - s) > 2 ? t : s + (t - s) * 0.2;
    this.shown.set(b.n, v); return v;
  }
  pos(b, tc, dx = b.dx || 0) {
    const age = tc - b.t0, r = clamp((age - FORM) * SPEED, 0, RISE), y = b.y + r;
    let x = b.x + dx;
    for (const w of this.winds) if (x > w.x0 && x < w.x1) x += w.v * (clamp(y, w.y0, w.y1) - clamp(b.y, w.y0, w.y1)) / SPEED;
    return { x, y, age, form: sat(age / FORM), alive: age >= 0 && age < this.life(), fade: sat((this.life() - age) / 0.25), big: !!b.big };
  }
  mineToRide(g, b) { return b.big || b.by !== g.role; } // 짝이 분 방울만 내 세계에 있다 (큰 방울은 둘 다)
  canSteer(g, b) { return b.big ? g.tool === 'needle' : true; }
  solids(g, out) {
    const st = g.pz(this.id), me = g.me; let now = null;
    // 방울은 장 시계(실제 시간)로 움직이니, 모는 속도도 실제 시간으로 (느린 폰에서 몰기가 느려지지 않게)
    const tcNow = g.tc, sdt = Math.min(0.1, Math.max(0, tcNow - (this.lastTc ?? tcNow))); this.lastTc = tcNow;
    for (const b of st.list) {
      if (!this.mineToRide(g, b) || this.gone.has(b.n)) continue;
      const p = this.pos(b, g.tc, this.dxOf(g, b)); if (!p.alive || p.form < 1) continue;
      const half = b.big ? 1.25 : 0.62, prev = this.prev.get(b.n), top = p.y + 0.1, py = this.prevY.get(b.n);
      // 방울 안에 서 있었으면(뛰지 않는 한) 붙어서 함께 간다. ←→는 걷기 대신 방울을 몬다.
      const was = prev != null && py != null && me.state === 'play' && Math.abs(me.x - prev) < half + 0.1 && Math.abs(me.y - py) < 0.16 && me.vy <= 0.5;
      // 떠 주기: 방울이 생긴 자리에 서 있으면 (화면이 늦게 받아 이미 조금 떠올랐어도) 태워 올린다
      const scoop = !was && this.inside !== b.n && me.state === 'play' && me.vy <= 0.5 && p.age < FORM + 1.2 && Math.abs(me.x - p.x) < half && me.y >= b.y - 0.15 && me.y <= top + 0.05;
      if ((was || scoop) && !(g.inp && (g.inp.jump || g.inp.jumpPressed))) {
        const ix = g.inp ? g.inp.x || 0 : 0;
        if (ix && this.canSteer(g, b)) { // 방울 몰기
          const s = clamp((this.steer.get(b.n) ?? b.dx ?? 0) + ix * STEER * sdt, -REACH, REACH);
          this.steer.set(b.n, s);
          if (g.t - this.sentAt > 0.12) { this.sentAt = g.t; g.act('bsteer', { id: this.id, n: b.n, dx: Math.round(s * 100) / 100 }); }
        }
        const p2 = this.pos(b, g.tc, this.dxOf(g, b));
        me.x += p2.x - (prev ?? p2.x); me.y = top; me.vy = 0; now = b.n; g.steerLock = true;
        this.prev.set(b.n, p2.x); this.prevY.set(b.n, top);
        out.push({ x: p2.x - half, y: p.y - 0.2, w: half * 2, h: 0.3, oneWay: true, carry: true });
        continue;
      }
      this.prevY.set(b.n, top); this.prev.set(b.n, p.x);
      out.push({ x: p.x - half, y: p.y - 0.2, w: half * 2, h: 0.3, oneWay: true, carry: true });
    }
    me.inBubble = now != null;
    if (now !== this.inside) {
      if (now != null) { haptics.buzz('ride'); g.sound('pop', { x: me.x, vol: 0.5, rate: 1.4 }); }
      else if (this.inside != null && this.steer.has(this.inside)) { const s = this.steer.get(this.inside); g.act('bsteer', { id: this.id, n: this.inside, dx: s }); this.steer.delete(this.inside); }
      this.inside = now;
    }
    if (this.prev.size > 12) for (const k of [...this.prev.keys()]) if (!st.list.some((b) => b.n === k)) { this.prev.delete(k); this.prevY.delete(k); this.shown.delete(k); }
  }
  // 바늘 담당이 타고 있는 방울을 터뜨린다 → 높이 뛰어오른다
  popRiding(g) {
    if (this.inside == null) return false;
    const n = this.inside; this.gone.add(n); this.inside = null; g.me.inBubble = false;
    g.act('popb', { id: this.id, n });
    return true;
  }
  onPad(g) { return this.pads.find((x) => Math.abs(g.me.x - x) < 0.7 && g.me.ground) ; }
  update(g, dt) {
    const me = g.me; this.cool = Math.max(0, this.cool - dt);
    if (g.tool === 'bubble' && g.inp && g.inp.toolPressed && this.cool <= 0 && me.state === 'play' && me.ground) {
      const pad = this.onPad(g);
      this.cool = pad != null ? 1.4 : 0.6;
      g.act('bubble', { id: this.id, x: Math.round((pad ?? me.x) * 100) / 100, y: Math.round(me.y * 100) / 100, big: pad != null });
      g.sound('pop', { x: me.x, vol: 0.7, rate: pad != null ? 0.6 : 0.8 }); g.fx.burst('spark', me.x, me.y + 0.3, g.q.sparks(6), { speed: 1.2, up: 0.8, color: '#dff7ff', life: 0.5 });
      me.anim.setExpr('effort', 0.4);
    }
  }
  host(g, st, from, type, d) {
    if (d.id !== this.id) return false;
    if (type === 'bubble') {
      st.list.push({ n: ++st.n, by: from, x: +d.x, y: +d.y, t0: g.tc, dx: 0, big: !!d.big });
      const mine = st.list.filter((b) => b.by === from && !b.big); if (mine.length > MAXN) st.list.splice(st.list.indexOf(mine[0]), 1);
      const bigs = st.list.filter((b) => b.big); if (bigs.length > 1) st.list.splice(st.list.indexOf(bigs[0]), 1);
      st.list = st.list.filter((b) => g.tc - b.t0 < this.life() + 1);
      return true;
    }
    if (type === 'bsteer') { const b = st.list.find((q) => q.n === d.n); if (b) { b.dx = clamp(+d.dx || 0, -REACH, REACH); return true; } return false; }
    if (type === 'popb') { const i = st.list.findIndex((q) => q.n === d.n); if (i >= 0) { st.list.splice(i, 1); return true; } return false; }
    return false;
  }
  onFx() {}
  peek(g) { return { inside: this.inside, list: g.pz(this.id).list.map((b) => ({ n: b.n, by: b.by, big: !!b.big, ...this.pos(b, g.tc, this.dxOf(g, b)) })) }; }
  draw(g, ctx, layer) {
    const st = g.pz(this.id);
    if (layer === 'back') {
      for (const w of this.winds) { // 바람띠: 보이는 쪽에만
        if (!g.sees(w.world)) continue;
        const dir = Math.sign(w.v), span = w.x1 - w.x0 + 2;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
        for (let k = 0; k < 12; k++) {
          const u = ((g.t * Math.abs(w.v) * 0.18 + k / 12) % 1), y = w.y0 + ((k * 0.37) % 1) * (w.y1 - w.y0);
          const x = dir > 0 ? w.x0 - 1 + u * span : w.x1 + 1 - u * span;
          ctx.globalAlpha = 0.55 * Math.sin(u * Math.PI);
          ctx.beginPath(); ctx.moveTo(x, -y); ctx.bezierCurveTo(x + dir * 0.4, -y - 0.08, x + dir * 0.8, -y + 0.08, x + dir * 1.3, -y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      for (const x of this.pads) { // 큰 방울 받침 (둘 다 보인다)
        ctx.fillStyle = rgba('#9fe3ff', 0.35 + 0.15 * Math.sin(g.t * 2)); ctx.beginPath(); ctx.ellipse(x, -this.padY - 0.05, 0.75, 0.16, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 0.04; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - 0.4 + k * 0.4, -this.padY - 0.3 - k % 2 * 0.15, 0.12 + k % 2 * 0.06, 0, TAU); ctx.stroke(); }
      }
      return;
    }
    if (layer !== 'front') return;
    // 사라진 방울: 터지는 모습
    const ids = new Set(st.list.map((b) => b.n)), last = this._last || new Map();
    for (const [n, p] of last) if (!ids.has(n) && p.alive && p.fade > 0.5) { g.fx.ring(p.x, p.y + 0.6, '#dff7ff', p.big ? 2 : 1, 0.45); g.fx.burst('spark', p.x, p.y + 0.6, g.q.sparks(10), { speed: 2.4, color: '#dff7ff', life: 0.45 }); g.sound('pop', { x: p.x }); this.gone.delete(n); }
    this._last = new Map(st.list.map((b) => [b.n, this.pos(b, g.tc, this.dxOf(g, b))]));
    for (const b of st.list) {
      if (this.gone.has(b.n)) continue;
      const p = this._last.get(b.n); if (!p.alive) continue;
      const real = this.mineToRide(g, b), R = b.big ? 1.45 : 0.72, r = R * (0.25 + 0.75 * p.form), cx = p.x, cy = -(p.y + R * 0.86 * p.form) - Math.sin(g.t * 2 + b.n) * 0.03;
      ctx.save(); ctx.globalAlpha = (real ? 1 : 0.38) * p.fade;
      if (real) {
        const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
        gr.addColorStop(0, rgba('#ffffff', 0.5)); gr.addColorStop(0.55, rgba('#c9f3ff', 0.16)); gr.addColorStop(1, rgba('#9fe3ff', 0.42));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgba('#ffffff', 0.85); ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        ctx.lineWidth = 0.06; ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
      } else { // 내가 분 방울: 내 세계에는 없어서 자국만 비친다
        ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = 0.035; ctx.setLineDash([0.12, 0.12]); ctx.lineDashOffset = g.t * 0.4;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }
}
