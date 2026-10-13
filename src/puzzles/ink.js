// 선 그리기: 선 담당(도구 'draw')이 단추를 누르면 붓을 든다. 그다음 화면을 손가락으로 그으면 그 선이 "짝의 세계"에 발판으로 생긴다.
// 선은 LIFE초 뒤에 사라지고, 구간(zones)마다 잉크(길이)가 정해져 있다. 짝에게는 단단한 발판, 그린 사람에게는 흐린 선으로 보인다.
// → 짝은 자기 세계의 구멍을 보고 "여기서 저기까지 그어 줘!", 그리는 사람은 잉크를 아껴 "두 번에 나눠 그을게, 사이는 뛰어!"
// cfg: { id, world(선이 단단한 세계), zones:[{ x0, x1, n }] }
import { TAU, rgba, sat, clamp } from '../util.js';
import { haptics } from '../game/haptics.js';

export const INK_LIFE = 9;
const r2 = (v) => Math.round(v * 100) / 100;
let ACTIVE = null, HOOKED = false;
const SKIP = '#pad, #btnJump, #btnAct, #btnPull, [data-free], #wait, #endui, #wheel, button';

function hook() {
  if (HOOKED || typeof document === 'undefined') return; HOOKED = true;
  // 붓을 든 동안: 화면을 그으면 선이 된다 (신호판보다 먼저 받는다)
  document.addEventListener('pointerdown', (e) => {
    const I = ACTIVE; if (!I || !I.mode || I.ptr != null || (e.target.closest && e.target.closest(SKIP))) return;
    I.ptr = e.pointerId; I.pts = [I.g.signals.toWorld(e.clientX, e.clientY)]; e.stopPropagation();
  }, true);
  document.addEventListener('pointermove', (e) => {
    const I = ACTIVE; if (!I || e.pointerId !== I.ptr) return;
    const w = I.g.signals.toWorld(e.clientX, e.clientY), last = I.pts[I.pts.length - 1];
    if (Math.hypot(w.x - last.x, w.y - last.y) > 0.22) I.pts.push(w);
  }, true);
  const up = (e) => { const I = ACTIVE; if (!I || e.pointerId !== I.ptr) return; I.ptr = null; const pts = I.pts; I.pts = null; I.mode = false; if (pts && pts.length > 1) I.submit(I.g, pts.map((p) => [p.x, p.y])); };
  document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true);
}

