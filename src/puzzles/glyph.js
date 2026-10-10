// 퍼즐 3 · 문양 암호
// 빛의 세계(1P)에게만 벽의 문양 3개가 보인다. 그림자 세계(2P)에게만 문양을 맞추는 장치가 보인다.
// 1P가 생김새를 말로 설명하고, 2P가 장치의 고리 3개를 돌려 맞춘 뒤 발바닥 단추를 누른다.
// 틀리면 벽의 문양이 바뀐다(찍어서는 못 연다).
import { rng, TAU, sat, easeInOut, easeOut, rgba, clamp, lerp, roundRect, Spring } from '../util.js';
import { drawGlyph, GLYPH_COUNT } from '../render/glyphs.js';

export class GlyphGate {
  constructor(cfg) {
    Object.assign(this, cfg);
    this.panel = { open: false, dials: [0, 3, 5], u: 0, shake: new Spring(7, 0.3), spin: [0, 0, 0] };
    this.shuffleT = -9; this.okT = -9;
    this._seed = null;
  }
  init() { return { seed: 11, tries: 0, open: 0 }; }

  code(seed) {
    if (this._seed !== seed) {
      const r = rng(seed * 104729 + 17), pool = [...Array(GLYPH_COUNT).keys()], c = [];
      for (let i = 0; i < 3; i++) c.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      this._seed = seed; this._code = c;
    }
    return this._code;
  }
  isOpen(g) { const st = g.pz(this.id); return st.open > 0; }
  openU(g) { const st = g.pz(this.id); return st.open > 0 ? sat((g.tc - st.open - 0.5) / 1.6) : 0; }

  solids(g, out) {
    if (this.openU(g) < 0.55) out.push({ x: this.gate.x, y: 0, w: this.gate.w, h: this.gate.h });
  }

  nearDevice(g) { return g.me.ground && Math.abs(g.me.x - this.deviceX) < 1.15 && g.me.state === 'play'; }
  canAct(g) { return g.viewRole === 1 && !this.isOpen(g) && this.nearDevice(g); }
  act(g) {
    const p = this.panel;
    if (p.open) { this.submit(g); return; }
    p.open = true; p.at = g.me.x;
    g.sound('panel');
    g.emote('think');
  }
  submit(g) {
    g.act('glyph', { id: this.id, code: this.panel.dials.slice() });
    g.sound('press');
  }

  update(g, dt) {
    const p = this.panel;
    if (p.open && (!this.canAct(g) || Math.abs(g.me.x - p.at) > 0.4)) p.open = false; // 걸어서 멀어지면 닫힌다
    p.u = clamp(p.u + (p.open ? dt : -dt) * 5, 0, 1);
    p.shake.step(dt);
    for (let i = 0; i < 3; i++) p.spin[i] *= Math.exp(-dt * 14);
    // 키보드(PC 테스트): 1·2·3으로 고리 돌리기
    if (p.open) for (let i = 0; i < 3; i++) while (g.keyHit('Digit' + (i + 1))) this.turn(g, i, 1);
    g.uiBusy = g.uiBusy || p.u > 0.5;
  }
  turn(g, i, dir) {
    const p = this.panel;
    p.dials[i] = (p.dials[i] + dir + GLYPH_COUNT) % GLYPH_COUNT;
    p.spin[i] = dir;
    g.sound('dial');
  }

