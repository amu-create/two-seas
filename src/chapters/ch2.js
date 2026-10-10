// 2장 · 뒤바뀐 바다 — 서로의 눈이 바뀌었다. 목말 타기와 누름돌(밟아 주기)을 배운다.
import { Planks } from '../puzzles/planks.js';
import { Vents } from '../puzzles/vents.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Gates } from '../puzzles/gates.js';
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
      new Gates({ id: 'r1', y: 2.8, ty: 0, groups: [[13.5]], seenBy: 'both', target: { kind: 'riser', x: 9.6, w: 2.4, h: 1.45 } }),
      new Planks({ id: 'br1', x: 30, n: 7 }),
      new Planks({ id: 'br2', x: 40.8, n: 5 }),
      // 문 양쪽의 누름돌: 진짜는 빛의 눈(이번 장에서는 2P)에만 보인다
      new Gates({ id: 'd1', groups: [[50.2, 51.7, 53.2], [58.4, 59.9, 61.4]], seenBy: 0, target: { kind: 'door', x: 55.6, w: 0.95, h: 4.3 } }),
      new Vents({ id: 'hall', vents: [{ x: 64.4, w: 2, period: 6, on: 1.4, phase: 0 }, { x: 67.8, w: 2, period: 6, on: 1.4, phase: 3 }] }),
      new GlyphGate({ id: 'gate', beatId: 'g1', murals: [74.6, 76.6, 78.6], muralY: 3.0, deviceX: 80.3, gate: { x: 82, w: 0.95, h: 4.3 } }),
    ],
    beats: {
      s1: { when: (g) => g.bothPast(20.4), dur: 2.2 },
      b1: { when: (g) => g.bothPast(47.3), dur: 2.2 },
      d1: { when: (g) => g.bothPast(62.2), dur: 2.2 },
      g1: { focus: 82.4, dur: 2.8 },
    },
    end: { when: (g) => g.pz('gate').open && g.bothIn(88.4, 95.5), spots: [90.95, 92.05], y: 0, camX: 91.5, flip: true },
    drawBack(g, ctx) { P.sign(g, ctx, 7.6, 0, 'stack'); P.sign(g, ctx, 15.6, 2.8, 'hold'); P.sign(g, ctx, 48.9, 0, 'hold'); P.colonnade(g, ctx, 49, 70.4); P.wall(g, ctx, 73.2, 82.2); P.moonArch(g, ctx, 91.5); },
  });
}
