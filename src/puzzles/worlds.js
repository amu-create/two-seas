// 두 세계: "내 눈에 보이는 것만 내 세계에 있다."
// 다리·문·불꽃·받침돌(things)과 누름돌(keys)은 저마다 어느 세계의 것인지(world)가 정해져 있다.
//   world 0 = 빛의 눈에만, 1 = 그림자의 눈에만, 'both' = 둘 다.
// 내 세계에 없는 것은 보이지도, 밟히지도, 막히지도, 뜨겁지도 않다. (짝은 허공을 걷는 것처럼 보인다)
// 대신 내 세계의 누름돌이 짝의 세계를 바꾼다: 내가 밟고 있는 동안 짝의 다리가 놓이고, 짝의 문이 열리고, 짝의 불이 꺼진다.
// → "난 다리가 없어" "난 여기 돌이 하나 있어, 밟아 볼게" 하고 말해야 지나간다.
// 상태는 두 고양이의 위치만으로 정해지므로 방장이 따로 기억할 것이 없다.
//
// cfg: { id,
//   keys:   [{ x, y, world, mark }],
//   things: [{ kind:'bridge'|'door'|'flame'|'riser', world, x, w, y, h, key, mark }] }   key가 없으면 늘 있는 것
import { TAU, damp, rgba, easeInOut, roundRect, sat, lerp } from '../util.js';
import { drawGlyph } from '../render/glyphs.js';
import { flame, TINT } from './vents.js';
import { haptics } from '../game/haptics.js';

export class Links {
  constructor(cfg) {
    Object.assign(this, { keys: [], things: [] }, cfg);
    this.keys = this.keys.map((k) => ({ y: 0, world: 'both', ...k, sink: 0 }));
    this.things = this.things.map((t) => ({ y: 0, world: 'both', h: t.kind === 'flame' ? 2.3 : t.kind === 'door' ? 4.3 : t.kind === 'wall' ? 2.9 : 1.45, ...t, u: t.key == null ? 1 : 0 }));
    this.flash = -9;
  }
  init() { return {}; }
  // 그 세계의 눈을 가진 고양이들
  cats(g, world) { return world === 'both' ? [g.me, g.other] : (g.viewRole === world ? [g.me] : [g.other]); }
  onKey(c, k) { return c.present !== false && c.state === 'play' && c.ground && Math.abs(c.x - k.x) < 0.52 && Math.abs(c.y - k.y) < 0.12; }
  pressed(g, i) { // 그 세계의 고양이가 밟고 있거나, 상자가 올려져 있으면 눌린다 (상자는 두 세계에 다 있는 물건)
    const k = this.keys[i];
    return this.cats(g, k.world).some((c) => this.onKey(c, k)) || g.chapter.puzzles.some((p) => p.bx != null && k.x > p.bx + 0.05 && k.x < p.bx + p.w - 0.05 && Math.abs(p.y - k.y) < 0.1);
  }
  // 따라오는 발판: 내 세계에만 있고, 짝이 걷는 대로 따라 움직인다
  followLeft(g, t) { const o = g.other; return o.present ? Math.min(Math.max(o.x - t.w / 2 + (t.off || 0), t.x0), t.x1 - t.w) : t.x0; }
  // 곁얼음: 내 세계에서는 짝의 곁(r칸 안)에서만 물이 언다
  auraSpan(g, t) { const o = g.other; if (!o.present || o.state !== 'play') return null; const a = Math.max(t.x, o.x - t.r), b = Math.min(t.x + t.w, o.x + t.r); return b - a > 0.25 ? [a, b] : null; }
  active(g, t) { return t.key == null ? true : (Array.isArray(t.key) ? t.key : [t.key]).some((i) => this.pressed(g, i)); }
  mine(g, o) { return g.sees(o.world); }