  // 패널 위치(화면 픽셀)
  layout(g) {
    const { W, H } = g.view;
    const ph = H * 0.6, pw = Math.min(W * 0.6, ph * 2.05);
    const x = (W - pw) / 2, y = H * 0.1;
    const ww = pw * 0.24, gap = (pw - ww * 3) / 4;
    const wheels = [0, 1, 2].map((i) => ({ x: x + gap + i * (ww + gap), y: y + ph * 0.1, w: ww, h: ph * 0.62 }));
    const btn = { x: W / 2, y: y + ph * 0.86, r: ph * 0.105 };
    return { x, y, pw, ph, wheels, btn };
  }
  tap(g, tx, ty) {
    const p = this.panel;
    if (!p.open) return false;
    const L = this.layout(g);
    const k = g.view.dpr;
    tx *= k; ty *= k;
    for (let i = 0; i < 3; i++) {
      const w = L.wheels[i];
      if (tx >= w.x && tx <= w.x + w.w && ty >= w.y - 10 && ty <= w.y + w.h + 10) { this.turn(g, i, ty < w.y + w.h / 2 ? -1 : 1); return true; }
    }
    if (Math.hypot(tx - L.btn.x, ty - L.btn.y) < L.btn.r * 1.5) { this.submit(g); return true; }
    if (tx < L.x || tx > L.x + L.pw || ty < L.y || ty > L.y + L.ph) p.open = false;
    return true;
  }

  host(g, st, from, type, d) {
    if (type !== 'glyph' || d.id !== this.id || st.open) return false;
    const c = this.code(st.seed);
    if (d.code && d.code.length === 3 && d.code.every((v, i) => v === c[i])) {
      st.open = g.tc;
      g.emitFx('glyphOk', { id: this.id });
      g.beat('p3');
    } else {
      st.tries++; st.seed += 1 + (st.tries % 3);
      g.emitFx('glyphNo', { id: this.id });
    }
    return true;
  }
  onFx(g, name, d) {
    if (d.id !== this.id) return;
    if (name === 'glyphNo') {
      this.shuffleT = g.t; this.panel.shake.kick(26);
      g.sound('wrong');
      if (g.viewRole === 1) g.me.anim.setExpr('worry', 1.2); else g.other.anim.setExpr('worry', 1.2);
    }
    if (name === 'glyphOk') { this.okT = g.t; this.panel.open = false; g.sound('gate'); }
  }

