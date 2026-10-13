// 3장 · 메아리의 탑 — 역할이 나뉜다.  1P = 메아리(내 움직임을 녹화하면 그 유령이 짝의 세계에 나타난다)
//                                      2P = 멈춤(내 둘레의 시간을 4초 멈춘다. 구간마다 횟수가 정해져 있다)
// 1P의 세계의 불은 1P만 본다 → 1P가 "지금 멈춰!"를 부르고, 2P가 불 옆에 서서 멈춘다.
// 1P의 메아리는 2P의 세계에 있다 → 2P가 메아리를 타고, 메아리가 뛰어오른 꼭대기에서 2P가 시간을 멈춘다.
import { Vents } from '../puzzles/vents.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Links } from '../puzzles/worlds.js';
import { Echo } from '../puzzles/echo.js';
import { Freeze } from '../puzzles/freeze.js';
import { Movers } from '../puzzles/movers.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter3() {
  return chapter({
    id: 3, title: '메아리의 탑', subtitle: '3장 · 메아리와 멈춘 시간',
    endTitle: '3장 · 끝', endLine: '멈춘 시간 속에서도 우리는 같이 걸었다', endNext: '4장에서 계속',
    stack: false, swap: false,
    tool: (g) => (g.role === 0 ? 'echo' : 'freeze'),
    length: 132, bounds: { min: -6.6, max: 128.6 },
    solids: [
      ground(-8, 10), ground(20.6, 50), ground(50, 82, 'stone', 4.6), ground(94, 100, 'stone', 4.6), ground(100, 132),
    ],
    checkpoints: cps([2.9, 22, 37.6, 44, { x: 52, y: 4.6 }, { x: 61, y: 4.6 }, { x: 70, y: 4.6 }, { x: 80.6, y: 4.6 }, { x: 95.6, y: 4.6 }, 102]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 15.3, y: 2.0, world: 1 }, { x: 31.3, y: 3.0, world: 0 }, { x: 88.0, y: 6.8, world: 1 }] }),
      new Echo({ id: 'echo' }),
      new Freeze({ id: 'fz', zones: [{ x0: 23, x1: 40, n: 3 }, { x0: 40, x1: 50, n: 2 }, { x0: 80, x1: 96, n: 2 }] }),
      // ① 1P의 세계에만 다리가 있다. 1P가 다리를 걷는 모습을 녹화하면, 그 메아리가 2P에게는 허공을 건너는 탈것이 된다.
      new Links({ id: 'f1', things: [{ kind: 'bridge', world: 0, x: 10, w: 10.6 }] }),
      // ② 불 복도: 1P의 세계의 불은 1P만 보고, 거의 쉬지 않는다. 꺼진 순간에 2P가 옆에서 시간을 멈춰야 지나간다. 두 불은 함께 꺼지는 때가 없다.
      new Vents({ id: 'jet', seenBy: 0, vents: [{ x: 28.0, w: 1.6, period: 3.0, on: 2.5, phase: 0 }, { x: 33.0, w: 1.6, period: 3.0, on: 2.5, phase: 1.5 }] }),
      // ③ 높은 벽: 1P가 벽 앞에서 뛰는 모습을 녹화 → 2P가 메아리 머리에 타고 → 꼭대기에서 2P가 시간을 멈추고 뛰어오른다 → 돌 → 1P의 받침돌
      new Links({ id: 'wall', keys: [{ x: 53.2, y: 4.6, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 46.6, w: 2.4, h: 4.6, key: 0 }] }),
      // ④ 돌 둘, 고양이 하나: 2P의 세계의 돌 둘을 동시에 → 하나는 2P, 하나는 1P의 메아리 (1P에게는 돌이 안 보인다 → "세 걸음 더… 거기서 멈춰")
      new Links({ id: 'd1', keys: [{ x: 62.4, y: 4.6, world: 1 }, { x: 64.8, y: 4.6, world: 1 }], things: [{ kind: 'door', world: 'both', x: 67.4, y: 4.6, w: 0.95, key: [0, 1], all: true, latch: true }] }),
      // ⑤ 떠다니는 발판과 불: 1P의 세계에는 발판 하나, 그 길 한가운데 불. 2P는 자기 세계의 다리를 따라 걸으며 불이든 발판이든 멈춰 준다.
      new Links({ id: 'pit', things: [{ kind: 'bridge', world: 1, x: 82, w: 12, y: 4.6 }] }),
      new Movers({ id: 'mov', seenBy: 0, list: [{ x0: 82.1, x1: 91.5, y: 4.6, w: 2.4, period: 9, phase: 0 }] }),
      new Vents({ id: 'pjet', seenBy: 0, vents: [{ x: 87.2, w: 1.6, y: 4.6, period: 2.4, on: 1.5, phase: 0.6 }] }),
      // ⑥ 문양 문: 판마다 바뀌는 문양
      new GlyphGate({ id: 'gate', beatId: 'g1', murals: [106.6, 108.6, 110.6], muralY: 3.0, deviceX: 112.3, gate: { x: 114, w: 0.95, h: 4.3 } }),
    ],
    beats: {
      m1: { when: (g) => g.bothPast(21.2), dur: 2.2 },
      v1: { when: (g) => g.bothPast(37.2), dur: 2.0 },
      e1: { when: (g) => g.bothPast(51) && g.me.y > 4 && g.other.y > 4, dur: 2.2 },
      d1: { when: (g) => g.bothPast(68.6), dur: 2.0 },
      p1: { when: (g) => g.bothPast(95) && g.me.y > 4 && g.other.y > 4, dur: 2.0 },
      g1: { focus: 114.4, dur: 2.8 },
    },
    end: { when: (g) => g.pz('gate').open && g.bothIn(119.4, 126.5), spots: [121.95, 123.05], y: 0, camX: 122.5, flip: false },
    drawBack(g, ctx) {
      P.boat(g, ctx, -3.4); P.sign(g, ctx, 6.4, 0, 'echo'); P.sign(g, ctx, 25.0, 0, 'freeze'); P.sign(g, ctx, 58.6, 4.6, 'echo2');
      P.wall(g, ctx, 105.4, 114.2); P.moonArch(g, ctx, 122.5);
    },
  });
}
