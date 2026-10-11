// 두 폰 사이의 연결 한 줄(Link).
// 순서: 채널에서 서로 인사 → 폰끼리 직접 연결(WebRTC) 시도 → 안 되면 채널로 계속 중계(대비책).
// 게임 쪽에서는 send(type, data) / on(type, fn) 만 쓰면 되고, 어떤 길로 가는지는 몰라도 된다.
import { pickChannel } from './channel.js';

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
const now = () => performance.timeOrigin + performance.now();

export class Link {
  constructor({ room, id, isHost, opts = {} }) {
    this.room = room;
    this.id = id;
    this.isHost = isHost;
    this.opts = opts;
    this.handlers = new Map();
    this.peerId = null;
    this.peerSeen = 0;       // 상대에게서 마지막으로 뭔가 받은 시각
    this.status = 'opening'; // opening → alone(상대 기다림) → ok ↔ lost / full(방이 참)
    this.mode = 'relay';     // 'p2p' = 폰끼리 직접, 'relay' = 중계
    this.clockOffset = 0;
    this.rtt = 0;
    this.rttBest = Infinity;
    this.pc = null;
    this.rtcTries = 0;
    this.stats = { tx: 0, rx: 0 };
    this.useRtc = opts.rtc !== false && typeof RTCPeerConnection === 'function';
    this.closed = false;
  }

  on(type, fn) { this.handlers.set(type, fn); return this; }
  _emit(type, data) { const h = this.handlers.get(type); if (h) h(data); }
  _setStatus(s) { if (this.status !== s) { this.status = s; this._emit('status', s); } }
  _setMode(m) { if (this.mode !== m) { this.mode = m; this._emit('mode', m); } }

  // 두 폰이 함께 쓰는 시계(방장 기준, ms)
  hostNow() { return now() + this.clockOffset; }
  // 중계로 갈 때는 위치를 덜 자주 보낸다 (공개 중계소에 부담을 주지 않게)
  get stateHz() { return this.mode === 'p2p' ? 20 : (this.ch && this.ch.kind === 'mqtt' ? 15 : 20); }

  async start() {
    this.ch = await pickChannel(this.room, this.id, this.opts);
    if (this.closed) return;
    this.ch.onmsg = (m) => this._fromChannel(m);
    this.ch.onstate = (s) => {
      this._emit('channel', s);
      if (s === 'open') { this._hello(); if (this.status === 'opening') this._setStatus('alone'); }
    };
    this.ch.open();
    this._tick = setInterval(() => this._beat(), 500);
    this._vis = () => { if (!document.hidden) { this.ch.ensure(); this._hello(); } };
    document.addEventListener('visibilitychange', this._vis);
    window.addEventListener('online', this._vis);
    window.addEventListener('pageshow', this._vis);
  }

  close() {
    this.closed = true;
    clearInterval(this._tick);
    document.removeEventListener('visibilitychange', this._vis);
    window.removeEventListener('online', this._vis);
    window.removeEventListener('pageshow', this._vis);
    this._dropRtc();
    if (this.ch) this.ch.close();
  }

  _hello() { if (this.ch) this.ch.send({ f: this.id, t: 'hello', h: this.isHost ? 1 : 0, k: this.peerId ? 1 : 0 }); }

  _beat() {
    const t = performance.now();
    // 상대를 아직 못 찾았거나 놓쳤으면 계속 인사한다
    if (this.status !== 'ok') this._hello();
    if (this.peerId) {
      if (t - this.peerSeen > 4000) {
        if (this.status === 'ok') { this._setStatus('lost'); this._dropRtc(); this._setMode('relay'); }
      }
      if (this.status === 'ok') {
        this._raw({ t: 'hb' }, false);
        if (!this.isHost && (!this._pingAt || t - this._pingAt > (this.rttBest < 1e9 ? 2500 : 300))) { this._pingAt = t; this._raw({ t: 'ping', a: now() }, false); }
        // 직접 연결이 죽었으면 중계로 내려오고, 가끔 다시 시도한다
        if (this.mode === 'p2p' && !(this.dcR && this.dcR.readyState === 'open')) { this._dropRtc(); this._setMode('relay'); }
        if (this.isHost && this.useRtc && this.mode === 'relay' && !this.pc && t > (this._rtcRetryAt || 0)) this._startRtc();
      }
    }
  }