  solids(g, out) {
    for (const t of this.things) {
      if (!this.mine(g, t)) continue;
      if (t.kind === 'bridge') { if (t.u > 0.6) out.push({ x: t.x, y: t.y - 0.32, w: t.w, h: 0.32 }); }
      else if (t.kind === 'door') { if (t.u < 0.6) out.push({ x: t.x, y: t.y, w: t.w, h: t.h }); }
      else if (t.kind === 'wall') out.push({ x: t.x, y: t.y, w: t.w, h: t.h });
      else if (t.kind === 'follow') {
        // 발판 위에 가만히 서 있으면 발판과 함께 실려 간다 (물리 계산 바로 앞에서 옮겨야 한 프레임도 밀리지 않는다)
        const left = this.followLeft(g, t), prev = t._left ?? left, d = left - prev, me = g.me;
        if (d && Math.abs(d) < 2.5 && me.state === 'play' && me.ground && Math.abs(me.y - t.y) < 0.06 && me.x > prev - 0.3 && me.x < prev + t.w + 0.3 && !(g.inp && g.inp.x)) me.x += d;
        t._left = left; t._v = (t._v || 0) * 0.85 + Math.min(6, Math.abs(d) * 40) * 0.15;
        out.push({ x: left, y: t.y - 0.3, w: t.w, h: 0.3 });
      }
      else if (t.kind === 'aura') { const sp = this.auraSpan(g, t); if (sp) out.push({ x: sp[0], y: t.y - 0.32, w: sp[1] - sp[0], h: 0.32 }); }
      else if (t.kind === 'riser') { if (t.u > 0.02) out.push({ x: t.x, y: t.y - 0.4, w: t.w, h: 0.4 + t.h * t.u, carry: true }); }
    }
  }
  // 시험용 봇: 내 세계에서 지금 뜨거운 곳
  hazards(tc, g) { return g ? this.things.filter((t) => t.kind === 'flame' && this.mine(g, t)).map((t) => ({ x0: t.x, x1: t.x + t.w, y0: t.y, y1: t.y + t.h, active: t.u < 0.6, activeIn: t.u < 0.6 ? 0 : 99, clearIn: 0 })) : []; }
  peek(g) { return { keys: this.keys.map((k, i) => ({ x: k.x, y: k.y, world: k.world, on: this.pressed(g, i) })), things: this.things.map((t) => ({ kind: t.kind, world: t.world, x: t.x, w: t.w, u: +t.u.toFixed(2), key: t.key ?? null, mine: this.mine(g, t) })) }; }

  update(g, dt) {
    const me = g.me;
    this.keys.forEach((k, i) => { const p = this.pressed(g, i); if (p && !k.was && this.mine(g, k) && this.onKey(g.me, k)) haptics.buzz('key'); k.was = p; k.sink = damp(k.sink, p ? 1 : 0, 14, dt); });
    for (const t of this.things) {
      const on = this.active(g, t), was = t.u > 0.5;
      t.u = damp(t.u, on ? 1 : 0, t.kind === 'riser' ? 2.2 : t.kind === 'bridge' ? 6 : 5, dt);
      if (t.u > 0.5 !== was && t.key != null) {
        const near = this.mine(g, t);
        if (near) { haptics.buzz('open'); g.sound(t.kind === 'flame' ? 'press' : t.u > 0.5 ? 'panel' : 'press', { x: t.x }); if (t.kind === 'bridge' && t.u > 0.5) g.fx.burst('spark', t.x + t.w / 2, t.y + 0.1, g.q.sparks(12), { speed: 1.2, up: 0.7, color: g.pal.glow, life: 0.8, size: 0.07, rx: t.w }); }
      }
      if (t.kind === 'flame' && this.mine(g, t) && t.u < 0.5 && me.state === 'play' && me.safe <= 0 &&
        me.x > t.x + 0.12 && me.x < t.x + t.w - 0.12 && me.y < t.y + t.h && me.y + 0.9 > t.y) { this.flash = g.t; g.hazard = this.id; g.failMe('trap'); }
    }
  }
  host() { return false; }
  onFx() {}

