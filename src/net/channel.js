// 만남의 통로(채널): 같은 방 코드로 들어온 두 폰이 서로를 찾고, 직접 연결이 안 될 때 메시지를 대신 실어 나른다.
//  - WsChannel  : 게임을 PC의 server.mjs로 열었을 때 (같은 와이파이, 인터넷 없어도 됨)
//  - MqttChannel: 인터넷에 올렸을 때. 누구나 무료로 쓰는 공개 MQTT 중계소를 이용 (계정·비용 없음)
// 둘 다 같은 모양: open(), send(obj), close(), onmsg, onstate

const enc = new TextEncoder();
const dec = new TextDecoder();

class BaseChannel {
  constructor(room, id) {
    this.room = room;
    this.id = id;
    this.onmsg = () => {};
    this.onstate = () => {};
    this.state = 'closed';
    this.wanted = false;
    this.retry = 0;
    this.kind = 'base';
  }
  _set(state) {
    if (this.state === state) return;
    this.state = state;
    this.onstate(state);
  }
  open() {
    this.wanted = true;
    this._connect();
  }
  ensure() { // 화면이 다시 켜졌을 때 등: 끊겨 있으면 바로 다시 붙는다
    if (this.wanted && this.state === 'closed') { clearTimeout(this._timer); this._connect(); }
  }
  close() {
    this.wanted = false;
    clearTimeout(this._timer);
    this._teardown();
    this._set('closed');
  }
  _lost() {
    this._teardown();
    this._set('closed');
    if (!this.wanted) return;
    const wait = Math.min(4000, 400 * Math.pow(1.6, this.retry++));
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._connect(), wait);
  }
}

export class WsChannel extends BaseChannel {
  constructor(room, id, base) {
    super(room, id);
    this.kind = 'ws';
    this.base = base || (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  }
  // 시험용: 연결을 강제로 끊어 두기/풀기 (와이파이가 잠깐 나간 상황 흉내)
  sever(on) { this.blocked = on; if (on) this._lost(); else this.ensure(); }
  _connect() {
    if (this.ws || this.blocked) return;
    this._set('connecting');
    let ws;
    try { ws = new WebSocket(`${this.base}/relay?room=${encodeURIComponent(this.room)}&id=${encodeURIComponent(this.id)}`); } catch (e) { this._lost(); return; }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.retry = 0;
      this._set('open');
      this._alive = performance.now();
      clearInterval(this._beat);
      this._beat = setInterval(() => {
        if (ws.readyState !== 1) return;
        if (performance.now() - this._alive > 9000) { this._lost(); return; }
        ws.send('~');
      }, 3000);
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      this._alive = performance.now();
      if (ev.data === '~') return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.sys) return; // 서버의 안내 메시지는 쓰지 않는다 (서로 직접 인사한다)
      this.onmsg(m);
    };
    ws.onclose = ws.onerror = () => { if (this.ws === ws) this._lost(); };
  }
  _teardown() {
    clearInterval(this._beat);
    const ws = this.ws; this.ws = null;
    if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch (e) { /* 이미 닫힘 */ } }
  }
  send(obj) {
    if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(obj)); return true; }
    return false;
  }
}

// ---- 아주 작은 MQTT 3.1.1 클라이언트 (웹소켓 위에서, QoS 0만) ----
function mqStr(s) { const b = enc.encode(s); const o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
function mqPacket(type, parts) {
  let len = 0; for (const p of parts) len += p.length;
  const head = [type];
  let n = len;
  do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; head.push(b); } while (n > 0);
  const out = new Uint8Array(head.length + len);
  out.set(head, 0);
  let off = head.length;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export const PUBLIC_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

// 중계소 한 곳과의 연결 (끊기면 알아서 다시 붙는다)
class MqttSocket {
  constructor(url, topic, id, owner) { this.url = url; this.topic = topic; this.id = id; this.owner = owner; this.ok = false; this.retry = 0; this.wanted = false; }
  open() { this.wanted = true; this._connect(); }
  close() { this.wanted = false; clearTimeout(this._timer); this._teardown(); }
  ensure() { if (this.wanted && !this.ws) { clearTimeout(this._timer); this._connect(); } }
  _connect() {
    if (this.ws || !this.wanted) return;
    let ws;
    try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { this._lost(); return; }
    ws.binaryType = 'arraybuffer';
    this.ws = ws; this.buf = new Uint8Array(0);
    this._giveUp = setTimeout(() => { if (this.ws === ws && !this.ok) this._lost(); }, 7000);
    ws.onopen = () => {
      if (this.ws !== ws) return;
      const cid = 'ts' + this.id.slice(0, 10) + Math.random().toString(36).slice(2, 8);
      ws.send(mqPacket(0x10, [mqStr('MQTT'), new Uint8Array([4, 2, 0, 30]), mqStr(cid)]));
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      const chunk = new Uint8Array(ev.data);
      const merged = new Uint8Array(this.buf.length + chunk.length);
      merged.set(this.buf, 0); merged.set(chunk, this.buf.length);
      this.buf = merged;
      this._drain(ws);
    };
    ws.onclose = ws.onerror = () => { if (this.ws === ws) this._lost(); };
  }
  _drain(ws) {
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      let mult = 1, len = 0, i = 1;
      for (;;) {
        if (i >= b.length) return;
        const d = b[i++]; len += (d & 127) * mult; mult *= 128;
        if (!(d & 128)) break;
        if (i > 4) { this._lost(); return; }
      }
      if (b.length < i + len) return;
      const type = b[0] >> 4;
      const body = b.subarray(i, i + len);
      this.buf = b.slice(i + len);
      if (type === 2) { // 접속 허락
        if (body[1] !== 0) { this._lost(); return; }
        ws.send(mqPacket(0x82, [new Uint8Array([0, 1]), mqStr(this.topic), new Uint8Array([0])]));
      } else if (type === 9) { // 구독 완료 = 준비 끝
        clearTimeout(this._giveUp);
        this.retry = 0; this.ok = true; this._alive = performance.now();
        clearInterval(this._beat);
        this._beat = setInterval(() => {
          if (ws.readyState !== 1) return;
          if (performance.now() - this._alive > 40000) { this._lost(); return; }
          ws.send(new Uint8Array([0xc0, 0]));
        }, 15000);
        this.owner._socketState();
      } else if (type === 3) { // 메시지 도착
        this._alive = performance.now();
        const tl = (body[0] << 8) | body[1];
        let m; try { m = JSON.parse(dec.decode(body.subarray(2 + tl))); } catch (e) { continue; }
        if (!m || m.f === this.id) continue; // 내가 보낸 건 건너뛴다
        this.owner._from(this, m);
      } else if (type === 13) this._alive = performance.now();
    }
  }
  _teardown() {
    clearInterval(this._beat); clearTimeout(this._giveUp);
    const ws = this.ws; this.ws = null; this.ok = false;
    if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch (e) { /* 이미 닫힘 */ } }
  }
  _lost() {
    this._teardown();
    this.owner._socketState();
    if (!this.wanted) return;
    const wait = Math.min(8000, 600 * Math.pow(1.7, this.retry++));
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._connect(), wait);
  }
  send(bytes) { if (this.ws && this.ws.readyState === 1 && this.ok) { this.ws.send(bytes); return true; } return false; }
}

