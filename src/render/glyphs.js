// 문양 8개. 말로 설명하기 딱 애매하게(그래서 재밌게) 생겼다.
// 각 문양은 가로세로 1짜리 상자(-0.5..0.5) 안에 선으로 그린다.
import { TAU } from '../util.js';

export const GLYPH_COUNT = 8;

export function drawGlyph(ctx, id, x, y, size, color, lw = 0.085) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size, size);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (id) {
    case 0: // 소용돌이
      for (let a = 0; a <= TAU * 2.1; a += 0.15) { const r = 0.05 + a * 0.031; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke(); break;
    case 1: // 물결 + 위에 점
    case 2: // 물결 + 아래에 점
      ctx.moveTo(-0.4, 0); ctx.bezierCurveTo(-0.25, -0.28, -0.12, -0.28, 0, 0); ctx.bezierCurveTo(0.12, 0.28, 0.25, 0.28, 0.4, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(id === 1 ? 0.2 : -0.2, id === 1 ? -0.3 : 0.3, 0.07, 0, TAU); ctx.fill(); break;
    case 3: // 초승달과 별
      ctx.arc(-0.05, 0, 0.34, Math.PI * 0.42, Math.PI * 1.58); ctx.quadraticCurveTo(-0.22, 0, -0.105, 0.33); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.26, -0.2); ctx.lineTo(0.26, 0.04); ctx.moveTo(0.14, -0.08); ctx.lineTo(0.38, -0.08); ctx.stroke(); break;
    case 4: // 물고기 뼈
      ctx.moveTo(-0.38, 0); ctx.lineTo(0.3, 0);
      for (const bx of [-0.2, 0, 0.2]) { ctx.moveTo(bx - 0.09, -0.24); ctx.lineTo(bx, 0); ctx.lineTo(bx - 0.09, 0.24); }
      ctx.moveTo(0.3, 0); ctx.lineTo(0.42, -0.14); ctx.moveTo(0.3, 0); ctx.lineTo(0.42, 0.14);
      ctx.stroke(); break;
    case 5: // 물방울 셋
      for (const [dx, dy] of [[0, -0.2], [-0.22, 0.17], [0.22, 0.17]]) {
        ctx.moveTo(dx, dy - 0.17); ctx.bezierCurveTo(dx + 0.16, dy + 0.02, dx + 0.1, dy + 0.15, dx, dy + 0.15); ctx.bezierCurveTo(dx - 0.1, dy + 0.15, dx - 0.16, dy + 0.02, dx, dy - 0.17);
      }
      ctx.stroke(); break;
    case 6: // 눈
      ctx.moveTo(-0.4, 0); ctx.quadraticCurveTo(0, -0.36, 0.4, 0); ctx.quadraticCurveTo(0, 0.36, -0.4, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 0.1, 0, TAU); ctx.fill(); break;
    default: // 왕관
      ctx.moveTo(-0.36, 0.22); ctx.lineTo(-0.36, -0.2); ctx.lineTo(-0.16, 0.04); ctx.lineTo(0, -0.28); ctx.lineTo(0.16, 0.04); ctx.lineTo(0.36, -0.2); ctx.lineTo(0.36, 0.22); ctx.closePath(); ctx.stroke(); break;
  }
  ctx.restore();
}
