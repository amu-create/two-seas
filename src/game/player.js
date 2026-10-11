// 고양이의 몸(물리). 내 고양이는 내 폰이 직접 움직이고, 짝의 고양이는 받은 위치를 부드럽게 이어서 보여준다.
import { clamp, lerp, damp, easeInOut, sat } from '../util.js';
import { CatAnim } from '../render/cat.js';

export const PHYS = {
  w: 0.78, h: 1.0,          // 충돌 상자 (그림보다 살짝 작게: 아슬아슬하게 걸치는 맛)
  run: 4.5,                 // 너무 빠르지 않게
  accel: 34, decel: 46, airAccel: 22,
  gravity: 38, jumpV: 13.2, // 점프 높이 약 2.3칸
  maxFall: 19,
  coyote: 0.11,             // 발판 끝에서 살짝 늦게 눌러도 점프
  buffer: 0.13,             // 착지 직전에 눌러도 점프
  cutV: 5.2,                // 버튼을 일찍 떼면 낮게 뛴다
};

export class Player {
  constructor(role, x, y) {
    this.role = role;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.face = 1;
    this.ground = true;
    this.state = 'play';     // play | bubble(실패 후 돌아오는 중) | cine(연출이 움직이는 중)
    this.anim = new CatAnim(role);
    this.coyoteT = 0; this.bufferT = 0;
    this.cp = 0;             // 마지막으로 지난 체크포인트 번호
    this.safe = 0;           // 돌아온 직후 잠깐은 다시 다치지 않는다
    this.bub = null;
    this.walkTo = null;      // 연출: 이 x까지 걸어간다
    this.jumped = false;     // 이번 프레임에 점프했는가 (소리용)
    this.emote = null; this.emoteT = 0;
    this.present = true;
  }

