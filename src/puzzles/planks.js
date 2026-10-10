// 퍼즐 1 · 가짜 발판 다리
// 빛의 세계(1P)에게만 진짜/가짜 발판이 구분돼 보인다. 그림자 세계(2P)에게는 전부 똑같아 보인다.
// 가짜를 밟으면 스르르 풀리며 물에 빠진다 → 방울을 타고 바로 앞 지점으로.
// 누가 빠지면(다리 위에 아무도 없을 때) 진짜/가짜 배치가 바뀐다 → 외워서는 못 건너고, 말로 알려줘야 한다.
import { rng, Spring, TAU, sat, easeOut, lerp, rgba } from '../util.js';

export class Planks {
  constructor(cfg) {
    Object.assign(this, { w: 1.2, y: 0, mode: 'bridge' }, cfg);
    this.x1 = this.x + this.n * this.w;
    this.press = Array.from({ length: this.n }, () => new Spring(3.2, 0.4));
    this.gone = new Array(this.n).fill(-9);   // 풀린 시각
    this.reform = -9;                         // 배치가 바뀐 시각
    this._seed = null; this._fake = null;
  }
  init() { return { seed: 1 }; }

  fakes(seed) {
    if (this._seed === seed) return this._fake;
    let f;
    if (this.mode === 'tease') f = new Array(this.n).fill(true); // 첫 만남: 전부 가짜(뛰어넘으면 된다)
    else {
      const r = rng(seed * 7919 + this.x * 131);
      const want = Math.floor(this.n / 2);
      for (let tries = 0; tries < 200; tries++) {
        f = new Array(this.n).fill(false);
        let c = 0;
        while (c < want) { const i = Math.floor(r() * this.n); if (!f[i]) { f[i] = true; c++; } }
        let ok = true, run = 0;
        for (let i = 0; i < this.n; i++) { run = f[i] ? run + 1 : 0; if (run >= 3) ok = false; }
        // 양 끝에서 연달아 가짜 둘이면 땅에서 바로 뛰어야 해서 너무 어렵다 → 끝의 가짜는 하나까지만
        if (f[0] && f[1]) ok = false;
        if (f[this.n - 1] && f[this.n - 2]) ok = false;
        if (ok) break;
      }
    }
    this._seed = seed; this._fake = f;
    return f;
  }

  peek(g) { return { fakes: this.fakes(g.pz(this.id).seed).slice() }; }
  tileAt(x) { const i = Math.floor((x - this.x) / this.w); return i >= 0 && i < this.n ? i : -1; }

  solids(g, out) {
    const st = g.pz(this.id), f = this.fakes(st.seed);
    for (let i = 0; i < this.n; i++) if (!f[i]) out.push({ x: this.x + i * this.w, y: this.y - 0.32, w: this.w, h: 0.32 });
  }

  update(g, dt) {
    const st = g.pz(this.id), f = this.fakes(st.seed);
    if (this._drawnSeed !== st.seed) { if (this._drawnSeed != null) this.reform = g.t; this._drawnSeed = st.seed; }
    for (let i = 0; i < this.n; i++) this.press[i].step(dt);
    for (const c of [g.me, g.other]) {
      if (!c.present || c.state === 'bubble') continue;
      const i = this.tileAt(c.x);
      if (i < 0) continue;
      const onTop = c.y <= this.y + 0.06 && c.y > this.y - 0.5 && c.vy <= 0.5;
      if (!onTop) continue;
      if (!f[i]) { if (c.ground) this.press[i].target = -0.07; continue; }
      if (c === g.me && g.t - this.gone[i] > 1.0) { // 가짜를 밟았다
        this.dissolve(g, i);
        g.hazard = this.id;
        g.act('plank', { id: this.id, i });
      }
    }
    for (let i = 0; i < this.n; i++) {
      const stood = [g.me, g.other].some((c) => c.present && c.ground && this.tileAt(c.x) === i && Math.abs(c.y - this.y) < 0.08);
      if (!stood) this.press[i].target = 0;
    }
  }

  dissolve(g, i) {
    if (g.t - this.gone[i] < 1.0) return;
    this.gone[i] = g.t;
    const cx = this.x + (i + 0.5) * this.w;
    g.fx.burst('spark', cx, this.y - 0.1, g.q.sparks(10), { speed: 1.6, up: 0.8, color: g.pal.glow, life: 0.9, size: 0.07, rx: this.w });
    g.sound('dissolve', { x: cx });
  }

  onFx(g, name, d) { if (name === 'plank' && d.id === this.id) this.dissolve(g, d.i); }

