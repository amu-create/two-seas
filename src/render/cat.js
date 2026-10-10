// 통통한 고양이 한 마리: 움직임 계산(CatAnim) + 그리기(drawCat)
// 원칙: 쫀득·탱탱·말랑. 한 번 꾹 눌렸다가 한 번만 살짝 되튀고 멈춘다(출렁거림 금지).
// 팔다리는 몸에 붙은 작은 혹처럼만 그린다(몸에서 떨어진 팔다리 없음). 귀는 둥글게.
import { clamp, lerp, damp, Spring, TAU, sat, smooth, easeOutBack } from '../util.js';

export const LOOKS = [
  { // 1P · 빛의 고양이 (크림)
    name: 'light', body: '#FFF4E3', shade: '#F8DFC2', line: '#8C5E48', ear: '#FFC7B5', blush: '#FFAE9F',
    patch: '#F4C892', eye: '#4A3128', glow: '#FFE9B8',
  },
  { // 2P · 그림자 고양이 (라일락)
    name: 'shadow', body: '#DAD2F6', shade: '#BDB1E6', line: '#584783', ear: '#F6B9D6', blush: '#F09CC4',
    patch: '#A898DE', eye: '#33264F', glow: '#C9B8FF',
  },
];

export class CatAnim {
  constructor(seed = 0) {
    this.sq = new Spring(3.6, 0.46);      // 몸 눌림/늘어남 (+늘어남, -눌림)
    this.headY = new Spring(3.1, 0.5);    // 머리가 몸보다 살짝 늦게 따라온다
    this.headX = new Spring(2.6, 0.55);
    this.earL = new Spring(4.2, 0.4);     // 귀는 더 가볍게 팔랑
    this.earR = new Spring(4.4, 0.4);
    this.tail = new Spring(2.2, 0.35);
    this.turn = new Spring(3.2, 0.75, 1); // 좌우 돌아보기 (-1..1)
    this.pop = new Spring(3.4, 0.5, 1);   // 등장할 때 뿅
    this.phase = seed * 1.7;              // 걷기 박자
    this.walk = 0;                        // 걷는 정도 0..1
    this.air = 0;                         // 공중에 있는 정도 0..1
    this.sit = 0;                         // 앉은 정도 0..1
    this.lean = 0;                        // 짝에게 기대는 정도 (-1..1, 방향 포함)
    this.leanTarget = 0;
    this.idleT = 0;
    this.t = seed * 3.1;
    this.blinkAt = 1.5 + seed;
    this.blink = 0;
    this.twitchAt = 3 + seed * 2;
    this.expr = 'neutral';
    this.exprT = 0;
    this.wasGround = true;
    this.lastVy = 0;
    this.bubble = 0;                      // 방울 속에 있는 정도
    this.armUp = 0;
    this.lookAt = 0;                      // 짝이 있는 쪽 (-1/1)
    this.footstep = false;                // 이번 프레임에 발이 땅에 닿았는지 (소리용)
    this.landed = 0;                      // 이번 프레임 착지 세기 (소리용)
    this._lastStep = 0;
  }

  setExpr(name, dur = 1.2) { this.expr = name; this.exprT = dur; }

