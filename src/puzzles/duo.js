// 퍼즐 4 · 동시 조작 ("하나, 둘, 셋!")
// 등불 기둥이 두 줄. 크림색 줄은 1P만, 라일락색 줄은 2P만 울릴 수 있다.
// 내 줄의 "정답 기둥"은 내 화면에는 안 보이고 짝의 화면에만 반딧불로 표시된다 → 서로 알려줘야 한다.
// 둘이 각자 정답 기둥 앞에서 거의 동시에(0.8초 안에) 눌러야 빛의 다리가 놓인다.
import { rng, TAU, sat, easeOut, easeInOut, rgba, lerp, Spring } from '../util.js';
import { paw, pawHint } from './glyph.js';

const OWNER = [{ lamp: '#ffe9b5', deep: '#f4b96a', line: '#8c5e48' }, { lamp: '#e2ccff', deep: '#b58cf0', line: '#584783' }];

export class Duo {
  constructor(cfg) {
    Object.assign(this, { window: 0.8 }, cfg);
    this.lit = [new Array(cfg.rows[0].xs.length).fill(-9), new Array(cfg.rows[1].xs.length).fill(-9)];
    this.noT = -9; this.okT = -9;
    this.shake = new Spring(8, 0.3);
    this._seed = null;
  }
  init() { return { seed: 5, hit: [null, null], open: 0, miss: 0 }; }

  answer(seed) {
    if (this._seed !== seed) {
      const r = rng(seed * 15485863 + 3);
      this._ans = [Math.floor(r() * this.rows[0].xs.length), Math.floor(r() * this.rows[1].xs.length)];
      this._seed = seed;
    }
    return this._ans;
  }
  bridgeU(g) { const st = g.pz(this.id); return st.open > 0 ? sat((g.tc - st.open - 0.6) / 1.4) : 0; }

  solids(g, out) {
    if (this.bridgeU(g) > 0.5) out.push({ x: this.bridge.x - 0.1, y: -0.3, w: this.bridge.w + 0.2, h: 0.3 });
  }