  host(g, st, from, type, d) {
    if (type === 'plank' && d.id === this.id) { g.emitFx('plank', d, from); return false; }
    if (type === 'fell' && d.pz === this.id && this.mode !== 'tease') {
      // 다리 위에 서 있는 고양이가 없을 때만 배치를 바꾼다 (서 있던 발판이 갑자기 사라지면 억울하니까)
      const busy = [g.me, g.other].some((c) => c.present && c.state === 'play' && c.x > this.x - 0.2 && c.x < this.x1 + 0.2 && c.y > this.y - 0.2);
      if (!busy) { st.seed++; return true; }
    }
    return false;
  }

  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const st = g.pz(this.id), f = this.fakes(st.seed), pal = g.pal;
    const seesTruth = g.viewRole === 0;
    const top = -this.y;
    // 양쪽 말뚝과 위쪽 밧줄
    const px0 = this.x - 0.25, px1 = this.x1 + 0.25, ph = 1.9;
    ctx.fillStyle = pal.wood;
    for (const px of [px0, px1]) { ctx.fillRect(px - 0.09, top - ph, 0.18, ph + 0.1); ctx.beginPath(); ctx.arc(px, top - ph, 0.13, 0, TAU); ctx.fill(); }
    const sag = 0.75;
    const ropeY = (x) => { const u = (x - px0) / (px1 - px0); return top - ph + 0.06 + sag * 4 * u * (1 - u); };
    ctx.strokeStyle = pal.woodHi; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.045;
    ctx.beginPath();
    for (let u = 0; u <= 1.001; u += 0.05) { const x = lerp(px0, px1, u); if (u === 0) ctx.moveTo(x, ropeY(x)); else ctx.lineTo(x, ropeY(x)); }
    ctx.stroke(); ctx.globalAlpha = 1;

    const reformU = sat((g.t - this.reform) / 0.7);
    for (let i = 0; i < this.n; i++) {
      const x = this.x + i * this.w, cx = x + this.w / 2;
      const goneU = (g.t - this.gone[i]) / 1.1;                 // 0..1 사라져 있는 동안
      const bob = Math.sin(g.t * 1.3 + i * 1.1 + this.x) * 0.025 + this.press[i].x;
      let alpha = 1, scale = 1;
      if (goneU >= 0 && goneU < 1) { alpha = goneU < 0.25 ? 1 - goneU / 0.25 : goneU > 0.8 ? (goneU - 0.8) / 0.2 : 0; scale = 0.9 + 0.1 * alpha; }
      if (reformU < 1) { alpha *= 0.35 + 0.65 * reformU; }
      const ghost = seesTruth && f[i];
      const y = top - bob;
      // 매달린 줄
      ctx.strokeStyle = pal.woodHi; ctx.lineWidth = 0.025; ctx.globalAlpha = 0.45 * alpha * (ghost ? 0.4 : 1);
      ctx.beginPath();
      ctx.moveTo(x + 0.14, y); ctx.lineTo(x + 0.14, ropeY(x + 0.14));
      ctx.moveTo(x + this.w - 0.14, y); ctx.lineTo(x + this.w - 0.14, ropeY(x + this.w - 0.14));
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, y); ctx.scale(scale, scale); ctx.translate(-cx, -y);
      const pw = this.w - 0.1, px = x + 0.05;
      if (ghost) { // 빛의 눈에는 가짜가 비쳐 보인다
        const flick = 0.2 + 0.07 * Math.sin(g.t * 3.1 + i * 2.3);
        ctx.globalAlpha = alpha * flick;
        ctx.fillStyle = pal.glow; roundR(ctx, px, y, pw, 0.3, 0.08); ctx.fill();
        ctx.globalAlpha = alpha * 0.75; ctx.strokeStyle = pal.glow; ctx.lineWidth = 0.03; ctx.setLineDash([0.12, 0.1]); ctx.lineDashOffset = -g.t * 0.3;
        roundR(ctx, px, y, pw, 0.3, 0.08); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.globalAlpha = alpha;
        const gr = ctx.createLinearGradient(0, y, 0, y + 0.32);
        gr.addColorStop(0, pal.woodHi); gr.addColorStop(0.28, pal.wood); gr.addColorStop(1, pal.woodDark);
        ctx.fillStyle = gr; roundR(ctx, px, y, pw, 0.3, 0.08); ctx.fill();
        ctx.strokeStyle = rgba('#000000', 0.22); ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(px + pw * 0.34, y + 0.04); ctx.lineTo(px + pw * 0.34, y + 0.28); ctx.moveTo(px + pw * 0.69, y + 0.04); ctx.lineTo(px + pw * 0.69, y + 0.28); ctx.stroke();
        ctx.strokeStyle = pal.topHi; ctx.globalAlpha = alpha * 0.6; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.moveTo(px + 0.08, y + 0.02); ctx.lineTo(px + pw - 0.08, y + 0.02); ctx.stroke();
        if (seesTruth) { // 진짜 발판은 아래가 은은히 빛난다
          const gl = ctx.createRadialGradient(cx, y + 0.3, 0, cx, y + 0.3, 0.8);
          gl.addColorStop(0, pal.glow); gl.addColorStop(1, rgba('#000000', 0));
          ctx.globalAlpha = alpha * (0.28 + 0.08 * Math.sin(g.t * 2 + i)); ctx.fillStyle = gl;
          ctx.beginPath(); ctx.ellipse(cx, y + 0.34, 0.75, 0.3, 0, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

function roundR(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
