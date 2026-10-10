// 1장 · 오로라 다리
// 장 하나 = 이 파일 하나. 2장을 만들 때는 이 파일을 복사해 ch2.js로 만들고 chapters/index.js에 한 줄 추가하면 된다.
// 좌표: x는 오른쪽으로, y는 위로. 땅 높이는 0. 한 칸 = 고양이 키와 비슷.
import { Planks } from '../puzzles/planks.js';
import { Vents } from '../puzzles/vents.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Duo } from '../puzzles/duo.js';
import { TAU, rgba, sat, easeOut } from '../util.js';
import { drawGlyph } from '../render/glyphs.js';

const DEEP = -7; // 발판 아래로 충분히 깊게
const ground = (x0, x1, kind = 'rock', top = 0) => ({ x: x0, y: DEEP, w: x1 - x0, h: top - DEEP, kind });

export function makeChapter1() {
  const ch = {
    id: 1,
    title: '두 개의 바다',
    subtitle: '1장 · 오로라 다리',
    endTitle: '1장 · 끝',
    endLine: '서로의 바다가 뒤바뀌었다',
    endNext: '2장에서 계속',
    length: 132,
    bounds: { min: -6.6, max: 129.6 },
    lobbyMax: 9.2,                       // 짝을 기다리는 동안은 부두 위에서만 논다
    spawn: [{ x: 2.2, y: 0 }, { x: 3.6, y: 0 }],
    waterKill: -2.3,
    solids: [
      ground(-8, 10, 'pier'),
      ground(10, 13, 'rock', 0.9),       // 첫 턱: 점프를 배운다
      ground(13, 20),
      // 20~22.4: 첫 가짜 발판(맛보기)
      ground(22.4, 30),
      // 30~37.2 다리 앞쪽 / 37.2~39.6 가운데 바위 / 39.6~46.8 다리 뒤쪽
      ground(37.2, 39.6),
      ground(46.8, 54),
      ground(54, 80, 'stone'),           // 함정 복도
      ground(80, 91, 'stone'),           // 문양의 문
      ground(91, 112),                   // 등불 기둥 두 줄
      // 112~118: 빛의 다리가 놓일 자리
      ground(118, 131),                  // 달문이 있는 마지막 섬
    ],
    checkpoints: [
      { x: 2.9 }, { x: 14.6 }, { x: 24.4 }, { x: 38.4 }, { x: 49 }, { x: 59.7 }, { x: 67.9 }, { x: 78.7 }, { x: 82.6 }, { x: 91.2 }, { x: 119.6 },
    ].map((c) => ({ y: 0, ...c })),
    puzzles: [
      new Planks({ id: 'tease', x: 20, n: 2, mode: 'tease' }),
      new Planks({ id: 'br1', x: 30, n: 6 }),
      new Planks({ id: 'br2', x: 39.6, n: 6 }),
      new Vents({
        id: 'hall',
        // 불꽃: 꺼져 있는 시간이 2초쯤 되어야 "지금 가!"라고 말해주고 건널 여유가 있다
        vents: [
          { x: 56.2, w: 2.2, period: 3.4, on: 1.2, phase: 0 },
          { x: 61.6, w: 1.9, period: 3.6, on: 1.3, phase: 0.4 },
          { x: 64.9, w: 1.9, period: 3.6, on: 1.3, phase: 2.2 },   // 앞 불꽃과의 사이(1.4칸)가 중간 쉼터
        ],
        // 구르는 물결: 낮고 좁아서 "뛰어!" 소리를 듣고 뛰어도 넘을 수 있다
        wave: { x0: 69.6, x1: 77.2, speed: 4.2, period: 2.4, h: 0.58, w: 0.6 },
      }),
      new GlyphGate({ id: 'gate', murals: [80.9, 82.9, 84.9], muralY: 3.0, deviceX: 86.5, gate: { x: 88, w: 0.95, h: 4.3 } }),
      new Duo({ id: 'duo', rows: [{ xs: [94, 95.3, 96.6, 97.9] }, { xs: [101.3, 102.6, 103.9, 105.2] }], stoneX: 99.6, bridge: { x: 112, w: 6 } }),
      // 마지막 섬: 화면이 뒤바뀐 뒤에야 "상대의 세계"가 보이는 것들 (2장 예고)
      new Vents({ id: 'tail', harmless: true, vents: [{ x: 126.6, w: 1.5, period: 2.4, on: 1.2, phase: 0.3 }] }),
      new Planks({ id: 'next', x: 131, n: 5, mode: 'bridge' }),
    ],
    // 박수 칠 순간들: 조건이 되면 방장이 시각을 기록하고, 두 폰이 같은 연출을 튼다
    beats: {
      p1: { when: (g) => g.bothPast(47.3), focus: null, dur: 3.0 },
      p2: { when: (g) => g.bothPast(78.3), focus: null, dur: 3.0 },
      p3: { focus: 88.4, dur: 3.6 },   // 문양을 맞히면 퍼즐이 직접 알린다
      p4: { focus: 115, dur: 3.6 },
    },
    end: { when: (g) => g.bothIn(121.6, 128.5), spots: [123.95, 125.05] },

    drawBack(g, ctx) {
      const pal = g.pal, t = g.t;
      // 타고 온 작은 배
      {
        const bx = -3.4, by = g.view.waterY - 0.02 + Math.sin(t * 1.2) * 0.05;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(t * 0.9) * 0.03);
        ctx.fillStyle = pal.wood; ctx.beginPath(); ctx.moveTo(-1.5, -0.42); ctx.quadraticCurveTo(-1.2, 0.32, 0, 0.32); ctx.quadraticCurveTo(1.2, 0.32, 1.6, -0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = pal.woodHi; ctx.globalAlpha = 0.7; ctx.fillRect(-1.42, -0.44, 2.95, 0.08); ctx.globalAlpha = 1;
        ctx.strokeStyle = pal.woodDark; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(1.5, -0.45); ctx.quadraticCurveTo(2.4, -0.2, 2.9, -1.75); ctx.stroke();
        ctx.restore();
      }
      // 함정 복도: 뒤쪽 기둥과 지붕
      {
        const x0 = 54.6, x1 = 79.4, roof = -4.5;
        ctx.fillStyle = pal.stoneDark;
        for (let x = x0; x <= x1; x += 3.1) {
          ctx.globalAlpha = 0.85; ctx.fillRect(x - 0.3, roof, 0.6, -roof);
          ctx.globalAlpha = 1; ctx.fillRect(x - 0.42, roof, 0.84, 0.22); ctx.fillRect(x - 0.42, -0.2, 0.84, 0.2);
        }
        const rg = ctx.createLinearGradient(0, roof - 0.9, 0, roof);
        rg.addColorStop(0, pal.stone); rg.addColorStop(1, pal.stoneDark);
        ctx.fillStyle = rg; ctx.fillRect(x0 - 0.8, roof - 0.9, x1 - x0 + 1.6, 0.9);
        ctx.fillStyle = pal.top; ctx.globalAlpha = 0.8; ctx.fillRect(x0 - 0.8, roof - 0.9, x1 - x0 + 1.6, 0.1); ctx.globalAlpha = 1;
        // 지붕에서 늘어진 덩굴
        ctx.strokeStyle = pal.top; ctx.lineWidth = 0.05; ctx.globalAlpha = 0.6; ctx.beginPath();
        for (let x = x0; x < x1; x += 1.37) { const len = 0.3 + ((x * 7.3) % 1) * 0.8; ctx.moveTo(x, roof); ctx.quadraticCurveTo(x + Math.sin(t + x) * 0.08, roof + len * 0.6, x + Math.sin(t * 0.8 + x) * 0.12, roof + len); }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      // 문양의 벽
      {
        const x0 = 79.6, x1 = 88.2, top = -5.2;
        const wg = ctx.createLinearGradient(0, top, 0, 0);
        wg.addColorStop(0, pal.stoneDark); wg.addColorStop(1, pal.stone);
        ctx.fillStyle = wg; ctx.globalAlpha = 0.92;
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 0.3, top + 0.6); ctx.quadraticCurveTo(x0 + 0.4, top, x0 + 1.2, top); ctx.lineTo(x1, top); ctx.lineTo(x1, 0); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = pal.top; ctx.globalAlpha = 0.75; ctx.fillRect(x0 + 1, top, x1 - x0 - 1, 0.1); ctx.globalAlpha = 1;
      }
      // 달문: 마지막 섬의 커다란 돌 고리
      {
        const cx = 124.5, cy = -2.55, r = 2.5;
        const glow = 0.5 + 0.2 * Math.sin(t * 1.1) + g.surge * 0.4;
        const gg = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.1);
        gg.addColorStop(0, rgba('#fff6d8', 0.22 * glow)); gg.addColorStop(1, rgba('#fff6d8', 0));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, TAU); ctx.fill();
        ctx.lineWidth = 0.62; ctx.strokeStyle = pal.stoneDark; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        ctx.lineWidth = 0.4; ctx.strokeStyle = pal.stone; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        ctx.lineWidth = 0.05; ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(cx, cy, r + 0.22, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.globalAlpha = 1;
        for (let i = 0; i < 8; i++) { // 고리에 새겨진 문양들
          const a = -Math.PI / 2 + (i - 3.5) * 0.36;
          ctx.globalAlpha = 0.5 + 0.4 * glow; drawGlyph(ctx, i, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.3, pal.warm, 0.12);
        }
        ctx.globalAlpha = 1;
      }
    },

    drawFront() { /* 이 장은 맨 앞에 가리는 것을 두지 않는다 (함정 타이밍을 봐야 하므로) */ },
  };
  return ch;
}