  myPost(g) {
    const row = this.rows[g.role];
    if (!g.me.ground || g.me.state !== 'play') return -1;
    let best = -1, bd = 0.62;
    row.xs.forEach((x, i) => { const d = Math.abs(g.me.x - x); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  canAct(g) { return !g.pz(this.id).open && this.myPost(g) >= 0; }
  act(g) {
    const i = this.myPost(g);
    if (i < 0) return;
    this.lit[g.role][i] = g.t; // 누른 느낌은 바로
    g.sound(g.role ? 'ringB' : 'ringA', { x: this.rows[g.role].xs[i] });
    g.me.anim.sq.kick(-1.6);
    g.act('ring', { id: this.id, i });
  }

  update(g, dt) { this.shake.step(dt); }

  host(g, st, from, type, d) {
    if (type !== 'ring' || d.id !== this.id || st.open) return false;
    st.hit[from] = { i: d.i, t: g.tc };
    g.emitFx('ring', { id: this.id, r: from, i: d.i }, from);
    const o = st.hit[1 - from];
    if (o && g.tc - o.t <= this.window) {
      const a = this.answer(st.seed);
      if (st.hit[0].i === a[0] && st.hit[1].i === a[1]) { st.open = g.tc; g.emitFx('duoOk', { id: this.id }); g.beat('p4'); }
      else { st.seed++; st.miss++; st.hit = [null, null]; g.emitFx('duoNo', { id: this.id }); }
    }
    return true;
  }
  hostTick(g, st) {
    let ch = false;
    for (let r = 0; r < 2; r++) if (st.hit[r] && g.tc - st.hit[r].t > this.window + 0.05) { st.hit[r] = null; ch = true; }
    return ch;
  }
  onFx(g, name, d) {
    if (d.id !== this.id) return;
    if (name === 'ring') { this.lit[d.r][d.i] = g.t; g.sound(d.r ? 'ringB' : 'ringA', { x: this.rows[d.r].xs[d.i], vol: 0.85 }); }
    if (name === 'duoNo') { this.noT = g.t; this.shake.kick(22); g.sound('wrong'); g.me.anim.setExpr('worry', 1); g.other.anim.setExpr('worry', 1); }
    if (name === 'duoOk') { this.okT = g.t; g.sound('bridge'); }
  }

  draw(g, ctx, layer) {
    const pal = g.pal, st = g.pz(this.id), ans = this.answer(st.seed);
    if (layer === 'back') {
      const noU = sat((g.t - this.noT) / 0.8);
      for (let r = 0; r < 2; r++) {
        const row = this.rows[r], C = OWNER[r];
        row.xs.forEach((x, i) => {
          const since = g.t - this.lit[r][i];
          const hot = st.open ? 1 : sat(1 - since / this.window);
          // 기둥
          ctx.fillStyle = pal.stoneDark; ctx.fillRect(x - 0.07, -2.25, 0.14, 2.25);
          ctx.fillStyle = pal.stone; ctx.beginPath(); ctx.ellipse(x, -0.02, 0.34, 0.1, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = pal.stoneDark; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, -2.25); ctx.quadraticCurveTo(x + 0.02, -2.5, x + 0.3, -2.45); ctx.stroke();
          // 등불 (주인의 색 + 고양이 귀)
          const lx = x + 0.3, ly = -2.02 + Math.sin(g.t * 1.6 + x) * 0.02, sw = Math.sin(g.t * 1.6 + x) * 0.04;
          ctx.save(); ctx.translate(lx, ly); ctx.rotate(sw + (since < 0.5 ? Math.sin(since * 30) * 0.2 * (1 - since / 0.5) : 0));
          const glowA = 0.14 + hot * 0.6;
          const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.3 + hot * 0.6);
          gg.addColorStop(0, rgba(C.lamp, glowA)); gg.addColorStop(1, rgba(C.lamp, 0));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 1.3 + hot * 0.6, 0, TAU); ctx.fill();
          ctx.fillStyle = hot > 0.05 ? C.lamp : rgba(C.deep, 0.75); ctx.strokeStyle = C.line; ctx.lineWidth = 0.04;
          ctx.beginPath(); ctx.moveTo(-0.15, -0.3); ctx.quadraticCurveTo(-0.2, -0.47, -0.06, -0.36); ctx.lineTo(0.06, -0.36); ctx.quadraticCurveTo(0.2, -0.47, 0.15, -0.3);
          ctx.bezierCurveTo(0.33, -0.2, 0.3, 0.22, 0, 0.22); ctx.bezierCurveTo(-0.3, 0.22, -0.33, -0.2, -0.15, -0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
          if (hot > 0.05) { ctx.fillStyle = '#fff'; ctx.globalAlpha = hot; ctx.beginPath(); ctx.arc(0, -0.04, 0.09, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
          ctx.restore();
          // 눌린 뒤 줄어드는 고리 = "이 시간 안에 짝도 눌러야 해"
          if (!st.open && since < this.window) {
            ctx.strokeStyle = C.lamp; ctx.lineWidth = 0.05; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.arc(lx, ly, 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - since / this.window)); ctx.stroke(); ctx.globalAlpha = 1;
          }
          // 정답 표시: 이 줄의 주인이 아닌 쪽 화면에만 반딧불이 맴돈다
          if (!st.open && g.viewRole !== r && i === ans[r]) {
            const a = noU < 1 ? noU : 1;
            for (let k = 0; k < 5; k++) {
              const ang = g.t * (1.4 + k * 0.13) + k * 1.26, rad = 0.32 + 0.1 * Math.sin(g.t * 2 + k);
              const fx = lx + Math.cos(ang) * rad, fy = ly - 0.75 + Math.sin(ang * 1.3) * 0.16;
              ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(g.t * 5 + k)); ctx.fillStyle = '#ffffff';
              ctx.beginPath(); ctx.arc(fx, fy, 0.04, 0, TAU); ctx.fill();
              ctx.globalAlpha *= 0.35; ctx.fillStyle = C.lamp; ctx.beginPath(); ctx.arc(fx, fy, 0.13, 0, TAU); ctx.fill();
            }
            const mg = ctx.createRadialGradient(lx, ly - 0.75, 0, lx, ly - 0.75, 0.75);
            mg.addColorStop(0, rgba('#ffffff', 0.35)); mg.addColorStop(1, rgba('#ffffff', 0));
            ctx.globalAlpha = a; ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(lx, ly - 0.75, 0.75, 0, TAU); ctx.fill();
            ctx.globalAlpha = a * 0.95; ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(lx - 0.13, ly - 0.68 + Math.sin(g.t * 3) * 0.04); ctx.lineTo(lx + 0.13, ly - 0.68 + Math.sin(g.t * 3) * 0.04); ctx.lineTo(lx, ly - 0.5 + Math.sin(g.t * 3) * 0.04); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
          }
          if (r === g.role && !st.open && this.myPost(g) === i) pawHint(ctx, x - 0.25, -1.95 - Math.sin(g.t * 3) * 0.05, C.lamp);
        });
      }
      // 가운데 쌍둥이 발바닥 돌: 둘이 같이 눌러야 한다는 걸 그림으로 알려준다
      {
        const x = this.stoneX + this.shake.x * 0.01;
        ctx.fillStyle = pal.stoneDark; ctx.beginPath(); ctx.moveTo(x - 0.95, 0); ctx.quadraticCurveTo(x - 1.05, -1.75, x, -1.85); ctx.quadraticCurveTo(x + 1.05, -1.75, x + 0.95, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = pal.stone; ctx.beginPath(); ctx.moveTo(x - 0.8, -0.05); ctx.quadraticCurveTo(x - 0.9, -1.6, x, -1.7); ctx.quadraticCurveTo(x + 0.9, -1.6, x + 0.8, -0.05); ctx.closePath(); ctx.fill();
        for (let r = 0; r < 2; r++) {
          const h = st.hit[r];
          const hot = st.open ? 1 : h ? sat(1 - (g.tc - h.t) / this.window) : 0;
          const px = x + (r ? 0.36 : -0.36), py = -0.95;
          ctx.globalAlpha = 0.3 + 0.7 * hot;
          if (hot > 0) { const gg = ctx.createRadialGradient(px, py, 0, px, py, 0.6); gg.addColorStop(0, rgba(OWNER[r].lamp, 0.6 * hot)); gg.addColorStop(1, rgba(OWNER[r].lamp, 0)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, 0.6, 0, TAU); ctx.fill(); }
          paw(ctx, px, py, 0.24, hot > 0 ? OWNER[r].lamp : rgba(OWNER[r].deep, 0.9));
          ctx.globalAlpha = 1;
        }
        // 두 발바닥을 잇는 선
        const both = st.open ? 1 : 0;
        ctx.strokeStyle = pal.warm; ctx.globalAlpha = 0.25 + 0.75 * both; ctx.lineWidth = 0.04; ctx.setLineDash(both ? [] : [0.08, 0.08]);
        ctx.beginPath(); ctx.moveTo(x - 0.14, -0.95); ctx.lineTo(x + 0.14, -0.95); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      // 빛의 다리
      const b = this.bridge, u = this.bridgeU(g);
      // 끊어진 다리 흔적
      ctx.fillStyle = pal.stoneDark;
      ctx.fillRect(b.x - 0.1, 0, 0.5, 0.3); ctx.fillRect(b.x + b.w - 0.4, 0, 0.5, 0.3);
      if (u <= 0) {
        ctx.strokeStyle = pal.glow; ctx.globalAlpha = 0.16 + 0.06 * Math.sin(g.t * 2); ctx.lineWidth = 0.04; ctx.setLineDash([0.18, 0.2]);
        ctx.beginPath(); ctx.moveTo(b.x, 0.02); ctx.lineTo(b.x + b.w, 0.02); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else {
        const e = easeOut(u), w = b.w * e;
        const lg = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
        lg.addColorStop(0, '#fff3c4'); lg.addColorStop(0.5, '#bfffe0'); lg.addColorStop(1, '#e6c2ff');
        ctx.globalAlpha = 0.9; ctx.fillStyle = lg;
        ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x + w, 0); ctx.lineTo(b.x + w, 0.26); ctx.lineTo(b.x, 0.26); ctx.closePath(); ctx.fill();
        const gl = ctx.createLinearGradient(0, -0.9, 0, 0.26);
        gl.addColorStop(0, rgba('#ffffff', 0)); gl.addColorStop(1, rgba('#ffffff', 0.32));
        ctx.fillStyle = gl; ctx.fillRect(b.x, -0.9, w, 0.9);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9; ctx.fillRect(b.x, 0, w, 0.05);
        ctx.globalAlpha = 1;
        if (u < 1 && Math.random() < 0.6) g.fx.burst('spark', b.x + w, 0.1, 1, { speed: 1.5, up: 1, color: '#ffffff', life: 0.6 });
      }
    }
  }
}