  _peerAlive(id) {
    this.peerSeen = performance.now();
    if (this.status !== 'ok') {
      this.peerId = id;
      this._setStatus('ok');
      this._emit('peer', { id, back: true });
    }
  }

  _fromChannel(m) {
    if (!m || !m.f || m.f === this.id) return;
    if (m.t === 'hello') {
      if (this.peerId && m.f !== this.peerId && this.status === 'ok') { this.ch.send({ f: this.id, t: 'full', to: m.f }); return; }
      if (!!m.h === this.isHost) { // 둘 다 방장이거나 둘 다 손님이면 짝이 아니다
        if (this.isHost && m.h) this._emit('clash', m.f);
        return;
      }
      const fresh = this.peerId !== m.f || this.status !== 'ok' || !m.k;
      this.peerId = m.f;
      this.peerSeen = performance.now();
      if (fresh) {
        // 상대가 (다시) 들어왔다: 직접 연결은 새로 맺는다
        this._dropRtc(); this._setMode('relay');
        this._rtcRetryAt = 0; this.rtcTries = 0;
        const was = this.status;
        this.status = 'ok';
        this._emit('status', 'ok');
        this._emit('peer', { id: m.f, back: was === 'lost' });
        this._hello();
      }
      return;
    }
    if (m.t === 'full') { if (m.to === this.id && this.status !== 'ok') { this._setStatus('full'); } return; }
    if (this.peerId && m.f !== this.peerId) return;
    if (!this.peerId) return;
    if (m.t === 'sig') { this._signal(m.d); return; }
    this._deliver(m);
  }

  _deliver(m) {
    this.stats.rx++;
    this._peerAlive(this.peerId);
    switch (m.t) {
      case 'hb': return;
      case 'ping': this._raw({ t: 'pong', a: m.a, h: now() }, false); return;
      case 'pong': {
        const rtt = now() - m.a;
        this.rtt = this.rtt ? this.rtt * 0.7 + rtt * 0.3 : rtt;
        if (rtt <= this.rttBest * 1.25 || Math.abs((m.h + rtt / 2 - now()) - this.clockOffset) > 400) {
          this.rttBest = Math.min(this.rttBest, rtt);
          const off = m.h + rtt / 2 - now();
          this.clockOffset = this._clocked ? this.clockOffset * 0.6 + off * 0.4 : off;
          this._clocked = true;
        }
        return;
      }
      default: this._emit(m.t, m.d);
    }
  }

  _raw(obj, reliable) {
    this.stats.tx++;
    if (this.mode === 'p2p') {
      const dc = reliable ? this.dcR : this.dcU;
      if (dc && dc.readyState === 'open') {
        try { dc.send(JSON.stringify(obj)); return true; } catch (e) { /* 아래 중계로 */ }
      }
    }
    obj.f = this.id;
    return this.ch ? this.ch.send(obj) : false;
  }

  // 게임이 쓰는 보내기. reliable=false는 위치처럼 "최신 것만 중요한" 정보.
  send(type, data, reliable = true) {
    if (!this.peerId) return false;
    return this._raw({ t: type, d: data }, reliable);
  }

  // ---------- 목소리 ----------
  // 마이크 소리 한 줄(track)을 짝에게 보낸다. null이면 그만 보낸다. 직접 연결일 때만 실제로 전달된다.
  get canVoice() { return this.mode === 'p2p' && !!this.txA; }
  async setMic(track) {
    this.micTrack = track || null;
    if (this.txA) { try { await this.txA.sender.replaceTrack(this.micTrack); } catch (e) { /* 연결이 바뀌는 중이면 다음 연결에서 다시 싣는다 */ } }
    this.send('mic', { on: !!track });
  }

