// 2장 · 방울의 바다 — 역할이 나뉜다.  1P = 바늘(방울을 터뜨려 높이 뛰기, 앞을 찔러 짝의 거품벽 터뜨리기)
//                                    2P = 방울(1P의 세계에만 생기는 방울을 불어 준다)
// 1P의 세계의 성게는 1P에게 안 보이고 2P에게만 보인다. 2P의 세계의 거품벽은 2P에게만 보인다.
// → 방울을 탄 1P는 2P의 "왼쪽! 지금 터뜨려!"를 듣고, 2P는 1P에게 "두 칸 앞 찔러!"를 부탁한다.
import { Links } from '../puzzles/worlds.js';
import { Bubbles } from '../puzzles/bubbles.js';
import { Needle } from '../puzzles/needle.js';
import { Urchins } from '../puzzles/urchins.js';
import { Flood } from '../puzzles/flood.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter2() {
  return chapter({
    id: 2, title: '방울의 바다', subtitle: '2장 · 바늘과 방울',
    endTitle: '2장 · 끝', endLine: '거품 위로, 둘이서', endNext: '3장에서 계속',
    swap: false, stack: false,
    tool: (g) => (g.role === 0 ? 'needle' : 'bubble'),
    length: 150, bounds: { min: -6.6, max: 146.6 },
    solids: [
      ground(-8, 12), ground(12, 22, 'stone', 4.0), ground(22, 31), ground(31, 40, 'stone', 8.2),
      ground(50, 80, 'stone', 8.2), ground(90, 116, 'stone', 8.2),
      ground(116, 124, 'stone', 12.4), ground(124, 132, 'stone', 16.6), ground(132, 150, 'stone', 20.8),
    ],
    checkpoints: cps([2.9, { x: 14.9, y: 4 }, 24, { x: 33.9, y: 8.2 }, { x: 52.9, y: 8.2 }, { x: 62.2, y: 8.2 }, { x: 67.8, y: 8.2 }, { x: 76.4, y: 8.2 }, { x: 92.4, y: 8.2 }, { x: 106, y: 8.2 }]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 10.6, y: 5.3, world: 1 }, { x: 27.4, y: 6.8, world: 0 }, { x: 88.4, y: 15.4, world: 0 }] }),
      new Bubbles({ id: 'bub', pads: [79.0], padY: 8.2, winds: [
        { world: 0, x0: 38, x1: 50, y0: 9.5, y1: 14, v: 2.6 },    // 물 건너는 바람 (타는 1P만 본다)
        { world: 0, x0: 77.5, x1: 91, y0: 9.0, y1: 13.5, v: 3.2 },  // 큰 방울 바람
      ] }),
      new Needle({ id: 'pin', world: 1, foams: [{ x: 19.2, y: 4 }, { x: 58, y: 8.2 }, { x: 63.5, y: 8.2 }, { x: 69, y: 8.2 }] }),
      new Urchins({ id: 'urch', world: 0, list: [
        { x: 29.0, y: 3.6 }, { x: 27.6, y: 5.6 }, { x: 30.4, y: 5.6 },                 // ② 성게 굴뚝: 옆으로 비켰다가 가운데로
        { x: 44.2, y: 12.4 }, { x: 46.4, y: 13.8 },                                     // ③ 바람 건너기
        { x: 60.6, y: 8.6, r: 0.38 }, { x: 66.2, y: 8.6, r: 0.38 }, { x: 71.6, y: 8.6, r: 0.38 }, // ④ 거품 복도 바닥
        { x: 82.8, y: 10.6 }, { x: 86.3, y: 14.8 },                                     // ⑤ 큰 방울: 처음엔 참았다가 오른쪽
        { x: 115.4, y: 11.6 }, { x: 122.2, y: 15.4 }, { x: 130.0, y: 19.6 },            // ⑥ 탑
      ] }),
      // ① 벼랑: 2P가 불어 준 방울을 타고 1P가 올라가 돌을 밟으면 받침돌이 2P를 올려 준다. 그 위 거품벽은 1P가 찔러 준다.
      new Links({ id: 'rA', keys: [{ x: 14.4, y: 4, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 9.4, w: 2.4, h: 4.0, key: 0 }] }),
      // ② 성게 굴뚝(8.2칸): 방울로 올라가며 성게를 피하고, 꼭대기에서 "지금!" 터뜨려 뛰어오른다
      new Links({ id: 'rB', keys: [{ x: 33.6, y: 8.2, world: 'both' }], things: [{ kind: 'riser', world: 'both', x: 26.4, w: 2.4, h: 8.2, key: 0 }] }),
      // ③ 바람 건너기: 바람은 1P만, 성게는 2P만 본다. 건너간 1P가 돌을 밟으면 2P의 세계에 다리가 놓인다
      new Links({ id: 'brC', keys: [{ x: 52.4, y: 8.2, world: 'both' }], things: [{ kind: 'bridge', world: 1, x: 40, w: 10, y: 8.2, key: 0 }] }),
      // ⑥ 물이 차오르는 탑: 방울 → 1P가 오르고 → 돌 → 받침돌로 2P가 오른다. 세 번.
      new Links({ id: 'rF', keys: [{ x: 117.4, y: 12.4, world: 'both' }, { x: 125.4, y: 16.6, world: 'both' }, { x: 133.4, y: 20.8, world: 'both' }],
        things: [{ kind: 'riser', world: 'both', x: 112.2, y: 8.2, w: 2.4, h: 4.2, key: 0 }, { kind: 'riser', world: 'both', x: 120.6, y: 12.4, w: 2.4, h: 4.2, key: 1 }, { kind: 'riser', world: 'both', x: 128.6, y: 16.6, w: 2.4, h: 4.2, key: 2 }] }),
      new Flood({ id: 'flood', x0: 106, start: 6.0, speed: 0.15 }),
    ],
    beats: {
      a1: { when: (g) => g.bothPast(14) && g.me.y > 3.5 && g.other.y > 3.5, dur: 2.0 },
      b1: { when: (g) => g.bothPast(32) && g.me.y > 8 && g.other.y > 8, dur: 2.0 },
      c1: { when: (g) => g.bothPast(51) && g.me.y > 8 && g.other.y > 8, dur: 2.0 },
      d1: { when: (g) => g.bothPast(75.5), dur: 2.0 },
      e1: { when: (g) => g.bothPast(91) && g.me.y > 8 && g.other.y > 8, dur: 2.0 },
    },
    end: { when: (g) => g.bothIn(137, 146) && g.me.y > 20 && g.other.y > 20, spots: [140.95, 142.05], y: 20.8, camX: 141.5, flip: false },
    drawBack(g, ctx) {
      P.sign(g, ctx, 7.6, 0, 'bubble'); P.sign(g, ctx, 17.4, 4, 'needle'); P.sign(g, ctx, 36.6, 8.2, 'wind'); P.sign(g, ctx, 76.6, 8.2, 'bubble');
      P.moonArch(g, ctx, 141.5, 20.8);
    },
  });
}
