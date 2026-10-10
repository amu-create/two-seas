// 4장 · 어둠의 물길 — 내 주변은 안 보이고 짝의 주변만 보인다. 서로의 눈이 되어 준다.
import { Vents } from '../puzzles/vents.js';
import { Gates } from '../puzzles/gates.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter4() {
  return chapter({
    id: 4, title: '어둠의 물길', subtitle: '4장 · 서로의 눈',
    endTitle: '4장 · 끝', endLine: '멀리 두 개의 달이 떠오른다', endNext: '마지막 장에서 계속',
    stack: true, dark: { x0: 12.5, x1: 87 },
    length: 106, bounds: { min: -6.6, max: 102.6 },
    solids: [
      ground(-8, 20), ground(22.2, 28), ground(30.4, 35), ground(36.8, 44),
      ground(44, 52, 'stone', 2.8), ground(52, 54, 'stone', 1.4), ground(54, 105, 'stone'),
    ],
    checkpoints: cps([2.9, 14.4, 23.4, 31.4, 38, { x: 47, y: 2.8 }, 55.2, 63.8, 70.2, 80.4, 88.6]),
    puzzles: [
      new Gates({ id: 'r1', y: 2.8, ty: 0, groups: [[45.5]], seenBy: 'both', target: { kind: 'riser', x: 41.6, w: 2.4, h: 1.45 } }),
      new Gates({ id: 'd1', groups: [[57, 58.5, 60], [65, 66.5, 68]], seenBy: 'both', target: { kind: 'door', x: 62.4, w: 0.95, h: 4.3 } }),
      new Vents({ id: 'hall', seenBy: 'both', vents: [{ x: 72.6, w: 2, period: 6.4, on: 1.4, phase: 0 }, { x: 76.4, w: 2, period: 6.4, on: 1.4, phase: 3.2 }] }),
    ],
    beats: {
      a: { when: (g) => g.bothPast(37.2), dur: 2.0 },
      b: { when: (g) => g.bothPast(54.4), dur: 2.0 },
      c: { when: (g) => g.bothPast(63.6), dur: 2.0 },
      d: { when: (g) => g.bothPast(87.4), dur: 2.4 },
    },
    end: { when: (g) => g.bothIn(92.4, 99.5), spots: [94.95, 96.05], y: 0, camX: 95.5, flip: false },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.sign(g, ctx, 9.4, 0, 'dark'); P.moonArch(g, ctx, 95.5); },
  });
}