  // s: { vx, vy, ground, face(-1/1), state('play'|'bubble'|'cine'), partnerDx }
  update(dt, s) {
    this.t += dt;
    this.footstep = false; this.landed = 0;
    const speed = Math.abs(s.vx);
    const moving = s.ground && speed > 0.4;
    this.walk = damp(this.walk, moving ? 1 : 0, 12, dt);
    this.air = damp(this.air, s.ground ? 0 : 1, 14, dt);
    this.bubble = damp(this.bubble, s.state === 'bubble' ? 1 : 0, 10, dt);
    if (moving) {
      this.phase += speed * 2.25 * dt;
      const step = Math.floor(this.phase / Math.PI);
      if (step !== this._lastStep) { this._lastStep = step; this.footstep = true; }
    }

    // 뛰는 순간: 쭉 늘어난다 / 착지: 꾹 눌린다
    if (this.wasGround && !s.ground && s.vy > 2) { this.sq.kick(3.4); this.earL.kick(-5); this.earR.kick(-5); this.headY.kick(1.2); }
    if (!this.wasGround && s.ground) {
      const impact = clamp(-this.lastVy, 0, 22);
      this.landed = impact;
      this.sq.x = Math.min(this.sq.x, 0.02);            // 늘어나 있던 몸이 바닥에 닿는 순간부터 눌린다
      this.sq.kick(-(2.0 + impact * 0.27));
      this.headY.kick(-(0.8 + impact * 0.09));
      this.earL.kick(4 + impact * 0.3); this.earR.kick(5 + impact * 0.3);
      this.tail.kick(3);
      if (impact > 9 && this.exprT <= 0) this.setExpr('effort', 0.22);
    }
    this.wasGround = s.ground; this.lastVy = s.vy;

    // 공중에서는 속도만큼 살짝 길어진다
    this.sq.target = s.ground ? 0 : clamp(Math.abs(s.vy) * 0.008, 0, 0.1);
    this.sq.step(dt);
    this.sq.x = clamp(this.sq.x, -0.34, 0.3);
    this.headY.step(dt); this.headX.target = clamp(-s.vx * 0.006, -0.04, 0.04); this.headX.step(dt);
    this.earL.target = this.earR.target = s.ground ? 0 : clamp(s.vy * 0.03, -0.5, 0.4);
    this.earL.step(dt); this.earR.step(dt);
    this.tail.target = clamp(-s.vx * 0.05, -0.3, 0.3); this.tail.step(dt);
    this.turn.target = s.face >= 0 ? 1 : -1; this.turn.step(dt);
    this.pop.step(dt);
    this.armUp = damp(this.armUp, (!s.ground && s.vy > 0) || this.expr === 'happy' ? 1 : 0, 10, dt);

    // 가만히 있으면 앉아서 짝 쪽을 본다
    if (s.ground && speed < 0.2 && s.state !== 'bubble') this.idleT += dt; else this.idleT = 0;
    this.sit = damp(this.sit, this.idleT > 3.2 && Math.abs(this.leanTarget) < 0.1 ? 1 : 0, 5, dt);
    this.lookAt = s.partnerDx ? Math.sign(s.partnerDx) : 0;
    this.lean = damp(this.lean, this.leanTarget, 7, dt);

    // 눈 깜빡임, 귀 쫑긋
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) { this.blink = 0.13; this.blinkAt = 2.2 + Math.random() * 3.2; }
    this.blink = Math.max(0, this.blink - dt);
    this.twitchAt -= dt;
    if (this.twitchAt <= 0) { (Math.random() < 0.5 ? this.earL : this.earR).kick(3.2); this.twitchAt = 2.5 + Math.random() * 4; }
    if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'neutral'; }
  }
}

function blob(ctx, cx, cy, rx, ry, flat = 0) {
  // 아래쪽이 살짝 납작한 둥근 덩어리 (찹쌀떡 모양)
  const k = 0.5523;
  const by = cy + ry * (1 - flat);
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.bezierCurveTo(cx - rx, cy - ry * k * 1.05, cx - rx * k, cy - ry, cx, cy - ry);
  ctx.bezierCurveTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k * 1.05, cx + rx, cy);
  ctx.bezierCurveTo(cx + rx, cy + ry * k * (1 + flat), cx + rx * (k + flat * 0.5), by, cx, by);
  ctx.bezierCurveTo(cx - rx * (k + flat * 0.5), by, cx - rx, cy + ry * k * (1 + flat), cx - rx, cy);
  ctx.closePath();
}

function fillStroke(ctx, fill, line, lw) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke();
}

