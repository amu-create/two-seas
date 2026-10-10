// 진동: 콘솔 게임 패드처럼 "무슨 일이 일어났는지"를 손으로 느끼게 한다.
// 안드로이드 크롬은 navigator.vibrate로 길이·박자를 그대로 낸다.
// 아이폰 사파리는 그 기능이 없어서, 숨겨 둔 스위치를 눌러 "톡" 하는 짧은 떨림만 흉내 낸다(되는 기기에서만, 박자는 톡톡으로).
// 무늬는 [떨림, 쉼, 떨림, ...] 밀리초. 세기 조절이 없으므로 길이와 박자로 무게를 표현한다.
const P = {
  tap: [7],                         // 단추
  jump: [9],
  land: [14], thud: [26],           // 사뿐 / 높은 데서 쿵
  step: [5],
  push: [12, 60, 12],               // 상자 미는 드르륵
  key: [16],                        // 누름돌 딸깍
  open: [10, 30, 28],               // 내 세계의 문·다리가 바뀜: 톡-두둥
  lamp: [10, 40, 10],               // 등불
  dial: [6],
  wrong: [35, 45, 35],
  fail: [45, 50, 20, 40, 12],       // 방울 타고 돌아감: 쿵… 잦아듦
  pop: [12],
  gate: [20, 40, 20, 40, 60],       // 큰 문이 열림: 점점 크게
  success: [15, 60, 15, 60, 90],
  swap: [25, 35, 25, 35, 25, 35, 110], // 바다가 뒤바뀜: 우르르-쾅
  heart: [22, 110, 34],             // 부비기: 두근
  wow: [10, 30, 10],
  lift: [9],                        // 승강기 톱니
  pull: [8],
  ride: [12, 40, 12],
  end: [30, 120, 40, 420, 30, 120, 40, 420, 30, 120, 60], // 엔딩: 두근… 두근… 두근
};
// 소리 이름 → 진동 (내 고양이 가까이에서 난 소리만)
const BY_SOUND = { jump: 'jump', dissolve: 'key', splash: null, pop: 'pop', zap: null, panel: 'open', dial: 'dial', press: 'key', wrong: 'wrong', gate: 'gate', bridge: 'gate', success: 'success', swap: 'swap', lamp: 'lamp', nuzzle: 'heart', wow: 'wow' };

let on = true, busyUntil = 0, sw = null;
try { on = localStorage.getItem('twoseas.haptic') !== '0'; } catch (e) { /* 저장소 없음 */ }
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function iosTick() { // 아이폰: 숨긴 스위치를 한 번 뒤집으면 "톡" 한다 (지원하는 사파리에서만)
  try {
    if (!sw) {
      const label = document.createElement('label'); label.style.cssText = 'position:fixed;left:-99px;top:-99px;opacity:0;pointer-events:none';
      const inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); label.appendChild(inp); document.body.appendChild(label); sw = label;
    }
    sw.click();
  } catch (e) { /* 무시 */ }
}

export const haptics = {
  get on() { return on; },
  set(v) { on = !!v; try { localStorage.setItem('twoseas.haptic', on ? '1' : '0'); } catch (e) { /* 무시 */ } if (!on && canVibrate) navigator.vibrate(0); },
  // name: 무늬 이름. strong: 긴 무늬가 울리는 중에도 끼어든다.
  buzz(name, strong) {
    if (!on) return;
    const p = P[name]; if (!p) return;
    const now = performance.now();
    if (now < busyUntil && !strong) return;         // 긴 무늬(뒤바뀜, 엔딩)를 자잘한 떨림이 끊지 않게
    const total = p.reduce((a, b) => a + b, 0);
    if (total > 60) busyUntil = now + total;
    if (canVibrate) { try { navigator.vibrate(p); } catch (e) { /* 무시 */ } }
    else { iosTick(); if (p.length >= 3) setTimeout(iosTick, p[0] + p[1]); if (p.length >= 5) setTimeout(iosTick, p[0] + p[1] + p[2] + p[3]); }
  },
  bySound(name) { const h = BY_SOUND[name]; if (h) this.buzz(h, h === 'swap' || h === 'gate' || h === 'success'); },
};
