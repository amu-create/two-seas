// 등불 차례로 켜기 + "하나, 둘, 셋!"
// 등불 기둥이 두 줄(각 4개). 크림색 줄은 1P만, 라일락색 줄은 2P만 켤 수 있다.
// 켜는 "순서"는 내 화면에는 없고 짝의 화면에만 점(1~4개)으로 보인다 → 짝이 "왼쪽에서 둘째, 그다음 맨 끝…" 하고 불러줘야 한다.
// 순서를 틀리면 내 줄이 꺼지고 순서가 바뀐다. 두 줄이 다 켜지면 가운데 발바닥 돌 앞에서 둘이 거의 동시에(1초 안에) 누른다.
import { rng, TAU, sat, easeOut, rgba, Spring } from '../util.js';
import { paw, pawHint } from './glyph.js';

const OWNER = [{ lamp: '#ffe9b5', deep: '#f4b96a', line: '#8c5e48' }, { lamp: '#e2ccff', deep: '#b58cf0', line: '#584783' }];

export class Lanterns {
  constructor(cfg) {
    Object.assign(this, { window: 1.0, y: 0, bridge: null, beatId: 'lamp' }, cfg);
    this.lit = [this.rows[0].xs.map(() => -9), this.rows[1].xs.map(() => -9)];
    this.noT = [-9, -9]; this.okT = -9;
    this.shake = new Spring(8, 0.3);
    this._o = [null, null]; this._s = [null, null];
  }
  init() { return { seed: 1, seeds: [1 + Math.floor(Math.random() * 1e6), 1 + Math.floor(Math.random() * 1e6)], prog: [0, 0], hit: [null, null], open: 0 }; }

  order(st, r) { // r번 줄을 켜야 하는 순서 (기둥 번호의 나열)
    const seed = st.seeds[r];
    if (this._s[r] !== seed) {
      const rnd = rng(seed * 2654435761 + r * 97), n = this.rows[r].xs.length, a = [...Array(n).keys()];
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      this._s[r] = seed; this._o[r] = a;
    }
    return this._o[r];
  }
  done(st) { return st.prog[0] >= this.rows[0].xs.length && st.prog[1] >= this.rows[1].xs.length; }
  bridgeU(g) { const st = g.pz(this.id); return st.open > 0 ? sat((g.tc - st.open - 0.6) / 1.4) : 0; }
  solids(g, out) { if (this.bridge && this.bridgeU(g) > 0.5) out.push({ x: this.bridge.x - 0.1, y: this.y - 0.3, w: this.bridge.w + 0.2, h: 0.3 }); }

