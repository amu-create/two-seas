// 게임 본체: 한 프레임마다 "입력 → 움직임 → 퍼즐 → 연출 → 그리기 → 짝에게 보내기"
// 규칙의 주인: 내 고양이의 위치는 내 폰이, 세계의 상태(퍼즐 진행)는 방장(1P) 폰이 정한다.
import { clamp, lerp, damp, sat, smooth, smoothstep, easeOut, easeInOut, TAU, rgba } from '../util.js';
import { Player, RemotePlayer, PHYS } from './player.js';
import { drawCat, drawCatShadow, LOOKS } from '../render/cat.js';
import { palette, drawSolid, makeDecor, drawFar, drawNear, drawFore, drawWater, drawThread, drawShellLamp, drawFallback } from '../render/scene.js';
import { Fx } from '../render/fx.js';
import { makeChapter, CHAPTERS } from '../chapters/index.js';

const VH = 10.4;             // 화면 세로에 보이는 칸 수 (고양이가 크다는 의견으로 8.6 → 10.4: 전체를 17%쯤 멀리서 본다)
const CAM_Y = 0.2 * VH;      // 땅이 화면 아래에서 30% 높이에 오게
const SAVE_KEY = 'twoseas.save.v2';
const PROGRESS_KEY = 'twoseas.progress.v1';
// 어디까지 깼는지 (이 폰에 저장). 다음에 방을 만들 때 그 다음 장부터 고를 수 있다.
export function loadProgress() { try { return Math.max(0, Math.min(CHAPTERS.length, Number(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}').cleared) || 0)); } catch (e) { return 0; } }
function saveProgress(n) { try { if (n > loadProgress()) localStorage.setItem(PROGRESS_KEY, JSON.stringify({ cleared: n, at: Date.now() })); } catch (e) { /* 저장 못 해도 진행 */ } }
const QUALITY = [            // 좋은 폰 → 느린 폰
  { dpr: 2, parts: 220, k: 1, bgSkip: 1, glow: true },
  { dpr: 1.75, parts: 160, k: 0.75, bgSkip: 1, glow: true },
  { dpr: 1.35, parts: 100, k: 0.5, bgSkip: 2, glow: false },
  { dpr: 1, parts: 60, k: 0.3, bgSkip: 2, glow: false },
];

export class Game {
  constructor({ canvas, bg, input, audio, chapter, ui }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.bg = bg; this.input = input; this.audio = audio; this.ui = ui;
    this.chapter = chapter;
    this.decor = makeDecor(chapter.length, 7 + chapter.id);
    this.fx = new Fx();
    this.link = null; this.isHost = true; this.room = null;
    this.role = 0;
    this.t = 0; this.frame = 0;
    this.view = { W: 1, H: 1, s: 1, dpr: 1, cx: 3, cy: CAM_Y, left: 0, right: 1, waterY: 1.9, bottom: 3, horizon: 0.4, zoom: 1 };
    this.cam = { x: 3, y: CAM_Y, zoom: 1, focus: null };
    this.surge = 0; this.surgeT = 0;
    this.letter = 0;
    this.swapK = 0;
    this.hazard = null;
    this.uiBusy = false;
    this.keysHit = new Map();   // 방금 눌린 키 → 횟수 (한 프레임에 같은 키가 두 번 눌려도 놓치지 않는다)
    this.seenBeats = new Set();
    this.nuzzleT = 0; this.heartT = 0;
    this.lampLit = chapter.checkpoints.map(() => 0);
    this.sendAcc = 0; this.wAcc = 0; this.saveAcc = 0;
    this.paused = false;
    this.card = { title: 0, end: 0 };
    this.lastEmote = -9;
    this.perf = { ema: 16.7, slow: 0, fast: 0, tier: this._guessTier(), frames: 0, t0: performance.now(), fps: 60, worst: 0, samples: [] };
    this.q = { ...QUALITY[this.perf.tier], sparks: (n) => Math.max(1, Math.round(n * QUALITY[this.perf.tier].k)) };
    this.pal = palette(0);
    this.W = this._freshWorld();
    this.setRole(0);
    this._applyTier();
    window.addEventListener('keydown', (e) => { if (!e.repeat) this.keysHit.set(e.code, (this.keysHit.get(e.code) || 0) + 1); });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    this.resize();
  }

  // ---------- 세계 상태 ----------
  _freshWorld() {
    const W = { rev: 1, ch: this.chapter.id, phase: 'lobby', t0: 0, beats: {}, flips: [], end: 0, pz: {} };
    // 퍼즐 배치(가짜 발판·문양·정답 기둥)는 방을 만들 때마다 달라진다
    for (const p of this.chapter.puzzles) { const st = p.init(); if ('seed' in st) st.seed = 1 + Math.floor(Math.random() * 1e6); W.pz[p.id] = st; }
    return W;
  }
  pz(id) { return this.W.pz[id]; }
  get tc() { // 장 시계(초): 두 폰이 같은 값을 본다
    if (this.W.phase === 'lobby' || !this.W.t0) return this.t;
    const now = this.link ? this.link.hostNow() : performance.timeOrigin + performance.now();
    return (now - this.W.t0) / 1000;
  }
  // 지금 내 화면이 보는 바다 (0 빛 / 1 그림자). 장마다 처음부터 뒤바뀌어 있을 수 있고(swap), 도중에 뒤바뀌기도 한다(flips).
  get viewRole() { const tc = this.tc; let n = 0; for (const t of this.W.flips || []) if (tc - t > 0.65) n++; return this.role ^ (this.chapter.swap ? 1 : 0) ^ (n & 1); }
  sees(kind) { return kind === 'both' || this.viewRole === kind; }
  // 장 바꾸기: 지도·퍼즐을 새로 만들고 고양이를 출발점에 세운다
  setChapter(n) {
    this.chapter = makeChapter(n);
    this.decor = makeDecor(this.chapter.length, 7 + this.chapter.id);
    this.lampLit = this.chapter.checkpoints.map(() => 0);
    this.seenBeats.clear(); this._endReset(); this._flipSeen = 0; this.beatNow = null;
    this.card.end = 0; this.letter = 0; this.input.locked = false;
    this.setRole(this.role);
    this.ui.onChapter(this.chapter);
  }
  keyHit(code) { const n = this.keysHit.get(code) || 0; if (n > 0) this.keysHit.set(code, n - 1); return n > 0; }

  setRole(role) {
    this.role = role;
    const sp = this.chapter.spawn;
    this.me = new Player(role, sp[role].x, sp[role].y);
    this.other = new RemotePlayer(1 - role, sp[1 - role].x, sp[1 - role].y);
    this.me.face = 1;
    this.cam.x = this.me.x + 2;
    this.swapK = this.viewRole;
  }

  // ---------- 연결 ----------
  attach(link, room) {
    this.link = link; this.room = room; this.isHost = link.isHost;
    link.on('st', (d) => { this.other.push(d.t, d.s); });
    link.on('w', (d) => this._onWorld(d));
    link.on('act', (d) => { if (this.isHost) this._hostAct(1 - this.role, d.type, d.data); });
    link.on('fx', (d) => { if (d.x !== this.role) this._fx(d.n, d.d); });
    link.on('emote', (d) => this._emote(this.other, d));
    link.on('resume', (d) => { // 방장이 새로고침해서 기억을 잃었을 때: 손님이 기억하던 세계로 이어간다
      if (this.isHost && d && d.W && d.W.rev > this.W.rev && d.W.ch === this.W.ch) { this.W = d.W; this.W.rev++; this._afterWorld(); this._sendWorld(); }
    });
    link.on('peer', () => {
      if (this.isHost) {
        if (this.W.phase === 'lobby') { this.W.phase = 'play'; this.W.t0 = this.link.hostNow() + 400; this.W.rev++; this.card.title = 0.001; }
        this._sendWorld();
      } else if (this.W.rev > 1 && this.W.phase !== 'lobby') link.send('resume', { W: this.W });
      this.sound('join');
    });
    link.on('status', (s) => { this.ui.onLink(s, link.mode); });
    link.on('mode', (m) => { this.ui.onLink(link.status, m); });
  }
  _sendWorld() { if (this.link) this.link.send('w', { W: this.W, cp: [this.role === 0 ? this.me.cp : this.other.cp, this.role === 1 ? this.me.cp : this.other.cp] }); this._dirty = false; this.wAcc = 0; this._save(); }
  _onWorld(d) {
    if (this.isHost || !d || !d.W) return;
    const first = this.W.phase === 'lobby' && d.W.phase !== 'lobby';
    if (d.W.rev < this.W.rev && !d.W.reset) return;
    const wasEnd = this.W.end;
    if (d.W.ch !== this.chapter.id) { this.setChapter(d.W.ch); this._restored = false; } // 방장이 다른 장을 골랐다
    this.W = d.W;
    if (first) {
      this.card.title = 0.001;
      // 다시 들어온 경우: 방장이 기억하는 내 마지막 지점에서 이어간다
      if (!this._restored && d.cp && d.cp[this.role] > 0) this._placeAt(d.cp[this.role]);
    }
    if (d.W.reset && d.W.reset !== this._resetSeen) { this._resetSeen = d.W.reset; this._restart(); }
    if (wasEnd && !this.W.end) this._restart();
    this._afterWorld();
    this._save();
  }
  _afterWorld() { /* 세계가 통째로 바뀐 뒤 화면 쪽 뒷정리가 필요하면 여기서 */ }
  _placeAt(cp) {
    const c = this.chapter.checkpoints[clamp(cp, 0, this.chapter.checkpoints.length - 1)];
    this.me.cp = cp; this.me.x = c.x + (this.role ? 0.5 : -0.5); this.me.y = c.y; this.me.vx = this.me.vy = 0;
    this.cam.x = this.me.x;
  }
  _restart() {
    this.setRole(this.role);
    this.seenBeats.clear(); this.card.end = 0; this.card.title = 0.001; this.letter = 0;
    this.input.locked = false; this.ui.onEnd(false);
    this.lampLit.fill(0); this._flipSeen = 0; this._endReset();
  }
  nextChapter() { if (this.chapter.id < CHAPTERS.length) this.restartChapter(this.chapter.id + 1); }
  restartChapter(n) { // 이 장을 처음부터 다시, 또는 n장으로 (손님이 눌러도 방장이 처리한다)
    if (!this.isHost) { this.act('restart', { ch: n || this.chapter.id }); return; }
    if (n && n !== this.chapter.id) this.setChapter(n);
    const W = this._freshWorld();
    W.rev = this.W.rev + 10; W.phase = 'play'; W.reset = Date.now();
    W.t0 = (this.link ? this.link.hostNow() : performance.timeOrigin + performance.now()) + 300;
    this.W = W; this._restart(); this._sendWorld();
  }

  // 손님의 행동은 방장에게 보내고, 방장은 바로 처리한다
  act(type, data) {
    if (this.isHost) this._hostAct(this.role, type, data);
    else if (this.link) this.link.send('act', { type, data });
  }
  _hostAct(from, type, data) {
    if (type === 'restart') { this.restartChapter(data && data.ch); return; }
    let ch = false;
    for (const p of this.chapter.puzzles) if (p.host(this, this.W.pz[p.id], from, type, data || {})) ch = true;
    if (ch) { this.W.rev++; this._dirty = true; }
  }
  // 두 화면 모두에서 터지는 순간 효과. except = 이미 자기 화면에서 본 쪽은 건너뛴다.
  emitFx(n, d, except = -1) {
    if (!this.isHost) return;
    if (this.link) this.link.send('fx', { n, d, x: except });
    if (except !== this.role) this._fx(n, d);
  }
  _fx(n, d) { for (const p of this.chapter.puzzles) p.onFx(this, n, d || {}); }
  beat(id) {
    if (!this.isHost || this.W.beats[id]) return;
    this.W.beats[id] = this.tc;
    const b = this.chapter.beats[id];
    if (b && b.flip) (this.W.flips ||= []).push(this.tc + 0.9); // 이 순간 두 사람의 바다가 뒤바뀐다
    this.W.rev++; this._dirty = true;
  }
  bothPast(x) { return this.other.present && this.me.x > x && this.other.x > x && this.me.ground && this.other.ground && this.me.state === 'play' && this.other.state === 'play'; }
  bothIn(x0, x1) { return this.bothPast(x0) && this.me.x < x1 && this.other.x < x1; }

  // ---------- 저장/이어하기 ----------
  _save() {
    if (!this.room) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ room: this.room, role: this.role, W: this.W, cp: this.me.cp, at: Date.now() })); } catch (e) { /* 저장 못 해도 게임은 계속 */ }
  }
  restore(room) {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s || s.room !== room || s.role !== this.role || Date.now() - s.at > 6 * 3600e3 || !s.W) return false;
      if (s.W.phase === 'lobby') return false;
      if (s.W.ch !== this.chapter.id) this.setChapter(s.W.ch);
      this.W = s.W;
      for (const p of this.chapter.puzzles) if (!this.W.pz[p.id]) this.W.pz[p.id] = p.init();
      this._placeAt(s.cp || 0);
      this._restored = true;
      for (const id of Object.keys(this.W.beats)) this.seenBeats.add(id);
      return true;
    } catch (e) { return false; }
  }

  // ---------- 화질 자동 조절 ----------
  _guessTier() {
    const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    if (cores <= 4 || mem <= 3) return 2;
    return 1;
  }
  _applyTier() {
    const t = this.perf.tier;
    Object.assign(this.q, QUALITY[t]);
    this.q.sparks = (n) => Math.max(1, Math.round(n * QUALITY[t].k));
    this.fx.setBudget(this.q.parts);
    this.bg.setTier(t);
    this.resize();
  }
  _perf(ms) {
    const p = this.perf;
    if (ms > 250) return; // 화면이 꺼졌다 켜진 순간 등은 무시
    p.ema = p.ema * 0.95 + ms * 0.05;
    p.frames++; p.worst = Math.max(p.worst, ms);
    const now = performance.now();
    if (now - p.t0 >= 1000) { p.fps = Math.round(p.frames * 1000 / (now - p.t0)); p.samples.push(p.fps); if (p.samples.length > 600) p.samples.shift(); p.frames = 0; p.t0 = now; p.worstLast = p.worst; p.worst = 0; }
    if (this.t < 2.5 || this.lockTier != null) return;
    if (p.ema > 21) { p.slow += ms; p.fast = 0; } else if (p.ema < 14.5) { p.fast += ms; p.slow = 0; } else { p.slow = Math.max(0, p.slow - ms); p.fast = 0; }
    if (p.slow > 1500 && p.tier < QUALITY.length - 1) { p.tier++; p.slow = 0; p.raised = (p.raised || 0); p.lowered = now; this._applyTier(); }
    // 올리는 건 신중하게: 한참 여유가 있었고, 최근에 낮춘 적이 없을 때만
    if (p.fast > 8000 && p.tier > 0 && now - (p.lowered || 0) > 30000) { p.tier--; p.fast = 0; this._applyTier(); }
  }

  resize() {
    const cssW = window.innerWidth, cssH = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.q.dpr);
    const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    Object.assign(this.view, { W, H, dpr });
    this.bg.resize(cssW, cssH);
  }

  // ---------- 소리·감정표현 ----------
  sound(name, opt = {}) {
    if (opt.x != null) { const dx = (opt.x - this.view.cx) / ((this.view.right - this.view.left) / 2 || 1); opt.pan = clamp(dx, -1, 1) * 0.7; if (Math.abs(dx) > 1.3) return; }
    this.audio.play(name, opt);
  }
  emote(kind) {
    this._emote(this.me, { k: kind });
    if (this.link) this.link.send('emote', { k: kind });
  }
  _emote(cat, d) {
    cat.emote = d.k; cat.emoteT = d.k === 'think' ? 2.2 : 1.5;
    if (d.k === 'call') { cat.anim.sq.kick(1.8); cat.anim.setExpr('happy', 0.9); this.sound(cat.role ? 'babbleB' : 'babbleA', { x: cat.x, vol: cat === this.me ? 1 : 0.85 }); }
  }

  failMe(kind) {
    const me = this.me;
    const c = this.chapter.checkpoints[me.cp];
    const fx = me.x, fy = me.y;
    if (!me.fail(c.x + (this.role ? 0.5 : -0.5), c.y)) return;
    if (kind === 'water') {
      this.fx.burst('drop', fx, this.chapter.waterKill + 0.5, this.q.sparks(12), { speed: 3.2, a0: Math.PI * 0.25, spread: Math.PI * 0.5, g: 9, color: this.pal.raw('waterHi'), life: 0.7, size: 0.08, drag: 0.4 });
      this.fx.add({ kind: 'ring', x: fx, y: this.chapter.waterKill + 0.45, color: '#ffffff', size: 1.1, life: 0.7, flat: 0.25 });
      this.sound('splash', { x: fx });
    } else { this.fx.burst('spark', fx, fy + 0.6, this.q.sparks(10), { speed: 2.4, color: '#ff9fe6', life: 0.5 }); this.sound('zap', { x: fx }); }
    this.sound('oops', { x: fx, rate: this.role ? 1.12 : 0.94 });
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) { /* 진동 없는 기기 */ } }
    this.act('fell', { pz: this.hazard, kind });
    this.hazard = null;
  }

  // ---------- 한 프레임 ----------
  frameStep(dtRaw) {
    const dt = Math.max(0, Math.min(dtRaw, 1 / 20)); // 첫 프레임은 시간이 거꾸로 올 수도 있다
    this.t += dt; this.frame++;
    const inp = this.input.read();
    this.inp = inp;
    const linked = !!this.link && this.W.phase !== 'lobby';
    this.paused = linked && this.link.status !== 'ok';
    if (!this.paused) {
      // 물리는 작은 걸음으로 나눠 계산해 느린 폰에서도 벽을 뚫지 않게 한다
      const n = Math.max(1, Math.ceil(dt / (1 / 90)));
      for (let i = 0; i < n; i++) this._phys(dt / n, inp, i === 0);
      this._logic(dt, inp);
    }
    this._animate(dt);
    this._net(dt);
    this._camera(dt);
    if (!this.drawEvery || this.frame % this.drawEvery === 0) this.draw();
    this.keysHit.clear();
  }

  _solids() {
    const out = this._solidBuf || (this._solidBuf = []);
    out.length = 0;
    for (const s of this.chapter.solids) out.push(s);
    for (const p of this.chapter.puzzles) p.solids(this, out);
    // 목말: 가만히 서 있는 짝의 머리 위에 올라설 수 있다
    const o = this.other;
    // 짝이 걸어가면 머리 위의 나도 함께 실려 간다 (내 세계에 길이 없는 곳은 이렇게 건넌다)
    if (this.chapter.stack && o.present && o.state === 'play' && o.ground) out.push({ x: o.x - 0.42, y: o.y + 0.8, w: 0.84, h: 0.12, oneWay: true, head: true, vx: o.vx });
    return out;
  }

  _phys(dt, inp, first) {
    const me = this.me, other = this.other, ch = this.chapter;
    const solids = this._solids();
    // 빛의 실: 너무 멀어지지 않게 (둘이 항상 한 화면에)
    const viewW = this.view.right - this.view.left;
    const leash = clamp(viewW - 4.6, 6, 13);
    const lim = { min: ch.bounds.min, max: this.W.phase === 'lobby' ? ch.lobbyMax : ch.bounds.max };
    if (other.present && other.state === 'play' && me.state === 'play') { lim.min = Math.max(lim.min, Math.min(other.x - leash, me.x)); lim.max = Math.min(lim.max, Math.max(other.x + leash, me.x)); }
    this.leash = leash;
    const pinp = this.uiBusy ? { x: inp.x, jump: false, jumpPressed: false } : (first ? inp : { x: inp.x, jump: inp.jump, jumpPressed: false });
    // 실 당기기: 내가 단추를 누르고 있으면 짝이 내 쪽으로 끌려오고, 짝이 누르고 있으면 내가 끌려간다
    me.pulling = !!(ch.pull && inp.pull && me.ground && me.state === 'play' && other.present);
    const ext = ch.pull && other.pulling && other.state === 'play' && !me.pulling ? { pullTo: { x: other.x, y: other.y } } : null;
    me.update(dt, pinp, solids, lim, ext);
    // 목말: 짝의 머리 위에 가만히 서 있으면 짝에게 붙어서 실려 간다 (움직이거나 뛰면 떨어진다)
    {
      const can = ch.stack && other.present && other.state === 'play' && me.state === 'play';
      const onHead = me.ground && Math.abs(me.y - (other.y + 0.92)) < 0.08 && Math.abs(me.x - other.x) < 0.85;
      const stick = me.wasRiding && !pinp.x && !inp.jumpPressed && !inp.jump && other.ground && Math.abs(me.x - other.x) < 3;
      me.riding = !!(can && (onHead || stick));
      if (me.riding && !pinp.x) { me.x = Math.abs(me.x - other.x) > 0.5 ? other.x : damp(me.x, other.x, 30, dt); me.y = other.y + 0.92; me.vy = 0; me.vx = 0; me.ground = true; }
      me.wasRiding = me.riding;
    }
    if (me.jumped) { this.sound('jump', { x: me.x }); this.fx.burst('dust', me.x, me.y + 0.05, this.q.sparks(4), { speed: 0.8, spread: Math.PI, color: '#cfe9ff', life: 0.4, size: 0.1 }); }
    if (me.popped) { me.popped = false; this.fx.ring(me.x, me.y + 0.6, '#dff7ff', 0.9, 0.4); this.fx.burst('spark', me.x, me.y + 0.6, this.q.sparks(8), { speed: 2.2, color: '#dff7ff', life: 0.45 }); this.sound('pop', { x: me.x }); }
    if (me.state === 'play' && me.y < ch.waterKill) this.failMe('water');
    // 체크포인트
    if (me.ground && me.state === 'play') {
      const cps = ch.checkpoints;
      for (let i = cps.length - 1; i > me.cp; i--) if (me.x >= cps[i].x - 0.4 && Math.abs(me.y - cps[i].y) < 0.6) { me.cp = i; this.sound('lamp', { x: cps[i].x }); this.fx.burst('spark', cps[i].x, cps[i].y + 0.85, this.q.sparks(8), { speed: 1.4, up: 0.6, color: '#ffe9b0', life: 0.7 }); break; }
    }
  }

  // 프레임당 한 번: 퍼즐, 상호작용, 방장의 판정, 연출
  _logic(dt, inp) {
    const me = this.me, ch = this.chapter;
    this.uiBusy = false;
    for (const p of ch.puzzles) p.update(this, dt);
    // 상호작용
    let target = null;
    if (me.state === 'play') for (const p of ch.puzzles) if (p.canAct && p.canAct(this)) { target = p; break; }
    this.input.setActHint(!!target);
    if (inp.actPressed) { if (target) target.act(this); else this._call(); }
    for (const tap of inp.taps) {
      let used = false;
      for (const p of ch.puzzles) if (p.tap && p.tap(this, tap.x, tap.y)) { used = true; break; }
      if (!used) this._call();
    }
    // 방장: 조건 확인 → 세계 갱신
    if (this.isHost && this.W.phase === 'play') {
      for (const p of ch.puzzles) if (p.hostTick && p.hostTick(this, this.W.pz[p.id])) { this.W.rev++; this._dirty = true; }
      for (const id of Object.keys(ch.beats)) { const b = ch.beats[id]; if (b.when && !this.W.beats[id] && b.when(this)) this.beat(id); }
      if (!this.W.end && ch.end.when(this)) { this.W.end = this.tc; if (ch.end.flip) (this.W.flips ||= []).push(this.tc + 3.2); this.W.rev++; this._dirty = true; }
    }
    this._beats(dt);
    this._ending(dt);
  }

  _call() { // 짝을 부르는 옹알이
    if (this.t - this.lastEmote < 0.9 || this.me.state !== 'play') return;
    this.lastEmote = this.t;
    this.emote('call');
  }

  // 퍼즐을 풀었을 때의 짧은 축하 (폴짝 + 오로라). 껴안기는 장의 끝에서만 한다.
  _beats(dt) {
    const tc = this.tc, me = this.me, other = this.other;
    let active = null;
    for (const id of Object.keys(this.W.beats)) {
      const b = this.chapter.beats[id]; if (!b) continue;
      const u = tc - this.W.beats[id];
      if (u < 0 || u > b.dur + 0.3) { if (u > b.dur) this.seenBeats.add(id); continue; }
      if (!this.seenBeats.has(id)) {
        this.seenBeats.add(id);
        this.surgeT = 1;
        me.anim.setExpr('happy', 1.8); other.anim.setExpr('happy', 1.8);
        if (me.ground && me.state === 'play') { me.vy = 8.5; me.ground = false; }
        this.sound('success');
        for (const c of [me, other]) this.fx.burst('spark', c.x, c.y + 0.8, this.q.sparks(14), { speed: 3, up: 1.2, color: [this.pal.raw('glow'), '#ffffff', this.pal.raw('warm')], life: 0.9, size: 0.08 });
      }
      active = { id, b, u };
    }
    this.beatNow = active;
    if (!this.W.end) { if (me.state === 'cine') { me.state = 'play'; me.walkTo = null; } me.anim.leanTarget = this._nuzzle(dt); }
    // 바다가 뒤바뀌는 순간: 소리와 놀란 표정
    let n = 0; for (const t of this.W.flips || []) if (tc >= t) n++;
    if (n > (this._flipSeen || 0)) {
      const fresh = tc - this.W.flips[n - 1] < 2;
      this._flipSeen = n;
      if (fresh) { this.sound('swap'); this.surgeT = 1; this._wowAt = this.t + 0.7; }
    }
    if (this._wowAt && this.t >= this._wowAt) { this._wowAt = 0; this.sound('wow', { rate: this.role ? 1.12 : 0.94 }); me.anim.setExpr('wow', 2.0); other.anim.setExpr('wow', 2.0); me.anim.sq.kick(2.4); }
  }

  // 한참 가만히 붙어 있을 때만, 가끔 스르르 기댄다
  _nuzzle(dt) {
    const me = this.me, o = this.other;
    const close = o.present && me.ground && o.ground && Math.abs(me.vx) < 0.3 && Math.abs(o.vx) < 0.3 && Math.abs(o.x - me.x) < 1.12 && Math.abs(o.x - me.x) > 0.55 && Math.abs(o.y - me.y) < 0.3 && me.state === 'play' && o.state === 'play';
    this.nuzzleT = close ? this.nuzzleT + dt : 0;
    const start = 2.6, len = 2.2;
    if (close && this.nuzzleT > start && this.nuzzleT < start + len && this.t > (this.nuzzleRest || 0)) {
      if (this.nuzzleT - dt <= start) this.sound('nuzzle', { x: me.x });
      this._hearts(dt); me.face = o.x > me.x ? 1 : -1;
      this._nuzzling = true;
      return o.x > me.x ? 1 : -1;
    }
    if (this._nuzzling) { this._nuzzling = false; this.nuzzleRest = this.t + 40; } // 한 번 기대면 한동안은 쉰다
    return 0;
  }
  _hearts(dt) {
    this.heartT -= dt;
    if (this.heartT <= 0) { this.heartT = 0.55; this.fx.heart((this.me.x + this.other.x) / 2 + (Math.random() - 0.5) * 0.5, Math.max(this.me.y, this.other.y) + 1.45, Math.random() < 0.5 ? '#ff9db8' : '#ffc2d6'); }
  }

  // 장의 끝: 달문 앞에서 만나 꼭 붙는다. 장에 따라 여기서 바다가 뒤바뀐다.
  _ending(dt) {
    if (!this.W.end) return;
    const u = this.tc - this.W.end, me = this.me, o = this.other, e = this.chapter.end, spots = e.spots;
    const cardAt = e.flip ? 6.6 : this.chapter.final ? 6.2 : 4.8;
    this.endU = u;
    if (!this._endSeen) { this._endSeen = true; this.sound('success', { rate: 0.84 }); if (u > cardAt + 3) this.card.end = 1; }
    this.input.locked = true;
    if (me.state !== 'bubble') {
      me.state = 'cine';
      const sx = spots[this.role];
      if (u < 2.4) me.walkTo = sx; else me.walkTo = null;
      if (u >= 1.2 && Math.abs(me.x - sx) < 0.15 && !(e.flip && u > 3.9 && u < 6.4)) me.face = this.role === 0 ? 1 : -1;
    }
    const together = Math.abs(o.x - me.x) < 1.25;
    const hugEnd = this.chapter.final ? 5.6 : 3.5;
    me.anim.leanTarget = u > 1.6 && u < hugEnd && together ? (this.role === 0 ? 1 : -1) : 0;
    if (u > 1.6 && u < hugEnd && together) this._hearts(dt);
    if (u > 1.5 && u < (this.chapter.final ? 6 : 3.3)) this.surgeT = 1;
    if (e.flip && u > 3.9 && u < 6.4) me.face = Math.sin((u - 3.9) * 4.2) > 0 ? 1 : -1; // 어리둥절해서 두리번
    if (u > cardAt) {
      this.card.end = Math.min(1, this.card.end + dt * 0.8);
      if (!this._endUi) { this._endUi = true; saveProgress(this.chapter.id); this.ui.onEnd(true, this.chapter); }
    }
  }
  _endReset() { this._endSeen = this._endUi = false; this.endU = 0; }

  _animate(dt) {
    const me = this.me, o = this.other;
    if (!this.W.end && this._endSeen) this._endReset();
    const hostT = this.link ? this.link.hostNow() : 0;
    const delay = this.link && this.link.mode === 'p2p' ? 90 : 140;
    const wasBubble = o.state === 'bubble';
    o.update(dt, hostT, delay);
    if (o.present && !wasBubble && o.state === 'bubble') { me.anim.setExpr('worry', 1.0); }
    if (o.present && wasBubble && o.state !== 'bubble') { this.fx.ring(o.x, o.y + 0.6, '#dff7ff', 0.9, 0.4); this.sound('pop', { x: o.x, vol: 0.7 }); }
    if (o.jumped) this.sound('jump', { x: o.x, vol: 0.6 });
    // 짝도 같은 규칙으로 기댄다 (각자 화면에서 계산)
    const myLean = me.anim.leanTarget;
    o.anim.leanTarget = myLean !== 0 ? -myLean : 0;
    // 짝이 내 머리 위에 올라서 있으면 꾹 눌린다
    for (const [low, high] of [[me, o], [o, me]]) { const on = o.present && Math.abs(high.x - low.x) < 0.5 && high.y - low.y > 0.6 && high.y - low.y < 1.05 && low.ground; if (on) { low.anim.sq.target = -0.09; if (low.anim.exprT <= 0) low.anim.setExpr('effort', 0.3); } }
    me.anim.update(dt, { vx: me.vx, vy: me.vy, ground: me.ground, face: me.face, state: me.state, partnerDx: o.present ? o.x - me.x : 0 });
    if (o.present) o.anim.update(dt, { vx: o.vx, vy: o.vy, ground: o.ground, face: o.face, state: o.state, partnerDx: me.x - o.x });
    for (const c of [me, o]) {
      if (!c.present) continue;
      if (c.anim.footstep) this.sound('step', { x: c.x, vol: c === me ? 0.5 : 0.32 });
      if (c.anim.landed > 5) { this.sound('land', { x: c.x, vol: clamp(c.anim.landed / 16, 0.35, 1) * (c === me ? 1 : 0.7) }); this.fx.burst('dust', c.x, c.y + 0.05, this.q.sparks(5), { speed: 1.2, spread: Math.PI, color: '#cfe9ff', life: 0.45, size: 0.11 }); }
    }
    this.fx.update(dt);
    this.surgeT = Math.max(0, this.surgeT - dt * 0.45);
    this.surge = damp(this.surge, smooth(this.surgeT), 3, dt);
    // 등불
    const cps = this.chapter.checkpoints;
    for (let i = 0; i < cps.length; i++) this.lampLit[i] = damp(this.lampLit[i], Math.max(me.cp, o.present ? o.cp : 0) >= i ? 1 : 0, 5, dt);
    // 글자 카드
    if (this.card.title > 0) { this.card.title += dt; if (this.card.title > 5.2) this.card.title = 0; }
    // 화면 위아래 검은 띠(연출 때)
    const cine = (this.beatNow && (this.beatNow.b.focus != null || this.beatNow.b.flip) && this.beatNow.u < this.beatNow.b.dur - 0.4) || (this.W.end > 0);
    this.letter = damp(this.letter, cine ? 1 : 0, 5, dt);
    // 세계 색: 뒤바뀜
    const targetK = this.viewRole;
    this.swapK = damp(this.swapK, targetK, 3.2, dt);
    this.pal = palette(this.swapK);
  }

  _net(dt) {
    if (!this.link) return;
    if (this.link.status === 'ok') {
      this.sendAcc += dt;
      const iv = 1 / this.link.stateHz;
      if (this.sendAcc >= iv) { this.sendAcc = this.sendAcc % iv; this.link.send('st', { t: Math.round(this.link.hostNow()), s: this.me.snapshot() }, false); }
      if (this.isHost) { this.wAcc += dt; if (this._dirty || this.wAcc > 1.5) this._sendWorld(); }
    }
    this.saveAcc += dt;
    if (this.saveAcc > 2) { this.saveAcc = 0; this._save(); }
  }

  _camera(dt) {
    const me = this.me, o = this.other, v = this.view, c = this.cam;
    const s0 = Math.min(v.H / VH, v.W / 20); // 좁은 화면(태블릿 등)에서도 가로로 20칸은 보이게
    let zoomT = 1, tx = o.present ? lerp(me.x, o.x, 0.4) : me.x;
    tx += me.face * 0.5;
    if (this.beatNow) { const { b, u } = this.beatNow; if (b.focus != null && u > 0.15 && u < 1.7) tx = lerp(tx, b.focus, 0.75); }
    if (this.W.end) { const u = this.tc - this.W.end; tx = this.chapter.end.camX; zoomT = u < 3.2 ? 1.14 : u < 6.6 ? 1.0 : 0.94; }
    c.zoom = damp(c.zoom, zoomT, 2.4, dt);
    const s = s0 * c.zoom, halfW = v.W / s / 2;
    // 내 고양이는 항상 화면 안쪽에
    tx = clamp(tx, me.x - halfW + 2.4, me.x + halfW - 2.4);
    const b = this.chapter.bounds;
    tx = Math.min(tx, b.max - halfW + 2.2);
    tx = Math.max(tx, b.min + halfW - 1.4);
    c.x = Math.abs(tx - c.x) > 30 ? tx : damp(c.x, tx, 3.6, dt);
    const avgY = Math.max(0, o.present && o.state === 'play' ? (me.y + o.y) / 2 : me.y); // 높은 곳에 오르면 화면도 따라 올라간다
    const ty = CAM_Y / c.zoom + clamp(avgY * 0.72, 0, 4.2) + (c.zoom > 1 ? 0.15 : 0);
    c.y = damp(c.y, ty, 3, dt);
    v.s = s; v.cx = c.x; v.cy = c.y; v.zoom = c.zoom;
    v.left = c.x - halfW; v.right = c.x + halfW;
    v.waterY = 1.9; v.bottom = v.H / s / 2 + c.y;   // 그리기 좌표(아래가 +)
    v.horizon = clamp(0.5 + (0.62 - c.y) * s / v.H, 0.15, 0.6);
  }

  // ---------- 그리기 ----------
  draw() {
    const { ctx, view: v, bg } = this;
    const pal = this.pal || palette(this.role);
    // 바다가 뒤바뀌는 중이면 빛줄기가 화면을 쓸고 지나간다
    const tcNow = this.tc, base = this.role ^ (this.chapter.swap ? 1 : 0), flips = this.W.flips || [];
    let wipeU = -1, palNow = base;
    flips.forEach((t, i) => { const u = (tcNow - t) / 1.3; if (u >= 0 && u < 1.15) { wipeU = u; palNow = base ^ (i & 1); } else if (u >= 1.15) palNow = base ^ ((i + 1) & 1); });
    bg.u.time = this.t; bg.u.camX = v.cx; bg.u.camY = v.cy - CAM_Y; bg.u.surge = this.surge;
    bg.u.pal = palNow; bg.u.wipe = wipeU >= 0 ? sat(wipeU) : 0; bg.u.horizon = v.horizon;
    bg.u.fade = 0;
    bg.draw(this.q.bgSkip);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, v.W, v.H);
    if (!bg.ok) drawFallback(ctx, v.W, v.H, pal);
    drawFar(ctx, v, pal, this.decor, this.t, this.chapter.length);

    ctx.setTransform(v.s, 0, 0, v.s, v.W / 2 - v.cx * v.s, v.H / 2 + v.cy * v.s);
    drawNear(ctx, v, pal, this.decor, this.t);
    drawWater(ctx, v, pal, this.t, false);
    this.chapter.drawBack(this, ctx);
    for (const s of this.chapter.solids) if (s.x < v.right + 1 && s.x + s.w > v.left - 1) drawSolid(ctx, s, pal, this.t, v);
    const cps = this.chapter.checkpoints;
    for (let i = 1; i < cps.length; i++) if (cps[i].x > v.left - 2 && cps[i].x < v.right + 2) drawShellLamp(ctx, cps[i].x + 0.9, cps[i].y, this.lampLit[i], pal, this.t);
    for (const p of this.chapter.puzzles) p.draw(this, ctx, 'back');

    // 빛의 실과 고양이들
    const me = this.me, o = this.other;
    if (o.present) {
      const d = Math.abs(o.x - me.x), tension = me.pulling || o.pulling ? 1 : sat((d - this.leash * 0.55) / (this.leash * 0.45));
      drawThread(ctx, me.x, -(me.y + 0.5), o.x, -(o.y + 0.5), pal, this.t, tension);
      if (me.pulling || o.pulling) { const u = (this.t * 2.2) % 1, from = me.pulling ? o : me, to = me.pulling ? me : o; this.fx.add({ kind: 'spark', x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) + 0.5, life: 0.25, size: 0.07, color: pal.raw('thread') }); }
    }
    const cats = o.present ? [o, me] : [me];
    for (const c of cats) {
      ctx.save(); ctx.translate(c.x, -c.y);
      if (c.state !== 'bubble') { const gy = this._groundBelow(c); if (gy != null) { ctx.save(); ctx.translate(0, c.y - gy); drawCatShadow(ctx, c.anim, 0.32, c.y - gy); ctx.restore(); } }
      const look = LOOKS[c.role];
      drawCat(ctx, c.anim, look, this.q.glow ? { glow: look.glow, glowPx: 10 * v.dpr } : {});
      ctx.restore();
      if (c.emote) this._bubble(ctx, c);
    }
    for (const p of this.chapter.puzzles) p.draw(this, ctx, 'front');
    this.fx.draw(ctx);
    drawWater(ctx, v, pal, this.t, true);
    this.chapter.drawFront(this, ctx);
    drawFore(ctx, v, pal, this.decor, this.t);

    // --- 화면 고정 요소 ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this._darkness(ctx);
    if (wipeU >= 0) { // 뒤바뀜의 빛줄기
      const x = (wipeU * 1.5 - 0.25) * v.W;
      const g = ctx.createLinearGradient(x - v.W * 0.16, 0, x + v.W * 0.05, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - v.W * 0.16, 0, v.W * 0.21, v.H);
    }
    if (this.letter > 0.01) { const h = v.H * 0.085 * this.letter; ctx.fillStyle = '#02040c'; ctx.fillRect(0, 0, v.W, h); ctx.fillRect(0, v.H - h, v.W, h); }
    for (const p of this.chapter.puzzles) p.draw(this, ctx, 'ui');
    this._cards(ctx);
  }

  // 어둠의 구간: 내 주변은 캄캄하고 짝의 주변만 보인다 (내 고양이만은 희미하게 보인다)
  _darkness(ctx) {
    const d = this.chapter.dark; if (!d) return;
    const v = this.view, me = this.me, o = this.other;
    const a = smoothstep(d.x0 - 2, d.x0 + 3, v.cx) * (1 - smoothstep(d.x1 - 3, d.x1 + 2, v.cx));
    if (a < 0.01) return;
    const c = o.present ? o : me;
    const sx = v.W / 2 + (c.x - v.cx) * v.s, sy = v.H / 2 - (c.y + 0.6 - v.cy) * v.s;
    const g = ctx.createRadialGradient(sx, sy, v.s * 1.9, sx, sy, v.s * 3.5);
    g.addColorStop(0, 'rgba(2,4,12,0)'); g.addColorStop(1, `rgba(2,4,12,${0.975 * a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    // 내 고양이는 어둠 위에 다시 그린다 (어디 있는지는 알아야 하니까)
    ctx.save();
    ctx.setTransform(v.s, 0, 0, v.s, v.W / 2 - v.cx * v.s, v.H / 2 + v.cy * v.s);
    ctx.globalAlpha = 0.5 + 0.5 * (1 - a);
    ctx.translate(me.x, -me.y); drawCat(ctx, me.anim, LOOKS[me.role], {});
    ctx.restore();
  }

  _groundBelow(c) {
    let best = null;
    for (const s of this._solidBuf || []) { const top = s.y + s.h; if (c.x > s.x - 0.2 && c.x < s.x + s.w + 0.2 && top <= c.y + 0.05 && (best == null || top > best)) best = top; }
    return best != null && c.y - best < 4 ? best : null;
  }

  _bubble(ctx, c) { // 머리 위 작은 말풍선 (글자 없이 그림으로)
    const u = sat(c.emoteT / 0.25), x = c.x + 0.55, y = -(c.y + 1.75);
    ctx.save(); ctx.translate(x, y); ctx.scale(easeOut(u), easeOut(u)); ctx.globalAlpha = sat(c.emoteT * 4);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.3, 0.16); ctx.lineTo(-0.44, 0.42); ctx.lineTo(-0.1, 0.26); ctx.fill();
    const col = LOOKS[c.role].line;
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    if (c.emote === 'think') { for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.35 + 0.65 * sat(Math.sin(this.t * 5 - i * 0.9)); ctx.beginPath(); ctx.arc(-0.18 + i * 0.18, 0, 0.05, 0, TAU); ctx.fill(); } }
    else { // 음표
      ctx.beginPath(); ctx.ellipse(-0.1, 0.1, 0.075, 0.055, -0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0.14, 0.05, 0.075, 0.055, -0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.04, 0.09); ctx.lineTo(-0.04, -0.14); ctx.lineTo(0.2, -0.19); ctx.lineTo(0.2, 0.04); ctx.stroke();
    }
    ctx.restore();
  }

  _cards(ctx) {
    const v = this.view, ch = this.chapter;
    const font = (px, w = 300) => `${w} ${Math.round(px)}px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif`;
    const spaced = (text, x, y, sp) => { // 자간을 넓힌 글자
      const widths = [...text].map((c) => (c === ' ' ? ctx.measureText(c).width * 0.6 : ctx.measureText(c).width + sp)); const total = widths.reduce((a, b) => a + b, 0) - sp;
      let cx = x - total / 2; [...text].forEach((c, i) => { ctx.fillText(c, cx + (widths[i] - sp) / 2, y); cx += widths[i]; });
    };
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.card.title > 0) {
      const t = this.card.title, a = sat(Math.min((t - 0.3) / 0.9, (4.8 - t) / 0.9));
      ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(160,255,220,0.9)'; ctx.shadowBlur = v.H * 0.035;
      ctx.font = font(v.H * 0.105, 200); spaced(ch.title, v.W / 2, v.H * 0.3 - (1 - easeOut(sat((t - 0.3) / 1.4))) * v.H * 0.02, v.H * 0.035);
      ctx.shadowBlur = 0; ctx.globalAlpha = a * 0.85; ctx.font = font(v.H * 0.042, 300); spaced(ch.subtitle, v.W / 2, v.H * 0.41, v.H * 0.012);
      ctx.globalAlpha = 1;
    }
    if (this.card.end > 0) {
      const a = this.card.end;
      ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#02040c'; ctx.fillRect(0, 0, v.W, v.H);
      ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.shadowColor = this.viewRole ? 'rgba(240,170,255,0.9)' : 'rgba(160,255,220,0.9)'; ctx.shadowBlur = v.H * 0.035;
      ctx.font = font(v.H * 0.09, 200); spaced(ch.endTitle, v.W / 2, v.H * 0.27, v.H * 0.03);
      ctx.shadowBlur = 0; ctx.font = font(v.H * 0.045, 300); ctx.globalAlpha = a * 0.9; spaced(ch.endLine, v.W / 2, v.H * 0.4, v.H * 0.01);
      ctx.globalAlpha = a * 0.6; ctx.font = font(v.H * 0.036, 300); spaced(ch.endNext, v.W / 2, v.H * 0.49, v.H * 0.012);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 테스트·진단용: 지금 "이 화면에서 보이는 것"만 알려준다 ----------
  info() {
    const W = this.W, pz = {};
    for (const p of this.chapter.puzzles) if (p.peek) pz[p.id] = p.peek(this);
    return {
      ch: this.chapter.id, role: this.role, viewRole: this.viewRole, phase: W.phase, rev: W.rev, tc: this.tc, paused: this.paused,
      me: { x: this.me.x, y: this.me.y, ground: this.me.ground, state: this.me.state, cp: this.me.cp },
      other: { present: this.other.present, x: this.other.x, y: this.other.y, state: this.other.state },
      link: this.link ? { status: this.link.status, mode: this.link.mode, rtt: Math.round(this.link.rtt), kind: this.link.ch && this.link.ch.kind } : null,
      beats: W.beats, flips: W.flips, end: W.end, pz,
      fps: this.perf.fps, tier: this.perf.tier, frameMs: Math.round(this.perf.ema * 10) / 10, card: this.card,
    };
  }
}
