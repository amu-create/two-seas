// 작은 효과들: 반짝이, 하트, 물방울, 먼지, 퍼지는 고리
import { TAU, lerp, sat, easeOut } from '../util.js';

export class Fx {
  constructor() { this.p = []; this.max = 220; }
  setBudget(n) { this.max = n; }
  add(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, t: 0, size: 0.1, color: '#fff', kind: 'spark', drag: 0, rot: 0, vr: 0 }, o));
  }
  burst(kind, x, y, n, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = (opt.a0 ?? 0) + Math.random() * (opt.spread ?? TAU);
      const sp = (opt.speed ?? 2) * (0.4 + Math.random() * 0.8);
      this.add({
        kind, x: x + (Math.random() - 0.5) * (opt.rx ?? 0.2), y: y + (Math.random() - 0.5) * (opt.ry ?? 0.2),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (opt.up ?? 0), g: opt.g ?? 0, drag: opt.drag ?? 1.5,
        life: (opt.life ?? 0.8) * (0.6 + Math.random() * 0.6), size: (opt.size ?? 0.09) * (0.6 + Math.random() * 0.8),
        color: Array.isArray(opt.color) ? opt.color[i % opt.color.length] : (opt.color ?? '#fff'), vr: (Math.random() - 0.5) * 4,
      });
    }
  }
  ring(x, y, color, size = 1.2, life = 0.6) { this.add({ kind: 'ring', x, y, color, size, life }); }
  heart(x, y, color = '#ff8fb0') { this.add({ kind: 'heart', x, y, vx: (Math.random() - 0.5) * 0.5, vy: 1.1 + Math.random() * 0.5, life: 1.3, size: 0.2 + Math.random() * 0.08, color, drag: 0.6 }); }
  update(dt) {
    const p = this.p;
    for (let i = p.length - 1; i >= 0; i--) {
      const o = p[i];
      o.t += dt;
      if (o.t >= o.life) { p.splice(i, 1); continue; }
      o.vy -= o.g * dt;
      const k = Math.exp(-o.drag * dt);
      o.vx *= k; o.vy *= k;
      o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
    }
  }
  draw(ctx) {
    for (const o of this.p) {
      const u = o.t / o.life;
      const X = o.x, Y = -o.y;
      if (o.kind === 'ring') {
        ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = o.color; ctx.lineWidth = 0.07 * (1 - u) + 0.01;
        ctx.beginPath(); ctx.ellipse(X, Y, o.size * easeOut(u), o.size * easeOut(u) * (o.flat ?? 1), 0, 0, TAU); ctx.stroke();
      } else if (o.kind === 'heart') {
        const s = o.size * (u < 0.2 ? easeOut(u / 0.2) * 1.15 : 1) * (1 + Math.sin(o.t * 9) * 0.04);
        ctx.globalAlpha = sat((1 - u) * 2.5);
        ctx.fillStyle = o.color;
        ctx.save(); ctx.translate(X + Math.sin(o.t * 3 + o.size * 40) * 0.08, Y); ctx.scale(s, s);
        ctx.beginPath(); ctx.moveTo(0, 0.55); ctx.bezierCurveTo(-1.1, -0.2, -0.5, -0.95, 0, -0.38); ctx.bezierCurveTo(0.5, -0.95, 1.1, -0.2, 0, 0.55); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-0.3, -0.32, 0.13, 0.08, -0.6, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (o.kind === 'drop') {
        ctx.globalAlpha = sat((1 - u) * 2); ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.ellipse(X, Y, o.size * 0.6, o.size, 0, 0, TAU); ctx.fill();
      } else if (o.kind === 'dust') {
        ctx.globalAlpha = (1 - u) * 0.35; ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.arc(X, Y, o.size * (0.6 + u * 1.6), 0, TAU); ctx.fill();
      } else if (o.kind === 'bit') {
        ctx.globalAlpha = sat((1 - u) * 1.6); ctx.fillStyle = o.color;
        ctx.save(); ctx.translate(X, Y); ctx.rotate(o.rot); ctx.fillRect(-o.size, -o.size * 0.45, o.size * 2, o.size * 0.9); ctx.restore();
      } else { // spark: 가운데가 하얀 빛 알갱이
        const s = o.size * (1 - u * 0.6);
        ctx.globalAlpha = sat((1 - u) * 1.8) * 0.35; ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.arc(X, Y, s * 2.4, 0, TAU); ctx.fill();
        ctx.globalAlpha = sat((1 - u) * 1.8); ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(X, Y, s * 0.7, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
