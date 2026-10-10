// 소리: 전부 녹음/생성된 파일을 재생한다 (코드로 음을 합성하지 않는다).
// 어떤 이름에 어떤 파일을 쓸지는 assets/audio/manifest.json 에 적혀 있어서, 파일만 바꿔 끼우면 된다.
export class AudioBox {
  constructor(base = 'assets/audio/') {
    this.base = base;
    this.ctx = null;
    this.man = {};
    this.buf = new Map();     // 파일 → 디코딩된 소리
    this.loading = new Map();
    this.loops = new Map();
    this.unlocked = false;
    this.muted = false;
    this.last = new Map();    // 같은 소리가 너무 촘촘히 겹치지 않게
    this.ready = this._loadManifest();
  }
  async _loadManifest() {
    try { const r = await fetch(this.base + 'manifest.json', { cache: 'no-cache' }); if (r.ok) this.man = await r.json(); } catch (e) { this.man = {}; }
  }
  // 첫 터치 때 불러야 한다 (폰 브라우저는 사용자가 화면을 건드려야 소리를 허락한다)
  unlock() {
    if (this.unlocked) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.bed = this.ctx.createGain(); this.bed.gain.value = 1; this.bed.connect(this.master);
    this.unlocked = true;
    this.ctx.resume();
    this.ready.then(() => { for (const n of Object.keys(this.man)) if (this.man[n].preload !== false) this._files(n).forEach((f) => this._load(f)); for (const [n, v] of this.pendingLoops || []) this.loop(n, v); });
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else this.ctx.resume(); });
  }
  _files(name) { const m = this.man[name]; return m ? (Array.isArray(m.files) ? m.files : [m.files]) : []; }
  _load(file) {
    if (this.buf.has(file)) return Promise.resolve(this.buf.get(file));
    if (this.loading.has(file)) return this.loading.get(file);
    const p = fetch(this.base + file).then((r) => { if (!r.ok) throw new Error('없는 소리: ' + file); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then((b) => { this.buf.set(file, b); return b; })
      .catch(() => { this.buf.set(file, null); return null; });
    this.loading.set(file, p);
    return p;
  }
  // 한 번 재생. opt: vol(크기), rate(빠르기=음높이), pan(-1 왼쪽..1 오른쪽), gap(같은 소리 최소 간격 초)
  play(name, opt = {}) {
    if (!this.unlocked || !this.ctx) return;
    const m = this.man[name]; if (!m) return;
    const now = this.ctx.currentTime, gap = opt.gap ?? m.gap ?? 0.04;
    if (now - (this.last.get(name) ?? -9) < gap) return;
    this.last.set(name, now);
    const files = this._files(name);
    const file = files[Math.floor(Math.random() * files.length)];
    const b = this.buf.get(file);
    if (b === undefined) { this._load(file); return; }
    if (!b) return;
    const src = this.ctx.createBufferSource(); src.buffer = b;
    const jitter = m.jitter ?? 0.04;
    src.playbackRate.value = (opt.rate ?? 1) * (m.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
    const g = this.ctx.createGain(); g.gain.value = (opt.vol ?? 1) * (m.vol ?? 1);
    let node = g;
    if (this.ctx.createStereoPanner && opt.pan) { const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, opt.pan)); g.connect(p); node = p; }
    src.connect(g); node.connect(this.sfx);
    const off = m.start ?? 0;
    if (m.dur) { const d = m.dur / src.playbackRate.value; g.gain.setValueAtTime(g.gain.value, now + Math.max(0, d - 0.08)); g.gain.linearRampToValueAtTime(0, now + d); src.start(now, off, m.dur + 0.02); }
    else src.start(now, off);
  }
  // 끊김 없는 반복(파도 소리, 음악): 끝과 처음을 겹쳐 이어 붙인다
  loop(name, vol = 1) {
    if (!this.unlocked) { (this.pendingLoops ||= new Map()).set(name, vol); return; }
    if (this.loops.has(name)) { this.setLoopVol(name, vol); return; }
    const m = this.man[name]; if (!m) return;
    const file = this._files(name)[0];
    const st = { vol, gain: this.ctx.createGain(), stop: false };
    st.gain.gain.value = 0; st.gain.connect(this.bed);
    this.loops.set(name, st);
    this._load(file).then((b) => {
      if (!b || st.stop) return;
      const X = Math.min(m.cross ?? 2.5, b.duration / 4);
      const sched = (when) => {
        if (st.stop) return;
        const src = this.ctx.createBufferSource(); src.buffer = b;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(1, when + X);
        g.gain.setValueAtTime(1, when + b.duration - X); g.gain.linearRampToValueAtTime(0, when + b.duration);
        src.connect(g); g.connect(st.gain); src.start(when);
        const next = when + b.duration - X;
        st.timer = setTimeout(() => sched(next), Math.max(0, (next - this.ctx.currentTime - 1.5) * 1000));
      };
      sched(this.ctx.currentTime + 0.05);
      st.gain.gain.linearRampToValueAtTime(vol * (m.vol ?? 1), this.ctx.currentTime + 2.5);
    });
  }
  setLoopVol(name, vol, fade = 1.2) {
    const st = this.loops.get(name), m = this.man[name];
    if (!st || !this.ctx) return;
    st.vol = vol;
    const g = st.gain.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(vol * (m?.vol ?? 1), now + fade);
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 1; }
}
