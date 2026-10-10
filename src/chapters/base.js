// 장을 만들 때 쓰는 공통 도우미
export const DEEP = -7; // 발판 아래로 충분히 깊게
export const ground = (x0, x1, kind = 'rock', top = 0) => ({ x: x0, y: DEEP, w: x1 - x0, h: top - DEEP, kind });
export const cps = (list) => list.map((c) => (typeof c === 'number' ? { x: c, y: 0 } : { y: 0, ...c }));
// 모든 장이 갖는 기본값
export const chapter = (o) => ({
  swap: false,        // true면 이 장에서는 두 사람의 바다가 뒤바뀌어 있다 (1P가 그림자, 2P가 빛)
  stack: false,       // 짝의 머리 위에 올라설 수 있는가 (목말)
  pull: false,        // 실 당기기 단추가 있는가
  dark: null,         // {x0,x1}: 이 구간은 어둡고, 짝의 주변만 보인다
  waterKill: -2.3,
  lobbyMax: 9.2,
  spawn: [{ x: 2.2, y: 0 }, { x: 3.6, y: 0 }],
  beats: {},
  drawBack() {}, drawFront() {},
  ...o,
});
