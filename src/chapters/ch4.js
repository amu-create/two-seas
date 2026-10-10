// 4장 · 어둠의 물길 — 내 주변은 안 보이고 짝의 주변만 보인다. 서로의 눈이 되어 준다.
import { Vents } from '../puzzles/vents.js';
import { Links } from '../puzzles/worlds.js';
import { Box } from '../puzzles/box.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter4() {
  return chapter({
    id: 4, title: '어둠의 물길', subtitle: '4장 · 서로의 눈',
    endTitle: '4장 · 끝', endLine: '멀리 두 개의 달이 떠오른다', endNext: '마지막 장에서 계속',
    stack: true, dark: { x0: 12.5, x1: 87 },
    length: 106, bounds: { min: -6.6, max: 102.6 },
    solids: [
      ground(-8, 20), ground(22.2, 28), ground(34, 44),   // 28~34는 낭떠러지 (빛의 세계에만 다리가 있다)
      ground(44, 52, 'stone', 2.8), ground(52, 54, 'stone', 1.4), ground(54, 105, 'stone'),
    ],
    checkpoints: cps([2.9, 14.4, 23.4, 36.4, { x: 47, y: 2.8 }, 55.2, 63.8, 70.6, 80.4, 88.6]),
    puzzles: [
      // 어둠 속의 낭떠러지와 상자: 이번엔 빛에게 다리와 상자가 있고, 그림자는 길이 끊겨 있다.
      // 어둠 속에서는 짝의 둘레만 보이므로, 상자를 미는 사람은 "짝 쪽에 상자가 보일 때까지" 밀어야 한다.
      new Links({ id: 'pit', things: [{ kind: 'bridge', world: 0, x: 28, w: 6 }] }),
      new Box({ id: 'box1', x: 35.3, min: 28.3, max: 38.5 }),
      new Links({ id: 'r1', keys: [{ x: 45.5, y: 2.8, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 41.6, w: 2.4, h: 1.45, key: 0 }] }),
      // 서로 열어 주는 문 (어둠 속: 내 돌은 짝의 둘레가 비칠 때만 보인다)
      new Links({ id: 'd1', keys: [{ x: 58.8, world: 1 }, { x: 65.2, world: 0 }], things: [{ kind: 'door', world: 0, x: 62.4, w: 0.95, key: 0 }, { kind: 'door', world: 1, x: 68.2, w: 0.95, key: 1 }] }),
      new Vents({ id: 'hall', seenBy: 'both', vents: [{ x: 72.6, w: 2, period: 6.4, on: 1.4, phase: 0 }, { x: 76.4, w: 2, period: 6.4, on: 1.4, phase: 3.2 }] }),
    ],
    beats: {
      a: { when: (g) => g.bothPast(37.2), dur: 2.0 },
      b: { when: (g) => g.bothPast(54.4), dur: 2.0 },
      c: { when: (g) => g.bothPast(69.5), dur: 2.0 },
      d: { when: (g) => g.bothPast(87.4), dur: 2.4 },
    },
    end: { when: (g) => g.bothIn(92.4, 99.5), spots: [94.95, 96.05], y: 0, camX: 95.5, flip: false },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.sign(g, ctx, 9.4, 0, 'dark'); P.moonArch(g, ctx, 95.5); },
  });
}
