// 방울 불기: 도구 단추를 누르면 내 발밑에서 방울이 피어난다. 그 방울은 "짝의 세계"에만 있다.
// 짝이 방울 안에 들어서면 방울과 함께 둥실 떠오른다 → 높은 벼랑, 벽 너머, 바람을 타고 물 건너로.
// 방울을 부는 사람은 짝이 어디로 가야 하는지(짝의 세계의 벽, 바람)를 못 본다 → "두 걸음 오른쪽에서 불어 줘!"
// 방울의 위치는 (생긴 곳, 생긴 시각)만으로 정해지므로 두 폰에서 똑같이 움직인다.
// cfg: { id, winds:[{ world, x0, x1, y0, y1, v }] }   바람띠: 그 높이를 지나는 동안 옆으로 밀린다. world 쪽 눈에만 보인다.
import { TAU, clamp, rgba, sat } from '../util.js';
import { haptics } from '../game/haptics.js';

const FORM = 0.55, SPEED = 1.25, RISE = 6.4, HOVER = 2.4, MAXN = 3; // 다 올라가서 2.4초 머문 뒤 터진다

export class Bubbles {
  constructor(cfg) { Object.assign(this, { winds: [] }, cfg); this.cool = 0; this.inside = null; this.prev = new Map(); this.prevY = new Map(); }
  init() { return { list: [], n: 0 }; }
  pos(b, tc) {
    const age = tc - b.t0, r = clamp((age - FORM) * SPEED, 0, RISE), y = b.y + r;
    let x = b.x;
    for (const w of this.winds) if (b.x > w.x0 && b.x < w.x1) x += w.v * (clamp(y, w.y0, w.y1) - clamp(b.y, w.y0, w.y1)) / SPEED;
    const life = FORM + RISE / SPEED + HOVER;
    return { x, y, age, form: sat(age / FORM), alive: age >= 0 && age < life, fade: sat((life - age) / 0.25) };
  }
  mineToRide(g, b) { return b.by !== g.role; }          // 짝이 분 방울만 내 세계에 있다
  solids(g, out) {
    const st = g.pz(this.id), me = g.me; let now = null;
    for (const b of st.list) {
      if (!this.mineToRide(g, b)) continue;
      const p = this.pos(b, g.tc); if (!p.alive || p.form < 1) continue;
      // 방울 안에 서 있으면 방울이 옆으로 밀릴 때 함께 실려 간다
      const prev = this.prev.get(b.n);
      const top = p.y + 0.1, py = this.prevY.get(b.n);
      // 방울 안에 서 있었으면(뛰거나 걸어 나오지 않는 한) 방울에 붙어서 함께 간다: 화면이 잠깐 끊겨도 떨어지지 않게
      const was = prev != null && py != null && me.state === 'play' && Math.abs(me.x - prev) < 0.75 && Math.abs(me.y - py) < 0.14 && me.vy <= 0.5;
      if (was && !(g.inp && (g.inp.jump || g.inp.jumpPressed))) { if (!(g.inp && g.inp.x)) me.x += p.x - prev; me.y = top; me.vy = 0; now = b.n; }
      this.prevY.set(b.n, top);
      this.prev.set(b.n, p.x);
      out.push({ x: p.x - 0.62, y: p.y - 0.2, w: 1.24, h: 0.3, oneWay: true, carry: true });
    }
    me.inBubble = now != null;
    if (now !== this.inside) { if (now != null) { haptics.buzz('ride'); g.sound('pop', { x: me.x, vol: 0.5, rate: 1.4 }); } this.inside = now; }
    if (this.prev.size > 12) for (const k of this.prev.keys()) if (!st.list.some((b) => b.n === k)) this.prev.delete(k);
  }
  update(g, dt) {
    const me = g.me; this.cool = Math.max(0, this.cool - dt);
    if (g.tool === 'bubble' && g.inp && g.inp.toolPressed && this.cool <= 0 && me.state === 'play' && me.ground && this.near(g)) {
      this.cool = 0.7; g.act('bubble', { id: this.id, x: Math.round(me.x * 100) / 100, y: Math.round(me.y * 100) / 100 });
      g.sound('pop', { x: me.x, vol: 0.7, rate: 0.8 }); g.fx.burst('spark', me.x, me.y + 0.3, g.q.sparks(6), { speed: 1.2, up: 0.8, color: '#dff7ff', life: 0.5 });
      me.anim.setExpr && me.anim.setExpr('effort', 0.4);
    }
  }
  near(g) { return this.zone ? g.me.x > this.zone[0] && g.me.x < this.zone[1] : true; }
  host(g, st, from, type, d) {
    if (type !== 'bubble' || d.id !== this.id) return false;
    st.list.push({ n: ++st.n, by: from, x: +d.x, y: +d.y, t0: g.tc });
    const mineN = st.list.filter((b) => b.by === from); if (mineN.length > MAXN) st.list.splice(st.list.indexOf(mineN[0]), 1);
    st.list = st.list.filter((b) => g.tc - b.t0 < FORM + RISE / SPEED + HOVER + 1);
    return true;
  }
  onFx() {}
  peek(g) { return { list: g.pz(this.id).list.map((b) => ({ by: b.by, ...this.pos(b, g.tc) })) }; }
  draw(g, ctx, layer) {
    const st = g.pz(this.id);
    if (layer === 'back') { // 바람띠: 보이는 쪽에만
      for (const w of this.winds) {
        if (!g.sees(w.world)) continue;
        const dir = Math.sign(w.v), span = w.x1 - w.x0 + 9;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
        for (let k = 0; k < 9; k++) {
          const u = ((g.t * Math.abs(w.v) * 0.22 + k / 9) % 1), y = w.y0 + ((k * 0.37) % 1) * (w.y1 - w.y0);
          const x = dir > 0 ? w.x0 + u * span : w.x1 - u * span;
          ctx.globalAlpha = 0.5 * Math.sin(u * Math.PI);
          ctx.beginPath(); ctx.moveTo(x, -y); ctx.bezierCurveTo(x + dir * 0.4, -y - 0.08, x + dir * 0.8, -y + 0.08, x + dir * 1.3, -y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      return;
    }
    if (layer !== 'front') return;
    for (const b of st.list) {
      const p = this.pos(b, g.tc); if (!p.alive) continue;
      const real = this.mineToRide(g, b), r = 0.72 * (0.25 + 0.75 * p.form), cx = p.x, cy = -(p.y + 0.62 * p.form) - Math.sin(g.t * 2 + b.n) * 0.03;
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
