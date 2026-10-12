// 등불 기름: 안개 구간에서는 불의 주인이 자기 불을 못 본다. 짝이 발바닥 단추를 꾹 누르고 있는 동안만 등불이 켜져서
// 짝의 세계의 불이 비쳐 보인다. 기름은 구간마다 정해져 있다(기본 12초) → 아껴서 1초씩 켜 보고 "3, 2, 1, 지금!"
// 짝이 실패하면(물러나면) 기름이 다시 찬다. 안개는 화면에 뿌옇게 그린다.
// cfg: { id, x0, x1, fuel }
import { TAU, rgba, sat, hash1 } from '../util.js';
import { haptics } from '../game/haptics.js';

export class Lamp {
  constructor(cfg) { Object.assign(this, { fuel: 12 }, cfg); this.left = this.fuel; this.on = false; this.flick = 0; }
  init() { return {}; }
  solids() {}
  near(g) { const me = g.me; return me.x > this.x0 - 7 && me.x < this.x1 + 3; }
  update(g, dt) {
    const me = g.me, o = g.other;
    if (o.state === 'bubble' && !this._ob) this.left = this.fuel; // 짝이 데었다: 기름을 다시 채워 준다
    this._ob = o.state === 'bubble';
    if (me.x < this.x0 - 7.5) this.left = this.fuel;
    const busy = g.chapter.puzzles.some((p) => p !== this && p.canAct && p.canAct(g));
    const want = this.near(g) && g.inp && g.inp.actHeld && !busy && me.state === 'play';
    const was = this.on;
    this.on = want && this.left > 0;
    if (this.on) { this.left = Math.max(0, this.left - dt); if (Math.floor(this.left * 2) !== Math.floor((this.left + dt) * 2)) haptics.buzz('lift'); }
    if (this.on !== was) { g.sound(this.on ? 'lamp' : 'press', { x: me.x, vol: 0.5 }); if (!this.on && this.left <= 0) g.sound('wrong', { x: me.x, vol: 0.6 }); }
    g.lampOn = this.on;
    this.flick += dt;
  }
  host() { return false; }
  onFx() {}
  peek() { return { left: +this.left.toFixed(1), on: this.on }; }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    // 안개: 구간 위로 뿌연 띠 (등불을 켜면 내 화면에서는 걷힌다)
    const a = g.lampOn ? 0.12 : 0.38;
    for (let k = 0; k < 14; k++) {
      const x = this.x0 - 0.5 + ((k * 0.913 + g.t * 0.06 * (k % 2 ? 1 : -1)) % 1 + 1) % 1 * (this.x1 - this.x0 + 1), y = -0.4 - hash1(k) * 1.6;
      const r = 0.9 + hash1(k * 3.1) * 0.8;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba('#e8f2ff', a)); gr.addColorStop(1, rgba('#e8f2ff', 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    if (!this.near(g)) return;
    // 내 머리 위의 등불과 남은 기름
    const me = g.me, X = me.x + 0.55, Y = -me.y - 1.55, u = sat(this.left / this.fuel);
    if (this.on) { const gr = ctx.createRadialGradient(X, Y, 0, X, Y, 1.6); gr.addColorStop(0, rgba('#ffd98a', 0.45)); gr.addColorStop(1, rgba('#ffd98a', 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X, Y, 1.6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = this.on ? '#ffe2a0' : rgba('#ffe2a0', 0.55); ctx.beginPath(); ctx.ellipse(X, Y, 0.13, 0.17, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#000000', 0.45); ctx.fillRect(X - 0.45, Y + 0.28, 0.9, 0.09);
    ctx.fillStyle = u < 0.25 ? '#ff9fb6' : '#ffd98a'; ctx.fillRect(X - 0.45, Y + 0.28, 0.9 * u, 0.09);
  }
}
