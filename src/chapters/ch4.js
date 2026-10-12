// 4장 · 어둠의 물길 — 이 장의 도구: 크기 바꾸기. 단추를 누르면 내가 커지고 짝이 작아진다(늘 반대).
// 큰 고양이: 높이 뛰고, 무거운 돌을 누르고, 무거운 상자를 민다. 작은 고양이: 낮은 굴을 지나고, 얇은 다리를 건넌다.
// 가운데부터는 어둡다: 화면에는 짝의 둘레만 비친다.
import { Links } from '../puzzles/worlds.js';
import { Box } from '../puzzles/box.js';
import { Sizes } from '../puzzles/sizes.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter4() {
  return chapter({
    id: 4, title: '어둠의 물길', subtitle: '4장 · 커졌다 작아졌다',
    endTitle: '4장 · 끝', endLine: '멀리 두 개의 달이 떠오른다', endNext: '마지막 장에서 계속',
    stack: true, tool: 'size', sizes: true, dark: { x0: 40, x1: 126.5 },
    length: 148, bounds: { min: -6.6, max: 144.6 },
    solids: [
      ground(-8, 24), ground(24, 34, 'stone', 2.75), ground(34, 36, 'stone', 1.4), ground(36, 46),
      ground(52, 70), ground(77, 96), ground(103, 147, 'stone'),
    ],
    checkpoints: cps([2.9, 18.8, { x: 28, y: 2.75 }, 37.6, 58.6, 77.9, 86.6, 103.9, 110.2, 123.6, 130.4]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 8, y: 4.0, world: 1 }, { x: 61, y: 4.0, world: 0 }, { x: 119.4, y: 0.3, world: 1 }] }),   // 별조각 셋: 안 모아도 되지만, 이 장의 손발을 한 번 더 궁리해야 닿는다
      new Sizes({ id: 'size' }),
      // ① 낮은 굴이 뚫린 문: 작아진 쪽이 굴로 지나가 돌을 밟으면 문이 열린다.
      new Links({ id: 'd0', keys: [{ x: 17.6, world: 'both' }], things: [{ kind: 'door', world: 'both', x: 14, w: 1.0, hole: 0.78, key: 0 }] }),
      // ② 높은 턱(2.75칸): 큰 고양이만 뛰어오른다. 위에서 돌을 밟으면 받침돌이 솟는다 (또는 큰 고양이 머리를 밟고).
      new Links({ id: 'r1', keys: [{ x: 26.4, y: 2.75, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 21.4, w: 2.4, h: 1.45, key: 0 }] }),
      // ③ 어둠 속 낭떠러지와 무거운 상자: 빛에게 다리와 상자가 있고, 그림자는 길이 끊겨 있다. 상자는 큰 고양이만 민다.
      new Links({ id: 'pit', things: [{ kind: 'bridge', world: 0, x: 46, w: 6 }] }),
      new Box({ id: 'box1', x: 53.3, min: 46.3, max: 56.5, heavy: true }),
      // ④ 얇은 다리와 무거운 돌: 그림자의 다리는 얇아서 작을 때만 버틴다. 그 뒤 그림자의 문은 빛의 무거운 돌(커야 눌린다)로 열린다.
      new Links({ id: 'thin1', keys: [{ x: 79.4, world: 0, heavy: true }], things: [{ kind: 'bridge', world: 0, x: 70, w: 7 }, { kind: 'bridge', world: 1, x: 70, w: 7, thin: true }, { kind: 'door', world: 1, x: 82.4, w: 0.95, key: 0 }] }),
      // ⑤ 반대로: 이번엔 빛의 다리가 얇고, 그림자의 돌이 무겁다 → 그 사이에 크기를 바꿔야 한다.
      new Links({ id: 'thin2', keys: [{ x: 105.4, world: 1, heavy: true }], things: [{ kind: 'bridge', world: 1, x: 96, w: 7 }, { kind: 'bridge', world: 0, x: 96, w: 7, thin: true }, { kind: 'door', world: 0, x: 108.4, w: 0.95, key: 0 }] }),
      // ⑥ 긴 굴: 굴 안에는 불이 있다. 큰 쪽이 무거운 돌로 불을 꺼 주는 동안 작은 쪽이 굴을 지나, 건너편 돌을 밟아 문을 연다.
      new Links({
        id: 'tunnel',
        keys: [{ x: 111.6, world: 'both', heavy: true }, { x: 122.2, world: 'both' }],
        things: [{ kind: 'door', world: 'both', x: 114, w: 6, hole: 0.78, key: 1 }, { kind: 'flame', world: 'both', x: 115.4, w: 3.2, h: 0.78, key: [0, 1] }],
      }),
    ],
    beats: {
      a: { when: (g) => g.bothPast(18.6), dur: 2.0 },
      b: { when: (g) => g.bothPast(36.4), dur: 2.0 },
      c: { when: (g) => g.bothPast(52.6), dur: 2.0 },
      d: { when: (g) => g.bothPast(83.6), dur: 2.0 },
      e: { when: (g) => g.bothPast(109.6), dur: 2.0 },
      f: { when: (g) => g.bothPast(127.2), dur: 2.4 },
    },
    end: { when: (g) => g.bothIn(134.4, 141.5), spots: [136.95, 138.05], y: 0, camX: 137.5, flip: false },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.sign(g, ctx, 8.6, 0, 'size'); P.sign(g, ctx, 38.4, 0, 'dark'); P.moonArch(g, ctx, 137.5); },
  });
}
