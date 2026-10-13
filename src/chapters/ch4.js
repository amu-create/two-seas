// 4장 · 어둠의 물길 — 역할이 나뉜다.  1P = 크기(단추를 누를 때마다 "내가 큼 ↔ 짝이 큼"을 뒤바꾼다. 짝은 부탁해야 한다)
//                                      2P = 등불(늘 등불을 든다. 단추를 누르고 있으면 높이 든다. 그동안은 못 걷는다)
// 어둠 속에서 1P는 2P의 등불 빛 안만 보이고, 1P의 유리 발판은 빛이 닿을 때만 단단하다.
// 빛의 크기는 2P의 몸집을 따른다 → 1P가 작아져야(2P가 커져야) 빛이 멀리 간다. 그런데 굴은 작아야 지나간다.
import { Links } from '../puzzles/worlds.js';
import { Sizes } from '../puzzles/sizes.js';
import { Lantern } from '../puzzles/lantern.js';
import { Stars } from '../puzzles/stars.js';
import { ground, cps, chapter } from './base.js';
import * as P from '../render/props.js';

export function makeChapter4() {
  const lantern = new Lantern({
    id: 'lamp', holder: 1,
    plats: [
      { x: 41.0, y: 1.0 }, { x: 43.4, y: 2.0 }, { x: 45.8, y: 3.2 }, { x: 48.4, y: 4.4 }, { x: 51.0, y: 3.4 }, { x: 53.6, y: 1.8 },   // ③ 어둠의 유리 다리
      { x: 105.0, y: 1.0 }, { x: 107.4, y: 1.6 }, { x: 113.4, y: 2.6 }, { x: 115.8, y: 3.6 }, { x: 118.4, y: 2.6 }, { x: 121.0, y: 1.4 }, // ⑥ 마지막 어둠
    ],
  });
  const light = (g) => lantern.light(g);
  return chapter({
    id: 4, title: '어둠의 물길', subtitle: '4장 · 크기와 등불',
    endTitle: '4장 · 끝', endLine: '네 빛 안에서만 나는 걸을 수 있었다', endNext: '마지막 장에서 계속',
    stack: false, swap: false, sizes: true,
    tool: (g) => (g.role === 0 ? 'size' : 'lantern'),
    dark: [{ x0: 39, x1: 57, who: 0, light }, { x0: 103, x1: 125, who: 0, light }],
    length: 140, bounds: { min: -6.6, max: 136.6 },
    solids: [
      ground(-8, 24), ground(24, 34, 'stone', 2.75), ground(34, 40), ground(56, 64), ground(71, 84), ground(91, 104), ground(124, 140),
    ],
    checkpoints: cps([2.9, 17.8, { x: 27, y: 2.75 }, 37, 57.6, 72.6, 79.6, 98.6, 101.8, { x: 110.6, y: 2.0 }, 125.2]),
    puzzles: [
      new Stars({ id: 'stars', list: [{ x: 7.0, y: 3.4, world: 1 }, { x: 47.6, y: 5.6, world: 0 }, { x: 117.0, y: 3.2, world: 1 }] }),
      new Sizes({ id: 'size', toggle: true }),
      lantern,
      // ① 낮은 굴이 뚫린 문: 2P의 세계의 돌은 문 너머에 있다 → 2P가 작아져야(1P가 커져야) 굴로 지나간다
      new Links({ id: 'd0', keys: [{ x: 15.6, world: 1 }], things: [{ kind: 'door', world: 'both', x: 12, w: 1.0, hole: 0.78, key: 0, latch: true }] }),
      // ② 높은 턱(2.75칸): 큰 고양이만 뛰어오른다. 위의 돌은 1P의 세계에 있다 → 1P가 커서 올라가 밟으면 2P의 받침돌이 솟는다
      new Links({ id: 'r1', keys: [{ x: 31.6, y: 2.75, world: 0 }], things: [{ kind: 'riser', world: 'both', x: 21.2, w: 2.4, h: 2.75, key: 0 }] }),
      // ③ 어둠의 유리 다리: 1P의 세계는 낭떠러지(유리 발판뿐), 2P의 세계는 바닥이 이어진다
      new Links({ id: 'floorA', things: [{ kind: 'bridge', world: 1, x: 40, w: 16 }] }),
      // ④ 얇은 다리(작아야 버틴다)와 무거운 돌(커야 눌린다): 2P의 다리가 얇고, 1P의 돌이 무겁다
      new Links({ id: 'thin1', keys: [{ x: 73.4, world: 0, heavy: true }], things: [{ kind: 'bridge', world: 0, x: 64, w: 7 }, { kind: 'bridge', world: 1, x: 64, w: 7, thin: true }, { kind: 'door', world: 1, x: 76, w: 0.95, key: 0 }] }),
      // ⑤ 반대로: 1P의 다리가 얇고, 2P의 돌이 무겁다 → 그 사이에 크기를 뒤바꿔야 한다
      new Links({ id: 'thin2', keys: [{ x: 93.4, world: 1, heavy: true }], things: [{ kind: 'bridge', world: 1, x: 84, w: 7 }, { kind: 'bridge', world: 0, x: 84, w: 7, thin: true }, { kind: 'door', world: 0, x: 96, w: 0.95, key: 0 }] }),
      // ⑥ 마지막 어둠: 1P는 유리 발판과 쉼터 바위, 2P의 바닥에는 낮은 굴이 뚫린 벽 → 2P가 작아지는 동안 1P는 바위에서 기다린다
      new Links({ id: 'floorB', things: [{ kind: 'bridge', world: 1, x: 104, w: 20 }, { kind: 'bridge', world: 0, x: 110, w: 2, y: 2.0 }, { kind: 'wall', world: 1, x: 114, w: 1.0, h: 2.9, hole: 0.78 }] }),
    ],
    beats: {
      a: { when: (g) => g.bothPast(17.2), dur: 2.0 },
      b: { when: (g) => g.bothPast(35.6), dur: 2.0 },
      c: { when: (g) => g.bothPast(57.2), dur: 2.2 },
      d: { when: (g) => g.bothPast(77.4), dur: 2.0 },
      e: { when: (g) => g.bothPast(97.4), dur: 2.0 },
      f: { when: (g) => g.bothPast(124.6), dur: 2.4 },
    },
    end: { when: (g) => g.bothIn(128.4, 135.5), spots: [130.95, 132.05], y: 0, camX: 131.5, flip: false },
    drawBack(g, ctx) { P.boat(g, ctx, -3.4); P.sign(g, ctx, 8.6, 0, 'size'); P.sign(g, ctx, 37.4, 0, 'dark'); P.moonArch(g, ctx, 131.5); },
  });
}
