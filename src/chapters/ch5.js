// 5장 · 두 개의 달 — 실 당기기를 배우고, 바다가 두 번 뒤바뀌는 가운데 지금까지의 모든 것을 쓴다
import { Links } from '../puzzles/worlds.js';
import { Vents } from '../puzzles/vents.js';
import { Movers } from '../puzzles/movers.js';
import { Lift } from '../puzzles/lift.js';
import { Lanterns } from '../puzzles/lanterns.js';
import { ground, cps, chapter } from './base.js';
import { sat } from '../util.js';
import * as P from '../render/props.js';

export function makeChapter5() {
  return chapter({
    id: 5, title: '두 개의 달', subtitle: '마지막 장 · 실을 당겨',
    endTitle: '끝', endLine: '두 개의 바다, 하나의 달', endNext: '함께해 줘서 고마워요',
    stack: true, pull: true, final: true,
    length: 104, bounds: { min: -6.6, max: 98.6 },
    solids: [
      ground(-8, 10), ground(10, 20, 'stone', 2.8), ground(28, 34, 'stone', 2.8), ground(34, 36, 'stone', 1.4), ground(36, 40),
      ground(48.4, 62, 'stone'), ground(62, 70), ground(70, 101, 'stone', 4.6),
    ],
    checkpoints: cps([2.9, { x: 12.4, y: 2.8 }, { x: 29.4, y: 2.8 }, 37, 49.6, 63, { x: 72.4, y: 4.6 }, { x: 88, y: 4.6 }]),
    puzzles: [
      // 넓은 틈(8칸): 나룻배 발판은 빛의 세계에만 있다. 먼저 건넌 쪽이 실을 당겨 주면 짝은 허공을 건너온다.
      new Movers({ id: 'ferry', seenBy: 0, list: [{ x0: 20.3, x1: 25.5, y: 2.8, w: 2.2, period: 8, phase: 0 }] }),
      // 반쪽 다리 (바다가 뒤바뀐 뒤라 누가 어느 반쪽을 가졌는지도 바뀌어 있다)
      new Links({ id: 'br1', things: [{ kind: 'bridge', world: 0, x: 40, w: 4.8 }, { kind: 'bridge', world: 1, x: 44.8, w: 3.6 }] }),
      // 서로 꺼 주는 불: 내 불은 내 세계에만, 끄는 돌은 짝의 세계에만
      new Links({ id: 'hall', keys: [{ x: 54.7, world: 1 }, { x: 59.0, world: 0 }], things: [{ kind: 'flame', world: 0, x: 52, w: 1.8, key: 0 }, { kind: 'flame', world: 1, x: 56.4, w: 1.8, key: 1 }] }),
      new Lift({ id: 'lift', x: 67.5, w: 2.5, y0: 0, y1: 4.6, cranks: [{ x: 64.4, y: 0 }, { x: 72.4, y: 4.6 }] }),
      new Vents({ id: 'jet', seenBy: 1, vents: [{ x: 67.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 0 }] }),
      new Vents({ id: 'jet0', seenBy: 0, vents: [{ x: 67.5, w: 2.5, y: 2.3, h: 0.9, period: 5.5, on: 1.8, phase: 2.75 }] }),
      new Lanterns({ id: 'lamps', beatId: 'moon', y: 4.6, rows: [{ xs: [75.4, 76.7, 78, 79.3] }, { xs: [82.7, 84, 85.3, 86.6] }], stoneX: 81 }),
    ],
    beats: {
      up: { when: (g) => g.bothPast(10.4) && g.me.y > 2.5 && g.other.y > 2.5, dur: 2.0 },
      f1: { when: (g) => g.bothPast(28.6), dur: 2.6, flip: true },          // 바다가 뒤바뀐다
      f2: { when: (g) => g.bothPast(62.6), dur: 2.6, flip: true },          // 다시 제자리로
      top: { when: (g) => g.bothPast(70.6) && g.me.y > 4 && g.other.y > 4, dur: 2.0 },
      moon: { focus: 92, dur: 3.0 },
    },
    end: { when: (g) => g.pz('lamps').open && g.bothIn(89.4, 96.5), spots: [91.45, 92.55], y: 4.6, camX: 92, flip: false },
    drawBack(g, ctx) {
      P.boat(g, ctx, -3.4); P.sign(g, ctx, 6.4, 0, 'stack'); P.sign(g, ctx, 15.4, 2.8, 'pull'); P.sign(g, ctx, 62.6, 0, 'crank');
      const st = g.pz('lamps'); // 등불을 다 켜면 달문 안에서 두 달이 하나로 겹친다
      P.moonArch(g, ctx, 92, 4.6, st.open ? 0.35 + 0.65 * sat((g.tc - st.open) / 3) : 0.3);
    },
  });
}
