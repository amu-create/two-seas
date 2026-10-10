// 1장 · 오로라 다리 — 서로 다른 화면이라는 규칙을 배운다
// 좌표: x는 오른쪽으로, y는 위로. 땅 높이는 0. 한 칸 = 고양이 키와 비슷.
import { Planks } from '../puzzles/planks.js';
import { Vents } from '../puzzles/vents.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Lanterns } from '../puzzles/lanterns.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter1() {
  return chapter({
    id: 1, title: '두 개의 바다', subtitle: '1장 · 오로라 다리',
    endTitle: '1장 · 끝', endLine: '서로의 바다가 뒤바뀌었다', endNext: '2장에서 계속',
    length: 132, bounds: { min: -6.6, max: 129.6 },
    solids: [
      ground(-8, 10, 'pier'), ground(10, 13, 'rock', 0.9), ground(13, 20),
      ground(22.4, 30), ground(37.2, 39.6), ground(46.8, 54),
      ground(54, 80, 'stone'), ground(80, 91, 'stone'), ground(91, 112), ground(118, 131),
    ],
    checkpoints: cps([2.9, 14.6, 24.4, 38.4, 49, 59.7, 67.9, 78.7, 82.6, 91.2, 119.6]),
    puzzles: [
      new Planks({ id: 'tease', x: 20, n: 2, mode: 'tease' }),
      new Planks({ id: 'br1', x: 30, n: 6 }),
      new Planks({ id: 'br2', x: 39.6, n: 6 }),
      new Vents({
        id: 'hall',
        // 첫 장이라 느긋하게: 불꽃이 꺼져 있는 시간이 5초쯤 된다
        vents: [
          { x: 56.2, w: 2.2, period: 6.4, on: 1.2, phase: 0 },
          { x: 61.6, w: 1.9, period: 6.6, on: 1.3, phase: 0.4 },
          { x: 64.9, w: 1.9, period: 6.6, on: 1.3, phase: 3.6 },
        ],
        wave: { x0: 69.6, x1: 77.2, speed: 3.4, period: 5.4, h: 0.58, w: 0.6 },
      }),
      new GlyphGate({ id: 'gate', beatId: 'p3', murals: [80.9, 82.9, 84.9], muralY: 3.0, deviceX: 86.5, gate: { x: 88, w: 0.95, h: 4.3 } }),
      new Lanterns({ id: 'lamps', beatId: 'p4', rows: [{ xs: [94, 95.3, 96.6, 97.9] }, { xs: [101.3, 102.6, 103.9, 105.2] }], stoneX: 99.6, bridge: { x: 112, w: 6 } }),
      // 마지막 섬: 화면이 뒤바뀐 뒤에야 "상대의 세계"가 보이는 것들 (2장 예고)
      new Vents({ id: 'tail', harmless: true, vents: [{ x: 126.6, w: 1.5, period: 2.4, on: 1.2, phase: 0.3 }] }),
      new Planks({ id: 'next', x: 131, n: 5 }),
    ],
    beats: {
      p1: { when: (g) => g.bothPast(47.3), dur: 2.2 },
      p2: { when: (g) => g.bothPast(78.3), dur: 2.2 },
      p3: { focus: 88.4, dur: 2.8 },
      p4: { focus: 115, dur: 2.8 },
    },
    end: { when: (g) => g.pz('lamps').open && g.bothIn(121.6, 128.5), spots: [123.95, 125.05], y: 0, camX: 124.5, flip: true },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.colonnade(g, ctx, 54.6, 79.4); P.wall(g, ctx, 79.6, 88.2); P.moonArch(g, ctx, 124.5); },
  });
}
