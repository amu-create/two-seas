// 5장 · 두 개의 달 — 실 당기기를 배우고, 바다가 두 번 뒤바뀌는 가운데 지금까지의 모든 것을 쓴다
import { Links } from '../puzzles/worlds.js';
import { Vents } from '../puzzles/vents.js';
import { Movers } from '../puzzles/movers.js';
import { Lift } from '../puzzles/lift.js';
import { Lanterns } from '../puzzles/lanterns.js';
import { Bubbles } from '../puzzles/bubbles.js';
import { Echo } from '../puzzles/echo.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import { sat } from '../util.js';
import * as P from '../render/props.js';

export function makeChapter5() {
  return chapter({
    id: 5, title: '두 개의 달', subtitle: '마지막 장 · 지금까지의 모든 것',
    endTitle: '끝', endLine: '두 개의 바다, 하나의 달', endNext: '함께해 줘서 고마워요',
    stack: true, final: true,
    // 마지막 장은 지금까지의 도구를 구간마다 바꿔 쥔다: 실 → (벼랑 밑) 방울 → 실 → 메아리
    tool: (g) => { const me = g.me; return me.x < 72 ? 'pull' : me.x < 84.6 && me.y < 8 ? 'bubble' : me.x < 99 ? 'pull' : me.x < 128 ? 'echo' : null; },
    length: 158, bounds: { min: -6.6, max: 154.6 },
    solids: [
      ground(-8, 10), ground(10, 20, 'stone', 2.8), ground(28, 34, 'stone', 2.8), ground(34, 36, 'stone', 1.4), ground(36, 40),
      ground(48.4, 50, 'stone'), ground(60, 62, 'stone'), ground(62, 70), ground(70, 84, 'stone', 4.6), ground(84, 104, 'stone', 9.4), ground(114, 157, 'stone', 9.4),
    ],
    checkpoints: cps([2.9, { x: 12.4, y: 2.8 }, { x: 29.4, y: 2.8 }, 37, 49.2, 63, { x: 73.6, y: 4.6 }, { x: 87.4, y: 9.4 }, { x: 101, y: 9.4 }, { x: 115.6, y: 9.4 }, { x: 126.4, y: 9.4 }, { x: 144.2, y: 9.4 }]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 15, y: 6.4, world: 1 }, { x: 79, y: 10.5, world: 0 }, { x: 120.7, y: 12.0, world: 1 }] }),   // 별조각 셋: 안 모아도 되지만, 이 장의 손발을 한 번 더 궁리해야 닿는다
      // 넓은 틈(8칸): 나룻배 발판은 빛의 세계에만 있다. 먼저 건넌 쪽이 실을 당겨 주면 짝은 허공을 건너온다.
      new Movers({ id: 'ferry', seenBy: 0, list: [{ x0: 20.3, x1: 25.5, y: 2.8, w: 2.2, period: 8, phase: 0 }] }),
      // 반쪽 다리 (바다가 뒤바뀐 뒤라 누가 어느 반쪽을 가졌는지도 바뀌어 있다)
      new Links({ id: 'br1', things: [{ kind: 'bridge', world: 0, x: 40, w: 4.8 }, { kind: 'bridge', world: 1, x: 44.8, w: 3.6 }] }),
      // 곁얼음: 물길 위에 한 사람의 세계에는 얼음길이 다 얼어 있고, 다른 사람의 세계에는 짝의 곁에서만 얼음이 언다 → 꼭 붙어서 같이 걷는다.
      // 얼음길 주인에게만 보이는 불꽃이 길 가운데서 솟는다 → "멈춰!" 하면 둘 다 멈춰야 한다.
      new Links({ id: 'ice', things: [{ kind: 'bridge', look: 'ice', world: 0, x: 50, w: 10 }, { kind: 'aura', world: 1, x: 50, w: 10, r: 2.3 }] }),
      new Vents({ id: 'hall', seenBy: 0, vents: [{ x: 54.4, w: 1.6, period: 5.4, on: 1.6, phase: 0 }] }),
      new Lift({ id: 'lift', x: 67.5, w: 2.5, y0: 0, y1: 4.6, cranks: [{ x: 64.4, y: 0 }, { x: 72.4, y: 4.6 }] }),
      new Vents({ id: 'jet', seenBy: 1, vents: [{ x: 67.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 0 }] }),
      new Vents({ id: 'jet0', seenBy: 0, vents: [{ x: 67.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 2.75 }] }),
      // 높은 벼랑(4.8칸): 한 명이 밑에서 방울을 불어 짝을 올려 보내고, 올라간 쪽이 실을 당겨 짝을 끌어올린다 (방울 + 실)
      new Bubbles({ id: 'bub' }),
      // 메아리 둘: 빛의 세계에만 있는 다리(빛이 녹화, 그림자가 탄다) → 빛의 세계에만 깔린 불바닥(그림자가 녹화, 빛이 탄다)
      new Echo({ id: 'echo' }),
      new Links({ id: 'e1', things: [{ kind: 'bridge', world: 0, x: 104, w: 10, y: 9.4 }] }),
      new Links({ id: 'e2', things: [{ kind: 'flame', world: 0, x: 118.4, w: 4.6, y: 9.4, h: 0.8, burn: true }] }),
      new Lanterns({ id: 'lamps', beatId: 'moon', y: 9.4, rows: [{ xs: [130, 131.3, 132.6, 133.9] }, { xs: [137.3, 138.6, 139.9, 141.2] }], stoneX: 135.6 }),
    ],
    beats: {
      up: { when: (g) => g.bothPast(10.4) && g.me.y > 2.5 && g.other.y > 2.5, dur: 2.0 },
      f1: { when: (g) => g.bothPast(28.6), dur: 2.6, flip: true },          // 바다가 뒤바뀐다
      f2: { when: (g) => g.bothPast(62.6), dur: 2.6, flip: true },          // 다시 제자리로
      top: { when: (g) => g.bothPast(70.6) && g.me.y > 4 && g.other.y > 4, dur: 2.0 },
      c2: { when: (g) => g.bothPast(84.6) && g.me.y > 9 && g.other.y > 9, dur: 2.0 },
      e1: { when: (g) => g.bothPast(114.6) && g.me.y > 9 && g.other.y > 9, dur: 2.0 },
      e2: { when: (g) => g.bothPast(123.6) && g.me.y > 9 && g.other.y > 9, dur: 2.0 },
      moon: { focus: 148, dur: 3.0 },
    },
    end: { when: (g) => g.pz('lamps').open && g.bothIn(145.4, 152.5), spots: [147.45, 148.55], y: 9.4, camX: 148, flip: false },
    drawBack(g, ctx) {
      P.boat(g, ctx, -3.4); P.sign(g, ctx, 6.4, 0, 'stack'); P.sign(g, ctx, 15.4, 2.8, 'pull'); P.sign(g, ctx, 62.6, 0, 'crank'); P.sign(g, ctx, 76.4, 4.6, 'bubble'); P.sign(g, ctx, 90.6, 9.4, 'pull'); P.sign(g, ctx, 99.6, 9.4, 'echo');
      const st = g.pz('lamps'); // 등불을 다 켜면 달문 안에서 두 달이 하나로 겹친다
      P.moonArch(g, ctx, 148, 9.4, st.open ? 0.35 + 0.65 * sat((g.tc - st.open) / 3) : 0.3);
    },
  });
}
