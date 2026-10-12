// 2장 · 방울의 바다 — 이 장의 도구: 방울 불기. 내가 분 방울은 짝의 세계에만 있고, 짝은 그 안에 들어가 떠오른다.
// 두 사람의 눈이 뒤바뀐 채로 시작한다 (1P가 그림자, 2P가 빛).
import { Links } from '../puzzles/worlds.js';
import { Box } from '../puzzles/box.js';
import { Bubbles } from '../puzzles/bubbles.js';
import { GlyphGate } from '../puzzles/glyph.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter2() {
  return chapter({
    id: 2, title: '방울의 바다', subtitle: '2장 · 불어 줄게, 타고 올라',
    endTitle: '2장 · 끝', endLine: '바다가 제자리로 돌아왔다', endNext: '3장에서 계속',
    swap: true, stack: false, tool: 'bubble',
    length: 156, bounds: { min: -6.6, max: 152.6 },
    solids: [
      ground(-8, 14), ground(14, 30, 'stone', 4.0), ground(30, 32, 'stone', 2.6), ground(32, 34, 'stone', 1.3), ground(34, 41.5),
      ground(50, 110), ground(110, 122, 'stone', 4.0), ground(122, 124, 'stone', 2.6), ground(124, 126, 'stone', 1.3), ground(126, 160),
    ],
    checkpoints: cps([2.9, { x: 18.6, y: 4 }, 35.6, 52.6, 63.4, 71.4, 79.4, 92.6, 96.6, { x: 115.2, y: 4 }, 127.4, 138.6]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 24, y: 9.0, world: 1 }, { x: 42.0, y: 6.9, world: 0 }, { x: 115, y: 8.6, world: 0 }] }),   // 별조각 셋: 안 모아도 되지만, 이 장의 손발을 한 번 더 궁리해야 닿는다
      new Bubbles({ id: 'bub', winds: [
        { world: 0, x0: 35.2, x1: 38.4, y0: 1.5, y1: 6, v: 1.1 },      // 약한 바람: 물 한가운데에 떨어진다
        { world: 0, x0: 38.6, x1: 41.6, y0: 1.5, y1: 6, v: 2.45 },     // 센 바람: 건너편까지 간다
        { world: 1, x0: 97.6, x1: 99.9, y0: 0.9, y1: 2.2, v: 9.4 },   // 불바다 위를 가로지르는 돌풍
      ] }),
      // ① 높은 벼랑(4칸): 한 명이 벼랑 밑에서 방울을 불어 짝을 올려 보낸다. 올라간 쪽이 돌을 밟으면 받침돌이 솟는다.
      new Links({ id: 'r1', keys: [{ x: 16.6, y: 4, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 11.4, w: 2.4, h: 4.0, key: 0 }] }),
      // ② 바람 타고 물 건너기: 바람은 빛의 눈에만 보인다. 어디서 불어야 건너편까지 가는지 알려 줘야 한다. 건넌 쪽이 돌을 밟으면 다리가 놓인다.
      new Links({ id: 'pool', keys: [{ x: 52.2, world: 'both' }], things: [{ kind: 'bridge', world: 'both', x: 41.5, w: 8.5, key: 0 }] }),
      // ③ 유령 벽(5.2칸): 벽은 한쪽 세계에만 있다. 벽이 안 보이는 짝이 벽 바로 앞에서 방울을 불어 줘야 넘는다.
      new Links({ id: 'walls', things: [{ kind: 'wall', world: 1, x: 60, w: 1.0, h: 5.2 }, { kind: 'wall', world: 0, x: 68, w: 1.0, h: 5.2 }] }),
      // ④ 무게 상자: 그림자의 불밭 한가운데에 빛의 문을 여는 돌이 있다. 빛은 상자를 밀어 자기 돌 위에 올려 불을 꺼 둔다.
      new Box({ id: 'box1', x: 82.5, min: 82.2, max: 88.25 }),
      new Links({
        id: 'hall',
        keys: [{ x: 88.9, world: 0 }, { x: 86.0, world: 1 }],
        things: [{ kind: 'flame', world: 1, x: 84.2, w: 3.6, key: 0 }, { kind: 'door', world: 0, x: 90.0, w: 0.95, key: 1 }],
      }),
      // ⑤ 불바다와 돌풍: 낮은 불바다(둘 다의 세계) 위로 돌풍이 분다. 돌풍은 그림자의 눈에만 보인다.
      //    방울을 타고 휙 건너가 벼랑에 내린 쪽이 첫째 돌을 밟으면 불이 꺼지고, 짝이 받침돌에 서면 둘째 돌로 옮겨 올려 준다.
      new Links({ id: 'fire', keys: [{ x: 111.0, y: 4, world: 'both' }, { x: 112.8, y: 4, world: 'both' }], things: [{ kind: 'flame', world: 'both', x: 100, w: 7.2, h: 0.8, key: 0 }, { kind: 'riser', world: 'both', x: 107.4, w: 2.4, h: 4.0, key: 1 }] }),
      new GlyphGate({ id: 'gate', beatId: 'g1', murals: [128.6, 130.6, 132.6], muralY: 3.0, deviceX: 134.3, gate: { x: 136, w: 0.95, h: 4.3 } }),
    ],
    beats: {
      s1: { when: (g) => g.bothPast(14.6) && g.me.y > 3.5 && g.other.y > 3.5, dur: 2.2 },
      b1: { when: (g) => g.bothPast(50.6), dur: 2.2 },
      w1: { when: (g) => g.bothPast(69.6), dur: 2.0 },
      d1: { when: (g) => g.bothPast(91.4), dur: 2.2 },
      f1: { when: (g) => g.bothPast(110.4) && g.me.y > 3.5 && g.other.y > 3.5, dur: 2.2 },
      g1: { focus: 136.4, dur: 2.8 },
    },
    end: { when: (g) => g.pz('gate').open && g.bothIn(142.4, 149.5), spots: [144.95, 146.05], y: 0, camX: 145.5, flip: true },
    drawBack(g, ctx) { P.sign(g, ctx, 8.4, 0, 'bubble'); P.sign(g, ctx, 20.6, 4, 'hold'); P.sign(g, ctx, 36.4, 0, 'wind'); P.sign(g, ctx, 80.6, 0, 'link'); P.sign(g, ctx, 94.6, 0, 'wind'); P.wall(g, ctx, 127.2, 136.2); P.moonArch(g, ctx, 145.5); },
  });
}