  // solids: [{x,y,w,h}] (x,y = 왼쪽 아래 모서리, y는 위로 +)
  update(dt, inp, solids, limits, ext) {
    this.jumped = false;
    this.safe = Math.max(0, this.safe - dt);
    if (this.emoteT > 0) { this.emoteT -= dt; if (this.emoteT <= 0) this.emote = null; }

    if (this.state === 'bubble') { this._bubble(dt); return; }

    let ax = inp.x;
    let wantJump = inp.jumpPressed, holdJump = inp.jump;
    if (this.state === 'cine') {
      ax = 0; wantJump = false; holdJump = false;
      if (this.walkTo != null) {
        const d = this.walkTo - this.x;
        if (Math.abs(d) > 0.06) ax = Math.sign(d) * clamp(Math.abs(d) * 2.2, 0.35, 0.8);
        else { this.walkTo = null; }
      }
    }

    const P = PHYS;
    const target = ax * P.run;
    const rate = this.ground ? (Math.abs(target) > 0.01 ? P.accel : P.decel) : P.airAccel;
    const dv = target - this.vx;
    this.vx += clamp(dv, -rate * dt, rate * dt);
    if (ax !== 0) this.face = ax > 0 ? 1 : -1;

    this.coyoteT = this.ground ? P.coyote : Math.max(0, this.coyoteT - dt);
    this.bufferT = wantJump ? P.buffer : Math.max(0, this.bufferT - dt);
    if (this.bufferT > 0 && this.coyoteT > 0) {
      this.vy = P.jumpV; this.ground = false; this.coyoteT = 0; this.bufferT = 0; this.jumped = true;
    }
    if (!holdJump && this.vy > P.cutV && !this.ground) this.vy = damp(this.vy, P.cutV, 30, dt);
    this.vy = Math.max(this.vy - P.gravity * dt, -P.maxFall);
    // 짝이 실을 당기는 중: 짝 쪽으로 둥실 끌려간다 (중력을 이긴다)
    this.pulled = false;
    if (ext && ext.pullTo && this.state === 'play') {
      const dx = ext.pullTo.x - this.x, dy = ext.pullTo.y - this.y, d = Math.hypot(dx, dy);
      if (d > 1.05) { this.vx = damp(this.vx, dx / d * 6.2, 9, dt); this.vy = damp(this.vy + P.gravity * dt, dy / d * 6.2 + 0.6, 9, dt); this.pulled = true; this.face = dx > 0 ? 1 : -1; }
    }

    // 가로 이동 후 충돌
    let nx = this.x + this.vx * dt;
    if (limits) {
      if (nx < limits.min) { nx = limits.min; this.vx = Math.max(0, this.vx); }
      if (nx > limits.max) { nx = limits.max; this.vx = Math.min(0, this.vx); }
    }
    const hw = P.w / 2;
    for (const s of solids) {
      if (s.oneWay) continue; // 위에서 내려앉을 수만 있는 발판(짝의 머리 등)은 옆에서 막지 않는다
      if (this.y + P.h <= s.y + 0.001 || this.y >= s.y + s.h - 0.001) continue;
      if (nx + hw > s.x && nx - hw < s.x + s.w) {
        // 낮은 턱(0.28칸 이하)은 그냥 올라선다
        const step = s.y + s.h - this.y;
        if (this.ground && step > 0 && step <= 0.28) { this.y = s.y + s.h; continue; }
        if (this.vx > 0 || (this.vx === 0 && this.x < s.x + s.w / 2)) nx = Math.min(nx, s.x - hw); else nx = Math.max(nx, s.x + s.w + hw);
        this.vx = 0;
      }
    }
    this.x = nx;

    // 세로 이동 후 충돌
    let ny = this.y + this.vy * dt;
    let grounded = false;
    for (const s of solids) {
      if (this.x + hw <= s.x + 0.001 || this.x - hw >= s.x + s.w - 0.001) continue;
      const top = s.y + s.h;
      if (this.vy <= 0 && this.y >= top - 0.02 && ny <= top) { ny = top; this.vy = 0; grounded = true; if (s.vx) this.x += s.vx * dt; }
      else if (s.carry && this.vy <= 1.5 && this.y < top && this.y > top - 0.45) { ny = top; this.vy = 0; grounded = true; } // 올라오는 승강기가 발밑에서 밀어 올린다
      else if (!s.oneWay && this.vy > 0 && this.y + P.h <= s.y + 0.02 && ny + P.h >= s.y) { ny = s.y - P.h; this.vy = 0; }
    }
    this.y = ny;
    this.ground = grounded;
  }

  // 실패: 방울에 담겨 바로 앞 지점으로 둥실 돌아온다 (약 1.2초, 짜증 나는 연출 없음)
  fail(toX, toY) {
    if (this.state === 'bubble') return false;
    const dist = Math.hypot(toX - this.x, toY - this.y);
    this.bub = { fx: this.x, fy: this.y, tx: toX, ty: toY, t: 0, dur: clamp(0.75 + dist * 0.035, 0.85, 1.25) };
    this.state = 'bubble'; this.vx = 0; this.vy = 0; this.ground = false;
    this.anim.setExpr('effort', 0.5);
    return true;
  }
  _bubble(dt) {
    const b = this.bub;
    b.t += dt;
    const u = sat(b.t / b.dur);
    const e = easeInOut(u);
    this.x = lerp(b.fx, b.tx, e);
    // 살짝 위로 솟았다가 내려앉는다
    this.y = lerp(b.fy, b.ty, e) + Math.sin(u * Math.PI) * (1.3 + Math.abs(b.tx - b.fx) * 0.06);
    this.face = 1;
    if (u >= 1) {
      this.state = 'play'; this.x = b.tx; this.y = b.ty + 0.05; this.vy = 2.5; this.ground = false; this.safe = 0.7;
      this.bub = null; this.popped = true;
      this.anim.setExpr('wow', 0.5);
    }
  }