export class Ink {
  constructor(cfg) { Object.assign(this, { world: 0, zones: [] }, cfg); this.mode = false; this.ptr = null; this.pts = null; this.cool = 0; this.emptyT = -9; hook(); }
  init() { return { s: [], n: 0, used: this.zones.map(() => 0) }; }
  zoneAt(x) { return this.zones.findIndex((z) => x >= z.x0 && x < z.x1); }
  left(g) { const i = this.zoneAt(g.me.x); return i < 0 ? 0 : Math.max(0, this.zones[i].n - (g.pz(this.id).used[i] || 0)); }
  alive(g, s) { const a = g.tc - s.t0; return a >= 0 && a < INK_LIFE; }
  // 획을 잉크 남은 만큼 잘라서 방장에게 보낸다 (봇도 이 길로 그린다)
  submit(g, pts) {
    let ink = this.left(g); if (ink <= 0.3) { this.emptyT = g.t; g.sound('oops', { vol: 0.35, rate: 1.5 }); return false; }
    const out = [[r2(pts[0][0]), r2(pts[0][1])]];
    for (let i = 1; i < pts.length && ink > 0; i++) {
      const [ax, ay] = out[out.length - 1]; let [bx, by] = pts[i]; const d = Math.hypot(bx - ax, by - ay); if (d < 0.05) continue;
      if (d > ink) { bx = ax + (bx - ax) * ink / d; by = ay + (by - ay) * ink / d; }
      out.push([r2(bx), r2(by)]); ink -= Math.min(d, ink);
      if (out.length >= 40) break;
    }
    if (out.length < 2) return false;
    g.act('ink', { id: this.id, pts: out, zx: r2(g.me.x) });
    haptics.buzz('tap'); return true;
  }
  len(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  // 선 → 짧은 디딤 조각들 (위에서만 밟힌다)
  static segs(pts, out, tag) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 0.2));
      for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u; out.push({ x: x - 0.13, y: y - 0.14, w: 0.26, h: 0.14, oneWay: true, step: 0.16, ink: tag }); }
    }
  }
  solids(g, out) { if (!g.sees(this.world)) return; for (const s of g.pz(this.id).s) if (this.alive(g, s)) Ink.segs(s.pts, out, s.n); }
  update(g, dt) {
    ACTIVE = this; this.g = g; this.cool = Math.max(0, this.cool - dt);
    const me = g.me;
    if (g.tool === 'draw' && g.inp && g.inp.toolPressed && this.cool <= 0 && me.state === 'play') {
      this.cool = 0.25;
      if (!this.mode && this.left(g) <= 0.3) { this.emptyT = g.t; g.sound('oops', { x: me.x, vol: 0.35, rate: 1.5 }); haptics.buzz('wrong'); }
      else { this.mode = !this.mode; g.sound(this.mode ? 'lamp' : 'press', { x: me.x, vol: 0.45, rate: 1.3 }); haptics.buzz('tap'); }
    }
    if (g.tool !== 'draw' || me.state !== 'play') { this.mode = false; this.ptr = null; this.pts = null; }
    g.drawMode = this.mode;
  }
  host(g, st, from, type, d) {
    if (type !== 'ink' || d.id !== this.id || !Array.isArray(d.pts)) return false;
    const zi = this.zoneAt(+d.zx); if (zi < 0) return false;
    const pts = d.pts.slice(0, 40).map((p) => [r2(+p[0]), r2(+p[1])]), L = this.len(pts), left = this.zones[zi].n - (st.used[zi] || 0);
    if (L > left + 0.05 || L < 0.2) return false;
    st.used[zi] = r2((st.used[zi] || 0) + L);
    st.s.push({ n: ++st.n, pts, t0: r2(g.tc) }); st.s = st.s.filter((s) => g.tc - s.t0 < INK_LIFE + 1).slice(-6);
    g.emitFx('ink', { id: this.id, x: pts[0][0], y: pts[0][1] });
    return true;
  }
  onFx(g, name, d) { if (name !== 'ink' || d.id !== this.id) return; g.sound('dial', { x: d.x, rate: 1.2, vol: 0.7 }); haptics.buzz('open', true); }
  peek(g) { const st = g.pz(this.id); return { mode: this.mode, left: +this.left(g).toFixed(2), used: st.used.slice(), strokes: st.s.filter((s) => this.alive(g, s)).map((s) => ({ n: s.n, a: s.pts[0], b: s.pts[s.pts.length - 1] })) }; }
  static drawLine(ctx, pts, col, wid, alpha) {
    ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = wid; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, -y) : ctx.moveTo(x, -y))); ctx.stroke(); ctx.globalAlpha = 1;
  }
  draw(g, ctx, layer) {
    if (layer !== 'front') return;
    const st = g.pz(this.id), solid = g.sees(this.world);
    for (const s of st.s) {
      if (!this.alive(g, s)) continue;
      const a = g.tc - s.t0, f = Math.min(sat(a / 0.15), sat((INK_LIFE - a) / 1.2)), blink = INK_LIFE - a < 2 ? 0.6 + 0.4 * Math.sin(g.t * 14) : 1;
      if (solid) { Ink.drawLine(ctx, s.pts, rgba('#9ff0ff', 0.35), 0.32, f * blink); Ink.drawLine(ctx, s.pts, '#f4feff', 0.1, f * blink); }
      else Ink.drawLine(ctx, s.pts, rgba('#d9c8ff', 0.8), 0.06, f * 0.7);
    }
    if (this.pts && this.pts.length > 1) Ink.drawLine(ctx, this.pts.map((p) => [p.x, p.y]), '#ffffff', 0.08, 0.8); // 긋는 중
    if (g.tool === 'draw' && this.zoneAt(g.me.x) >= 0 && g.me.state === 'play') { // 잉크 병: 머리 위
      const me = g.me, X = me.x, Y = -me.y - 1.6, u = clamp(this.left(g) / this.zones[this.zoneAt(me.x)].n, 0, 1);
      const shake = g.t - this.emptyT < 0.4 ? Math.sin(g.t * 60) * 0.05 : 0;
      ctx.fillStyle = rgba('#000000', 0.45); ctx.fillRect(X - 0.45 + shake, Y, 0.9, 0.09);
      ctx.fillStyle = u < 0.25 ? '#ff9fb6' : '#bff4ff'; ctx.fillRect(X - 0.45 + shake, Y, 0.9 * u, 0.09);
      if (this.mode) { ctx.strokeStyle = rgba('#ffffff', 0.6 + 0.4 * Math.sin(g.t * 6)); ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(X + 0.62, Y + 0.04, 0.16, 0, TAU); ctx.stroke(); }
    }
  }
}
