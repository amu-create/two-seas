// 떠다니는 발판: 두 폰의 공유 시계에 맞춰 좌우로 오간다. seenBy 쪽의 세계에만 있다(그쪽만 보이고 그쪽만 밟는다).
// 안 보이는 쪽은 짝의 머리 위에 타고 건넌다(목말) → "타!" "지금 간다!"
// cfg: { id, seenBy: 0|1|'both', list:[{x0,x1,y,w,period,phase}] }
import { TAU, rgba, lerp } from '../util.js';

export class Movers {
  constructor(cfg) { Object.assign(this, { seenBy: 0 }, cfg); }
  init() { return {}; }
  at(m, tc) {
    const a = TAU * (tc + (m.phase || 0)) / m.period;
    return { x: lerp(m.x0, m.x1, 0.5 - 0.5 * Math.cos(a)), vx: (m.x1 - m.x0) * 0.5 * Math.sin(a) * TAU / m.period };
  }
  solids(g, out) { if (!g.sees(this.seenBy)) return; /* 내 눈에 안 보이는 발판은 내 세계에 없다 */ const tc = g.tc; for (const m of this.list) { const p = this.at(m, tc); out.push({ x: p.x, y: m.y - 0.3, w: m.w, h: 0.3, vx: p.vx, mover: true }); } }
  update() {}
  host() { return false; }
  onFx() {}
  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const pal = g.pal, tc = g.tc, sees = g.sees(this.seenBy);
    for (const m of this.list) {
      const p = this.at(m, tc), Y = -m.y, cx = p.x + m.w / 2;
      const ridden = [g.me, g.other].some((c) => c.present && c.ground && Math.abs(c.y - m.y) < 0.08 && c.x > p.x - 0.3 && c.x < p.x + m.w + 0.3);
      if (sees) {
        // 오가는 길(점선)과 빛나는 구름 발판
        ctx.strokeStyle = pal.glow; ctx.globalAlpha = 0.16; ctx.lineWidth = 0.04; ctx.setLineDash([0.1, 0.18]);
        ctx.beginPath(); ctx.moveTo(Math.min(m.x0, m.x1), Y + 0.15); ctx.lineTo(Math.max(m.x0, m.x1) + m.w, Y + 0.15); ctx.stroke(); ctx.setLineDash([]);
        const gg = ctx.createRadialGradient(cx, Y + 0.2, 0, cx, Y + 0.2, m.w * 0.8);
        gg.addColorStop(0, pal.glow); gg.addColorStop(1, rgba('#000000', 0));
        ctx.globalAlpha = 0.4 + 0.1 * Math.sin(g.t * 2 + m.x0); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(cx, Y + 0.22, m.w * 0.75, 0.42, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.92; ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.moveTo(p.x + 0.15, Y); ctx.lineTo(p.x + m.w - 0.15, Y);
        ctx.quadraticCurveTo(p.x + m.w + 0.05, Y + 0.02, p.x + m.w - 0.05, Y + 0.2);
        for (let k = 3; k >= 0; k--) { const bx = p.x + m.w * (k + 0.5) / 4; ctx.quadraticCurveTo(bx + m.w / 8, Y + 0.42 + Math.sin(g.t * 2 + k) * 0.03, bx - m.w / 8, Y + 0.22); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8; ctx.fillRect(p.x + 0.2, Y, m.w - 0.4, 0.045);
        ctx.globalAlpha = 1;
      } else if (ridden) { // 안 보이는 쪽: 누가 올라서 있을 때만 발밑에 잔물결
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.03;
        for (let k = 0; k < 2; k++) { const u = (g.t * 0.9 + k * 0.5) % 1; ctx.globalAlpha = (1 - u) * 0.4; ctx.beginPath(); ctx.ellipse(cx, Y + 0.04, 0.3 + u * 0.8, 0.06 + u * 0.12, 0, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    }
  }
}