  snapshot() {
    return [
      Math.round(this.x * 100) / 100, Math.round(this.y * 100) / 100,
      Math.round(this.vx * 10) / 10, Math.round(this.vy * 10) / 10,
      this.face, this.ground ? 1 : 0, this.state === 'bubble' ? 1 : this.state === 'cine' ? 2 : 0, this.cp, (this.pulling ? 1 : 0) | (this.cranking ? 2 : 0),
    ];
  }
}

// 짝의 고양이: 받은 위치들 사이를 이어 그린다(약 0.1초 전 모습을 보여주면 끊김이 안 보인다)
export class RemotePlayer {
  constructor(role, x, y) {
    this.role = role;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.face = -1; this.ground = true; this.state = 'play';
    this.anim = new CatAnim(role);
    this.buf = [];
    this.cp = 0;
    this.present = false;
    this.lastAt = 0;
    this.emote = null; this.emoteT = 0;
    this.jumped = false;
  }
  push(t, s) {
    const snap = { t, x: s[0], y: s[1], vx: s[2], vy: s[3], face: s[4], ground: !!s[5], st: s[6], cp: s[7], fl: s[8] || 0 };
    const b = this.buf;
    if (b.length && t <= b[b.length - 1].t) return; // 늦게 온 옛 소식은 버린다
    b.push(snap);
    if (b.length > 30) b.shift();
    this.cp = snap.cp;
    { // 소식이 오는 간격과 그 흔들림을 재서, 얼마나 과거를 그릴지 정한다
      const now = performance.now(), gap = this.lastAt ? Math.min(600, now - this.lastAt) : 60;
      this.gapAvg = this.gapAvg == null ? gap : this.gapAvg * 0.9 + gap * 0.1;
      this.gapDev = this.gapDev == null ? 0 : this.gapDev * 0.9 + Math.abs(gap - this.gapAvg) * 0.1;
      const want = Math.min(420, this.gapAvg * 1.15 + this.gapDev * 2.6 + 25);
      this.netDelay = this.netDelay == null ? want : this.netDelay + (want - this.netDelay) * (want > this.netDelay ? 0.12 : 0.02); // 늘릴 땐 빨리, 줄일 땐 천천히
    }
    this.lastAt = performance.now();
    if (!this.present) { this.present = true; this.x = snap.x; this.y = snap.y; this.anim.pop.x = 0; this.anim.pop.v = 0; this.anim.pop.target = 1; }
  }
  update(dt, tNow, delay) {
    this.jumped = false;
    if (this.emoteT > 0) { this.emoteT -= dt; if (this.emoteT <= 0) this.emote = null; }
    const b = this.buf;
    if (!b.length) return;
    const rt = tNow - delay;
    let a = b[0], c = b[b.length - 1];
    for (let i = b.length - 1; i >= 0; i--) { if (b[i].t <= rt) { a = b[i]; c = b[Math.min(i + 1, b.length - 1)]; break; } }
    let x, y;
    if (rt >= c.t) { // 최신 소식보다 앞: 속도로 잠깐만 이어 그린다
      const ex = clamp((rt - c.t) / 1000, 0, 0.18);
      x = c.x + c.vx * ex; y = c.y + (c.ground ? 0 : c.vy * ex);
      a = c;
    } else {
      const u = c.t > a.t ? sat((rt - a.t) / (c.t - a.t)) : 1;
      x = lerp(a.x, c.x, u); y = lerp(a.y, c.y, u);
    }
    const wasGround = this.ground;
    const jump = Math.abs(x - this.x) > 4 || Math.abs(y - this.y) > 5;
    this.x = jump ? x : damp(this.x, x, 28, dt);
    this.y = jump ? y : damp(this.y, y, 28, dt);
    this.vx = a.vx; this.vy = a.vy; this.face = a.face; this.ground = a.ground;
    this.state = a.st === 1 ? 'bubble' : a.st === 2 ? 'cine' : 'play';
    this.pulling = !!(c.fl & 1); this.cranking = !!(c.fl & 2);
    if (wasGround && !this.ground && this.vy > 2 && this.state !== 'bubble') this.jumped = true;
  }
}
