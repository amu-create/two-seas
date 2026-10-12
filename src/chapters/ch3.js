// 3장 · 메아리의 탑 — 이 장의 도구: 메아리. 내 움직임을 녹화하면, 그대로 되풀이하는 유령이 짝의 세계에 나타난다.
// 짝은 그 유령의 머리에 타고 건너고, 유령은 짝의 세계의 돌을 대신 밟아 준다. (이 장에서는 서로의 머리에는 못 탄다)
import { Vents } from '../puzzles/vents.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Lift } from '../puzzles/lift.js';
import { Links } from '../puzzles/worlds.js';
import { Echo } from '../puzzles/echo.js';
import { Lamp } from '../puzzles/lamp.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter3() {
  return chapter({
    id: 3, title: '메아리의 탑', subtitle: '3장 · 내가 걸은 길이 너의 다리',
    endTitle: '3장 · 끝', endLine: '탑 너머는 빛이 닿지 않는 물길', endNext: '4장에서 계속',
    stack: false, tool: 'echo',
    length: 138, bounds: { min: -6.6, max: 134.6 },
    solids: [
      ground(-8, 10), ground(20.6, 34), ground(34, 48, 'stone', 4.6), ground(58.6, 70, 'stone', 4.6),   // 틈은 10.6칸: 빛의 실(13칸)이 닿는 거리 안에서 녹화가 끝나야 한다
      ground(70, 72, 'stone', 3.1), ground(72, 74, 'stone', 1.6), ground(74, 137),
    ],
    checkpoints: cps([2.9, 23.4, { x: 38.4, y: 4.6 }, { x: 61.0, y: 4.6 }, { x: 68.6, y: 4.6 }, 75.6, 86, 95.4, 109.2, 121.6]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 5.5, y: 3.4, world: 0 }, { x: 41, y: 8.2, world: 1 }, { x: 89.8, y: 3.4, world: 0 }] }),   // 별조각 셋: 안 모아도 되지만, 이 장의 손발을 한 번 더 궁리해야 닿는다
      new Echo({ id: 'echo' }),
      // ① 그림자의 세계에만 다리가 있다. 그림자가 다리를 걷는 모습을 녹화하면, 그 메아리가 빛에게는 허공을 건너는 탈것이 된다.
      new Links({ id: 'f1', things: [{ kind: 'bridge', world: 1, x: 10, w: 10.6 }] }),
      // ② 승강기: 통로의 불꽃은 세계마다 따로 있다 → 탄 사람만 보고 "멈춰! 지금!" 한다.
      new Lift({ id: 'lift', x: 31.5, w: 2.5, y0: 0, y1: 4.6, cranks: [{ x: 28.4, y: 0 }, { x: 36.4, y: 4.6 }] }),
      new Vents({ id: 'jet', seenBy: 1, vents: [{ x: 31.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 0 }] }),
      new Vents({ id: 'jet0', seenBy: 0, vents: [{ x: 31.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 2.75 }] }),
      // ③ 탑 위: 이번엔 빛의 세계에만 다리가 있다 → 빛이 녹화하고 그림자가 탄다.
      new Links({ id: 'f2', things: [{ kind: 'bridge', world: 0, x: 48, w: 10.6, y: 4.6 }] }),
      // ④ 불바닥: 그림자의 세계에만 낮은 불이 깔려 있다. 빛은 불이 없으니 그냥 걸어가며 녹화하고, 그림자는 그 메아리의 머리 위에 타서 불 위를 지난다.
      new Links({ id: 'floor', things: [{ kind: 'flame', world: 1, x: 62.4, w: 4.6, y: 4.6, h: 0.8, burn: true }] }),
      // ⑤ 돌 둘, 고양이 하나: 빛의 문은 빛의 세계의 돌 둘을 동시에 밟아야 열린다. 하나는 빛이, 하나는 그림자의 메아리가 밟는다
      //    (그림자에게는 돌이 안 보인다 → "세 걸음 더… 거기서 멈춰"). 다음 문은 반대로.
      new Links({ id: 'd1', keys: [{ x: 78.2, world: 0 }, { x: 81.6, world: 0 }], things: [{ kind: 'door', world: 0, x: 84, w: 0.95, key: [0, 1], all: true, latch: true }] }),
      new Links({ id: 'd2', keys: [{ x: 88.2, world: 1 }, { x: 91.4, world: 1 }], things: [{ kind: 'door', world: 1, x: 94, w: 0.95, key: [0, 1], all: true, latch: true }] }),
      // ⑦ 안개 복도: 불이 세계마다 따로 솟는데, 안개 때문에 불의 주인은 자기 불을 못 본다.
      //    짝이 발바닥 단추를 꾹 눌러 등불을 켜면 그 불이 보인다. 등불 기름은 12초뿐 → 아껴 켜며 "3, 2, 1, 지금!"
      new Lamp({ id: 'lamp', x0: 96.6, x1: 107 }),
      new Vents({ id: 'fogA', seenBy: 1, fog: true, vents: [{ x: 97.4, w: 1.6, period: 4.6, on: 1.7, phase: 0 }, { x: 101.8, w: 1.6, period: 4.6, on: 1.7, phase: 2.1 }] }),
      new Vents({ id: 'fogB', seenBy: 0, fog: true, vents: [{ x: 99.6, w: 1.6, period: 4.6, on: 1.7, phase: 1.2 }, { x: 104.0, w: 1.6, period: 4.6, on: 1.7, phase: 3.3 }] }),
      new GlyphGate({ id: 'gate', beatId: 'g1', murals: [112.6, 114.6, 116.6], muralY: 3.0, deviceX: 118.3, gate: { x: 120, w: 0.95, h: 4.3 } }),
    ],
    beats: {
      m1: { when: (g) => g.bothPast(21.2), dur: 2.2 },
      l1: { when: (g) => g.bothPast(34.6) && g.me.y > 4 && g.other.y > 4, dur: 2.2 },
      m2: { when: (g) => g.bothPast(59.2) && g.me.y > 4 && g.other.y > 4, dur: 2.2 },
      e3: { when: (g) => g.bothPast(67.6) && g.me.y > 4 && g.other.y > 4, dur: 2.0 },
      d1: { when: (g) => g.bothPast(85.3), dur: 2.0 },
      d2: { when: (g) => g.bothPast(95.3), dur: 2.0 },
      fog: { when: (g) => g.bothPast(106.8), dur: 2.0 },
      g1: { focus: 120.4, dur: 2.8 },
    },
    end: { when: (g) => g.pz('gate').open && g.bothIn(125.4, 132.5), spots: [127.95, 129.05], y: 0, camX: 128.5, flip: false },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.sign(g, ctx, 6.4, 0, 'echo'); P.sign(g, ctx, 26.2, 0, 'crank'); P.sign(g, ctx, 76.2, 0, 'echo2'); P.sign(g, ctx, 96.2, 0, 'fog'); P.wall(g, ctx, 111.4, 120.2); P.moonArch(g, ctx, 128.5); },
  });
}
