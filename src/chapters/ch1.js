// 1장 · 오로라 다리 — "내 눈에 보이는 것만 내 세계에 있다"를 배운다. 이 장의 손발: 밀기, 밟아 주기, 그리고 머리에 태우기.
// 좌표: x는 오른쪽으로, y는 위로. 땅 높이는 0. 한 칸 = 고양이 키와 비슷.
import { Links } from '../puzzles/worlds.js';
import { Box } from '../puzzles/box.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Lanterns } from '../puzzles/lanterns.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter1() {
  return chapter({
    id: 1, title: '두 개의 바다', subtitle: '1장 · 오로라 다리',
    endTitle: '1장 · 끝', endLine: '서로의 바다가 뒤바뀌었다', endNext: '2장에서 계속',
    stack: true,
    length: 188, bounds: { min: -6.6, max: 185.6 },
    solids: [
      ground(-8, 10, 'pier'), ground(10, 13, 'rock', 0.9), ground(13, 20.48),   // 첫 점프 틈 1.92칸
      ground(22.4, 30), ground(36, 54),   // 30~36은 낭떠러지 (그림자의 세계에만 다리가 있다)
      ground(54, 80, 'stone'),
      ground(80, 88), ground(88, 94, 'stone', 2.8), ground(94, 96, 'stone', 1.4), ground(96, 104),
      ground(112.4, 114.8), ground(120.8, 147, 'stone'), ground(147, 168), ground(174, 187),
    ],
    checkpoints: cps([2.9, 14.6, 24.4, 38.9, 51.6, 56.4, 76.6, 82.4, { x: 91, y: 2.8 }, 98, 113.6, 122.4, 128, 134, 138.6, 147.6, 175.6]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 25.6, y: 3.4, world: 0 }, { x: 33.0, y: 4.2, world: 1 }, { x: 146.2, y: 3.4, world: 0 }] }),   // 별조각 셋: 안 모아도 되지만, 이 장의 손발을 한 번 더 궁리해야 닿는다
      // ① 낭떠러지와 상자: 빛의 세계는 길이 끊겨 있다. 그림자의 세계에는 다리가 있고, 건너편에 상자가 있다.
      new Links({ id: 'pit', things: [{ kind: 'bridge', world: 1, x: 30, w: 6 }] }),
      new Box({ id: 'box1', x: 37.3, min: 30.3, max: 40.5 }),
      // ② 그림자의 세계에만 있는 문. 여는 돌은 빛의 세계에만 있다.
      new Links({ id: 'door1', keys: [{ x: 49.6, world: 0 }], things: [{ kind: 'door', world: 1, x: 45.6, w: 0.95, key: 0 }] }),
      // ③ 불의 복도: 불 셋은 그림자의 세계에, 끄는 돌 셋은 빛의 세계에. 불의 문양 → (해독표) → 돌의 문양. 짝과 문양은 판마다 바뀐다.
      //    그림자: "첫 불은 소용돌이야" → 빛: (표를 보고) "소용돌이는… 물방울 돌!"
      // ④ 그 뒤의 문은 빛의 세계에만 있고, 여는 돌은 그림자의 세계에만 있다.
      new Links({
        id: 'hall', shuffle: true, codebook: { x: 70.4, world: 0 },   // 불의 문양과 돌의 문양이 다르다: 짝을 지은 표는 빛의 세계에만
        keys: [{ x: 66.4, world: 0, mark: 0 }, { x: 67.7, world: 0, mark: 2 }, { x: 69.0, world: 0, mark: 5 }, { x: 71.6, world: 1 }],
        things: [
          { kind: 'flame', world: 1, x: 58.4, w: 1.6, key: 1, mark: 2 },
          { kind: 'flame', world: 1, x: 61.2, w: 1.6, key: 2, mark: 5 },
          { kind: 'flame', world: 1, x: 64.0, w: 1.6, key: 0, mark: 0 },
          { kind: 'door', world: 0, x: 74, w: 0.95, key: 3 },
        ],
      }),
      // ⑤ 높은 턱: 한 명이 받쳐 주면(목말) 한 명이 올라가고, 위에서 누름돌을 밟아 주면 아래 받침돌이 솟는다
      new Links({ id: 'r1', keys: [{ x: 89.5, y: 2.8, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 85.6, w: 2.4, h: 1.45, key: 0 }] }),
      // ⑥ 반쪽 다리: 앞 절반은 빛의 세계에만, 뒤 절반은 그림자의 세계에만 → 번갈아 머리에 태워서 건넌다
      new Links({ id: 'br1', things: [{ kind: 'bridge', world: 0, x: 104, w: 4.8 }, { kind: 'bridge', world: 1, x: 108.8, w: 3.6 }] }),
      new Links({ id: 'br2', things: [{ kind: 'bridge', world: 1, x: 114.8, w: 2.4 }, { kind: 'bridge', world: 0, x: 117.2, w: 3.6 }] }),
      // ⑦ 유령 벽: 내 세계에만 서 있는 높은 벽. 벽이 안 보이는 짝을 벽 앞에 세워 놓고("조금 더… 거기!") 머리를 밟고 넘는다.
      new Links({ id: 'walls', things: [{ kind: 'wall', world: 1, x: 125, w: 1.0 }, { kind: 'wall', world: 0, x: 131, w: 1.0 }] }),
      new GlyphGate({ id: 'gate', beatId: 'p3', murals: [136.9, 138.9, 140.9], muralY: 3.0, deviceX: 142.5, gate: { x: 144, w: 0.95, h: 4.3 } }),
      new Lanterns({ id: 'lamps', beatId: 'p4', rows: [{ xs: [150, 151.3, 152.6, 153.9] }, { xs: [157.3, 158.6, 159.9, 161.2] }], stoneX: 155.6, bridge: { x: 168, w: 6 } }),
    ],
    beats: {
      p1: { when: (g) => g.bothPast(50.6), dur: 2.2 },
      p2: { when: (g) => g.bothPast(78.3), dur: 2.2 },
      s1: { when: (g) => g.bothPast(96.4), dur: 2.0 },
      b1: { when: (g) => g.bothPast(121.3), dur: 2.2 },
      w1: { when: (g) => g.bothPast(132.6), dur: 2.0 },
      p3: { focus: 144.4, dur: 2.8 },
      p4: { focus: 171, dur: 2.8 },
    },
    end: { when: (g) => g.pz('lamps').open && g.bothIn(177.6, 184.5), spots: [179.95, 181.05], y: 0, camX: 180.5, flip: true },
    drawBack(g, ctx) {
      P.boat(g, ctx, -3.4); P.sign(g, ctx, 26.6, 0, 'box'); P.sign(g, ctx, 41.8, 0, 'link'); P.colonnade(g, ctx, 54.6, 79.4);
      P.sign(g, ctx, 83.2, 0, 'stack'); P.sign(g, ctx, 91.6, 2.8, 'hold'); P.sign(g, ctx, 100.4, 0, 'ride'); P.sign(g, ctx, 122.6, 0, 'stack');
      P.wall(g, ctx, 135.6, 144.2); P.moonArch(g, ctx, 180.5);
    },
  });
}