  myPost(g) {
    const row = this.rows[g.role];
    if (!g.me.ground || g.me.state !== 'play' || Math.abs(g.me.y - this.y) > 0.3) return -1;
    let best = -1, bd = 0.62;
    row.xs.forEach((x, i) => { const d = Math.abs(g.me.x - x); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  atStone(g) { return g.me.ground && g.me.state === 'play' && Math.abs(g.me.y - this.y) < 0.3 && Math.abs(g.me.x - this.stoneX) < 1.7; }
  canAct(g) { const st = g.pz(this.id); if (st.open) return false; return this.done(st) ? this.atStone(g) : this.myPost(g) >= 0; }
  act(g) {
    const st = g.pz(this.id);
    g.me.anim.sq.kick(-1.6);
    if (this.done(st)) { g.sound(g.role ? 'ringB' : 'ringA', { x: this.stoneX }); g.act('sync', { id: this.id }); return; }
    const i = this.myPost(g);
    if (i < 0) return;
    g.act('lamp', { id: this.id, i });
  }
  update(g, dt) { this.shake.step(dt); }

  host(g, st, from, type, d) {
    if (d.id !== this.id || st.open) return false;
    if (type === 'lamp') {
      const ord = this.order(st, from), n = ord.length;
      if (st.prog[from] >= n || ord.indexOf(d.i) < st.prog[from]) return false;      // 이미 켠 등불
      if (ord[st.prog[from]] === d.i) { st.prog[from]++; g.emitFx('lampOk', { id: this.id, r: from, i: d.i, k: st.prog[from] }); }
      else { st.prog[from] = 0; st.seeds[from]++; g.emitFx('lampNo', { id: this.id, r: from }); }
      return true;
    }
    if (type === 'sync' && this.done(st)) {
      st.hit[from] = g.tc;
      g.emitFx('sync', { id: this.id, r: from }, from);
      const o = st.hit[1 - from];
      if (o != null && g.tc - o <= this.window) { st.open = g.tc; g.emitFx('lampOpen', { id: this.id }); g.beat(this.beatId); }
      return true;
    }
    return false;
  }
  hostTick(g, st) {
    let ch = false;
    for (let r = 0; r < 2; r++) if (st.hit[r] != null && g.tc - st.hit[r] > this.window + 0.05) { st.hit[r] = null; ch = true; }
    return ch;
  }
  onFx(g, name, d) {
    if (d.id !== this.id) return;
    if (name === 'lampOk') { this.lit[d.r][d.i] = g.t; g.sound(d.r ? 'ringB' : 'ringA', { x: this.rows[d.r].xs[d.i], rate: 0.84 + d.k * 0.09 }); }
    if (name === 'lampNo') { this.noT[d.r] = g.t; this.shake.kick(22); g.sound('wrong'); (d.r === g.role ? g.me : g.other).anim.setExpr('worry', 1); }
    if (name === 'sync') g.sound(d.r ? 'ringB' : 'ringA', { x: this.stoneX, vol: 0.85 });
    if (name === 'lampOpen') { this.okT = g.t; g.sound('bridge'); }
  }
  peek(g) { const st = g.pz(this.id); return { order: [this.order(st, 0).slice(), this.order(st, 1).slice()], prog: st.prog.slice(), open: st.open, done: this.done(st), rows: this.rows.map((r) => r.xs), stoneX: this.stoneX }; }

  draw(g, ctx, layer) {
    if (layer !== 'back') return;
    const pal = g.pal, st = g.pz(this.id), Y = -this.y;
    const allDone = this.done(st);
    for (let r = 0; r < 2; r++) {
      const row = this.rows[r], C = OWNER[r], ord = this.order(st, r), noU = sat((g.t - this.noT[r]) / 0.7);
      row.xs.forEach((x, i) => {
        const rank = ord.indexOf(i), on = rank < st.prog[r] || st.open > 0;
        const since = g.t - this.lit[r][i];
        const hot = on ? 1 : 0;
        ctx.fillStyle = pal.stoneDark; ctx.fillRect(x - 0.07, Y - 2.25, 0.14, 2.25);
        ctx.fillStyle = pal.stone; ctx.beginPath(); ctx.ellipse(x, Y - 0.02, 0.34, 0.1, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = pal.stoneDark; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, Y - 2.25); ctx.quadraticCurveTo(x + 0.02, Y - 2.5, x + 0.3, Y - 2.45); ctx.stroke();
        const lx = x + 0.3, ly = Y - 2.02 + Math.sin(g.t * 1.6 + x) * 0.02;
        ctx.save(); ctx.translate(lx, ly);
        ctx.rotate(Math.sin(g.t * 1.6 + x) * 0.04 + (since < 0.5 ? Math.sin(since * 30) * 0.2 * (1 - since / 0.5) : 0) + (noU < 1 ? Math.sin(noU * 40) * 0.12 * (1 - noU) : 0));
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.2 + hot * 0.6);
        gg.addColorStop(0, rgba(C.lamp, 0.12 + hot * 0.55)); gg.addColorStop(1, rgba(C.lamp, 0));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 1.2 + hot * 0.6, 0, TAU); ctx.fill();
        ctx.fillStyle = hot ? C.lamp : rgba(C.deep, 0.7); ctx.strokeStyle = C.line; ctx.lineWidth = 0.04;
        ctx.beginPath(); ctx.moveTo(-0.15, -0.3); ctx.quadraticCurveTo(-0.2, -0.47, -0.06, -0.36); ctx.lineTo(0.06, -0.36); ctx.quadraticCurveTo(0.2, -0.47, 0.15, -0.3);
        ctx.bezierCurveTo(0.33, -0.2, 0.3, 0.22, 0, 0.22); ctx.bezierCurveTo(-0.3, 0.22, -0.33, -0.2, -0.15, -0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (hot) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -0.04, 0.09, 0, TAU); ctx.fill(); }
        ctx.restore();
        // 순서 표시: 이 줄의 주인이 아닌 쪽 화면에만, 몇 번째인지 점의 개수로 보인다
        if (!on && !st.open && g.role !== r) {
          const a = noU < 1 ? noU : 1, by = ly - 0.78 + Math.sin(g.t * 2.2 + i) * 0.03, n = rank + 1, next = rank === st.prog[r];
          ctx.globalAlpha = a * 0.85; ctx.fillStyle = 'rgba(10,8,30,0.7)';
          const bw = 0.2 + n * 0.17; rrect(ctx, lx - bw / 2, by - 0.15, bw, 0.3, 0.15); ctx.fill();
          if (next) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.035; ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(g.t * 5)); rrect(ctx, lx - bw / 2, by - 0.15, bw, 0.3, 0.15); ctx.stroke(); }
          ctx.globalAlpha = a; ctx.fillStyle = next ? '#ffffff' : C.lamp;
          for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(lx - (n - 1) * 0.085 + k * 0.17, by, 0.055, 0, TAU); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
        if (r === g.role && !st.open && !allDone && !on && this.myPost(g) === i) pawHint(ctx, x - 0.25, Y - 1.95 - Math.sin(g.t * 3) * 0.05, C.lamp);
      });
    }
    // 가운데 발바닥 돌: 두 줄이 다 켜지면 빛나고, 둘이 같이 눌러야 한다
    {
      const x = this.stoneX + this.shake.x * 0.01;
      ctx.fillStyle = pal.stoneDark; ctx.beginPath(); ctx.moveTo(x - 0.95, Y); ctx.quadraticCurveTo(x - 1.05, Y - 1.75, x, Y - 1.85); ctx.quadraticCurveTo(x + 1.05, Y - 1.75, x + 0.95, Y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.stone; ctx.beginPath(); ctx.moveTo(x - 0.8, Y - 0.05); ctx.quadraticCurveTo(x - 0.9, Y - 1.6, x, Y - 1.7); ctx.quadraticCurveTo(x + 0.9, Y - 1.6, x + 0.8, Y - 0.05); ctx.closePath(); ctx.fill();
      for (let r = 0; r < 2; r++) {
        const h = st.hit[r];
        const press = st.open ? 1 : h != null ? sat(1 - (g.tc - h) / this.window) : 0;
        const ready = allDone ? 0.45 + 0.25 * Math.sin(g.t * 4 + r * 3) : st.prog[r] / this.rows[r].xs.length * 0.3;
        const hot = Math.max(press, ready);
        const px = x + (r ? 0.36 : -0.36), py = Y - 0.95;
        if (hot > 0.05) { const gg = ctx.createRadialGradient(px, py, 0, px, py, 0.6); gg.addColorStop(0, rgba(OWNER[r].lamp, 0.6 * hot)); gg.addColorStop(1, rgba(OWNER[r].lamp, 0)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, 0.6, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 0.35 + 0.65 * hot;
        paw(ctx, px, py, 0.24, hot > 0.3 ? OWNER[r].lamp : rgba(OWNER[r].deep, 0.9));
        ctx.globalAlpha = 1;
        if (press > 0 && !st.open) { ctx.strokeStyle = OWNER[r].lamp; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(px, py, 0.4, -Math.PI / 2, -Math.PI / 2 + TAU * press); ctx.stroke(); }
      }
      ctx.strokeStyle = pal.warm; ctx.globalAlpha = st.open ? 1 : 0.25; ctx.lineWidth = 0.04; ctx.setLineDash(st.open ? [] : [0.08, 0.08]);
      ctx.beginPath(); ctx.moveTo(x - 0.14, Y - 0.95); ctx.lineTo(x + 0.14, Y - 0.95); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (allDone && !st.open && this.atStone(g)) pawHint(ctx, x, Y - 2.45 - Math.sin(g.t * 3) * 0.05, OWNER[g.role].lamp);
    }
    // 빛의 다리 (있는 장에서만)
    const b = this.bridge;
    if (b) {
      const u = this.bridgeU(g);
      ctx.fillStyle = pal.stoneDark;
      ctx.fillRect(b.x - 0.1, Y, 0.5, 0.3); ctx.fillRect(b.x + b.w - 0.4, Y, 0.5, 0.3);
      if (u <= 0) {
        ctx.strokeStyle = pal.glow; ctx.globalAlpha = 0.16 + 0.06 * Math.sin(g.t * 2); ctx.lineWidth = 0.04; ctx.setLineDash([0.18, 0.2]);
        ctx.beginPath(); ctx.moveTo(b.x, Y + 0.02); ctx.lineTo(b.x + b.w, Y + 0.02); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else {
        const w = b.w * easeOut(u);
        const lg = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
        lg.addColorStop(0, '#fff3c4'); lg.addColorStop(0.5, '#bfffe0'); lg.addColorStop(1, '#e6c2ff');
        ctx.globalAlpha = 0.9; ctx.fillStyle = lg; ctx.fillRect(b.x, Y, w, 0.26);
        const gl = ctx.createLinearGradient(0, Y - 0.9, 0, Y + 0.26);
        gl.addColorStop(0, rgba('#ffffff', 0)); gl.addColorStop(1, rgba('#ffffff', 0.32));
        ctx.fillStyle = gl; ctx.fillRect(b.x, Y - 0.9, w, 0.9);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x, Y, w, 0.05);
        ctx.globalAlpha = 1;
        if (u < 1 && Math.random() < 0.6) g.fx.burst('spark', b.x + w, this.y + 0.1, 1, { speed: 1.5, up: 1, color: '#ffffff', life: 0.6 });
      }
    }
  }
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
