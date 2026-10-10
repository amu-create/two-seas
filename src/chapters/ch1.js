// 1장 · 오로라 다리 — "내 눈에 보이는 것만 내 세계에 있다"는 규칙을 배운다
// 좌표: x는 오른쪽으로, y는 위로. 땅 높이는 0. 한 칸 = 고양이 키와 비슷.
import { Links } from '../puzzles/worlds.js';
import { Box } from '../puzzles/box.js';
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
      ground(22.4, 30), ground(36, 54),   // 30~36은 낭떠러지 (그림자의 세계에만 다리가 있다)
      ground(54, 80, 'stone'), ground(80, 91, 'stone'), ground(91, 112), ground(118, 131),
    ],
    checkpoints: cps([2.9, 14.6, 24.4, 38.9, 51.6, 56.4, 76.6, 82.6, 91.2, 119.6]),
    puzzles: [
      // ① 낭떠러지와 상자: 빛의 세계는 길이 끊겨 있다. 그림자의 세계에는 다리가 있고, 건너편에 상자가 있다.
      //    그림자가 상자를 밀어 한가운데에 놓아 주면, 빛은 (허공에 뜬) 상자를 밟고 뛰어 건넌다.
      new Links({ id: 'pit', things: [{ kind: 'bridge', world: 1, x: 30, w: 6 }] }),
      new Box({ id: 'box1', x: 37.3, min: 30.3, max: 40.5 }),
      // ② 그림자의 세계에만 있는 문. 여는 돌은 빛의 세계에만 있다 (빛은 문이 없으니 그냥 지나가서 밟아 준다).
      new Links({ id: 'door1', keys: [{ x: 49.6, world: 0 }], things: [{ kind: 'door', world: 1, x: 45.6, w: 0.95, key: 0 }] }),
      // 불의 복도: 불 셋은 그림자의 세계에만 있다. 끄는 돌 셋은 빛의 세계에만 있다. 같은 문양끼리 이어져 있다 → "달 모양 불 꺼 줘!"
      // 그 뒤의 문은 빛의 세계에만 있고, 여는 돌은 그림자의 세계에만 있다.
      new Links({
        id: 'hall',
        keys: [{ x: 66.4, world: 0, mark: 0 }, { x: 67.7, world: 0, mark: 2 }, { x: 69.0, world: 0, mark: 5 }, { x: 71.6, world: 1 }],
        things: [
          { kind: 'flame', world: 1, x: 58.4, w: 1.6, key: 1, mark: 2 },
          { kind: 'flame', world: 1, x: 61.2, w: 1.6, key: 2, mark: 5 },
          { kind: 'flame', world: 1, x: 64.0, w: 1.6, key: 0, mark: 0 },
          { kind: 'door', world: 0, x: 74, w: 0.95, key: 3 },
        ],
      }),
      new GlyphGate({ id: 'gate', beatId: 'p3', murals: [80.9, 82.9, 84.9], muralY: 3.0, deviceX: 86.5, gate: { x: 88, w: 0.95, h: 4.3 } }),
      new Lanterns({ id: 'lamps', beatId: 'p4', rows: [{ xs: [94, 95.3, 96.6, 97.9] }, { xs: [101.3, 102.6, 103.9, 105.2] }], stoneX: 99.6, bridge: { x: 112, w: 6 } }),
    ],
    beats: {
      p1: { when: (g) => g.bothPast(50.6), dur: 2.2 },
      p2: { when: (g) => g.bothPast(78.3), dur: 2.2 },
      p3: { focus: 88.4, dur: 2.8 },
      p4: { focus: 115, dur: 2.8 },
    },
    end: { when: (g) => g.pz('lamps').open && g.bothIn(121.6, 128.5), spots: [123.95, 125.05], y: 0, camX: 124.5, flip: true },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.sign(g, ctx, 26.6, 0, 'box'); P.sign(g, ctx, 41.8, 0, 'link'); P.colonnade(g, ctx, 54.6, 79.4); P.wall(g, ctx, 79.6, 88.2); P.moonArch(g, ctx, 124.5); },
  });
}
