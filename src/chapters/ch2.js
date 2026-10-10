// 2장 · 뒤바뀐 바다 — 서로의 눈이 바뀌었다. 목말 타기와 누름돌(밟아 주기)을 배운다.
import { Links } from '../puzzles/worlds.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter2() {
  return chapter({
    id: 2, title: '뒤바뀐 바다', subtitle: '2장 · 서로의 눈으로',
    endTitle: '2장 · 끝', endLine: '바다가 제자리로 돌아왔다', endNext: '3장에서 계속',
    swap: true, stack: true,
    length: 102, bounds: { min: -6.6, max: 98.6 },
    solids: [
      ground(-8, 12), ground(12, 18, 'stone', 2.8), ground(18, 20, 'stone', 1.4), ground(20, 30),
      ground(38.4, 40.8), ground(46.8, 72, 'stone'), ground(72, 101),
    ],
    checkpoints: cps([2.9, { x: 14.6, y: 2.8 }, 21.6, 39.6, 48.2, 57.4, 62.6, 71.2, 76, 84]),
    puzzles: [
      // 높은 턱: 한 명이 받쳐 주면(목말) 한 명이 올라가고, 위에서 누름돌을 밟아 주면 아래 받침돌이 솟는다
      new Links({ id: 'r1', keys: [{ x: 13.5, y: 2.8, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 9.6, w: 2.4, h: 1.45, key: 0 }] }),
      // 반쪽 다리: 앞 절반은 빛의 세계에만, 뒤 절반은 그림자의 세계에만 있다 → 번갈아 머리에 태워서 건넌다
      new Links({ id: 'br1', things: [{ kind: 'bridge', world: 0, x: 30, w: 4.8 }, { kind: 'bridge', world: 1, x: 34.8, w: 3.6 }] }),
      new Links({ id: 'br2', things: [{ kind: 'bridge', world: 1, x: 40.8, w: 2.4 }, { kind: 'bridge', world: 0, x: 43.2, w: 3.6 }] }),
      // 서로 열어 주는 문: 내 문은 내 세계에만 있고, 여는 돌은 짝의 세계에만 있다
      new Links({ id: 'd1', keys: [{ x: 52.2, world: 0 }, { x: 58.6, world: 1 }], things: [{ kind: 'door', world: 1, x: 55.6, w: 0.95, key: 0 }, { kind: 'door', world: 0, x: 61.4, w: 0.95, key: 1 }] }),
      // 불 둘은 그림자의 세계에, 끄는 돌 둘은 빛의 세계에. 문양이 엇갈려 있다.
      new Links({
        id: 'hall',
        keys: [{ x: 69.4, world: 0, mark: 6 }, { x: 70.7, world: 0, mark: 3 }],
        things: [{ kind: 'flame', world: 1, x: 64.6, w: 1.6, key: 1, mark: 3 }, { kind: 'flame', world: 1, x: 67.2, w: 1.6, key: 0, mark: 6 }],
      }),
      new GlyphGate({ id: 'gate', beatId: 'g1', murals: [74.6, 76.6, 78.6], muralY: 3.0, deviceX: 80.3, gate: { x: 82, w: 0.95, h: 4.3 } }),
    ],
    beats: {
      s1: { when: (g) => g.bothPast(20.4), dur: 2.2 },
      b1: { when: (g) => g.bothPast(47.3), dur: 2.2 },
      d1: { when: (g) => g.bothPast(62.6), dur: 2.2 },
      g1: { focus: 82.4, dur: 2.8 },
    },
    end: { when: (g) => g.pz('gate').open && g.bothIn(88.4, 95.5), spots: [90.95, 92.05], y: 0, camX: 91.5, flip: true },
    drawBack(g, ctx) { P.sign(g, ctx, 7.6, 0, 'stack'); P.sign(g, ctx, 15.6, 2.8, 'hold'); P.sign(g, ctx, 26.6, 0, 'ride'); P.sign(g, ctx, 48.9, 0, 'link'); P.colonnade(g, ctx, 49, 70.4); P.wall(g, ctx, 73.2, 82.2); P.moonArch(g, ctx, 91.5); },
  });
}