  draw(g, ctx, layer) {
    const pal = g.pal;
    if (layer === 'front') { // 불꽃은 고양이 앞에
      for (const t of this.things) {
        if (t.kind !== 'flame' || !this.mine(g, t)) continue;
        const T = TINT[t.world === 'both' ? g.viewRole : t.world] || TINT[1], k = 1 - t.u, Y = -t.y;
        if (k > 0.03) flame(ctx, t.x, Y, t.w, t.h * (0.25 + 0.75 * k), Math.min(1, k * 1.4), g.t, t.x, T);
        if (t.mark != null) this.badge(g, ctx, t.x + t.w / 2, Y - t.h - 0.7, t.mark, T[4], k);
      }
      return;
    }
    if (layer !== 'back') return;
    // 누름돌
    this.keys.forEach((k, i) => {
      if (!this.mine(g, k)) return;
      const X = k.x, Y = -k.y, s = k.sink, top = Y - 0.2 + s * 0.13;
      ctx.fillStyle = pal.stoneDark; roundRect(ctx, X - 0.52, Y - 0.04, 1.04, 0.14, 0.05); ctx.fill();
      const gg = ctx.createRadialGradient(X, top, 0, X, top, 1.0);
      gg.addColorStop(0, pal.warm); gg.addColorStop(1, rgba('#000000', 0));
      ctx.globalAlpha = 0.22 + 0.1 * Math.sin(g.t * 2.4 + X) + 0.5 * s; ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(X, top, 0.95, 0.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      const pg = ctx.createLinearGradient(0, top, 0, top + 0.22);
      pg.addColorStop(0, pal.top); pg.addColorStop(1, pal.stone);
      ctx.fillStyle = pg; roundRect(ctx, X - 0.42, top, 0.84, 0.22, 0.08); ctx.fill();
      ctx.strokeStyle = pal.topHi; ctx.globalAlpha = 0.6; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(X - 0.3, top + 0.03); ctx.lineTo(X + 0.3, top + 0.03); ctx.stroke(); ctx.globalAlpha = 1;
      if (k.mark != null) this.badge(g, ctx, X, Y - 1.95 - Math.sin(g.t * 2 + X) * 0.04, k.mark, pal.raw('warm'), 0.55 + 0.45 * s);
      else { // 짝에게 닿는 돌: 밟고 있으면 빛이 실을 타고 짝에게 흘러간다
        ctx.fillStyle = pal.warm; ctx.globalAlpha = 0.35 + 0.6 * s;
        for (let n = 0; n < 3; n++) { const u = (g.t * 0.9 + n / 3) % 1; ctx.globalAlpha = (0.25 + 0.6 * s) * (1 - u); ctx.beginPath(); ctx.arc(X, Y - 0.5 - u * 0.9, 0.05 + 0.03 * s, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      // 같은 세계 안에서 이어진 것은 점선으로 보여 준다
      for (const t of this.things) {
        if (!this.mine(g, t) || !(Array.isArray(t.key) ? t.key.includes(i) : t.key === i) || t.kind === 'flame') continue;
        const tx = t.x + t.w / 2, TY = -t.y;
        ctx.strokeStyle = pal.warm; ctx.lineWidth = 0.05; ctx.globalAlpha = 0.18 + 0.6 * t.u; ctx.setLineDash([0.12, 0.16]); ctx.lineDashOffset = -g.t * 0.6 * t.u;
        ctx.beginPath(); ctx.moveTo(X, Y + 0.14); ctx.lineTo(X, Y + 0.45); ctx.lineTo(tx, Math.max(Y, TY) + 0.45); ctx.lineTo(tx, TY + 0.14); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    });
    for (const t of this.things) {
      if (!this.mine(g, t)) continue;
      const Y = -t.y;
      if (t.kind === 'bridge') { if (t.look === 'ice') this.ice(g, ctx, t.x, t.x + t.w, t.y, 1); else this.bridge(g, ctx, t); }
      else if (t.kind === 'aura') { const sp = this.auraSpan(g, t); if (sp) this.ice(g, ctx, sp[0], sp[1], t.y, 0.9, true); }
      else if (t.kind === 'follow') {
        const x = this.followLeft(g, t), cx = x + t.w / 2, mv = Math.min(1, (t._v || 0) / 3);
        const gg = ctx.createRadialGradient(cx, Y + 0.2, 0, cx, Y + 0.2, t.w * 0.8);
        gg.addColorStop(0, pal.glow); gg.addColorStop(1, rgba('#000000', 0));
        ctx.globalAlpha = 0.4 + 0.1 * Math.sin(g.t * 2 + t.x0) + 0.25 * mv; ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(cx, Y + 0.22, t.w * 0.75, 0.42, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.94; ctx.fillStyle = pal.glow; ctx.beginPath();
        ctx.moveTo(x + 0.15, Y); ctx.lineTo(x + t.w - 0.15, Y); ctx.quadraticCurveTo(x + t.w + 0.05, Y + 0.02, x + t.w - 0.05, Y + 0.2);
        for (let k = 3; k >= 0; k--) { const bx = x + t.w * (k + 0.5) / 4; ctx.quadraticCurveTo(bx + t.w / 8, Y + 0.42 + Math.sin(g.t * 2 + k) * 0.03, bx - t.w / 8, Y + 0.22); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8; ctx.fillRect(x + 0.2, Y, t.w - 0.4, 0.045);
        // 짝과 이어진 가는 빛줄: "이 발판은 짝을 따라온다"
        const o = g.other; if (o.present) { ctx.strokeStyle = pal.glow; ctx.globalAlpha = 0.25 + 0.4 * mv; ctx.lineWidth = 0.035; ctx.setLineDash([0.08, 0.1]); ctx.lineDashOffset = -g.t * 0.5; ctx.beginPath(); ctx.moveTo(cx, Y + 0.3); ctx.quadraticCurveTo((cx + o.x) / 2, Y + 0.9, o.x, -o.y - 0.1); ctx.stroke(); ctx.setLineDash([]); }
        ctx.globalAlpha = 1;
      }
      else if (t.kind === 'flame') { // 불구멍(격자)
        ctx.fillStyle = rgba('#000000', 0.45); roundRect(ctx, t.x + 0.1, Y + 0.03, t.w - 0.2, 0.16, 0.08); ctx.fill();
        ctx.strokeStyle = pal.stoneDark; ctx.lineWidth = 0.05; ctx.beginPath();
        for (let x = t.x + 0.3; x < t.x + t.w - 0.15; x += 0.28) { ctx.moveTo(x, Y + 0.03); ctx.lineTo(x, Y + 0.19); }
        ctx.stroke();
      } else if (t.kind === 'wall') { // 내 세계에만 서 있는 돌벽 (짝은 그냥 지나다닌다)
        const wg = ctx.createLinearGradient(t.x, 0, t.x + t.w, 0);
        wg.addColorStop(0, pal.stone); wg.addColorStop(1, pal.stoneDark);
        ctx.fillStyle = wg; roundRect(ctx, t.x, Y - t.h, t.w, t.h + 0.05, 0.12); ctx.fill();
        ctx.fillStyle = pal.top; roundRect(ctx, t.x - 0.08, Y - t.h - 0.08, t.w + 0.16, 0.2, 0.08); ctx.fill();
        ctx.strokeStyle = rgba('#000000', 0.2); ctx.lineWidth = 0.03; ctx.beginPath();
        for (let yy = 0.55; yy < t.h - 0.2; yy += 0.55) { ctx.moveTo(t.x + 0.06, Y - yy); ctx.lineTo(t.x + t.w - 0.06, Y - yy); }
        ctx.stroke();
        const gl = ctx.createLinearGradient(0, Y - t.h - 0.9, 0, Y - t.h); gl.addColorStop(0, rgba('#ffffff', 0)); gl.addColorStop(1, pal.glow);
        ctx.globalAlpha = 0.22 + 0.08 * Math.sin(g.t * 2 + t.x); ctx.fillStyle = gl; ctx.fillRect(t.x, Y - t.h - 0.9, t.w, 0.9); ctx.globalAlpha = 1;
      } else if (t.kind === 'door') {
        const e = easeInOut(t.u), off = e * (t.h + 0.2);
        ctx.fillStyle = pal.stoneDark; ctx.fillRect(t.x - 0.26, Y - t.h - 0.1, 0.14, t.h + 0.1); ctx.fillRect(t.x + t.w + 0.12, Y - t.h - 0.1, 0.14, t.h + 0.1); // 문설주
        ctx.save();
        ctx.beginPath(); ctx.rect(t.x - 1, Y - t.h - 1.2, t.w + 2, t.h + 1.2); ctx.clip();
        const dg = ctx.createLinearGradient(t.x, 0, t.x + t.w, 0);
        dg.addColorStop(0, pal.stone); dg.addColorStop(1, pal.stoneDark);
        ctx.fillStyle = dg; roundRect(ctx, t.x, Y - t.h + off, t.w, t.h + 0.2, 0.18); ctx.fill();
        ctx.strokeStyle = pal.warm; ctx.globalAlpha = 0.35 + 0.5 * t.u; ctx.lineWidth = 0.05;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(t.x + t.w / 2, Y - t.h + off + 0.9 + k * 1.05, 0.22, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.restore();
        ctx.fillStyle = pal.stoneDark; ctx.fillRect(t.x - 0.3, Y - t.h - 0.75, t.w + 0.6, 0.75);
        ctx.fillStyle = pal.top; ctx.fillRect(t.x - 0.3, Y - t.h - 0.75, t.w + 0.6, 0.12);
        if (t.mark != null) this.badge(g, ctx, t.x + t.w / 2, Y - t.h - 1.35, t.mark, pal.raw('warm'), 1 - t.u * 0.6);
      } else if (t.kind === 'riser') {
        const h = t.h * t.u;
        ctx.fillStyle = pal.stoneDark; ctx.fillRect(t.x + 0.08, Y - 0.03, t.w - 0.16, 0.08);
        if (h > 0.01) {
          const bg = ctx.createLinearGradient(0, Y - h, 0, Y);
          bg.addColorStop(0, pal.stone); bg.addColorStop(1, pal.stoneDark);
          ctx.fillStyle = bg; roundRect(ctx, t.x, Y - h, t.w, h + 0.05, 0.1); ctx.fill();
          ctx.fillStyle = pal.top; ctx.fillRect(t.x + 0.05, Y - h, t.w - 0.1, 0.1);
        }
        ctx.fillStyle = pal.warm; ctx.globalAlpha = 0.35 + 0.5 * t.u;
        for (let k = 0; k < 2; k++) { const ax = t.x + t.w * (0.33 + k * 0.34), ay = Y - h - 0.25 - Math.sin(g.t * 3 + k) * 0.05; ctx.beginPath(); ctx.moveTo(ax, ay - 0.16); ctx.lineTo(ax - 0.13, ay + 0.04); ctx.lineTo(ax + 0.13, ay + 0.04); ctx.closePath(); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    }
  }

  // 문양 딱지: 누름돌과 그것이 바꾸는 것(짝의 세계)에 같은 문양이 붙어 있다
  badge(g, ctx, x, y, mark, color, a) {
    const r = 0.5, pulse = 1 + 0.04 * Math.sin(g.t * 2.6 + x);
    ctx.globalAlpha = 0.9; ctx.fillStyle = rgba('#050a18', 0.82); ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, TAU); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 0.06; ctx.globalAlpha = 0.6 + 0.4 * a; ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1; drawGlyph(ctx, mark, x, y, 0.3, color, 0.085);
  }

  // 얼음길
  ice(g, ctx, x0, x1, y, a, soft) {
    const Y = -y, w = x1 - x0;
    const gr = ctx.createLinearGradient(0, Y, 0, Y + 0.34);
    gr.addColorStop(0, rgba('#f4fdff', 0.95 * a)); gr.addColorStop(0.3, rgba('#bfeaff', 0.8 * a)); gr.addColorStop(1, rgba('#7fc4f0', 0.35 * a));
    ctx.fillStyle = gr; roundRect(ctx, x0, Y, w, 0.34, soft ? 0.16 : 0.06); ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.7 * a); ctx.lineWidth = 0.03; ctx.beginPath();
    for (let x = Math.ceil(x0 / 0.9) * 0.9; x < x1 - 0.3; x += 0.9) { ctx.moveTo(x + 0.1, Y + 0.06); ctx.lineTo(x + 0.32, Y + 0.2); ctx.lineTo(x + 0.22, Y + 0.3); }
    ctx.stroke();
    if (soft) { // 가장자리에서 얼음이 피어나고 녹는다
      for (const ex of [x0, x1]) for (let k = 0; k < 3; k++) { const u = (g.t * 0.8 + k / 3 + ex) % 1; ctx.globalAlpha = (1 - u) * 0.7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex + Math.sin(k * 7 + ex) * 0.2, Y + 0.1 - u * 0.5, 0.04, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }

  // 널다리: 말뚝은 늘 서 있고(내 세계에 다리 자리가 있다는 표시), 널은 다리가 놓였을 때만 있다
  bridge(g, ctx, t) {
    const pal = g.pal, top = -t.y, px0 = t.x - 0.02, px1 = t.x + t.w + 0.02, ph = 1.7, u = t.u;
    const n = Math.max(1, Math.round(t.w / 1.2)), pw = t.w / n;
    ctx.fillStyle = pal.wood;
    for (const px of [px0, px1]) { ctx.globalAlpha = 0.55 + 0.45 * u; ctx.fillRect(px - 0.08, top - ph, 0.16, ph + 0.1); ctx.beginPath(); ctx.arc(px, top - ph, 0.12, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (u < 0.02) return;
    const sag = Math.min(0.75, t.w * 0.1);
    const ropeY = (x) => { const k = (x - px0) / (px1 - px0); return top - ph + 0.06 + sag * 4 * k * (1 - k); };
    ctx.strokeStyle = pal.woodHi; ctx.globalAlpha = 0.7 * u; ctx.lineWidth = 0.045; ctx.beginPath();
    for (let k = 0; k <= 1.001; k += 0.05) { const x = lerp(px0, px1, k); if (k === 0) ctx.moveTo(x, ropeY(x)); else ctx.lineTo(x, ropeY(x)); }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const a = sat(u * (n + 2) - i) * (t.key == null ? 1 : 0.92), x = t.x + i * pw, bob = Math.sin(g.t * 1.3 + i * 1.1 + t.x) * 0.02, y = top - bob + (1 - a) * 0.5;
      if (a <= 0) continue;
      ctx.strokeStyle = pal.woodHi; ctx.lineWidth = 0.025; ctx.globalAlpha = 0.45 * a; ctx.beginPath();
      ctx.moveTo(x + 0.14, y); ctx.lineTo(x + 0.14, ropeY(x + 0.14)); ctx.moveTo(x + pw - 0.14, y); ctx.lineTo(x + pw - 0.14, ropeY(x + pw - 0.14)); ctx.stroke();
      ctx.globalAlpha = a;
      const gr = ctx.createLinearGradient(0, y, 0, y + 0.32);
      gr.addColorStop(0, pal.woodHi); gr.addColorStop(0.28, pal.wood); gr.addColorStop(1, pal.woodDark);
      ctx.fillStyle = gr; roundRect(ctx, x + 0.05, y, pw - 0.1, 0.3, 0.08); ctx.fill();
      ctx.strokeStyle = pal.topHi; ctx.globalAlpha = a * 0.6; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(x + 0.14, y + 0.03); ctx.lineTo(x + pw - 0.14, y + 0.03); ctx.stroke();
      if (t.key != null) { ctx.globalAlpha = a * (0.25 + 0.12 * Math.sin(g.t * 3 + i)); ctx.fillStyle = pal.glow; roundRect(ctx, x + 0.05, y, pw - 0.1, 0.3, 0.08); ctx.fill(); } // 짝이 놓아 준 다리는 은은히 빛난다
    }
    ctx.globalAlpha = 1;
  }
}
