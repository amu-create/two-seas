// 신호: 화면(단추가 아닌 곳)을 길게 누르면 둥근 메뉴가 뜬다. 손가락을 밀어 고르고 떼면 짝에게 간다.
//   가운데에서 그냥 떼기 = "여기!" 깃발 (누른 자리에 꽂힌다: 내 세계의 안 보이는 것을 짝에게 손가락으로 가리킬 수 있다)
//   위·위오른쪽·오른쪽·아래·아래왼쪽·왼쪽 = 지금! / 3·2·1 / 오른쪽 / 멈춰! / 하트 / 왼쪽
// 글자는 일부러 짧게만: 신호만으로 다 풀리면 말하는 재미가 줄어든다.
import { TAU, clamp, sat, rgba } from '../util.js';
import { haptics } from './haptics.js';

const HOLD = 420;
const ITEMS = [ // 화면 각도(0 = 오른쪽, 시계 방향)
  { k: 'right', a: 0, icon: '▶' },
  { k: 'stop', a: 60, icon: '멈춰' },
  { k: 'heart', a: 120, icon: '♥' },
  { k: 'left', a: 180, icon: '◀' },
  { k: 'now', a: 240, icon: '지금' },
  { k: 'count', a: 300, icon: '3·2·1' },
];
const SKIP = '#pad, #btnJump, #btnAct, #btnPull, [data-free], #wait, #endui';