  // ---------- 폰끼리 직접 연결 (WebRTC) ----------
  _dropRtc() {
    const pc = this.pc; this.pc = null; this.dcR = null; this.dcU = null; this.txA = null;
    clearTimeout(this._rtcTimer);
    if (pc) { pc.onicecandidate = pc.ondatachannel = pc.onconnectionstatechange = pc.ontrack = null; try { pc.close(); } catch (e) { /* 이미 닫힘 */ } }
  }
  _newPc() {
    const pc = new RTCPeerConnection({ iceServers: this.opts.noStun ? [] : ICE });
    this.pc = pc;
    this.pendingIce = [];
    pc.onicecandidate = (e) => { if (e.candidate && this.pc === pc) this.ch.send({ f: this.id, t: 'sig', d: { ice: e.candidate } }); };
    pc.ontrack = (e) => { if (this.pc === pc && e.track.kind === 'audio') this._emit('voice', e.streams[0] || new MediaStream([e.track])); };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') { this._dropRtc(); this._setMode('relay'); this._rtcRetryAt = performance.now() + 15000; }
    };
    return pc;
  }
  _wire(dc) {
    dc.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } this._deliver(m); };
    dc.onopen = () => {
      if (this.dcR && this.dcU && this.dcR.readyState === 'open' && this.dcU.readyState === 'open') {
        clearTimeout(this._rtcTimer);
        this._setMode('p2p');
        if (this.micTrack) this.send('mic', { on: true }); // 다시 이어졌을 때 내 마이크 상태를 알려 준다
      }
    };
    dc.onclose = () => { if (this.mode === 'p2p' && (dc === this.dcR || dc === this.dcU)) { this._dropRtc(); this._setMode('relay'); this._rtcRetryAt = performance.now() + 5000; } };
  }
  async _startRtc() {
    if (this.rtcTries >= 4) return; // 몇 번 해도 안 되면 이 환경은 중계로 간다
    this.rtcTries++;
    this._rtcRetryAt = performance.now() + 20000;
    try {
      const pc = this._newPc();
      this.dcR = pc.createDataChannel('ev', { ordered: true });
      this.dcU = pc.createDataChannel('st', { ordered: false, maxRetransmits: 0 });
      this._wire(this.dcR); this._wire(this.dcU);
      // 목소리가 지나갈 길을 처음부터 열어 둔다 (마이크를 켜기 전에는 아무 소리도 안 보낸다)
      try { this.txA = pc.addTransceiver('audio', { direction: 'sendrecv' }); if (this.micTrack) await this.txA.sender.replaceTrack(this.micTrack); } catch (e) { this.txA = null; }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (this.pc !== pc) return;
      this.ch.send({ f: this.id, t: 'sig', d: { sdp: pc.localDescription } });
      this._rtcTimer = setTimeout(() => { if (this.pc === pc && this.mode !== 'p2p') { this._dropRtc(); } }, 9000);
    } catch (e) { this._dropRtc(); }
  }
  async _signal(d) {
    if (!this.useRtc || !d) return;
    try {
      if (d.sdp && d.sdp.type === 'offer') {
        this._dropRtc();
        const pc = this._newPc();
        pc.ondatachannel = (e) => {
          if (e.channel.label === 'ev') this.dcR = e.channel; else this.dcU = e.channel;
          this._wire(e.channel);
          if (e.channel.readyState === 'open') e.channel.onopen();
        };
        await pc.setRemoteDescription(d.sdp);
        try { const tx = pc.getTransceivers().find((t) => t.receiver && t.receiver.track && t.receiver.track.kind === 'audio'); if (tx) { tx.direction = 'sendrecv'; this.txA = tx; if (this.micTrack) await tx.sender.replaceTrack(this.micTrack); } } catch (e) { this.txA = null; }
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        if (this.pc !== pc) return;
        this.ch.send({ f: this.id, t: 'sig', d: { sdp: pc.localDescription } });
        for (const c of this.pendingIce) await pc.addIceCandidate(c).catch(() => {});
        this.pendingIce = [];
        this._rtcTimer = setTimeout(() => { if (this.pc === pc && this.mode !== 'p2p') this._dropRtc(); }, 9000);
      } else if (d.sdp && d.sdp.type === 'answer') {
        if (this.pc && this.pc.signalingState === 'have-local-offer') {
          await this.pc.setRemoteDescription(d.sdp);
          for (const c of this.pendingIce) await this.pc.addIceCandidate(c).catch(() => {});
          this.pendingIce = [];
        }
      } else if (d.ice) {
        if (this.pc && this.pc.remoteDescription) await this.pc.addIceCandidate(d.ice).catch(() => {});
        else if (this.pc) this.pendingIce.push(d.ice);
      }
    } catch (e) { this._dropRtc(); }
  }
}