// (0,0)이 발바닥, 위쪽이 -y. 단위는 게임 세계 단위(고양이 키 약 1.3)
export function drawCat(ctx, a, look, opt = {}) {
  const L = look;
  const lw = 0.05;
  const dir = a.turn.x;                    // -1..1 (돌아볼 때 0을 지나며 납작해진다)
  const side = dir >= 0 ? 1 : -1;
  const turnSq = 0.9 + 0.1 * Math.abs(dir);
  const sq = a.sq.x;
  const breathe = Math.sin(a.t * 2.1) * 0.012 * (1 - a.walk);
  const stepSq = Math.sin(a.phase * 2) * 0.028 * a.walk; // 걸을 때 발 디딜 때마다 살짝 말랑
  const sy = (1 + sq + breathe + stepSq) * (1 - a.sit * 0.07);
  const sx = (1 - sq * 0.62 - breathe * 0.5 - stepSq * 0.6) * turnSq * (1 + a.sit * 0.05);
  const bob = Math.abs(Math.sin(a.phase)) * 0.05 * a.walk;
  const tilt = (a.walk * 0.07 + a.air * 0.05) * side * clamp(Math.abs(dir), 0, 1) + a.lean * 0.1;
  const pop = Math.max(0, a.pop.x);
  const bub = a.bubble;

  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (bub > 0.01) { // 방울 속: 살짝 작아지고 둥실
    const k = lerp(1, 0.78, bub);
    ctx.translate(0, -0.25 * bub);
    ctx.rotate(Math.sin(a.t * 3) * 0.12 * bub);
    ctx.scale(k, k);
  }
  ctx.scale(pop, pop);
  if (opt.glow) { ctx.shadowColor = opt.glow; ctx.shadowBlur = opt.glowPx || 0; }

  // 발 아래 기준으로 눌림/늘어남
  ctx.translate(0, -bob);
  ctx.rotate(tilt);
  ctx.scale(sx, sy);

  const sit = a.sit;
  const bodyCy = -0.37 + sit * 0.05;
  const bodyRx = 0.42 + sit * 0.04, bodyRy = 0.36 - sit * 0.03;

  // --- 꼬리 (몸 뒤쪽에 붙어 있음) ---
  {
    const sway = Math.sin(a.t * 1.7) * 0.1 * (1 - a.walk * 0.5) + a.tail.x + Math.sin(a.phase) * 0.06 * a.walk;
    const bx = -side * (bodyRx - 0.1), by = bodyCy + 0.17;
    const tipx = bx - side * (0.2 + sit * 0.03), tipy = by - 0.2 + sway * 0.16 - a.air * 0.06;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - side * 0.2, by + 0.06, tipx + sway * 0.07 * side, tipy);
    ctx.lineWidth = 0.2 + lw * 2; ctx.strokeStyle = L.line; ctx.stroke();
    ctx.lineWidth = 0.2; ctx.strokeStyle = L.body; ctx.stroke();
    // 꼬리 끝 무늬
    ctx.beginPath(); ctx.arc(tipx + sway * 0.07 * side, tipy, 0.08, 0, TAU); ctx.fillStyle = L.patch; ctx.fill();
  }
  ctx.shadowBlur = 0;

  // --- 발 (몸 아래에 반쯤 묻혀 있음) ---
  const footY = -0.06;
  for (const f of [-1, 1]) {
    const ph = a.phase + (f > 0 ? Math.PI : 0);
    const swing = Math.sin(ph) * 0.12 * a.walk * side;
    const lift = Math.max(0, Math.cos(ph)) * 0.075 * a.walk + a.air * 0.05;
    const fx = f * 0.19 + swing + sit * f * 0.03 + side * sit * 0.06;
    blob(ctx, fx, footY - lift, 0.15, 0.1, 0.25);
    fillStroke(ctx, L.body, L.line, lw);
  }

  // --- 몸 ---
  blob(ctx, 0, bodyCy, bodyRx, bodyRy, 0.3);
  {
    const g = ctx.createLinearGradient(0, bodyCy - bodyRy, 0, bodyCy + bodyRy);
    g.addColorStop(0, L.body); g.addColorStop(0.55, L.body); g.addColorStop(1, L.shade);
    fillStroke(ctx, g, L.line, lw);
  }

  // --- 앞발: 몸에 붙은 작은 혹 (윤곽은 바깥쪽 반만) ---
  for (const f of [-1, 1]) {
    const up = a.armUp;
    const hug = Math.max(0, a.lean * f) * 0.9; // 기댈 때 짝 쪽 팔을 내민다
    const swing = Math.sin(a.phase + (f > 0 ? 0 : Math.PI)) * 0.05 * a.walk;
    const ax = f * (0.3 + hug * 0.1) + side * 0.03, ay = bodyCy - 0.02 - up * 0.2 - hug * 0.1 + swing;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(f * (0.25 + up * 1.1 + hug * 0.8));
    blob(ctx, 0, 0, 0.105, 0.14, 0.1);
    ctx.fillStyle = L.body; ctx.fill();
    // 바깥쪽·아래쪽만 선을 그려서 몸과 한 덩어리로 보이게
    ctx.beginPath();
    if (f > 0) ctx.arc(0, 0.01, 0.115, -0.5, Math.PI * 0.95); else ctx.arc(0, 0.01, 0.115, Math.PI * 0.05, Math.PI + 0.5);
    ctx.lineWidth = lw * 0.85; ctx.strokeStyle = L.line; ctx.stroke();
    ctx.restore();
  }

  // --- 머리 (몸보다 크다) ---
  const hx = a.headX.x + dir * 0.035 + a.lean * 0.1;
  const hy = -0.85 + sit * 0.07 + a.headY.x * 0.06 - a.air * 0.02;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a.lean * 0.16 + sit * a.lookAt * 0.07 + Math.sin(a.t * 0.9) * 0.012);
  const cheek = 1 - Math.abs(a.lean) * 0.07; // 볼이 눌린다
  ctx.scale(cheek * (1 - a.headY.x * 0.02), 1 + Math.abs(a.lean) * 0.03 + a.headY.x * 0.03);
  const hrx = 0.56, hry = 0.46;

  // 귀 (둥글게, 머리 뒤에서 시작)
  for (const f of [-1, 1]) {
    const e = f < 0 ? a.earL.x : a.earR.x;
    const far = f === -side ? 0.92 : 1; // 먼 쪽 귀는 살짝 작게
    ctx.save();
    ctx.translate(f * 0.335 - dir * 0.02, -hry + 0.1);
    ctx.rotate(f * (0.36 + e * 0.16) + a.lean * 0.05);
    ctx.scale(far, far * (1 + clamp(-e * 0.05, -0.1, 0.12)));
    blob(ctx, 0, -0.09, 0.165, 0.185, 0);
    fillStroke(ctx, f === side ? L.patch : L.body, L.line, lw);
    blob(ctx, 0, -0.07, 0.085, 0.1, 0);
    ctx.fillStyle = L.ear; ctx.fill();
    ctx.restore();
  }
  blob(ctx, 0, 0, hrx, hry, 0.16);
  {
    const g = ctx.createRadialGradient(-0.08, -0.14, 0.1, 0, 0, 0.62);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, L.body); g.addColorStop(1, L.shade);
    fillStroke(ctx, g, L.line, lw);
  }

  // --- 얼굴 ---
  const fxo = dir * 0.085;                 // 보는 방향으로 얼굴이 쏠린다
  const ex = 0.215, ey = 0.06;              // 눈은 낮고 멀리(살짝 멍한 인상)
  let expr = a.expr;
  if (a.bubble > 0.5 && expr === 'neutral') expr = 'effort';
  if (Math.abs(a.lean) > 0.5) expr = 'happy';
  if (a.sit > 0.8 && expr === 'neutral' && Math.sin(a.t * 0.6) > 0.93) expr = 'sleepy';
  const blink = a.blink > 0 && (expr === 'neutral' || expr === 'worry');

  // 볼터치
  ctx.fillStyle = L.blush;
  ctx.globalAlpha = expr === 'happy' || expr === 'love' ? 0.85 : 0.55;
  for (const f of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fxo + f * 0.35, ey + 0.115, 0.09, 0.055, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = L.eye; ctx.fillStyle = L.eye; ctx.lineWidth = 0.042;
  for (const f of [-1, 1]) {
    const x = fxo + f * ex, y = ey;
    if (blink || expr === 'sleepy') {
      ctx.beginPath(); ctx.moveTo(x - 0.05, y + 0.005); ctx.lineTo(x + 0.05, y + 0.005); ctx.stroke();
    } else if (expr === 'happy' || expr === 'love') {
      ctx.beginPath(); ctx.arc(x, y + 0.03, 0.055, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    } else if (expr === 'effort') {
      ctx.beginPath(); ctx.moveTo(x + f * 0.05, y - 0.045); ctx.lineTo(x - f * 0.035, y); ctx.lineTo(x + f * 0.05, y + 0.045); ctx.stroke();
    } else if (expr === 'wow') {
      ctx.beginPath(); ctx.arc(x, y, 0.066, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 0.02, y - 0.024, 0.024, 0, TAU); ctx.fill(); ctx.fillStyle = L.eye;
    } else {
      ctx.beginPath(); ctx.ellipse(x, y, 0.047, 0.054, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 0.014, y - 0.02, 0.016, 0, TAU); ctx.fill(); ctx.fillStyle = L.eye;
      if (expr === 'worry') { ctx.beginPath(); ctx.moveTo(x - f * 0.06, y - 0.13); ctx.lineTo(x + f * 0.04, y - 0.1); ctx.lineWidth = 0.032; ctx.stroke(); ctx.lineWidth = 0.042; }
    }
  }
  // 코·입
  const mx = fxo, my = ey + 0.105;
  ctx.lineWidth = 0.034;
  if (expr === 'wow') {
    ctx.beginPath(); ctx.ellipse(mx, my + 0.03, 0.035, 0.045, 0, 0, TAU); ctx.fillStyle = L.line; ctx.fill();
  } else if (expr === 'worry') {
    ctx.beginPath(); ctx.moveTo(mx - 0.05, my + 0.03); ctx.quadraticCurveTo(mx - 0.025, my, mx, my + 0.03); ctx.quadraticCurveTo(mx + 0.025, my + 0.055, mx + 0.05, my + 0.025); ctx.stroke();
  } else if (expr === 'happy' || expr === 'love') {
    ctx.beginPath(); ctx.moveTo(mx - 0.06, my); ctx.quadraticCurveTo(mx, my + 0.11, mx + 0.06, my); ctx.closePath();
    ctx.fillStyle = '#E8766F'; ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(mx - 0.032, my, 0.032, 0.1, Math.PI * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx + 0.032, my, 0.032, Math.PI * 0.05, Math.PI * 0.9); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(mx, my - 0.022, 0.022, 0.015, 0, 0, TAU); ctx.fillStyle = '#E79A8F'; ctx.fill();
  ctx.restore(); // 머리

  ctx.restore();

  // 방울
  if (bub > 0.02) {
    ctx.save();
    const r = 0.86 * easeOutBack(sat(bub * 1.15));
    ctx.translate(0, -0.62);
    const g = ctx.createRadialGradient(-0.25, -0.3, 0.05, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.3, 'rgba(190,240,255,0.10)'); g.addColorStop(0.85, 'rgba(160,230,255,0.16)'); g.addColorStop(1, 'rgba(210,250,255,0.55)');
    ctx.beginPath(); ctx.ellipse(0, 0, r * (1 + Math.sin(a.t * 5) * 0.03), r * (1 - Math.sin(a.t * 5) * 0.03), 0, 0, TAU);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 0.025; ctx.strokeStyle = 'rgba(235,252,255,0.8)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.48, r * 0.2, r * 0.1, -0.7, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    ctx.restore();
  }
}

// 발밑 그림자
export function drawCatShadow(ctx, a, alpha = 0.3, h = 0) {
  const k = clamp(1 - h * 0.25, 0.35, 1);
  ctx.save();
  ctx.fillStyle = `rgba(4,8,22,${alpha * k})`;
  ctx.beginPath(); ctx.ellipse(0, 0.02, 0.46 * k * (1 - a.sq.x * 0.4), 0.085 * k, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
