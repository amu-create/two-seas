// 조작: 왼쪽 엄지 = 좌우, 오른쪽 엄지 = 점프·상호작용. 키보드(PC 테스트용)도 지원.
// 손가락이 버튼 사이를 미끄러져도 따라가고, 여러 손가락을 동시에 추적한다.
export class Input {
  constructor(root) {
    this.root = root;
    this.left = false; this.right = false;
    this.jumpHeld = false;
    this.jumpPressed = false;   // 이번 프레임에 막 눌렀는가
    this.actPressed = false;
    this.taps = [];             // 버튼이 아닌 곳을 톡 친 위치들 (패널 조작·감정표현)
    this.locked = false;        // 연출 중에는 조작을 잠근다
    this.used = false;          // 한 번이라도 움직였는가 (첫 안내를 끄는 용도)
    this.keys = new Set();
    this.ptr = new Map();       // pointerId -> 'pad' | 'jump' | 'act' | 'tap'
    this.padX = 0;
    this.el = {
      pad: root.querySelector('#pad'), l: root.querySelector('#btnL'), r: root.querySelector('#btnR'),
      jump: root.querySelector('#btnJump'), act: root.querySelector('#btnAct'),
    };
    this._bind();
  }

  _bind() {
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    // 스크롤, 확대, 당겨서 새로고침, 길게 눌러 메뉴 띄우기를 전부 막는다
    for (const type of ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'gesturechange', 'contextmenu', 'dblclick', 'selectstart']) {
      document.addEventListener(type, (e) => { if (!e.target.closest || !e.target.closest('[data-free]')) stop(e); }, { passive: false });
    }
    document.addEventListener('wheel', (e) => { if (e.ctrlKey) stop(e); }, { passive: false });

    const zoneOf = (target) => {
      if (!target || !target.closest) return 'tap';
      if (target.closest('#pad')) return 'pad';
      if (target.closest('#btnJump')) return 'jump';
      if (target.closest('#btnAct')) return 'act';
      if (target.closest('[data-free]')) return null;
      return 'tap';
    };
    const surface = this.root;
    surface.addEventListener('pointerdown', (e) => {
      const z = zoneOf(e.target);
      if (!z) return;
      this.ptr.set(e.pointerId, { z, x: e.clientX, y: e.clientY, t: performance.now() });
      if (z === 'pad') this._pad(e);
      if (z === 'jump') { this.jumpHeld = true; this.jumpPressed = true; this.el.jump.classList.add('on'); }
      if (z === 'act') { this.actPressed = true; this.el.act.classList.add('on'); }
      this._buzz(z);
    });
    surface.addEventListener('pointermove', (e) => {
      const p = this.ptr.get(e.pointerId);
      if (p && p.z === 'pad') this._pad(e);
    });
    const up = (e) => {
      const p = this.ptr.get(e.pointerId);
      if (!p) return;
      this.ptr.delete(e.pointerId);
      if (p.z === 'pad') { this.padX = 0; this._padLights(); }
      if (p.z === 'jump') { this.jumpHeld = [...this.ptr.values()].some((q) => q.z === 'jump'); if (!this.jumpHeld) this.el.jump.classList.remove('on'); }
      if (p.z === 'act') this.el.act.classList.remove('on');
      if (p.z === 'tap' && performance.now() - p.t < 400 && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 24) this.taps.push({ x: e.clientX, y: e.clientY });
    };
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', up);
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });

    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.repeat) { if (/Arrow|Space/.test(e.code)) e.preventDefault(); return; }
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { this.jumpPressed = true; e.preventDefault(); }
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'ArrowDown') { this.actPressed = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  _buzz(z) { if ((z === 'jump' || z === 'act') && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* 진동 없는 기기 */ } } }

  _pad(e) {
    const r = this.el.pad.getBoundingClientRect();
    const u = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    this.padX = u < -0.08 ? -1 : u > 0.08 ? 1 : 0;
    this._padLights();
  }
  _padLights() {
    this.el.l.classList.toggle('on', this.padX < 0);
    this.el.r.classList.toggle('on', this.padX > 0);
  }

  releaseAll() {
    this.ptr.clear(); this.keys.clear(); this.padX = 0; this.jumpHeld = false;
    this._padLights(); this.el.jump.classList.remove('on'); this.el.act.classList.remove('on');
  }

  // 매 프레임 시작에 부른다
  read() {
    const k = this.keys;
    const kl = k.has('ArrowLeft') || k.has('KeyA');
    const kr = k.has('ArrowRight') || k.has('KeyD');
    this.left = this.padX < 0 || kl;
    this.right = this.padX > 0 || kr;
    this.jump = this.jumpHeld || k.has('Space') || k.has('ArrowUp') || k.has('KeyW');
    if (this.left || this.right || this.jumpPressed) this.used = true;
    const out = {
      x: this.locked ? 0 : (this.right ? 1 : 0) - (this.left ? 1 : 0),
      jump: !this.locked && this.jump,
      jumpPressed: !this.locked && this.jumpPressed,
      actPressed: !this.locked && this.actPressed,
      taps: this.taps,
    };
    this.jumpPressed = false; this.actPressed = false; this.taps = [];
    return out;
  }

  // 상호작용 버튼은 쓸 수 있을 때만 또렷해진다
  setActHint(on) { this.el.act.classList.toggle('ready', !!on); }
}
