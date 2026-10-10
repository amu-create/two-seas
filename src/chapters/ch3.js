// 3장 · 조류의 탑 — 한쪽 세계에만 있는 떠다니는 발판(머리에 태워 건넌다)과, 한 명이 올려 주는 승강기
import { Vents } from '../puzzles/vents.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Movers } from '../puzzles/movers.js';
import { Lift } from '../puzzles/lift.js';
import { Links } from '../puzzles/worlds.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter3() {
  return chapter({
    id: 3, title: '조류의 탑', subtitle: '3장 · 보이지 않는 발판',
    endTitle: '3장 · 끝', endLine: '탑 너머는 빛이 닿지 않는 물길', endNext: '4장에서 계속',
    stack: true,
    length: 106, bounds: { min: -6.6, max: 102.6 },
    solids: [
      ground(-8, 10), ground(22, 34), ground(34, 48, 'stone', 4.6), ground(60, 70, 'stone', 4.6),
      ground(70, 72, 'stone', 3.1), ground(72, 74, 'stone', 1.6), ground(74, 105),
    ],
    checkpoints: cps([2.9, 23.4, { x: 38.4, y: 4.6 }, { x: 61.2, y: 4.6 }, 75.6, 89.6]),
    puzzles: [
      // 떠다니는 발판 둘은 빛의 세계에만 있다. 그림자는 빛의 머리에 타고 건넌다. 둘은 7초마다 한가운데서 맞닿는다.
      new Movers({ id: 'm1', seenBy: 0, list: [{ x0: 10.3, x1: 13.6, y: 0, w: 2.2, period: 7, phase: 0 }, { x0: 19.5, x1: 15.8, y: 0, w: 2.2, period: 7, phase: 0 }] }),
      // 승강기: 손잡이를 누르고 있으면 올라간다. 통로의 불꽃은 세계마다 따로 있다 → 탄 사람만 보고 "멈춰! 지금!" 한다.
      new Lift({ id: 'lift', x: 31.5, w: 2.5, y0: 0, y1: 4.6, cranks: [{ x: 28.4, y: 0 }, { x: 36.4, y: 4.6 }] }),
      new Vents({ id: 'jet', seenBy: 1, vents: [{ x: 31.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 0 }] }),
      new Vents({ id: 'jet0', seenBy: 0, vents: [{ x: 31.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 2.75 }] }),
      // 탑 위의 발판 둘은 그림자의 세계에만 있다 (이번엔 그림자가 태워 준다)
      new Movers({ id: 'm2', seenBy: 1, list: [{ x0: 48.3, x1: 51.6, y: 4.6, w: 2.2, period: 7, phase: 0.8 }, { x0: 57.5, x1: 53.8, y: 4.6, w: 2.2, period: 7, phase: 0.8 }] }),
      new Links({ id: 'top', keys: [{ x: 66.9, y: 4.6, world: 0 }], things: [{ kind: 'flame', world: 1, x: 63.2, w: 1.8, y: 4.6, key: 0 }] }),
      new GlyphGate({ id: 'gate', beatId: 'g1', murals: [80.6, 82.6, 84.6], muralY: 3.0, deviceX: 86.3, gate: { x: 88, w: 0.95, h: 4.3 } }),
    ],
    beats: {
      m1: { when: (g) => g.bothPast(22.6), dur: 2.2 },
      l1: { when: (g) => g.bothPast(34.6) && g.me.y > 4 && g.other.y > 4, dur: 2.2 },
      m2: { when: (g) => g.bothPast(60.6), dur: 2.2 },
      g1: { focus: 88.4, dur: 2.8 },
    },
    end: { when: (g) => g.pz('gate').open && g.bothIn(93.4, 100.5), spots: [95.95, 97.05], y: 0, camX: 96.5, flip: false },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.sign(g, ctx, 6.6, 0, 'ride'); P.sign(g, ctx, 26.2, 0, 'crank'); P.wall(g, ctx, 79.4, 88.2); P.moonArch(g, ctx, 96.5); },
  });
}