export class Signals {
  constructor(game) {
    this.g = game; this.flags = [null, null]; this.pops = []; this.count = null;
    this._wheel();
    const doc = document;
    doc.addEventListener('pointerdown', (e) => {
      if (this.ptr != null || (e.target.closest && e.target.closest(SKIP)) || !this.ready()) return;
      this.ptr = e.pointerId; this.x0 = e.clientX; this.y0 = e.clientY; this.sel = 'here'; this.moved = false;
      this.timer = setTimeout(() => this._open(), HOLD);
    });
    doc.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.ptr) return;
      const dx = e.clientX - this.x0, dy = e.clientY - this.y0, d = Math.hypot(dx, dy);
      if (!this.open && d > 18) { clearTimeout(this.timer); this.ptr = null; return; } // 끌기: 신호가 아니다
      if (!this.open) return;
      let a = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      this.sel = d < 30 ? 'here' : ITEMS.reduce((b, it) => (Math.abs(((a - it.a + 540) % 360) - 180) < Math.abs(((a - b.a + 540) % 360) - 180) ? it : b)).k;
      this._mark();
    });
    const up = (e) => {
      if (e.pointerId !== this.ptr) return;
      clearTimeout(this.timer); this.ptr = null;
      if (!this.open) return;
      this.open = false; this.el.classList.add('hidden');
      this.send(this.sel, this.x0, this.y0);
    };
    doc.addEventListener('pointerup', up); doc.addEventListener('pointercancel', up);
  }
  ready() { const g = this.g; return g.W && g.W.phase !== 'lobby' && !g.W.end && !g.paused; }
  _wheel() {
    const el = this.el = document.createElement('div'); el.id = 'wheel'; el.className = 'hidden';
    el.innerHTML = `<div class="c" data-k="here"><b>⚑</b><span>여기</span></div>` + ITEMS.map((it) => {
      const r = 64, x = Math.cos(it.a * Math.PI / 180) * r, y = Math.sin(it.a * Math.PI / 180) * r;
      return `<div class="p" data-k="${it.k}" style="transform:translate(${x.toFixed(0)}px,${y.toFixed(0)}px)">${it.icon}</div>`;
    }).join('');
    document.body.appendChild(el);
  }
  _open() {
    this.open = true; this.sel = 'here';
    this.el.style.left = clamp(this.x0, 100, innerWidth - 100) + 'px'; this.el.style.top = clamp(this.y0, 100, innerHeight - 100) + 'px';
    this.el.classList.remove('hidden'); this._mark(); haptics.buzz('tap');
  }
  _mark() { for (const n of this.el.children) n.classList.toggle('on', n.dataset.k === this.sel); }
  // 화면 좌표 → 세계 좌표 (거울 바다면 좌우 반대)
  toWorld(cx, cy) {
    const v = this.g.view, k = v.dpr || 1; let px = cx * k; const py = cy * k;
    if (this.g.mirrored) px = v.W - px;
    return { x: v.cx + (px - v.W / 2) / v.s, y: v.cy - (py - v.H / 2) / v.s };
  }
  send(kind, cx, cy) {
    const g = this.g, d = { k: kind, r: g.role };
    if (kind === 'here') { const w = this.toWorld(cx, cy); d.x = Math.round(w.x * 100) / 100; d.y = Math.round(w.y * 100) / 100; }
    if (kind === 'left' || kind === 'right') d.dir = (kind === 'right' ? 1 : -1) * (g.mirrored ? -1 : 1); // 세계 기준 방향
    if (kind === 'count') d.at = g.tc + 0.6;
    this.show(d, true);
    if (g.link) g.link.send('sig', d);
  }
  show(d, mine) {
    const g = this.g;
    if (d.k === 'here') { this.flags[d.r] = { x: d.x, y: d.y, t: g.t }; g.sound('lamp', { vol: 0.6, rate: d.r ? 1.15 : 0.95 }); }
    else if (d.k === 'count') this.count = { at: d.at, ticked: -1 };
    else this.pops.push({ k: d.k, r: d.r, dir: d.dir, t: g.t });
    if (this.pops.length > 6) this.pops.shift();
    if (!mine) { haptics.buzz(d.k === 'heart' ? 'heart' : d.k === 'stop' ? 'wrong' : 'ride', true); if (d.k !== 'here' && d.k !== 'count') g.sound(d.k === 'heart' ? 'nuzzle' : 'ringA', { vol: 0.7, rate: d.k === 'stop' ? 0.8 : 1.2 }); }
  }
  cat(r) { const g = this.g; return r === g.role ? g.me : g.other; }
  // 세계 위에 그리기 (깃발, 머리 위 신호)
  drawWorld(ctx) {
    const g = this.g;
    for (let r = 0; r < 2; r++) {
      const f = this.flags[r]; if (!f) continue;
      const u = (g.t - f.t) / 5; if (u > 1) { this.flags[r] = null; continue; }
      const a = Math.min(1, (1 - u) * 4), col = r ? '#e0c8ff' : '#ffe2a0', X = f.x, Y = -f.y;
      for (let k = 0; k < 2; k++) { const w = ((g.t - f.t) * 0.9 + k * 0.5) % 1; ctx.globalAlpha = a * (1 - w) * 0.7; ctx.strokeStyle = col; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.ellipse(X, Y, 0.3 + w * 0.9, 0.1 + w * 0.3, 0, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 1.3); ctx.stroke();
      const wave = Math.sin(g.t * 6) * 0.06;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X, Y - 1.3); ctx.quadraticCurveTo(X + 0.35, Y - 1.2 + wave, X + 0.7, Y - 1.1); ctx.lineTo(X, Y - 0.85); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const p of this.pops) {
      const u = (g.t - p.t) / 1.8; if (u > 1) continue;
      const c = this.cat(p.r); if (!c || !c.present) continue;
      const a = Math.min(1, u * 8, (1 - u) * 4), X = c.x, Y = -c.y - 2.1 - u * 0.3, s = 1 + Math.max(0, 0.25 - u) * 2;
      ctx.save(); ctx.translate(X, Y); ctx.scale(s * (g.mirrored ? -1 : 1), s); ctx.globalAlpha = a;
      ctx.fillStyle = rgba('#050a18', 0.75); ctx.beginPath(); ctx.ellipse(0, 0, 0.75, 0.42, 0, 0, TAU); ctx.fill();
      const col = p.r ? '#e0c8ff' : '#ffe2a0'; ctx.strokeStyle = col; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.fillStyle = p.k === 'heart' ? '#ff9fc8' : p.k === 'stop' ? '#ff9fb6' : col;
      if (p.k === 'left' || p.k === 'right') { // 세계 기준 화살표
        const d = (p.dir || 1) * (g.mirrored ? -1 : 1);
        ctx.beginPath(); ctx.moveTo(0.42 * d, 0); ctx.lineTo(-0.15 * d, -0.26); ctx.lineTo(-0.15 * d, -0.1); ctx.lineTo(-0.42 * d, -0.1); ctx.lineTo(-0.42 * d, 0.1); ctx.lineTo(-0.15 * d, 0.1); ctx.lineTo(-0.15 * d, 0.26); ctx.closePath(); ctx.fill();
      } else {
        ctx.font = `700 ${p.k === 'heart' ? 0.6 : 0.36}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.k === 'heart' ? '♥' : p.k === 'stop' ? '멈춰!' : '지금!', 0, 0.02);
      }
      ctx.restore();
    }
  }
  // 화면 고정: 두 화면에 같은 순간 뜨는 카운트다운
  drawUI(ctx) {
    const g = this.g, C = this.count; if (!C) return;
    const e = g.tc - C.at; if (e < 0) return;
    const i = Math.floor(e / 0.8); if (i > 3) { this.count = null; return; }
    if (i !== C.ticked) { C.ticked = i; g.sound(i === 3 ? 'ringB' : 'press', { vol: 0.8 }); haptics.buzz(i === 3 ? 'open' : 'tap', true); }
    const v = g.view, u = (e % 0.8) / 0.8, txt = i === 3 ? '지금!' : String(3 - i);
    ctx.save(); ctx.translate(v.W / 2, v.H * 0.36); if (g.mirrored) ctx.scale(-1, 1);
    const s = 1 + (1 - sat(u * 4)) * 0.4; ctx.scale(s, s);
    ctx.globalAlpha = 1 - sat((u - 0.6) / 0.4) * (i === 3 ? 1 : 0.6);
    ctx.font = `200 ${Math.round(v.H * 0.2)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(160,255,220,0.9)'; ctx.shadowBlur = v.H * 0.04; ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
}