  draw(g, ctx, layer) {
    const pal = g.pal, st = g.pz(this.id), code = this.code(st.seed);
    const seesWall = g.viewRole === 0, seesDev = g.viewRole === 1;
    if (layer === 'back') {
      // 벽의 석판 3장
      const shU = sat((g.t - this.shuffleT) / 0.9);
      for (let i = 0; i < 3; i++) {
        const x = this.murals[i], y = -this.muralY;
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = pal.stoneDark; roundRect(ctx, -0.78, -0.9, 1.56, 1.8, 0.2); ctx.fill();
        ctx.fillStyle = pal.stone; roundRect(ctx, -0.68, -0.8, 1.36, 1.6, 0.16); ctx.fill();
        ctx.strokeStyle = rgba('#000000', 0.2); ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(-0.5, 0.55); ctx.lineTo(-0.2, 0.35); ctx.lineTo(-0.3, 0.1); ctx.moveTo(0.45, -0.6); ctx.lineTo(0.3, -0.4); ctx.stroke();
        if (seesWall) {
          const open = st.open > 0;
          const pulse = 0.75 + 0.25 * Math.sin(g.t * 2.2 + i * 1.3);
          const a = shU < 1 ? Math.abs(Math.cos(shU * Math.PI * 1.5)) * (0.3 + 0.7 * shU) : 1;
          const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.2);
          gg.addColorStop(0, pal.glow); gg.addColorStop(1, rgba('#000000', 0));
          ctx.globalAlpha = 0.28 * pulse * a; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, TAU); ctx.fill();
          ctx.globalAlpha = a;
          ctx.rotate(shU < 1 ? (1 - shU) * (i - 1) * 0.6 : 0);
          drawGlyph(ctx, code[i], 0, 0, 1.05, open ? pal.warm : pal.glow, 0.1);
          ctx.globalAlpha = a * 0.5; drawGlyph(ctx, code[i], 0, 0, 1.05, '#ffffff', 0.035);
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0, 0, 0.36, 0.4, 2.2); ctx.stroke();
        }
        ctx.restore();
      }
      // 큰 돌문
      const u = this.openU(g), e = easeInOut(u);
      const gx = this.gate.x, gw = this.gate.w, gh = this.gate.h;
      ctx.save();
      ctx.beginPath(); ctx.rect(gx - 1, -gh - 1.2, gw + 2, gh + 1.2); ctx.clip();
      const off = e * (gh + 0.2) + (u > 0 && u < 1 ? Math.sin(g.t * 40) * 0.012 : 0);
      const dg = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      dg.addColorStop(0, pal.stone); dg.addColorStop(1, pal.stoneDark);
      ctx.fillStyle = dg; roundRect(ctx, gx, -gh + off, gw, gh + 0.2, 0.18); ctx.fill();
      ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.04; roundRect(ctx, gx + 0.12, -gh + off + 0.12, gw - 0.24, gh - 0.1, 0.12); ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { // 문에 새겨진 빈 자리 3개 (맞히면 채워진다)
        const cy = -gh + off + 0.9 + i * 1.05;
        ctx.fillStyle = rgba('#000000', 0.28); ctx.beginPath(); ctx.arc(gx + gw / 2, cy, 0.3, 0, TAU); ctx.fill();
        if (st.open > 0) { ctx.globalAlpha = sat((g.tc - st.open) / 0.4 - i * 0.3); drawGlyph(ctx, code[i], gx + gw / 2, cy, 0.5, pal.warm, 0.12); ctx.globalAlpha = 1; }
      }
      ctx.restore();
      // 문틀
      ctx.fillStyle = pal.stoneDark; ctx.fillRect(gx - 0.3, -gh - 0.75, gw + 0.6, 0.75);
      ctx.fillStyle = pal.top; ctx.fillRect(gx - 0.3, -gh - 0.75, gw + 0.6, 0.12);

      // 장치(2P만 본다) / 그냥 바위(1P)
      const dx = this.deviceX;
      if (seesDev) { // 고양이 키보다 높은 받침대: 고리 3개가 머리 위로 보인다
        ctx.fillStyle = pal.stoneDark; roundRect(ctx, dx - 0.26, -1.75, 0.52, 1.75, 0.1); ctx.fill();
        ctx.fillStyle = pal.stone; roundRect(ctx, dx - 0.36, -0.2, 0.72, 0.2, 0.06); ctx.fill();
        const hy = -2.1;
        ctx.fillStyle = pal.stoneDark; roundRect(ctx, dx - 0.78, hy - 0.36, 1.56, 0.72, 0.22); ctx.fill();
        ctx.strokeStyle = '#ffb8ea'; ctx.globalAlpha = 0.55 + 0.25 * Math.sin(g.t * 2); ctx.lineWidth = 0.035; roundRect(ctx, dx - 0.78, hy - 0.36, 1.56, 0.72, 0.22); ctx.stroke(); ctx.globalAlpha = 1;
        for (let i = 0; i < 3; i++) {
          const rx = dx - 0.48 + i * 0.48, ry = hy;
          ctx.fillStyle = rgba('#000000', 0.4); ctx.beginPath(); ctx.arc(rx, ry, 0.2, 0, TAU); ctx.fill();
          drawGlyph(ctx, st.open ? code[i] : this.panel.dials[i], rx, ry, 0.3, '#ffd9f4', 0.13);
        }
        if (this.canAct(g) && !this.panel.open) pawHint(ctx, dx + 1.05, -2.15 - Math.sin(g.t * 3) * 0.06, '#ffd9f4');
      } else {
        ctx.fillStyle = pal.rock; ctx.beginPath(); ctx.ellipse(dx, -0.02, 0.62, 0.85, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = pal.top; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(dx - 0.05, -0.72, 0.42, 0.14, -0.1, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      return;
    }
    if (layer === 'ui' && this.panel.u > 0.01) this.drawPanel(g, ctx);
  }

  drawPanel(g, ctx) {
    const p = this.panel, L = this.layout(g), u = easeOut(p.u);
    ctx.save();
    ctx.globalAlpha = sat(p.u * 1.5);
    ctx.translate(g.view.W / 2 + p.shake.x * g.view.H * 0.004, (1 - u) * g.view.H * 0.08);
    ctx.translate(-g.view.W / 2, 0);
    ctx.fillStyle = 'rgba(8,5,26,0.5)'; ctx.fillRect(-50, -200, g.view.W + 100, g.view.H + 400);
    // 판
    const grd = ctx.createLinearGradient(0, L.y, 0, L.y + L.ph);
    grd.addColorStop(0, '#3a2f6e'); grd.addColorStop(1, '#1d1642');
    ctx.fillStyle = grd; roundRect(ctx, L.x, L.y, L.pw, L.ph, L.ph * 0.09); ctx.fill();
    ctx.strokeStyle = 'rgba(232,190,255,0.55)'; ctx.lineWidth = Math.max(2, L.ph * 0.008); roundRect(ctx, L.x + 6, L.y + 6, L.pw - 12, L.ph - 12, L.ph * 0.075); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const w = L.wheels[i], cx = w.x + w.w / 2, cy = w.y + w.h / 2;
      ctx.save();
      roundRect(ctx, w.x, w.y, w.w, w.h, w.w * 0.2); ctx.fillStyle = 'rgba(8,4,28,0.6)'; ctx.fill(); ctx.clip();
      const spin = p.spin[i];
      for (let k = -1; k <= 1; k++) {
        const id = (p.dials[i] + k + GLYPH_COUNT) % GLYPH_COUNT;
        const yy = cy + (k + spin) * w.h * 0.46;
        ctx.globalAlpha = sat(p.u * 1.5) * (k === 0 ? 1 : 0.22);
        drawGlyph(ctx, id, cx, yy, w.w * (k === 0 ? 0.78 : 0.5), k === 0 ? '#ffe3f8' : '#c9a8ff', 0.095);
      }
      ctx.restore();
      ctx.globalAlpha = sat(p.u * 1.5);
      ctx.strokeStyle = 'rgba(255,184,234,0.75)'; ctx.lineWidth = Math.max(2, L.ph * 0.007); roundRect(ctx, w.x, w.y, w.w, w.h, w.w * 0.2); ctx.stroke();
      // 위아래 화살표
      ctx.fillStyle = 'rgba(255,215,244,0.85)';
      const ar = w.w * 0.09;
      ctx.beginPath(); ctx.moveTo(cx, w.y + ar * 0.7); ctx.lineTo(cx - ar, w.y + ar * 2); ctx.lineTo(cx + ar, w.y + ar * 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, w.y + w.h - ar * 0.7); ctx.lineTo(cx - ar, w.y + w.h - ar * 2); ctx.lineTo(cx + ar, w.y + w.h - ar * 2); ctx.closePath(); ctx.fill();
    }
    // 발바닥 단추
    const b = L.btn, pulse = 1 + Math.sin(g.t * 3.2) * 0.04;
    ctx.fillStyle = '#ff9fdc'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * pulse, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, b.r * 0.08); ctx.globalAlpha *= 0.8; ctx.stroke();
    ctx.globalAlpha = sat(p.u * 1.5);
    paw(ctx, b.x, b.y + b.r * 0.08, b.r * 0.55, '#4a2a6a');
    ctx.restore();
  }
}

export function paw(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.25, s * 0.52, s * 0.42, 0, 0, TAU); ctx.fill();
  for (const [dx, dy] of [[-0.62, -0.25], [-0.22, -0.62], [0.22, -0.62], [0.62, -0.25]]) { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, s * 0.2, s * 0.25, dx * 0.5, 0, TAU); ctx.fill(); }
}
// "여기서 발바닥 단추를 눌러봐" 말풍선
export function pawHint(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,12,48,0.75)'; ctx.beginPath(); ctx.arc(x, y, 0.36, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 0.12, y + 0.32); ctx.lineTo(x, y + 0.52); ctx.lineTo(x + 0.12, y + 0.32); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.arc(x, y, 0.36, 0, TAU); ctx.stroke();
  paw(ctx, x, y + 0.02, 0.2, color);
  ctx.restore();
}
