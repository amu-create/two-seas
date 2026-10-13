// 5장 · 두 개의 달 — 역할이 나뉜다.  1P = 사진(내 세계의 다리·기둥·짝이 그어 준 선을 찍으면, 짝의 세계에 그대로 생긴다. 사진은 한 장뿐)
//                                     2P = 선 그리기(붓을 들고 화면을 그으면, 그 선이 1P의 세계에 9초 동안 발판이 된다. 잉크는 구간마다 정해져 있다)
// 끝에는 달의 돌을 지나는 순간 뒤에서부터 길이 무너진다 → 선 하나, 사진 한 장을 빠르게.
import { Links } from '../puzzles/worlds.js';
import { Ink } from '../puzzles/ink.js';
import { Photo } from '../puzzles/photo.js';
import { Crumble } from '../puzzles/crumble.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import { sat } from '../util.js';
import * as P from '../render/props.js';

export function makeChapter5() {
  return chapter({
    id: 5, title: '두 개의 달', subtitle: '마지막 장 · 사진과 선',
    endTitle: '끝', endLine: '두 개의 바다, 하나의 달', endNext: '함께해 줘서 고마워요',
    stack: false, swap: false, final: true,
    tool: (g) => (g.role === 0 ? 'photo' : 'draw'),
    length: 146, bounds: { min: -6.6, max: 142.6 },
    solids: [
      ground(-8, 10), ground(16, 26), ground(32, 50), ground(50, 56, 'stone', 4.0), ground(62, 66, 'stone', 4.0), ground(70, 74, 'stone', 4.0), ground(78, 84, 'stone', 4.0),
      ground(84, 86), ground(98, 106), ground(132, 146),
    ],
    checkpoints: cps([2.9, 17, 33, { x: 51.4, y: 4 }, { x: 63, y: 4 }, { x: 71, y: 4 }, { x: 79.4, y: 4 }, 85, 99, 103.2, 133]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 13.0, y: 2.6, world: 0 }, { x: 59.0, y: 6.2, world: 1 }, { x: 127.0, y: 2.2, world: 0 }] }),
      new Ink({ id: 'ink', world: 0, zones: [{ x0: 20, x1: 40, n: 8 }, { x0: 50, x1: 66, n: 8 }, { x0: 84, x1: 100, n: 7 }, { x0: 103, x1: 132, n: 5 }] }),
      new Photo({
        id: 'photo', world: 0, ink: 'ink',
        items: [
          { x: 10, y: 0, w: 6 },            // ① 1P에게만 있는 다리
          { x: 47.2, y: 2.2, w: 1.4, h: 2.2 }, // ③ 1P에게만 있는 디딤 기둥
          { x: 66, y: 4.0, w: 4 },          // ⑤ 다리 둘, 사진은 한 장
          { x: 74, y: 4.0, w: 4 },
          { x: 122, y: 0, w: 4 },           // ⑦ 탈출 길의 두 번째 구멍
        ],
      }),
      // ② 2P에게만 있는 다리 → 1P에게는 2P가 선을 그어 준다
      new Links({ id: 'b2', things: [{ kind: 'bridge', world: 1, x: 26, w: 6 }] }),
      // ⑥ 넓은 물(12칸): 2P에게만 다리. 잉크(7칸)로는 한 번에 못 잇는다 → 선 두 개 + 사이는 뛰기
      new Links({ id: 'b6', things: [{ kind: 'bridge', world: 1, x: 86, w: 12 }] }),
      // ⑦ 탈출: 달의 돌을 지나면 뒤에서부터 길이 무너진다. 첫 구멍은 1P에게(선), 두 번째 구멍은 2P에게(사진)
      new Links({ id: 'b7', things: [{ kind: 'bridge', world: 1, x: 114, w: 4 }] }),
      new Crumble({ id: 'run', trigger: 105.4, y: 0, delay: 3.0, speed: 1.15, tiles: [[106, 108], [108, 110], [110, 112], [112, 114], [118, 120], [120, 122], [126, 128], [128, 130], [130, 132]] }),
    ],
    beats: {
      p1: { when: (g) => g.bothPast(16.6), dur: 2.0 },
      d1: { when: (g) => g.bothPast(32.6), dur: 2.0 },
      c1: { when: (g) => g.bothPast(50.6) && g.me.y > 3.5 && g.other.y > 3.5, dur: 2.0 },
      c2: { when: (g) => g.bothPast(62.6) && g.me.y > 3.5 && g.other.y > 3.5, dur: 2.0 },
      c3: { when: (g) => g.bothPast(78.6) && g.me.y > 3.5 && g.other.y > 3.5, dur: 2.0 },
      w1: { when: (g) => g.bothPast(98.6), dur: 2.0 },
      run: { when: (g) => g.bothPast(132.6), dur: 2.4 },
    },
    end: { when: (g) => g.bothIn(135.4, 142.4), spots: [138.45, 139.55], y: 0, camX: 139, flip: false },
    drawBack(g, ctx) {
      P.boat(g, ctx, -3.4); P.sign(g, ctx, 7.4, 0, 'photo'); P.sign(g, ctx, 22.6, 0, 'draw'); P.sign(g, ctx, 101.6, 0, 'run');
      const st = g.pz('run'); // 달의 돌: 지나면 길이 무너지기 시작한다
      P.moonArch(g, ctx, 139, 0, st.t0 ? 0.35 + 0.65 * sat((g.tc - st.t0) / 3) : 0.3);
    },
  });
}