// 공개 중계소 여러 곳에 동시에 귀를 대고 있다가, 짝의 목소리가 들린 곳으로 말한다.
// (한 곳이 죽거나 메시지를 안 넘겨줘도 다른 곳으로 만난다)
export class MqttChannel extends BaseChannel {
  constructor(room, id, brokers) {
    super(room, id);
    this.kind = 'mqtt';
    this.topic = `twoseas/v1/${room}`;
    this.socks = (brokers && brokers.length ? brokers : PUBLIC_BROKERS).map((u) => new MqttSocket(u, this.topic, id, this));
    this.via = null; this.viaAt = 0;
    this.seen = new Map(); // 같은 메시지가 두 중계소로 겹쳐 들어오면 한 번만 처리
    this.seq = Math.floor(Math.random() * 1e9); // 새로고침 뒤에도 예전 번호와 겹치지 않게
  }
  open() { this.wanted = true; this._set('connecting'); for (const s of this.socks) s.open(); }
  ensure() { for (const s of this.socks) s.ensure(); }
  close() { this.wanted = false; for (const s of this.socks) s.close(); this._set('closed'); }
  sever(on) { if (on) { for (const s of this.socks) s.close(); this.via = null; this._set('closed'); } else for (const s of this.socks) s.open(); }
  _socketState() {
    const any = this.socks.some((s) => s.ok);
    if (this.via && !this.via.ok) this.via = null;
    if (this.wanted) this._set(any ? 'open' : 'connecting');
  }
  _from(sock, m) {
    if (m.q != null) { // 겹친 메시지 거르기
      const k = m.f + ':' + m.q;
      if (this.seen.has(k)) return;
      this.seen.set(k, 1);
      if (this.seen.size > 400) { let n = 0; for (const key of this.seen.keys()) { this.seen.delete(key); if (++n > 200) break; } }
    }
    this.via = sock; this.viaAt = performance.now();
    this.onmsg(m);
  }
  send(obj) {
    obj.q = ++this.seq;
    const bytes = mqPacket(0x30, [mqStr(this.topic), enc.encode(JSON.stringify(obj))]);
    // 짝이 최근에 들린 중계소가 있으면 그곳으로만, 아니면 열린 곳 전부로
    if (this.via && this.via.ok && performance.now() - this.viaAt < 6000) return this.via.send(bytes);
    let sent = false;
    for (const s of this.socks) sent = s.send(bytes) || sent;
    return sent;
  }
}

// 지금 환경에서 쓸 채널을 고른다. server.mjs로 열었으면 그 서버의 중계를, 아니면 공개 MQTT를 쓴다.
export async function pickChannel(room, id, opts = {}) {
  if (opts.net === 'mqtt') return new MqttChannel(room, id, opts.brokers);
  if (opts.net === 'ws') return new WsChannel(room, id, opts.wsBase);
  if (location.protocol.startsWith('http')) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 1200);
      const r = await fetch('relay-info', { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (r.ok) { const j = await r.json(); if (j.relay) { pickChannel.info = j; return new WsChannel(room, id); } }
    } catch (e) { /* 중계 서버 없음 → 공개 MQTT로 */ }
  }
  return new MqttChannel(room, id, opts.brokers);
}
