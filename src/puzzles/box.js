// 상자: 두 세계에 모두 있는 물건. 옆에서 걸어가며 밀 수 있다.
// 길이 있는 쪽이 밀어서 짝의 낭떠러지 한가운데에 놓아 주면, 짝은 그 상자를 징검다리 삼아 뛰어 건넌다.
// (길이 없는 쪽의 화면에서는 상자가 허공에 떠 있는 것처럼 보인다)
// 미는 사람의 폰이 위치를 정해 방장에게 알리고, 다른 폰은 그 위치를 따라간다.
// cfg: { id, x, y, w, h, min, max }
import { clamp, damp, rgba, roundRect, TAU } from '../util.js';
import { PHYS } from '../game/player.js';
import { haptics } from '../game/haptics.js';

export class Box {
  constructor(cfg) { Object.assign(this, { y: 0, w: 1.3, h: 0.9 }, cfg); this.bx = this.x; this.pushT = -9; this.sentT = -9; this.moving = 0; this.rumble = 0; this.seq = Math.floor(Math.random() * 1e6); }
  init() { return { x: this.x }; }
  solids(g, out) { out.push({ x: this.bx, y: this.y, w: this.w, h: this.h, box: true }); }
  peek() { return { x: this.bx, w: this.w, min: this.min, max: this.max }; }
  update(g, dt) {
    const st = g.pz(this.id), me = g.me, hw = PHYS.w * (me.size || 1) / 2, ix = g.inp ? Math.sign(g.inp.x || 0) : 0;
    let pushed = false;
    if (ix && me.state === 'play' && me.ground && Math.abs(me.y - this.y) < 0.1 && (!this.heavy || (me.size || 1) > 1.1)) { // 무거운 상자는 큰 고양이만 민다
      const touch = ix > 0 ? Math.abs(me.x + hw - this.bx) < 0.07 : Math.abs(me.x - hw - (this.bx + this.w)) < 0.07;
      if (touch) {
        const nb = clamp(this.bx + ix * 2.1 * dt, this.min, this.max);
        if (nb !== this.bx) { this.bx = nb; pushed = true; this.pushT = g.t; if (g.t - this.sentT > 0.1) { this.sentT = g.t; g.act('box', { id: this.id, x: this.bx, s: Date.now() + (++this.seq % 1000) / 1000 }); } }
        me.pushing = true;
      }
    }
    if (!pushed) {
      if (this.pushT > 0 && g.t - this.pushT < 1.0) { if (g.t - this.sentT > 0.25) { this.sentT = g.t; g.act('box', { id: this.id, x: this.bx, s: Date.now() + (++this.seq % 1000) / 1000 }); } } // 손을 뗀 뒤 1초 동안 마지막 자리를 몇 번 더 알린다 (중계 연결에서 하나가 빠져도)
      else { const d = st.x - this.bx; if (Math.abs(d) > 0.002) { this.bx = Math.abs(d) > 4 ? st.x : damp(this.bx, st.x, 12, dt); pushed = Math.abs(d) > 0.03; } }
    }
    this.moving = damp(this.moving, pushed ? 1 : 0, 10, dt);
    if (pushed) { this.rumble += dt; if (this.rumble > 0.34) { this.rumble = 0; g.sound('step', { x: this.bx, vol: 0.5, rate: 0.6 }); } }
    if (g.t - this.pushT < 0.05) { this.hz = (this.hz || 0) + dt; if (this.hz > 0.16) { this.hz = 0; haptics.buzz('push'); } } // 내가 밀고 있는 동안 드르륵
  }
  host(g, st, from, type, d) {
    if (type !== 'box' || d.id !== this.id) return false;
    // 중계 연결에서는 소식이 뒤바뀐 순서로 올 수 있다 → 같은 사람이 보낸 것 중 더 늦게 보낸 것만 받는다
    const k = 's' + from; if (d.s != null && st[k] != null && d.s <= st[k]) return false;
    if (d.s != null) st[k] = d.s;
    st.x = clamp(+d.x || 0, this.min, this.max); return true;
  }
  onFx() {}
  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const pal = g.pal, x = this.bx, Y = -this.y, w = this.w, h = this.h, cx = x + w / 2;
    // 내 세계에서 상자 밑에 땅이 있는가? 없으면 떠 있는 모습으로
    let held = false;
    for (const s of g._solidBuf || []) if (!s.box && cx > s.x - 0.05 && cx < s.x + s.w + 0.05 && Math.abs(s.y + s.h - this.y) < 0.08) { held = true; break; }
    const bob = held ? 0 : Math.sin(g.t * 1.7 + this.x) * 0.035;
    if (!held) { // 허공의 상자: 밑에서 빛이 받치고 있다
      const gg = ctx.createRadialGradient(cx, Y + 0.25, 0, cx, Y + 0.25, w * 0.9);
      gg.addColorStop(0, pal.glow); gg.addColorStop(1, rgba('#000000', 0));
      ctx.globalAlpha = 0.45 + 0.12 * Math.sin(g.t * 2.3); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(cx, Y + 0.22, w * 0.85, 0.42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.glow;
      for (let k = 0; k < 4; k++) { const u = (g.t * 0.6 + k / 4) % 1; ctx.globalAlpha = (1 - u) * 0.6; ctx.beginPath(); ctx.arc(x + 0.2 + (k * 0.37 % 1) * (w - 0.4), Y + 0.15 + u * 0.9, 0.035, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(0, -bob);
    const gr = ctx.createLinearGradient(0, Y - h, 0, Y);
    gr.addColorStop(0, pal.woodHi); gr.addColorStop(0.25, pal.wood); gr.addColorStop(1, pal.woodDark);
    ctx.fillStyle = gr; roundRect(ctx, x, Y - h, w, h, 0.1); ctx.fill();
    ctx.strokeStyle = pal.woodDark; ctx.lineWidth = 0.07; roundRect(ctx, x + 0.09, Y - h + 0.09, w - 0.18, h - 0.18, 0.06); ctx.stroke();
    ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(x + 0.12, Y - 0.12); ctx.lineTo(x + w - 0.12, Y - h + 0.12); ctx.stroke();
    ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(x + 0.12, Y - h + 0.03); ctx.lineTo(x + w - 0.12, Y - h + 0.03); ctx.stroke(); ctx.globalAlpha = 1;
    // 발바닥 도장: 밀 수 있는 물건이라는 표시
    ctx.fillStyle = pal.warm; ctx.globalAlpha = 0.5 + 0.4 * this.moving;
    ctx.beginPath(); ctx.ellipse(cx, Y - h * 0.42, 0.13, 0.1, 0, 0, TAU); ctx.fill();
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(cx + k * 0.12, Y - h * 0.42 - 0.17 + Math.abs(k) * 0.04, 0.05, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.restore();
  }
}
